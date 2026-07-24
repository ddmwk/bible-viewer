import assert from 'node:assert/strict'
import test from 'node:test'
import { bibleData } from '../data/bibleData.js'
import {
  READING_PROGRESS_STORAGE_KEY,
  loadStoredReadingProgress,
  parseStoredValue,
  resolveReadingPosition,
  saveReadingProgress,
  sanitizeReadingProgress,
} from './readingProgress.js'

function createStorage(initialValue) {
  const state = new Map(initialValue ? [[READING_PROGRESS_STORAGE_KEY, initialValue]] : [])

  return {
    getItem(key) {
      return state.has(key) ? state.get(key) : null
    },
    setItem(key, value) {
      state.set(key, value)
    },
  }
}

test('parseStoredValue returns null for malformed JSON', () => {
  assert.equal(parseStoredValue('{not-json'), null)
})

test('sanitizeReadingProgress validates known books and chapter range', () => {
  assert.deepEqual(sanitizeReadingProgress({ bookName: '창세기', chapter: 3 }, bibleData), {
    bookName: '창세기',
    chapter: 3,
  })
  assert.equal(sanitizeReadingProgress({ bookName: '없는책', chapter: 1 }, bibleData), null)
  assert.equal(sanitizeReadingProgress({ bookName: '창세기', chapter: 0 }, bibleData), null)
  assert.equal(sanitizeReadingProgress({ bookName: '창세기', chapter: 51 }, bibleData), null)
})

test('loadStoredReadingProgress guards against corrupted storage values', () => {
  const malformedStorage = createStorage('{broken')
  const invalidBookStorage = createStorage(JSON.stringify({ bookName: '없는책', chapter: 3 }))
  const validStorage = createStorage(JSON.stringify({ bookName: '출애굽기', chapter: 12 }))

  assert.equal(loadStoredReadingProgress(malformedStorage, bibleData), null)
  assert.equal(loadStoredReadingProgress(invalidBookStorage, bibleData), null)
  assert.deepEqual(loadStoredReadingProgress(validStorage, bibleData), {
    bookName: '출애굽기',
    chapter: 12,
  })
})

test('saveReadingProgress writes only validated progress payloads', () => {
  const storage = createStorage()

  assert.equal(saveReadingProgress(storage, { bookName: '요한복음', chapter: 21 }, bibleData), true)
  assert.equal(storage.getItem(READING_PROGRESS_STORAGE_KEY), JSON.stringify({ bookName: '요한복음', chapter: 21 }))
  assert.equal(saveReadingProgress(storage, { bookName: '요한복음', chapter: 22 }, bibleData), false)
  assert.equal(storage.getItem(READING_PROGRESS_STORAGE_KEY), JSON.stringify({ bookName: '요한복음', chapter: 21 }))
})

test('resolveReadingPosition prioritizes bookmarkId over stored progress and falls back safely', () => {
  const fallbackBook = bibleData[0]
  const bookmarks = [
    { id: 10, bookName: '마가복음', chapter: 4 },
    { id: 11, bookName: '누가복음', chapter: 2 },
  ]

  assert.deepEqual(
    resolveReadingPosition({
      bookmarkId: 10,
      bookmarks,
      storedProgress: { bookName: '창세기', chapter: 7 },
      books: bibleData,
      fallbackBook,
    }),
    { bookName: '마가복음', chapter: 4, source: 'bookmark' }
  )

  assert.deepEqual(
    resolveReadingPosition({
      bookmarkId: 999,
      bookmarks,
      storedProgress: { bookName: '창세기', chapter: 7 },
      books: bibleData,
      fallbackBook,
    }),
    { bookName: '창세기', chapter: 7, source: 'progress' }
  )

  assert.deepEqual(
    resolveReadingPosition({
      bookmarkId: null,
      bookmarks,
      storedProgress: { bookName: '없는책', chapter: 7 },
      books: bibleData,
      fallbackBook,
    }),
    { bookName: fallbackBook.name, chapter: 1, source: 'default' }
  )
})
