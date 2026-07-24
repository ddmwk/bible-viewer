const CACHE_NAME = 'bible-offline-v1'
const DEFAULT_MANIFEST_URL = '/bible/manifest.json'
const BOOK_URL_PATTERN = /^\/bible\/books\/(\d{2})-([a-f0-9]{12})\.json$/u

export class BibleOfflineStorageError extends Error {
  constructor(code, message, options = {}) {
    super(message, options)
    this.name = 'BibleOfflineStorageError'
    this.code = code
  }
}

function assertStorage(condition, code, message) {
  if (!condition) {
    throw new BibleOfflineStorageError(code, message)
  }
}

function abortError() {
  return new DOMException('The Bible offline download was aborted.', 'AbortError')
}

function isAbortError(error) {
  return error?.name === 'AbortError'
}

async function sha256Hex(bytes, cryptoImpl = globalThis.crypto) {
  assertStorage(
    cryptoImpl?.subtle?.digest,
    'INTEGRITY_CHECK_UNAVAILABLE',
    '이 환경에서는 성경 데이터 무결성을 확인할 수 없습니다.',
  )
  const digest = await cryptoImpl.subtle.digest('SHA-256', bytes)
  return [...new Uint8Array(digest)]
    .map((value) => value.toString(16).padStart(2, '0'))
    .join('')
}

function normalizeManifestBook(book) {
  const match = typeof book?.url === 'string' ? book.url.match(BOOK_URL_PATTERN) : null

  assertStorage(Number.isInteger(book?.bookId) && book.bookId >= 1, 'INVALID_MANIFEST', '유효하지 않은 bookId입니다.')
  assertStorage(typeof book?.bookName === 'string' && book.bookName.trim() !== '', 'INVALID_MANIFEST', '유효하지 않은 bookName입니다.')
  assertStorage(Number.isInteger(book?.chapters) && book.chapters > 0, 'INVALID_MANIFEST', '유효하지 않은 장 수입니다.')
  assertStorage(match, 'INVALID_MANIFEST', '유효하지 않은 성경 권 URL입니다.')
  assertStorage(Number.parseInt(match[1], 10) === book.bookId, 'INVALID_MANIFEST', '성경 권 URL과 bookId가 다릅니다.')
  assertStorage(
    typeof book?.contentHash === 'string' && /^[a-f0-9]{64}$/u.test(book.contentHash),
    'INVALID_MANIFEST',
    '유효하지 않은 content hash입니다.',
  )
  assertStorage(
    match[2] === book.contentHash.slice(0, 12),
    'INVALID_MANIFEST',
    '성경 권 URL hash와 manifest hash가 다릅니다.',
  )
  assertStorage(Number.isInteger(book?.rawBytes) && book.rawBytes > 0, 'INVALID_MANIFEST', '유효하지 않은 rawBytes입니다.')
  assertStorage(
    Number.isInteger(book?.gzipBytes) && book.gzipBytes > 0,
    'INVALID_MANIFEST',
    '유효하지 않은 gzipBytes입니다.',
  )

  return {
    bookId: book.bookId,
    name: book.bookName,
    chapters: book.chapters,
    rawBytes: book.rawBytes,
    gzipBytes: book.gzipBytes,
    url: book.url,
    hash: book.contentHash,
    urlHash: match[2],
  }
}

function validateManifest(manifest) {
  assertStorage(manifest?.schemaVersion === 1, 'INVALID_MANIFEST', '지원하지 않는 manifest 버전입니다.')
  assertStorage(Array.isArray(manifest?.books), 'INVALID_MANIFEST', 'manifest 권 목록이 없습니다.')

  const books = manifest.books.map(normalizeManifestBook)
  const totals = manifest?.totals ?? {}

  return {
    schemaVersion: manifest.schemaVersion,
    books,
    totals: {
      rawBytes: Number.isInteger(totals.rawBytes) && totals.rawBytes >= 0 ? totals.rawBytes : null,
      gzipBytes: Number.isInteger(totals.gzipBytes) && totals.gzipBytes >= 0 ? totals.gzipBytes : null,
    },
  }
}

