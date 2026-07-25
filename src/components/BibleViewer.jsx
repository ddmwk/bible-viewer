import { useEffect, useMemo, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { bibleData } from '../data/bibleData'
import { Card, CardContent } from '@/components/ui/card'
import {
  loadStoredReadingProgress,
  resolveReadingPosition,
  saveReadingProgress,
} from '../utils/readingProgress'
import { loadBibleChapter } from '../data/bibleRepository'
import {
  createBookmarkEntry,
  loadStoredBookmarks,
  removeBookmarkById,
  saveStoredBookmarks,
} from '../utils/readerBookmarks'
import { getChapterNavigationModel } from '../utils/readerNavigation'
import BookmarksDialog from './reader/BookmarksDialog'
import BoundaryTransitionDialog from './reader/BoundaryTransitionDialog'
import ChapterNavigation from './reader/ChapterNavigation'
import ReaderHeader from './reader/ReaderHeader'
import ReaderLocationBar from './reader/ReaderLocationBar'
import ReaderStatusRegion from './reader/ReaderStatusRegion'
import ReaderSurface from './reader/ReaderSurface'

function BibleViewer() {
  const location = useLocation()
  const [selectedBook, setSelectedBook] = useState(bibleData[0])
  const [chapter, setChapter] = useState(1)
  const [content, setContent] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [bookmarks, setBookmarks] = useState(() => loadStoredBookmarks(localStorage))
  const [statusMessage, setStatusMessage] = useState('')
  const [boundaryNotice, setBoundaryNotice] = useState('')
  const [isBookmarksOpen, setIsBookmarksOpen] = useState(false)
  const [pendingTransition, setPendingTransition] = useState(null)
  const [isLocationResolved, setIsLocationResolved] = useState(false)

  const navigation = useMemo(
    () =>
      getChapterNavigationModel({
        books: bibleData,
        bookName: selectedBook.name,
        chapter,
      }),
    [chapter, selectedBook.name]
  )

  useEffect(() => {
    setBookmarks(loadStoredBookmarks(localStorage))
  }, [])

  useEffect(() => {
    const resolvedPosition = resolveReadingPosition({
      bookmarkId: location.state?.bookmarkId,
      bookmarks: loadStoredBookmarks(localStorage),
      storedProgress: loadStoredReadingProgress(localStorage, bibleData),
      books: bibleData,
      fallbackBook: bibleData[0],
    })

    const resolvedBook = bibleData.find((item) => item.name === resolvedPosition.bookName) || bibleData[0]

    setSelectedBook(resolvedBook)
    setChapter(resolvedPosition.chapter)

    if (resolvedPosition.source === 'bookmark') {
      setStatusMessage(`${resolvedPosition.bookName} ${resolvedPosition.chapter}장으로 이어 읽기를 준비했습니다.`)
    } else if (resolvedPosition.source === 'progress') {
      setStatusMessage(`${resolvedPosition.bookName} ${resolvedPosition.chapter}장에서 이어 읽기를 복원했습니다.`)
    }

    setIsLocationResolved(true)
  }, [location.state])

  useEffect(() => {
    if (!isLocationResolved) return

    const controller = new AbortController()

    const loadChapter = async () => {
      setLoading(true)
      setError(null)
      setContent([])

      try {
        const result = await loadBibleChapter(selectedBook.name, chapter, {
          signal: controller.signal,
        })
        setContent(result.verses)
      } catch (loadError) {
        if (loadError.name === 'AbortError') return
        console.error('Failed to load bible data:', loadError)
        setError('성경 데이터를 불러오는데 실패했습니다.')
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false)
        }
      }
    }

    loadChapter()
    setBoundaryNotice('')
    window.scrollTo({ top: 0, behavior: 'smooth' })

    return () => controller.abort()
  }, [chapter, isLocationResolved, selectedBook])

  useEffect(() => {
    if (!isLocationResolved) return

    saveReadingProgress(
      localStorage,
      {
        bookName: selectedBook.name,
        chapter,
      },
      bibleData
    )
  }, [chapter, isLocationResolved, selectedBook])

  const persistBookmarks = (nextBookmarks) => {
    if (!saveStoredBookmarks(localStorage, nextBookmarks)) {
      setStatusMessage('북마크를 저장하지 못했습니다. 브라우저 저장 공간을 확인해 주세요.')
      return false
    }

    setBookmarks(nextBookmarks)
    return true
  }

  const saveBookmark = () => {
    const now = new Date()
    const newBookmark = createBookmarkEntry({
      id: Date.now(),
      bookName: selectedBook.name,
      chapter,
      now,
    })
    if (persistBookmarks([newBookmark, ...bookmarks])) {
      setStatusMessage(`북마크를 저장했습니다: ${selectedBook.name} ${chapter}장`)
    }
  }

  const loadBookmark = (bookmark) => {
    const book = bibleData.find((item) => item.name === bookmark.bookName)
    if (!book) return
    setSelectedBook(book)
    setChapter(bookmark.chapter)
    setIsBookmarksOpen(false)
    setStatusMessage(`${bookmark.bookName} ${bookmark.chapter}장으로 이동했습니다.`)
  }

  const deleteBookmark = (id) => {
    const target = bookmarks.find((item) => item.id === id)
    const didPersist = persistBookmarks(removeBookmarkById(bookmarks, id))
    if (target && didPersist) {
      setStatusMessage(`${target.bookName} ${target.chapter}장 북마크를 삭제했습니다.`)
    }
  }

  const requestChapterMove = (direction) => {
    const target = navigation?.[direction]
    if (!target) return

    if (target.kind === 'move') {
      setChapter(target.targetChapter)
      return
    }

    if (target.kind === 'blocked') {
      setBoundaryNotice(target.boundaryNotice)
      return
    }

    const targetBook = bibleData.find((book) => book.name === target.targetBookName)
    if (targetBook) {
      setPendingTransition({
        direction,
        targetBook,
        targetChapter: target.targetChapter,
        message: target.confirmMessage,
      })
    }
  }

  const changeBook = (bookName) => {
    const book = bibleData.find((item) => item.name === bookName)
    if (!book) return

    setSelectedBook(book)
    setChapter(1)
    setStatusMessage(`${book.name} 1장으로 이동했습니다.`)
  }

  const confirmTransition = () => {
    if (!pendingTransition) return
    setSelectedBook(pendingTransition.targetBook)
    setChapter(pendingTransition.targetChapter)
    setPendingTransition(null)
  }

  return (
    <div className="bible-viewer grid gap-6">
      <Card className="overflow-hidden">
        <ReaderHeader
          onOpenBookmarks={() => setIsBookmarksOpen(true)}
          onSaveBookmark={saveBookmark}
        />
        <CardContent className="grid gap-5">
          <ReaderLocationBar
            selectedBook={selectedBook}
            chapter={chapter}
            onBookChange={changeBook}
            onChapterChange={setChapter}
            onRequestMove={requestChapterMove}
          />
          <ReaderStatusRegion
            statusMessage={statusMessage}
            boundaryNotice={boundaryNotice}
            error={error}
          />
          <ReaderSurface
            selectedBook={selectedBook}
            chapter={chapter}
            content={content}
            loading={loading}
          />
          <ChapterNavigation onRequestMove={requestChapterMove} />
        </CardContent>
      </Card>

      <BoundaryTransitionDialog
        transition={pendingTransition}
        onCancel={() => setPendingTransition(null)}
        onConfirm={confirmTransition}
      />
      <BookmarksDialog
        open={isBookmarksOpen}
        bookmarks={bookmarks}
        onOpenChange={setIsBookmarksOpen}
        onLoad={loadBookmark}
        onDelete={deleteBookmark}
      />
    </div>
  )
}

export default BibleViewer
