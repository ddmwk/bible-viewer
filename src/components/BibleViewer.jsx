import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { bibleData } from '../data/bibleData'
import {
  loadStoredReadingProgress,
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
import {
  loadStoredReaderPosition,
  resolveReaderStartPosition,
  saveReaderPosition,
} from '../utils/readerPosition'
import BookmarksDialog from './reader/BookmarksDialog'
import BoundaryTransitionDialog from './reader/BoundaryTransitionDialog'
import ChapterNavigation from './reader/ChapterNavigation'
import ReaderHeader from './reader/ReaderHeader'
import ReaderLocationDialog from './reader/ReaderLocationDialog'
import ReaderSettingsDialog from './reader/ReaderSettingsDialog'
import ReaderStatusRegion from './reader/ReaderStatusRegion'
import ReaderSurface from './reader/ReaderSurface'

function BibleViewer({
  isFocusMode,
  onEnterFocusMode,
  onExitFocusMode,
  theme,
  fontSize,
  onThemeChange,
  onFontSizeChange,
  onResetFontSize,
  readerPreferences,
  onReaderPreferenceChange,
  readerPreferenceStyle,
  onOverlayChange,
}) {
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
  const [isLocationDialogOpen, setIsLocationDialogOpen] = useState(false)
  const [isSettingsDialogOpen, setIsSettingsDialogOpen] = useState(false)
  const [pendingTransition, setPendingTransition] = useState(null)
  const [isLocationResolved, setIsLocationResolved] = useState(false)
  const [retryNonce, setRetryNonce] = useState(0)
  const [restoredVerseIndex, setRestoredVerseIndex] = useState(null)
  const latestReaderPositionRef = useRef(null)
  const savePositionTimeoutRef = useRef(null)

  const flushReaderPosition = useCallback(() => {
    if (savePositionTimeoutRef.current !== null) {
      window.clearTimeout(savePositionTimeoutRef.current)
      savePositionTimeoutRef.current = null
    }

    const latestPosition = latestReaderPositionRef.current
    if (!latestPosition) return

    saveReaderPosition(localStorage, latestPosition, bibleData, {
      verseCount: latestPosition.verseCount,
    })
    latestReaderPositionRef.current = null
  }, [])

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
    flushReaderPosition()

    const storedProgress = loadStoredReadingProgress(localStorage, bibleData)
    const resolvedPosition = resolveReaderStartPosition({
      bookmarkId: location.state?.bookmarkId,
      bookmarks: loadStoredBookmarks(localStorage),
      storedProgress,
      storedPosition: loadStoredReaderPosition(localStorage, bibleData),
      books: bibleData,
      fallbackBook: bibleData[0],
    })

    const resolvedBook = bibleData.find((item) => item.name === resolvedPosition.bookName) || bibleData[0]

    setSelectedBook(resolvedBook)
    setChapter(resolvedPosition.chapter)
    setRestoredVerseIndex(resolvedPosition.verseIndex)

    if (resolvedPosition.source === 'bookmark') {
      setStatusMessage(`${resolvedPosition.bookName} ${resolvedPosition.chapter}장으로 이어 읽기를 준비했습니다.`)
    } else if (resolvedPosition.source === 'position') {
      setStatusMessage(`${resolvedPosition.bookName} ${resolvedPosition.chapter}장의 읽던 위치를 확인하고 있습니다.`)
    } else if (resolvedPosition.source === 'progress') {
      setStatusMessage(`${resolvedPosition.bookName} ${resolvedPosition.chapter}장에서 이어 읽기를 복원했습니다.`)
    }

    setIsLocationResolved(true)
  }, [flushReaderPosition, location.state])

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

    return () => controller.abort()
  }, [chapter, isLocationResolved, retryNonce, selectedBook])

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

  useEffect(() => {
    if (loading || error || !content.length || !Number.isInteger(restoredVerseIndex)) return

    if (restoredVerseIndex >= content.length) {
      setRestoredVerseIndex(null)
      setStatusMessage(`${selectedBook.name} ${chapter}장에서 이어 읽기를 복원했습니다.`)
      return
    }

    setStatusMessage(
      `${selectedBook.name} ${chapter}장 ${restoredVerseIndex + 1}절 부근에서 이어 읽습니다.`
    )
  }, [
    chapter,
    content.length,
    error,
    loading,
    restoredVerseIndex,
    selectedBook.name,
  ])

  const handleActiveVerseChange = useCallback(
    (verseIndex) => {
      if (!Number.isInteger(verseIndex) || verseIndex < 0 || verseIndex >= content.length) return

      latestReaderPositionRef.current = {
        bookName: selectedBook.name,
        chapter,
        verseIndex,
        verseCount: content.length,
      }

      if (savePositionTimeoutRef.current === null) {
        savePositionTimeoutRef.current = window.setTimeout(flushReaderPosition, 500)
      }
    },
    [chapter, content.length, flushReaderPosition, selectedBook.name]
  )

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') flushReaderPosition()
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange)
  }, [flushReaderPosition])

  useEffect(
    () => () => {
      flushReaderPosition()
    },
    [flushReaderPosition]
  )

  const moveReader = ({ book, nextChapter, verseIndex = null, statusMessage: nextStatusMessage, closeBookmarks = false }) => {
    flushReaderPosition()
    setSelectedBook(book)
    setChapter(nextChapter)
    setRestoredVerseIndex(verseIndex)

    if (closeBookmarks) {
      setIsBookmarksOpen(false)
    }

    if (nextStatusMessage) {
      setStatusMessage(nextStatusMessage)
    }
  }

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
    moveReader({
      book,
      nextChapter: bookmark.chapter,
      statusMessage: `${bookmark.bookName} ${bookmark.chapter}장으로 이동했습니다.`,
      closeBookmarks: true,
    })
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
      moveReader({
        book: selectedBook,
        nextChapter: target.targetChapter,
      })
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

    moveReader({
      book,
      nextChapter: 1,
      statusMessage: `${book.name} 1장으로 이동했습니다.`,
    })
  }

  const confirmTransition = () => {
    if (!pendingTransition) return
    moveReader({
      book: pendingTransition.targetBook,
      nextChapter: pendingTransition.targetChapter,
    })
    setPendingTransition(null)
  }

  const retryLoad = () => {
    setRetryNonce((current) => current + 1)
  }

  useEffect(() => {
    onOverlayChange(Boolean(isBookmarksOpen || isLocationDialogOpen || isSettingsDialogOpen || pendingTransition))

    return () => onOverlayChange(false)
  }, [isBookmarksOpen, isLocationDialogOpen, isSettingsDialogOpen, onOverlayChange, pendingTransition])

  return (
    <div className={`bible-viewer ${isFocusMode ? 'bible-viewer--focus' : ''}`} style={readerPreferenceStyle}>
      <ReaderHeader
        isFocusMode={isFocusMode}
        onOpenLocation={() => setIsLocationDialogOpen(true)}
        onOpenBookmarks={() => setIsBookmarksOpen(true)}
        onOpenSettings={() => setIsSettingsDialogOpen(true)}
        onSaveBookmark={saveBookmark}
        onEnterFocusMode={onEnterFocusMode}
        onExitFocusMode={onExitFocusMode}
      />
      <ReaderStatusRegion
        statusMessage={statusMessage}
        boundaryNotice={boundaryNotice}
      />
      <ReaderSurface
        selectedBook={selectedBook}
        chapter={chapter}
        content={content}
        loading={loading}
        error={error}
        restoredVerseIndex={restoredVerseIndex}
        onActiveVerseChange={handleActiveVerseChange}
        onRetry={retryLoad}
      />
      <ChapterNavigation onRequestMove={requestChapterMove} />

      <BoundaryTransitionDialog
        transition={pendingTransition}
        onCancel={() => setPendingTransition(null)}
        onConfirm={confirmTransition}
      />
      <ReaderLocationDialog
        open={isLocationDialogOpen}
        selectedBook={selectedBook}
        chapter={chapter}
        onOpenChange={setIsLocationDialogOpen}
        onBookChange={changeBook}
        onChapterChange={(nextChapter) =>
          moveReader({
            book: selectedBook,
            nextChapter,
          })}
        onRequestMove={requestChapterMove}
      />
      <BookmarksDialog
        open={isBookmarksOpen}
        bookmarks={bookmarks}
        onOpenChange={setIsBookmarksOpen}
        onLoad={loadBookmark}
        onDelete={deleteBookmark}
      />
      <ReaderSettingsDialog
        open={isSettingsDialogOpen}
        onOpenChange={setIsSettingsDialogOpen}
        theme={theme}
        fontSize={fontSize}
        onThemeChange={onThemeChange}
        onFontSizeChange={onFontSizeChange}
        onResetFontSize={onResetFontSize}
        readerPreferences={readerPreferences}
        onReaderPreferenceChange={onReaderPreferenceChange}
      />
    </div>
  )
}

export default BibleViewer