async function defaultLoadManifest(fetchImpl = globalThis.fetch) {
  assertStorage(typeof fetchImpl === 'function', 'FETCH_UNAVAILABLE', 'manifest를 가져올 fetch를 사용할 수 없습니다.')

  let response
  try {
    response = await fetchImpl(DEFAULT_MANIFEST_URL)
  } catch (error) {
    throw new BibleOfflineStorageError('MANIFEST_FETCH_FAILED', 'manifest를 가져오지 못했습니다.', { cause: error })
  }

  if (!response?.ok) {
    throw new BibleOfflineStorageError(
      'MANIFEST_HTTP_ERROR',
      `manifest 요청이 실패했습니다. (${response?.status ?? 'unknown'})`,
    )
  }

  let manifest
  try {
    manifest = await response.json()
  } catch (error) {
    throw new BibleOfflineStorageError('INVALID_MANIFEST_JSON', 'manifest JSON을 해석하지 못했습니다.', { cause: error })
  }

  return validateManifest(manifest)
}

async function withAbortSignal(promise, signal) {
  if (!signal) {
    return promise
  }
  if (signal.aborted) {
    throw abortError()
  }

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

function getUrlPath(input) {
  const rawUrl = typeof input === 'string' ? input : input?.url
  if (typeof rawUrl !== 'string') {
    return null
  }

  try {
    return new URL(rawUrl, 'https://offline-bible.local').pathname
  } catch {
    return null
  }
}

function parseBookUrl(input) {
  const pathname = getUrlPath(input)
  const match = pathname?.match(BOOK_URL_PATTERN)
  if (!match) {
    return null
  }

  return {
    pathname,
    bookId: Number.parseInt(match[1], 10),
    shortHash: match[2],
  }
}

async function listBookEntries(cache, manifestBooks) {
  const keys = await cache.keys()
  const entries = new Map()

  for (const key of keys) {
    const parsed = parseBookUrl(key)
    if (!parsed) {
      continue
    }

    const manifestBook = manifestBooks.get(parsed.bookId)
    if (!manifestBook) {
      continue
    }

    const response = await cache.match(key)
    if (!response) {
      continue
    }

    const cachedBytes = (await response.clone().arrayBuffer()).byteLength
    const existing = entries.get(parsed.bookId) ?? []
    existing.push({
      request: key,
      pathname: parsed.pathname,
      shortHash: parsed.shortHash,
      cachedBytes,
    })
    entries.set(parsed.bookId, existing)
  }

  return entries
}

function unsupportedResult(feature) {
  return {
    supported: false,
    code: feature === 'storage-manager' ? 'STORAGE_MANAGER_UNSUPPORTED' : 'CACHE_STORAGE_UNSUPPORTED',
  }
}

export function createBibleOfflineStorage({
  cachesImpl = globalThis.caches,
  fetchImpl = globalThis.fetch,
  storageManager = globalThis.navigator?.storage,
  cryptoImpl = globalThis.crypto,
  loadManifest = () => defaultLoadManifest(fetchImpl),
} = {}) {
  let manifestPromise = null

  async function getManifest() {
    if (!manifestPromise) {
      manifestPromise = Promise.resolve()
        .then(() => loadManifest())
        .then(validateManifest)
        .catch((error) => {
          manifestPromise = null
          throw error
        })
    }

    return manifestPromise
  }

  function ensureCacheStorage() {
    if (!cachesImpl || typeof cachesImpl.open !== 'function') {
      return null
    }
    return cachesImpl
  }

  async function getCache() {
    const cacheStorage = ensureCacheStorage()
    assertStorage(cacheStorage, 'CACHE_STORAGE_UNSUPPORTED', '이 환경에서는 Cache Storage를 사용할 수 없습니다.')
    return cacheStorage.open(CACHE_NAME)
  }

  async function getManifestContext() {
    const manifest = await getManifest()
    const booksById = new Map(manifest.books.map((book) => [book.bookId, book]))
    return { manifest, booksById }
  }

  async function listOfflineBibleBooks() {
    const cacheStorage = ensureCacheStorage()
    const { manifest, booksById } = await getManifestContext()

    if (!cacheStorage) {
      return {
        supported: false,
        code: 'CACHE_STORAGE_UNSUPPORTED',
        books: manifest.books.map((book) => ({
          ...book,
          status: 'not-saved',
          cachedBytes: 0,
        })),
      }
    }

    const cache = await cacheStorage.open(CACHE_NAME)
    const entriesByBookId = await listBookEntries(cache, booksById)

    return {
      supported: true,
      books: manifest.books.map((book) => {
        const entries = entriesByBookId.get(book.bookId) ?? []
        const currentEntry = entries.find((entry) => entry.pathname === book.url)
        const hasOlderEntry = entries.some((entry) => entry.pathname !== book.url)
        const cachedBytes = entries.reduce((total, entry) => total + entry.cachedBytes, 0)

        return {
          ...book,
          status: currentEntry ? 'saved' : hasOlderEntry ? 'update-available' : 'not-saved',
          cachedBytes,
        }
      }),
    }
  }

  async function downloadBibleBook(bookId, { signal } = {}) {
    assertStorage(Number.isInteger(bookId) && bookId > 0, 'INVALID_BOOK_ID', '유효하지 않은 bookId입니다.')

    const cache = await getCache()
    const { booksById } = await getManifestContext()
    const manifestBook = booksById.get(bookId)

    assertStorage(manifestBook, 'UNKNOWN_BOOK', `알 수 없는 성경 권입니다: ${bookId}`)

    let response
    try {
      response = await withAbortSignal(fetchImpl(manifestBook.url, { signal }), signal)
    } catch (error) {
      if (isAbortError(error) || error instanceof BibleOfflineStorageError) {
        throw error
      }
      throw new BibleOfflineStorageError('DOWNLOAD_FAILED', '성경 권을 다운로드하지 못했습니다.', { cause: error })
    }

    if (!response?.ok) {
      throw new BibleOfflineStorageError(
        'DOWNLOAD_HTTP_ERROR',
        `성경 권 다운로드가 실패했습니다. (${response?.status ?? 'unknown'})`,
      )
    }

    let responseForCache
    let cachedBytes
    try {
      const cloned = response.clone()
      const body = await withAbortSignal(cloned.arrayBuffer(), signal)
      cachedBytes = body.byteLength
      assertStorage(
        cachedBytes === manifestBook.rawBytes,
        'DOWNLOAD_SIZE_MISMATCH',
        `${manifestBook.name} 데이터 크기가 manifest와 다릅니다.`,
      )
      const contentHash = await withAbortSignal(sha256Hex(body, cryptoImpl), signal)
      assertStorage(
        contentHash === manifestBook.hash,
        'DOWNLOAD_HASH_MISMATCH',
        `${manifestBook.name} 데이터 hash가 manifest와 다릅니다.`,
      )
      responseForCache = new Response(body, {
        headers: new Headers(cloned.headers),
        status: cloned.status,
        statusText: cloned.statusText,
      })
    } catch (error) {
      if (isAbortError(error) || error instanceof BibleOfflineStorageError) {
        throw error
      }
      throw new BibleOfflineStorageError('INVALID_RESPONSE_BODY', '성경 권 응답 본문을 읽지 못했습니다.', { cause: error })
    }

    if (signal?.aborted) {
      throw abortError()
    }

    await cache.put(manifestBook.url, responseForCache)

    const entriesByBookId = await listBookEntries(cache, booksById)
    const obsoleteEntries = (entriesByBookId.get(bookId) ?? [])
      .filter((entry) => entry.pathname !== manifestBook.url)
    for (const entry of obsoleteEntries) {
      await cache.delete(entry.request)
    }

    return {
      bookId: manifestBook.bookId,
      url: manifestBook.url,
      hash: manifestBook.hash,
      cachedBytes,
    }
  }

  async function removeOfflineBibleBook(bookId) {
    assertStorage(Number.isInteger(bookId) && bookId > 0, 'INVALID_BOOK_ID', '유효하지 않은 bookId입니다.')

    const cacheStorage = ensureCacheStorage()
    if (!cacheStorage) {
      return {
        supported: false,
        code: 'CACHE_STORAGE_UNSUPPORTED',
        removedUrls: [],
      }
    }

    const cache = await cacheStorage.open(CACHE_NAME)
    const { booksById } = await getManifestContext()
    const manifestBook = booksById.get(bookId)
    assertStorage(manifestBook, 'UNKNOWN_BOOK', `알 수 없는 성경 권입니다: ${bookId}`)

    const entriesByBookId = await listBookEntries(cache, booksById)
    const entries = entriesByBookId.get(bookId) ?? []
    const removedUrls = []

    for (const entry of entries) {
      const deleted = await cache.delete(entry.request)
      if (deleted) {
        removedUrls.push(entry.pathname)
      }
    }

    return {
      supported: true,
      bookId,
      removedUrls,
    }
  }

  async function matchOfflineBibleBook(url) {
    const cacheStorage = ensureCacheStorage()
    const pathname = getUrlPath(url)
    if (!cacheStorage || !pathname) {
      return null
    }

    const cache = await cacheStorage.open(CACHE_NAME)
    return (await cache.match(pathname)) ?? null
  }

  async function getBibleStorageSummary() {
    const { manifest } = await getManifestContext()
    const listing = await listOfflineBibleBooks()

    const summary = {
      supported: listing.supported,
      expectedBytes: {
        raw: manifest.totals.rawBytes ?? manifest.books.reduce((total, book) => total + book.rawBytes, 0),
        gzip: manifest.totals.gzipBytes ?? manifest.books.reduce((total, book) => total + book.gzipBytes, 0),
      },
      offline: {
        savedBooks: 0,
        updateAvailableBooks: 0,
        cachedBytes: 0,
      },
      storageEstimate: unsupportedResult('storage-manager'),
      persistence: unsupportedResult('storage-manager'),
    }

    for (const book of listing.books) {
      if (book.status === 'saved') {
        summary.offline.savedBooks += 1
      }
      if (book.status === 'update-available') {
        summary.offline.updateAvailableBooks += 1
      }
      summary.offline.cachedBytes += book.cachedBytes
    }

    if (storageManager?.estimate) {
      try {
        const estimate = await storageManager.estimate()
        summary.storageEstimate = {
          supported: true,
          usage: Number.isFinite(estimate?.usage) ? estimate.usage : null,
          quota: Number.isFinite(estimate?.quota) ? estimate.quota : null,
        }
      } catch {
        summary.storageEstimate = {
          supported: false,
          code: 'STORAGE_ESTIMATE_FAILED',
        }
      }
    }

    if (storageManager?.persisted) {
      try {
        summary.persistence = {
          supported: true,
          persisted: await storageManager.persisted(),
        }
      } catch {
        summary.persistence = {
          supported: false,
          code: 'STORAGE_PERSISTENCE_CHECK_FAILED',
        }
      }
    }

    return summary
  }

  async function requestPersistentBibleStorage() {
    if (!storageManager?.persisted || !storageManager?.persist) {
      return unsupportedResult('storage-manager')
    }

    const alreadyPersisted = await storageManager.persisted()
    if (alreadyPersisted) {
      return {
        supported: true,
        persisted: true,
        alreadyPersisted: true,
        granted: true,
      }
    }

    const granted = await storageManager.persist()
    return {
      supported: true,
      persisted: granted,
      alreadyPersisted: false,
      granted,
    }
  }

  return {
    listOfflineBibleBooks,
    downloadBibleBook,
    matchOfflineBibleBook,
    removeOfflineBibleBook,
    getBibleStorageSummary,
    requestPersistentBibleStorage,
  }
}

const defaultBibleOfflineStorage = createBibleOfflineStorage()

export const listOfflineBibleBooks = defaultBibleOfflineStorage.listOfflineBibleBooks
export const downloadBibleBook = defaultBibleOfflineStorage.downloadBibleBook
export const matchOfflineBibleBook = defaultBibleOfflineStorage.matchOfflineBibleBook
export const removeOfflineBibleBook = defaultBibleOfflineStorage.removeOfflineBibleBook
export const getBibleStorageSummary = defaultBibleOfflineStorage.getBibleStorageSummary
export const requestPersistentBibleStorage = defaultBibleOfflineStorage.requestPersistentBibleStorage
