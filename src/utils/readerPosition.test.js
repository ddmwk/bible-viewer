import assert from 'node:assert/strict'
import test from 'node:test'
import { bibleData } from '../data/bibleData.js'
import {
  READER_POSITION_STORAGE_KEY,
  findClosestVisibleVerse,
  loadStoredReaderPosition,
  resolveReaderStartPosition,
  saveReaderPosition,
  sanitizeReaderPosition,
} from './readerPosition.js'

function createStorage(initialValue) {
  const state = new Map(initialValue ? [[READER_POSITION_STORAGE_KEY, initialValue]] : [])

  return {
    getItem(key) {
      return state.has(key) ? state.get(key) : null
    },
    setItem(key, value) {
      state.set(key, value)
    },
  }
}

test('sanitizeReaderPosition validates known book, chapter, and 0-based verse index', () => {
  assert.deepEqual(
    sanitizeReaderPosition({ bookName: '창세기', chapter: 3, verseIndex: 0 }, bibleData),
    {
      bookName: '창세기',
      chapter: 3,
      verseIndex: 0,
    }
  )
  assert.equal(sanitizeReaderPosition({ bookName: '없는책', chapter: 1, verseIndex: 0 }, bibleData), null)
  assert.equal(sanitizeReaderPosition({ bookName: '창세기', chapter: 0, verseIndex: 0 }, bibleData), null)
  assert.equal(sanitizeReaderPosition({ bookName: '창세기', chapter: 1, verseIndex: -1 }, bibleData), null)
})

test('sanitizeReaderPosition enforces verse bounds when verseCount is provided', () => {
  assert.deepEqual(
    sanitizeReaderPosition(
      { bookName: '출애굽기', chapter: 2, verseIndex: 4 },
      bibleData,
      { verseCount: 5 }
    ),
    {
      bookName: '출애굽기',
      chapter: 2,
      verseIndex: 4,
    }
  )
  assert.equal(
    sanitizeReaderPosition(
      { bookName: '출애굽기', chapter: 2, verseIndex: 5 },
      bibleData,
      { verseCount: 5 }
    ),
    null
  )
  assert.equal(
    sanitizeReaderPosition(
      { bookName: '출애굽기', chapter: 2, verseIndex: 1 },
      bibleData,
      { verseCount: 1.5 }
    ),
    null
  )
})

test('findClosestVisibleVerse chooses the intersecting verse nearest the viewport center', () => {
  const entries = [
    {
      isIntersecting: true,
      target: { dataset: { verseIndex: '2' } },
      boundingClientRect: { top: 100, height: 40 },
    },
    {
      isIntersecting: true,
      target: { dataset: { verseIndex: '3' } },
      boundingClientRect: { top: 430, height: 40 },
    },
    {
      isIntersecting: false,
      target: { dataset: { verseIndex: '4' } },
      boundingClientRect: { top: 490, height: 40 },
    },
  ]

  assert.equal(findClosestVisibleVerse(entries, 1000), 3)
  assert.equal(findClosestVisibleVerse(entries.slice(2), 1000), null)
  assert.equal(findClosestVisibleVerse(entries, 0), null)
})

test('loadStoredReaderPosition ignores malformed or corrupted storage values', () => {
  const malformedStorage = createStorage('{broken')
  const wrongShapeStorage = createStorage(JSON.stringify({ bookName: '창세기', chapter: 1 }))
  const validStorage = createStorage(JSON.stringify({ bookName: '요한복음', chapter: 3, verseIndex: 15 }))
  const failingStorage = {
    getItem() {
      throw new Error('denied')
    },
  }

  assert.equal(loadStoredReaderPosition(malformedStorage, bibleData), null)
  assert.equal(loadStoredReaderPosition(wrongShapeStorage, bibleData), null)
  assert.equal(loadStoredReaderPosition(failingStorage, bibleData), null)
  assert.deepEqual(loadStoredReaderPosition(validStorage, bibleData), {
    bookName: '요한복음',
    chapter: 3,
    verseIndex: 15,
  })
})

test('saveReaderPosition writes validated payloads and handles storage failures safely', () => {
  const storage = createStorage()

  assert.equal(
    saveReaderPosition(storage, { bookName: '누가복음', chapter: 4, verseIndex: 8 }, bibleData),
    true
  )
  assert.equal(
    storage.getItem(READER_POSITION_STORAGE_KEY),
    JSON.stringify({ bookName: '누가복음', chapter: 4, verseIndex: 8 })
  )
  assert.equal(
    saveReaderPosition(storage, { bookName: '누가복음', chapter: 4, verseIndex: -1 }, bibleData),
    false
  )

  const failingStorage = {
    setItem() {
      throw new Error('quota')
    },
  }

  assert.equal(
    saveReaderPosition(failingStorage, { bookName: '누가복음', chapter: 4, verseIndex: 8 }, bibleData),
    false
  )
})

test('resolveReaderStartPosition prioritizes bookmark over automatic chapter and verse restore', () => {
  const fallbackBook = bibleData[0]
  const bookmarks = [{ id: 9, bookName: '마가복음', chapter: 4 }]

  assert.deepEqual(
    resolveReaderStartPosition({
      bookmarkId: 9,
      bookmarks,
      storedProgress: { bookName: '창세기', chapter: 7 },
      storedPosition: { bookName: '창세기', chapter: 7, verseIndex: 3 },
      books: bibleData,
      fallbackBook,
    }),
    { bookName: '마가복음', chapter: 4, verseIndex: null, source: 'bookmark' }
  )
})

test('resolveReaderStartPosition restores verse only when it matches the stored chapter', () => {
  const fallbackBook = bibleData[0]

  assert.deepEqual(
    resolveReaderStartPosition({
      bookmarkId: null,
      bookmarks: [],
      storedProgress: { bookName: '요한복음', chapter: 3 },
      storedPosition: { bookName: '요한복음', chapter: 3, verseIndex: 15 },
      books: bibleData,
      fallbackBook,
      verseCount: 36,
    }),
    { bookName: '요한복음', chapter: 3, verseIndex: 15, source: 'position' }
  )

  assert.deepEqual(
    resolveReaderStartPosition({
      bookmarkId: null,
      bookmarks: [],
      storedProgress: { bookName: '요한복음', chapter: 3 },
      storedPosition: { bookName: '요한복음', chapter: 4, verseIndex: 1 },
      books: bibleData,
      fallbackBook,
      verseCount: 54,
    }),
    { bookName: '요한복음', chapter: 3, verseIndex: null, source: 'progress' }
  )

  assert.deepEqual(
    resolveReaderStartPosition({
      bookmarkId: null,
      bookmarks: [],
      storedProgress: { bookName: '요한복음', chapter: 3 },
      storedPosition: { bookName: '요한복음', chapter: 3, verseIndex: 36 },
      books: bibleData,
      fallbackBook,
      verseCount: 36,
    }),
    { bookName: '요한복음', chapter: 3, verseIndex: null, source: 'progress' }
  )
})

test('resolveReaderStartPosition falls back safely when stored values are invalid', () => {
  const fallbackBook = bibleData[0]

  assert.deepEqual(
    resolveReaderStartPosition({
      bookmarkId: null,
      bookmarks: [],
      storedProgress: { bookName: '없는책', chapter: 2 },
      storedPosition: { bookName: '창세기', chapter: 2, verseIndex: 1 },
      books: bibleData,
      fallbackBook,
    }),
    { bookName: fallbackBook.name, chapter: 1, verseIndex: null, source: 'default' }
  )
})
