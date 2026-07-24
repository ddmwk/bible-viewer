export const READING_PROGRESS_STORAGE_KEY = 'bible_reading_progress'

function isRecord(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function findBookByName(books, bookName) {
  return books.find((book) => book.name === bookName) || null
}

export function parseStoredValue(rawValue) {
  if (typeof rawValue !== 'string') return null

  try {
    return JSON.parse(rawValue)
  } catch {
    return null
  }
}

export function sanitizeReadingProgress(value, books) {
  if (!isRecord(value)) return null
  if (typeof value.bookName !== 'string') return null
  if (!Number.isInteger(value.chapter)) return null

  const matchedBook = findBookByName(books, value.bookName)
  if (!matchedBook) return null
  if (value.chapter < 1 || value.chapter > matchedBook.chapters) return null

  return {
    bookName: matchedBook.name,
    chapter: value.chapter,
  }
}

export function loadStoredReadingProgress(storage, books) {
  if (!storage?.getItem) return null

  const rawValue = storage.getItem(READING_PROGRESS_STORAGE_KEY)
  return sanitizeReadingProgress(parseStoredValue(rawValue), books)
}

export function saveReadingProgress(storage, progress, books) {
  if (!storage?.setItem) return false

  const sanitizedProgress = sanitizeReadingProgress(progress, books)
  if (!sanitizedProgress) return false

  try {
    storage.setItem(READING_PROGRESS_STORAGE_KEY, JSON.stringify(sanitizedProgress))
    return true
  } catch {
    return false
  }
}

function bookmarkToProgress(bookmark) {
  if (!isRecord(bookmark)) return null

  return {
    bookName: bookmark.bookName,
    chapter: bookmark.chapter,
  }
}

export function resolveReadingPosition({
  bookmarkId,
  bookmarks,
  storedProgress,
  books,
  fallbackBook,
}) {
  const fallbackPosition = {
    bookName: fallbackBook.name,
    chapter: 1,
    source: 'default',
  }

  if (bookmarkId !== undefined && bookmarkId !== null && Array.isArray(bookmarks)) {
    const matchedBookmark = bookmarks.find((bookmark) => bookmark?.id === bookmarkId)
    const bookmarkProgress = sanitizeReadingProgress(bookmarkToProgress(matchedBookmark), books)

    if (bookmarkProgress) {
      return {
        ...bookmarkProgress,
        source: 'bookmark',
      }
    }
  }

  const sanitizedStoredProgress = sanitizeReadingProgress(storedProgress, books)
  if (sanitizedStoredProgress) {
    return {
      ...sanitizedStoredProgress,
      source: 'progress',
    }
  }

  return fallbackPosition
}
