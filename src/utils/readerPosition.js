import { sanitizeReadingProgress } from './readingProgress.js'

export const READER_POSITION_STORAGE_KEY = 'bible_reader_position'

function isRecord(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function parseStoredValue(rawValue) {
  if (typeof rawValue !== 'string') return null

  try {
    return JSON.parse(rawValue)
  } catch {
    return null
  }
}

function findBookByName(books, bookName) {
  return books.find((book) => book.name === bookName) || null
}

function sanitizeVerseIndex(verseIndex, verseCount) {
  if (!Number.isInteger(verseIndex) || verseIndex < 0) return null
  if (verseCount !== undefined && (!Number.isInteger(verseCount) || verseIndex >= verseCount)) return null
  return verseIndex
}

export function sanitizeReaderPosition(value, books, { verseCount } = {}) {
  if (!isRecord(value)) return null
  if (typeof value.bookName !== 'string') return null
  if (!Number.isInteger(value.chapter)) return null

  const matchedBook = findBookByName(books, value.bookName)
  if (!matchedBook) return null
  if (value.chapter < 1 || value.chapter > matchedBook.chapters) return null

  const verseIndex = sanitizeVerseIndex(value.verseIndex, verseCount)
  if (verseIndex === null) return null

  return {
    bookName: matchedBook.name,
    chapter: value.chapter,
    verseIndex,
  }
}

export function loadStoredReaderPosition(storage, books, options) {
  if (!storage?.getItem) return null

  try {
    const rawValue = storage.getItem(READER_POSITION_STORAGE_KEY)
    return sanitizeReaderPosition(parseStoredValue(rawValue), books, options)
  } catch {
    return null
  }
}

export function saveReaderPosition(storage, position, books, options) {
  if (!storage?.setItem) return false

  const sanitizedPosition = sanitizeReaderPosition(position, books, options)
  if (!sanitizedPosition) return false

  try {
    storage.setItem(READER_POSITION_STORAGE_KEY, JSON.stringify(sanitizedPosition))
    return true
  } catch {
    return false
  }
}

export function resolveReaderStartPosition({
  bookmarkId,
  bookmarks,
  storedProgress,
  storedPosition,
  books,
  fallbackBook,
  verseCount,
}) {
  const fallbackPosition = {
    bookName: fallbackBook.name,
    chapter: 1,
    verseIndex: null,
    source: 'default',
  }

  if (bookmarkId !== undefined && bookmarkId !== null && Array.isArray(bookmarks)) {
    const matchedBookmark = bookmarks.find((bookmark) => bookmark?.id === bookmarkId)
    const bookmarkProgress = sanitizeReadingProgress(matchedBookmark, books)

    if (bookmarkProgress) {
      return {
        ...bookmarkProgress,
        verseIndex: null,
        source: 'bookmark',
      }
    }
  }

  const sanitizedStoredProgress = sanitizeReadingProgress(storedProgress, books)
  if (!sanitizedStoredProgress) return fallbackPosition

  const sanitizedStoredPosition = sanitizeReaderPosition(storedPosition, books, { verseCount })
  const matchingVerseIndex =
    sanitizedStoredPosition &&
    sanitizedStoredPosition.bookName === sanitizedStoredProgress.bookName &&
    sanitizedStoredPosition.chapter === sanitizedStoredProgress.chapter
      ? sanitizedStoredPosition.verseIndex
      : null

  return {
    ...sanitizedStoredProgress,
    verseIndex: matchingVerseIndex,
    source: matchingVerseIndex === null ? 'progress' : 'position',
  }
}
