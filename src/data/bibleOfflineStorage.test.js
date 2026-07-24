import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import test from 'node:test'

import {
  BibleOfflineStorageError,
  createBibleOfflineStorage,
} from './bibleOfflineStorage.js'

const baseManifest = {
  schemaVersion: 1,
  totals: {
    rawBytes: 300,
    gzipBytes: 150,
  },
  books: [
    {
      bookId: 1,
      bookName: '창세기',
      chapters: 50,
      url: '/bible/books/01-aaaaaaaaaaaa.json',
      contentHash: 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
      rawBytes: 100,
      gzipBytes: 50,
    },
    {
      bookId: 2,
      bookName: '출애굽기',
      chapters: 40,
      url: '/bible/books/02-bbbbbbbbbbbb.json',
      contentHash: 'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
      rawBytes: 200,
      gzipBytes: 100,
    },
  ],
}

function createResponse(body, { status = 200, headers } = {}) {
  return new Response(body, {
    status,
    headers: headers ?? { 'content-type': 'application/json' },
  })
}

function normalizeCacheKey(request) {
  const key = typeof request === 'string' ? request : request.url
  return new URL(key, 'https://example.test').pathname
}

function byteLength(value) {
  return new TextEncoder().encode(value).byteLength
}

function manifestForBookBody(body) {
  const contentHash = createHash('sha256').update(body).digest('hex')
  return {
    ...baseManifest,
    books: [
      {
        ...baseManifest.books[0],
        url: `/bible/books/01-${contentHash.slice(0, 12)}.json`,
        contentHash,
        rawBytes: byteLength(body),
      },
      baseManifest.books[1],
    ],
  }
}

function createMockCaches(seedEntries = []) {
  const store = new Map(seedEntries.map(([key, value]) => [key, value]))

  const cache = {
    async match(request) {
      return store.get(normalizeCacheKey(request))
    },
    async put(request, response) {
      store.set(normalizeCacheKey(request), response)
    },
    async delete(request) {
      return store.delete(normalizeCacheKey(request))
    },
    async keys() {
      return [...store.keys()].map((key) => new Request(`https://example.test${key}`))
    },
  }

  return {
    async open(name) {
      assert.equal(name, 'bible-offline-v1')
      return cache
    },
    store,
  }
}

test('권 다운로드 후 목록과 요약에 저장 상태와 실제 cache bytes가 반영된다', async () => {
  const caches = createMockCaches()
  const fetchCalls = []
  const body = JSON.stringify({ bookId: 1, verses: ['태초에'] })
  const manifest = manifestForBookBody(body)
  const storage = createBibleOfflineStorage({
    cachesImpl: caches,
    fetchImpl: async (url) => {
      fetchCalls.push(url)
      return createResponse(body)
    },
    storageManager: {
      async estimate() {
        return { usage: 1024, quota: 2048 }
      },
      async persisted() {
        return false
      },
      async persist() {
        return true
      },
    },
    loadManifest: async () => manifest,
  })

  const download = await storage.downloadBibleBook(1)
  const listing = await storage.listOfflineBibleBooks()
  const summary = await storage.getBibleStorageSummary()
  const persisted = await storage.requestPersistentBibleStorage()
  const matched = await storage.matchOfflineBibleBook(manifest.books[0].url)
  const expectedBytes = byteLength(body)

  assert.deepEqual(fetchCalls, [manifest.books[0].url])
  assert.equal(download.bookId, 1)
  assert.equal(download.cachedBytes, expectedBytes)
  assert.equal((await matched.text()).includes('태초에'), true)
  assert.equal(listing.supported, true)
  assert.equal(listing.books[0].status, 'saved')
  assert.equal(listing.books[0].cachedBytes, download.cachedBytes)
  assert.equal(listing.books[1].status, 'not-saved')
  assert.deepEqual(summary.expectedBytes, { raw: 300, gzip: 150 })
  assert.deepEqual(summary.offline, {
    savedBooks: 1,
    updateAvailableBooks: 0,
    cachedBytes: download.cachedBytes,
  })
  assert.deepEqual(summary.storageEstimate, { supported: true, usage: 1024, quota: 2048 })
  assert.deepEqual(summary.persistence, { supported: true, persisted: false })
  assert.deepEqual(persisted, {
    supported: true,
    persisted: true,
    alreadyPersisted: false,
    granted: true,
  })
})

