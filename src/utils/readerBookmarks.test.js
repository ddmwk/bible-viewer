import assert from 'node:assert/strict'
import test from 'node:test'
import {
  BOOKMARKS_STORAGE_KEY,
  createBookmarkEntry,
  loadStoredBookmarks,
  removeBookmarkById,
  saveStoredBookmarks,
} from './readerBookmarks.js'

function createStorage(initialValue, { failGet = false, failSet = false } = {}) {
  const state = new Map(initialValue === undefined ? [] : [[BOOKMARKS_STORAGE_KEY, initialValue]])

  return {
    getItem(key) {
      if (failGet) throw new Error('read failed')
      return state.has(key) ? state.get(key) : null
    },
    setItem(key, value) {
      if (failSet) throw new Error('write failed')
      state.set(key, value)
    },
  }
}

test('loadStoredBookmarks preserves valid arrays and rejects malformed values', () => {
  const bookmarks = [{ id: 1, bookName: '창세기', chapter: 1, date: '2026. 7. 25.', time: '오전 1:00:00' }]

  assert.deepEqual(loadStoredBookmarks(createStorage(JSON.stringify(bookmarks))), bookmarks)
  assert.deepEqual(loadStoredBookmarks(createStorage('{broken')), [])
  assert.deepEqual(loadStoredBookmarks(createStorage(JSON.stringify({ bookmark: true }))), [])
  assert.deepEqual(loadStoredBookmarks(createStorage(undefined, { failGet: true })), [])
})

test('createBookmarkEntry keeps the existing bookmark shape', () => {
  const bookmark = createBookmarkEntry({
    id: 42,
    bookName: '요한복음',
    chapter: 3,
    now: new Date('2026-07-25T01:02:03+09:00'),
  })

  assert.deepEqual(Object.keys(bookmark), ['id', 'bookName', 'chapter', 'date', 'time'])
  assert.equal(bookmark.id, 42)
  assert.equal(bookmark.bookName, '요한복음')
  assert.equal(bookmark.chapter, 3)
  assert.equal(typeof bookmark.date, 'string')
  assert.equal(typeof bookmark.time, 'string')
})

test('bookmark persistence and removal remain safe and ordered', () => {
  const storage = createStorage()
  const bookmarks = [
    { id: 2, bookName: '출애굽기', chapter: 2 },
    { id: 1, bookName: '창세기', chapter: 1 },
  ]

  assert.equal(saveStoredBookmarks(storage, bookmarks), true)
  assert.deepEqual(loadStoredBookmarks(storage), bookmarks)
  assert.deepEqual(removeBookmarkById(bookmarks, 2), [bookmarks[1]])
  assert.deepEqual(removeBookmarkById(bookmarks, 999), bookmarks)
  assert.equal(saveStoredBookmarks(createStorage(undefined, { failSet: true }), bookmarks), false)
})
