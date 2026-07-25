export const BOOKMARKS_STORAGE_KEY = 'bible_bookmarks'

export function loadStoredBookmarks(storage) {
  if (!storage?.getItem) return []

  try {
    const parsed = JSON.parse(storage.getItem(BOOKMARKS_STORAGE_KEY) || '[]')
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

export function saveStoredBookmarks(storage, bookmarks) {
  if (!storage?.setItem || !Array.isArray(bookmarks)) return false

  try {
    storage.setItem(BOOKMARKS_STORAGE_KEY, JSON.stringify(bookmarks))
    return true
  } catch {
    return false
  }
}

export function createBookmarkEntry({ id, bookName, chapter, now = new Date() }) {
  return {
    id,
    bookName,
    chapter,
    date: now.toLocaleDateString(),
    time: now.toLocaleTimeString('ko-KR', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    }),
  }
}

export function removeBookmarkById(bookmarks, id) {
  return bookmarks.filter((bookmark) => bookmark.id !== id)
}