test('이전 hash cache entry가 남아 있으면 update-available로 표시하고 삭제 시 모두 제거한다', async () => {
  const oldBody = JSON.stringify({ old: true })
  const caches = createMockCaches([
    ['/bible/books/01-cccccccccccc.json', createResponse(oldBody)],
    ['/unrelated.json', createResponse('ignore')],
  ])
  const storage = createBibleOfflineStorage({
    cachesImpl: caches,
    fetchImpl: async () => {
      throw new Error('fetch should not be called')
    },
    loadManifest: async () => baseManifest,
  })

  const beforeRemoval = await storage.listOfflineBibleBooks()
  const removal = await storage.removeOfflineBibleBook(1)
  const afterRemoval = await storage.listOfflineBibleBooks()

  assert.equal(beforeRemoval.books[0].status, 'update-available')
  assert.equal(beforeRemoval.books[0].cachedBytes, byteLength(oldBody))
  assert.deepEqual(
    removal.removedUrls.sort(),
    ['/bible/books/01-cccccccccccc.json'],
  )
  assert.equal(afterRemoval.books[0].status, 'not-saved')
  assert.equal(caches.store.has('/unrelated.json'), true)
})

test('업데이트 다운로드가 성공하면 같은 권의 이전 hash 응답을 정리한다', async () => {
  const body = '{"current":true}'
  const manifest = manifestForBookBody(body)
  const caches = createMockCaches([
    ['/bible/books/01-cccccccccccc.json', createResponse('{"old":true}')],
  ])
  const storage = createBibleOfflineStorage({
    cachesImpl: caches,
    fetchImpl: async () => createResponse(body),
    loadManifest: async () => manifest,
  })

  assert.equal((await storage.listOfflineBibleBooks()).books[0].status, 'update-available')
  await storage.downloadBibleBook(1)

  const listing = await storage.listOfflineBibleBooks()
  assert.equal(listing.books[0].status, 'saved')
  assert.equal(caches.store.has('/bible/books/01-cccccccccccc.json'), false)
  assert.equal(caches.store.has(manifest.books[0].url), true)
})

test('manifest의 byte size나 SHA-256과 다른 응답은 캐시에 저장하지 않는다', async () => {
  const body = '{"current":true}'
  const validManifest = manifestForBookBody(body)
  const sizeMismatch = {
    ...validManifest,
    books: [{ ...validManifest.books[0], rawBytes: validManifest.books[0].rawBytes + 1 }, validManifest.books[1]],
  }
  const wrongHash = 'f'.repeat(64)
  const hashMismatch = {
    ...validManifest,
    books: [{
      ...validManifest.books[0],
      url: `/bible/books/01-${wrongHash.slice(0, 12)}.json`,
      contentHash: wrongHash,
    }, validManifest.books[1]],
  }

  for (const [manifest, code] of [
    [sizeMismatch, 'DOWNLOAD_SIZE_MISMATCH'],
    [hashMismatch, 'DOWNLOAD_HASH_MISMATCH'],
  ]) {
    const caches = createMockCaches()
    const storage = createBibleOfflineStorage({
      cachesImpl: caches,
      fetchImpl: async () => createResponse(body),
      loadManifest: async () => manifest,
    })
    await assert.rejects(
      storage.downloadBibleBook(1),
      (error) => error instanceof BibleOfflineStorageError && error.code === code,
    )
    assert.equal(caches.store.size, 0)
  }
})

test('다운로드 취소나 실패 시 부분 cache를 남기지 않는다', async () => {
  const caches = createMockCaches()
  let fetchCount = 0
  let resolveBody
  const response = new Response(
    new ReadableStream({
      start(controller) {
        resolveBody = () => {
          controller.enqueue(new TextEncoder().encode('{"delayed":true}'))
          controller.close()
        }
      },
    }),
    { status: 200, headers: { 'content-type': 'application/json' } },
  )
  const storage = createBibleOfflineStorage({
    cachesImpl: caches,
    fetchImpl: async () => {
      fetchCount += 1
      return response
    },
    loadManifest: async () => baseManifest,
  })

  const controller = new AbortController()
  const pending = storage.downloadBibleBook(1, { signal: controller.signal })
  controller.abort()
  resolveBody()

  await assert.rejects(pending, (error) => error.name === 'AbortError')
  assert.equal(fetchCount, 1)
  assert.equal(caches.store.size, 0)

  const failedStorage = createBibleOfflineStorage({
    cachesImpl: createMockCaches(),
    fetchImpl: async () => createResponse('boom', { status: 503 }),
    loadManifest: async () => baseManifest,
  })

  await assert.rejects(
    failedStorage.downloadBibleBook(1),
    (error) => error instanceof BibleOfflineStorageError && error.code === 'DOWNLOAD_HTTP_ERROR',
  )
})

