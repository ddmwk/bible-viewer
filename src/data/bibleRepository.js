import { bibleData } from './bibleData.js'
import { matchOfflineBibleBook } from './bibleOfflineStorage.js'

const DEFAULT_MANIFEST_URL = '/bible/manifest.json'
const BOOK_URL_PATTERN = /^\/bible\/books\/(\d{2})-([a-f0-9]{12})\.json$/u

export class BibleDataError extends Error {
  constructor(code, message, options = {}) {
    super(message, options)
    this.name = 'BibleDataError'
    this.code = code
  }
}

function abortError() {
  return new DOMException('The Bible data request was aborted.', 'AbortError')
}

function waitForPromiseWithSignal(promise, signal) {
  if (!signal) return promise
  if (signal.aborted) return Promise.reject(abortError())

  return new Promise((resolve, reject) => {
    const onAbort = () => reject(abortError())
    signal.addEventListener('abort', onAbort, { once: true })
    promise.then(
      (value) => {
        signal.removeEventListener('abort', onAbort)
        resolve(value)
      },
      (error) => {
        signal.removeEventListener('abort', onAbort)
        reject(error)
      },
    )
  })
}

function assertData(condition, code, message) {
  if (!condition) throw new BibleDataError(code, message)
}

function validateManifest(manifest, books) {
  assertData(manifest?.schemaVersion === 1, 'INVALID_MANIFEST', '지원하지 않는 성경 manifest입니다.')
  assertData(Array.isArray(manifest.books), 'INVALID_MANIFEST', '성경 manifest의 권 목록이 없습니다.')
  assertData(
    manifest.books.length === books.length,
    'INVALID_MANIFEST',
    '성경 manifest의 권 수가 올바르지 않습니다.',
  )

  for (const [index, expectedBook] of books.entries()) {
    const book = manifest.books[index]
    const urlMatch = typeof book?.url === 'string' ? book.url.match(BOOK_URL_PATTERN) : null
    assertData(book?.bookId === index + 1, 'INVALID_MANIFEST', '성경 manifest의 권 순서가 올바르지 않습니다.')
    assertData(book.bookName === expectedBook.name, 'INVALID_MANIFEST', '성경 manifest의 권명이 올바르지 않습니다.')
    assertData(book.chapters === expectedBook.chapters, 'INVALID_MANIFEST', '성경 manifest의 장 수가 올바르지 않습니다.')
    assertData(urlMatch, 'INVALID_MANIFEST', '성경 권 URL이 올바르지 않습니다.')
    assertData(Number.parseInt(urlMatch[1], 10) === book.bookId, 'INVALID_MANIFEST', '성경 권 URL과 ID가 다릅니다.')
    assertData(/^[a-f0-9]{64}$/u.test(book.contentHash), 'INVALID_MANIFEST', '성경 권 hash가 올바르지 않습니다.')
    assertData(urlMatch[2] === book.contentHash.slice(0, 12), 'INVALID_MANIFEST', '성경 권 URL과 hash가 다릅니다.')
    assertData(Number.isInteger(book.rawBytes) && book.rawBytes > 0, 'INVALID_MANIFEST', '성경 권 원본 용량이 올바르지 않습니다.')
    assertData(Number.isInteger(book.gzipBytes) && book.gzipBytes > 0, 'INVALID_MANIFEST', '성경 권 다운로드 용량이 올바르지 않습니다.')
  }

  return manifest
}

function validateBookPayload(payload, manifestBook) {
  assertData(payload?.schemaVersion === 1, 'INVALID_BOOK_DATA', '지원하지 않는 성경 권 데이터입니다.')
  assertData(payload.bookId === manifestBook.bookId, 'INVALID_BOOK_DATA', '성경 권 ID가 manifest와 다릅니다.')
  assertData(payload.bookName === manifestBook.bookName, 'INVALID_BOOK_DATA', '성경 권명이 manifest와 다릅니다.')
  assertData(
    Array.isArray(payload.chapters) && payload.chapters.length === manifestBook.chapters,
    'INVALID_BOOK_DATA',
    '성경 권의 장 수가 올바르지 않습니다.',
  )

  for (const verses of payload.chapters) {
    assertData(Array.isArray(verses) && verses.length > 0, 'INVALID_BOOK_DATA', '본문 절 배열이 비어 있습니다.')
    for (const verse of verses) {
      assertData(
        typeof verse === 'string' && verse.trim() !== '' && !verse.includes('######'),
        'INVALID_BOOK_DATA',
        '유효하지 않은 성경 절이 포함되어 있습니다.',
      )
    }
  }

  return payload
}

