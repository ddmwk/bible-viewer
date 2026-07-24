import assert from 'node:assert/strict'
import test from 'node:test'

import { BibleDataError, createBibleRepository } from './bibleRepository.js'

const books = [{ name: '창세기', chapters: 2 }]
const hash = 'a'.repeat(64)
const manifest = {
  schemaVersion: 1,
  books: [
    {
      bookId: 1,
      bookName: '창세기',
      chapters: 2,
      url: '/bible/books/01-test.json',
      contentHash: hash,
      rawBytes: 100,
      gzipBytes: 50,
    },
  ],
}
const bookPayload = {
  schemaVersion: 1,
  bookId: 1,
  bookName: '창세기',
  chapters: [['태초에'], ['땅이 혼돈하고']],
}

function jsonResponse(value, { ok = true, status = 200 } = {}) {
  return { ok, status, json: async () => value }
}

test('같은 권의 장 이동은 manifest와 권 파일을 한 번씩만 요청한다', async () => {
  const calls = []
  const repository = createBibleRepository({
    books,
    fetchImpl: async (url) => {
      calls.push(url)
      return jsonResponse(url.includes('manifest') ? manifest : bookPayload)
    },
  })

  const first = await repository.loadBibleChapter('창세기', 1)
  const second = await repository.loadBibleChapter('창세기', 2)

  assert.deepEqual(first.verses, ['태초에'])
  assert.deepEqual(second.verses, ['땅이 혼돈하고'])
  assert.deepEqual(calls, ['/bible/manifest.json', '/bible/books/01-test.json'])
})

test('동시에 요청한 같은 권은 하나의 fetch를 공유한다', async () => {
  let bookRequests = 0
  const repository = createBibleRepository({
    books,
    fetchImpl: async (url) => {
      if (url.includes('manifest')) return jsonResponse(manifest)
      bookRequests += 1
      return jsonResponse(bookPayload)
    },
  })

  await Promise.all([
    repository.loadBibleChapter('창세기', 1),
    repository.loadBibleChapter('창세기', 2),
  ])

  assert.equal(bookRequests, 1)
})

test('호출자가 취소해도 공유 요청은 다른 호출자에게 정상 완료된다', async () => {
  let resolveBook
  const bookResponse = new Promise((resolve) => {
    resolveBook = () => resolve(jsonResponse(bookPayload))
  })
  const repository = createBibleRepository({
    books,
    fetchImpl: async (url) => (url.includes('manifest') ? jsonResponse(manifest) : bookResponse),
  })
  const controller = new AbortController()
  const cancelled = repository.loadBibleChapter('창세기', 1, { signal: controller.signal })
  const retained = repository.loadBibleChapter('창세기', 2)

  controller.abort()
  resolveBook()

  await assert.rejects(cancelled, (error) => error.name === 'AbortError')
  assert.deepEqual((await retained).verses, ['땅이 혼돈하고'])
})

test('실패한 권 요청은 캐시에서 제거되어 재시도할 수 있다', async () => {
  let attempts = 0
  const repository = createBibleRepository({
    books,
    fetchImpl: async (url) => {
      if (url.includes('manifest')) return jsonResponse(manifest)
      attempts += 1
      return attempts === 1
        ? jsonResponse(null, { ok: false, status: 503 })
        : jsonResponse(bookPayload)
    },
  })

  await assert.rejects(repository.loadBibleChapter('창세기', 1), BibleDataError)
  assert.deepEqual((await repository.loadBibleChapter('창세기', 1)).verses, ['태초에'])
  assert.equal(attempts, 2)
})

test('알 수 없는 장과 오염된 본문을 명시적 데이터 오류로 거부한다', async () => {
  const repository = createBibleRepository({
    books,
    fetchImpl: async (url) =>
      jsonResponse(
        url.includes('manifest')
          ? manifest
          : { ...bookPayload, chapters: [['정상'], ['###### 오염']] },
      ),
  })

  await assert.rejects(
    repository.loadBibleChapter('창세기', 3),
    (error) => error.code === 'UNKNOWN_CHAPTER',
  )
  await assert.rejects(
    repository.loadBibleChapter('창세기', 1),
    (error) => error.code === 'INVALID_BOOK_DATA',
  )
})