test('Cache Storage 미지원 환경을 명시적으로 반환한다', async () => {
  const storage = createBibleOfflineStorage({
    cachesImpl: null,
    fetchImpl: async () => createResponse('{}'),
    storageManager: null,
    loadManifest: async () => baseManifest,
  })

  const listing = await storage.listOfflineBibleBooks()
  const summary = await storage.getBibleStorageSummary()
  const removal = await storage.removeOfflineBibleBook(1)
  const persistence = await storage.requestPersistentBibleStorage()

  assert.deepEqual(
    listing.books.map((book) => book.status),
    ['not-saved', 'not-saved'],
  )
  assert.equal(listing.supported, false)
  assert.equal(listing.code, 'CACHE_STORAGE_UNSUPPORTED')
  assert.deepEqual(summary.storageEstimate, {
    supported: false,
    code: 'STORAGE_MANAGER_UNSUPPORTED',
  })
  assert.deepEqual(summary.persistence, {
    supported: false,
    code: 'STORAGE_MANAGER_UNSUPPORTED',
  })
  assert.deepEqual(removal, {
    supported: false,
    code: 'CACHE_STORAGE_UNSUPPORTED',
    removedUrls: [],
  })
  assert.deepEqual(persistence, {
    supported: false,
    code: 'STORAGE_MANAGER_UNSUPPORTED',
  })
})

test('이미 영구 저장된 환경은 기존 상태를 구분해서 반환한다', async () => {
  const storage = createBibleOfflineStorage({
    cachesImpl: createMockCaches(),
    fetchImpl: async () => createResponse('{}'),
    storageManager: {
      async persisted() {
        return true
      },
      async persist() {
        throw new Error('persist should not be called')
      },
    },
    loadManifest: async () => baseManifest,
  })

  assert.deepEqual(await storage.requestPersistentBibleStorage(), {
    supported: true,
    persisted: true,
    alreadyPersisted: true,
    granted: true,
  })
})

test('StorageManager 조회가 거부되어도 권 목록과 성경 캐시 요약은 유지한다', async () => {
  const storage = createBibleOfflineStorage({
    cachesImpl: createMockCaches(),
    fetchImpl: async () => createResponse('{}'),
    storageManager: {
      async estimate() {
        throw new Error('denied')
      },
      async persisted() {
        throw new Error('denied')
      },
    },
    loadManifest: async () => baseManifest,
  })

  const summary = await storage.getBibleStorageSummary()
  assert.deepEqual(summary.expectedBytes, { raw: 300, gzip: 150 })
  assert.deepEqual(summary.offline, {
    savedBooks: 0,
    updateAvailableBooks: 0,
    cachedBytes: 0,
  })
  assert.deepEqual(summary.storageEstimate, {
    supported: false,
    code: 'STORAGE_ESTIMATE_FAILED',
  })
  assert.deepEqual(summary.persistence, {
    supported: false,
    code: 'STORAGE_PERSISTENCE_CHECK_FAILED',
  })
})

test('offline helper는 exact manifest URL만 응답하고 Cache Storage 미지원이면 null을 반환한다', async () => {
  const caches = createMockCaches([
    ['/bible/books/01-aaaaaaaaaaaa.json', createResponse('{"cached":true}')],
    ['/bible/books/01-cccccccccccc.json', createResponse('{"old":true}')],
  ])
  const storage = createBibleOfflineStorage({
    cachesImpl: caches,
    fetchImpl: async () => createResponse('{}'),
    loadManifest: async () => baseManifest,
  })
  const unsupportedStorage = createBibleOfflineStorage({
    cachesImpl: null,
    fetchImpl: async () => createResponse('{}'),
    loadManifest: async () => baseManifest,
  })

  assert.equal((await (await storage.matchOfflineBibleBook('/bible/books/01-aaaaaaaaaaaa.json')).json()).cached, true)
  assert.equal(await storage.matchOfflineBibleBook('/bible/books/02-bbbbbbbbbbbb.json'), null)
  assert.equal(await unsupportedStorage.matchOfflineBibleBook('/bible/books/01-aaaaaaaaaaaa.json'), null)
})
