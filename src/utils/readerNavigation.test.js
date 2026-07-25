import assert from 'node:assert/strict'
import test from 'node:test'
import { bibleData } from '../data/bibleData.js'
import { getChapterNavigationModel } from './readerNavigation.js'

test('getChapterNavigationModel moves directly inside the same book', () => {
  assert.deepEqual(getChapterNavigationModel({ books: bibleData, bookName: '창세기', chapter: 2 }), {
    prev: {
      kind: 'move',
      direction: 'prev',
      targetBookName: '창세기',
      targetChapter: 1,
    },
    next: {
      kind: 'move',
      direction: 'next',
      targetBookName: '창세기',
      targetChapter: 3,
    },
  })
})

test('getChapterNavigationModel requests confirmation across book boundaries', () => {
  const exodusStart = getChapterNavigationModel({
    books: bibleData,
    bookName: '출애굽기',
    chapter: 1,
  })
  assert.equal(exodusStart.prev.kind, 'confirm')
  assert.equal(exodusStart.prev.targetBookName, '창세기')
  assert.equal(exodusStart.prev.targetChapter, 50)
  assert.match(exodusStart.prev.confirmMessage, /창세기 50장/)

  const genesisEnd = getChapterNavigationModel({
    books: bibleData,
    bookName: '창세기',
    chapter: 50,
  })
  assert.equal(genesisEnd.next.kind, 'confirm')
  assert.equal(genesisEnd.next.targetBookName, '출애굽기')
  assert.equal(genesisEnd.next.targetChapter, 1)
  assert.match(genesisEnd.next.confirmMessage, /출애굽기 1장/)
})

test('getChapterNavigationModel blocks movement outside the Bible boundaries', () => {
  const first = getChapterNavigationModel({
    books: bibleData,
    bookName: '창세기',
    chapter: 1,
  })
  assert.deepEqual(first.prev, {
    kind: 'blocked',
    direction: 'prev',
    targetBookName: null,
    targetChapter: null,
    boundaryNotice: '성경의 첫 장입니다. 더 이전 장은 없습니다.',
  })

  const lastBook = bibleData.at(-1)
  const last = getChapterNavigationModel({
    books: bibleData,
    bookName: lastBook.name,
    chapter: lastBook.chapters,
  })
  assert.deepEqual(last.next, {
    kind: 'blocked',
    direction: 'next',
    targetBookName: null,
    targetChapter: null,
    boundaryNotice: '성경의 마지막 장입니다. 더 다음 장은 없습니다.',
  })
})

test('getChapterNavigationModel rejects an unknown or invalid current location', () => {
  assert.equal(
    getChapterNavigationModel({ books: bibleData, bookName: '없는책', chapter: 1 }),
    null
  )
  assert.equal(
    getChapterNavigationModel({ books: bibleData, bookName: '창세기', chapter: 51 }),
    null
  )
})