async function readJson(fetchImpl, url) {
  let response
  try {
    response = await fetchImpl(url)
  } catch (error) {
    throw new BibleDataError('NETWORK_ERROR', '성경 데이터를 가져오지 못했습니다.', { cause: error })
  }

  if (!response.ok) {
    throw new BibleDataError('HTTP_ERROR', `성경 데이터 요청이 실패했습니다. (${response.status})`)
  }

  try {
    return await response.json()
  } catch (error) {
    throw new BibleDataError('INVALID_JSON', '성경 데이터 JSON을 해석하지 못했습니다.', { cause: error })
  }
}

export function createBibleRepository({
  fetchImpl = globalThis.fetch,
  matchOfflineBook = matchOfflineBibleBook,
  manifestUrl = DEFAULT_MANIFEST_URL,
  books = bibleData,
} = {}) {
  assertData(typeof fetchImpl === 'function', 'FETCH_UNAVAILABLE', '이 환경에서는 성경 데이터를 가져올 수 없습니다.')

  let manifestPromise = null
  const bookPromises = new Map()

  function loadBibleManifest({ signal } = {}) {
    if (!manifestPromise) {
      manifestPromise = readJson(fetchImpl, manifestUrl)
        .then((manifest) => validateManifest(manifest, books))
        .catch((error) => {
          manifestPromise = null
          throw error
        })
    }
    return waitForPromiseWithSignal(manifestPromise, signal)
  }

  async function loadBook(bookName) {
    const manifest = await loadBibleManifest()
    const manifestBook = manifest.books.find((book) => book.bookName === bookName)
    assertData(manifestBook, 'UNKNOWN_BOOK', `알 수 없는 성경 권입니다: ${bookName}`)

    if (!bookPromises.has(manifestBook.bookId)) {
      const request = Promise.resolve()
        .then(async () => {
          let offlineResponse = null
          try {
            offlineResponse = typeof matchOfflineBook === 'function'
              ? await matchOfflineBook(manifestBook.url)
              : null
          } catch {
            // Cache Storage 조회 실패는 온라인 읽기를 막지 않는다.
          }

          if (offlineResponse) {
            if (!offlineResponse.ok) {
              throw new BibleDataError('HTTP_ERROR', `저장된 성경 데이터가 올바르지 않습니다. (${offlineResponse.status})`)
            }
            try {
              return await offlineResponse.json()
            } catch (error) {
              throw new BibleDataError('INVALID_JSON', '저장된 성경 데이터 JSON을 해석하지 못했습니다.', { cause: error })
            }
          }

          return readJson(fetchImpl, manifestBook.url)
        })
        .then((payload) => validateBookPayload(payload, manifestBook))
        .catch((error) => {
          bookPromises.delete(manifestBook.bookId)
          throw error
        })
      bookPromises.set(manifestBook.bookId, request)
    }

    return bookPromises.get(manifestBook.bookId)
  }

  async function loadBibleChapter(bookName, chapter, { signal } = {}) {
    const expectedBook = books.find((book) => book.name === bookName)
    assertData(expectedBook, 'UNKNOWN_BOOK', `알 수 없는 성경 권입니다: ${bookName}`)
    assertData(
      Number.isInteger(chapter) && chapter >= 1 && chapter <= expectedBook.chapters,
      'UNKNOWN_CHAPTER',
      `${bookName} ${chapter}장은 존재하지 않습니다.`,
    )

    const payload = await waitForPromiseWithSignal(loadBook(bookName), signal)
    if (signal?.aborted) throw abortError()

    return {
      bookName,
      chapter,
      verses: payload.chapters[chapter - 1],
    }
  }

  function clearBibleRepositoryCache() {
    manifestPromise = null
    bookPromises.clear()
  }

  return {
    loadBibleManifest,
    loadBibleChapter,
    clearBibleRepositoryCache,
  }
}

const defaultRepository = createBibleRepository()

export const loadBibleManifest = defaultRepository.loadBibleManifest
export const loadBibleChapter = defaultRepository.loadBibleChapter
export const clearBibleRepositoryCache = defaultRepository.clearBibleRepositoryCache
