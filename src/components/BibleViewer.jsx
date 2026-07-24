import { useEffect, useMemo, useState } from 'react'
import { useLocation } from 'react-router-dom'
import {
  BookMarked,
  BookOpen,
  Bookmark,
  ChevronLeft,
  ChevronRight,
  LoaderCircle,
  MoveRight,
  PanelRightOpen,
  Pin,
  Trash2,
} from 'lucide-react'
import { bibleData } from '../data/bibleData'
import BibleBookSelect from './BibleBookSelect'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import {
  loadStoredReadingProgress,
  resolveReadingPosition,
  saveReadingProgress,
} from '../utils/readingProgress'
import { loadBibleChapter } from '../data/bibleRepository'

function loadStoredBookmarks() {
  try {
    const parsed = JSON.parse(localStorage.getItem('bible_bookmarks') || '[]')
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function BibleViewer() {
  const location = useLocation()
  const [selectedBook, setSelectedBook] = useState(bibleData[0])
  const [chapter, setChapter] = useState(1)
  const [content, setContent] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [bookmarks, setBookmarks] = useState(() => loadStoredBookmarks())
  const [statusMessage, setStatusMessage] = useState('')
  const [boundaryNotice, setBoundaryNotice] = useState('')
  const [isBookmarksOpen, setIsBookmarksOpen] = useState(false)
  const [pendingTransition, setPendingTransition] = useState(null)
  const [isLocationResolved, setIsLocationResolved] = useState(false)

  const currentBookIndex = useMemo(
    () => bibleData.findIndex((book) => book.name === selectedBook.name),
    [selectedBook.name]
  )
  const isFirstBoundary = currentBookIndex === 0 && chapter === 1
  const isLastBoundary = currentBookIndex === bibleData.length - 1 && chapter === selectedBook.chapters

  useEffect(() => {
    setBookmarks(loadStoredBookmarks())
  }, [])

  useEffect(() => {
    const resolvedPosition = resolveReadingPosition({
      bookmarkId: location.state?.bookmarkId,
      bookmarks: loadStoredBookmarks(),
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
    setBookmarks(nextBookmarks)
    localStorage.setItem('bible_bookmarks', JSON.stringify(nextBookmarks))
  }

  const saveBookmark = () => {
    const now = new Date()
    const newBookmark = {
      id: Date.now(),
      bookName: selectedBook.name,
      chapter,
      date: now.toLocaleDateString(),
      time: now.toLocaleTimeString('ko-KR', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      }),
    }
    persistBookmarks([newBookmark, ...bookmarks])
    setStatusMessage(`북마크를 저장했습니다: ${selectedBook.name} ${chapter}장`)
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
    persistBookmarks(bookmarks.filter((item) => item.id !== id))
    if (target) {
      setStatusMessage(`${target.bookName} ${target.chapter}장 북마크를 삭제했습니다.`)
    }
  }

  const requestChapterMove = (direction) => {
    if (direction === 'next') {
      if (chapter < selectedBook.chapters) {
        setChapter((current) => current + 1)
        return
      }

      if (currentBookIndex < bibleData.length - 1) {
        const nextBook = bibleData[currentBookIndex + 1]
        setPendingTransition({
          direction,
          targetBook: nextBook,
          targetChapter: 1,
          message: `${selectedBook.name}을 마쳤습니다. ${nextBook.name} 1장으로 이동할까요?`,
        })
      } else {
        setBoundaryNotice('성경의 마지막 장입니다. 더 다음 장은 없습니다.')
      }
      return
    }

    if (chapter > 1) {
      setChapter((current) => current - 1)
      return
    }

    if (currentBookIndex > 0) {
      const previousBook = bibleData[currentBookIndex - 1]
      setPendingTransition({
        direction,
        targetBook: previousBook,
        targetChapter: previousBook.chapters,
        message: `${selectedBook.name} 첫 장입니다. ${previousBook.name} ${previousBook.chapters}장으로 이동할까요?`,
      })
    } else {
      setBoundaryNotice('성경의 첫 장입니다. 더 이전 장은 없습니다.')
    }
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
        <CardHeader className="gap-3 pb-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <CardTitle className="text-2xl">성경 읽기</CardTitle>
              <CardDescription className="mt-2 leading-6">
                긴 읽기에 적합한 툴바와 본문 레이아웃으로 정리했습니다.
              </CardDescription>
            </div>
            <div className="flex flex-wrap gap-3">
              <Button variant="secondary" onClick={() => setIsBookmarksOpen(true)}>
                <PanelRightOpen className="h-4 w-4" />
                북마크 목록
              </Button>
              <Button onClick={saveBookmark}>
                <Pin className="h-4 w-4" />
                현재 장 저장
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="grid gap-5">
          <div className="sticky top-4 z-10 rounded-[var(--radius-md)] border border-[color:var(--border-subtle)] bg-[color:color-mix(in_srgb,var(--bg-panel)_94%,transparent)] p-4 shadow-[var(--shadow-soft)] backdrop-blur">
            <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_120px_auto] xl:items-end">
              <BibleBookSelect
                value={selectedBook.name}
                onChange={(bookName) => {
                  const book = bibleData.find((item) => item.name === bookName)
                  if (book) {
                    setSelectedBook(book)
                    setChapter(1)
                    setStatusMessage(`${book.name} 1장으로 이동했습니다.`)
                  }
                }}
                idPrefix="viewer-book"
                legend="읽을 책 선택"
              />

              <div className="grid gap-2">
                <Label htmlFor="viewer-chapter">장 선택</Label>
                <select
                  id="viewer-chapter"
                  value={chapter}
                  onChange={(event) => setChapter(Number(event.target.value))}
                >
                  {Array.from({ length: selectedBook.chapters }, (_, index) => index + 1).map((number) => (
                    <option key={number} value={number}>
                      {number}장
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex flex-wrap gap-3 xl:justify-end">
                <Button variant="secondary" onClick={() => requestChapterMove('prev')} aria-disabled={isFirstBoundary}>
                  <ChevronLeft className="h-4 w-4" />
                  이전
                </Button>
                <Button variant="secondary" onClick={() => requestChapterMove('next')} aria-disabled={isLastBoundary}>
                  다음
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>

          <div aria-live="polite" className="grid gap-3">
            {statusMessage ? (
              <Alert>
                <AlertTitle>읽기 상태</AlertTitle>
                <AlertDescription>{statusMessage}</AlertDescription>
              </Alert>
            ) : null}
            {boundaryNotice ? (
              <Alert className="border-[color:color-mix(in_srgb,var(--accent-danger)_25%,var(--border-subtle))] bg-[color:color-mix(in_srgb,var(--accent-danger)_8%,var(--bg-panel))]">
                <AlertTitle>이동할 수 없는 경계입니다.</AlertTitle>
                <AlertDescription>{boundaryNotice}</AlertDescription>
              </Alert>
            ) : null}
            {error ? (
              <Alert className="border-[color:color-mix(in_srgb,var(--accent-danger)_25%,var(--border-subtle))] bg-[color:color-mix(in_srgb,var(--accent-danger)_8%,var(--bg-panel))]">
                <AlertTitle>본문을 불러오지 못했습니다.</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            ) : null}
          </div>

          <Card className="border-[color:var(--border-subtle)] bg-[color:color-mix(in_srgb,var(--bg-elevated)_72%,transparent)] shadow-none">
            <CardHeader className="border-b border-[color:var(--border-subtle)] pb-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--fg-muted)]">Scripture</p>
                  <CardTitle className="mt-2 text-3xl">{selectedBook.name} {chapter}장</CardTitle>
                </div>
                <div className="flex items-center gap-2 text-sm text-[var(--fg-secondary)]">
                  <BookOpen className="h-4 w-4" aria-hidden="true" />
                  {content.length}절
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-6">
              {loading ? (
                <div className="flex min-h-[320px] items-center justify-center gap-3 text-[var(--fg-secondary)]">
                  <LoaderCircle className="h-5 w-5 animate-spin" aria-hidden="true" />
                  본문을 불러오는 중입니다.
                </div>
              ) : content.length ? (
                <div className="mx-auto max-w-4xl space-y-5 font-[(family-name:var(--font-scripture))] text-[1.05em] leading-[1.95] text-[var(--fg-primary)]">
                  {content.map((verse, index) => (
                    <p
                      key={`${selectedBook.name}-${chapter}-${index + 1}`}
                      className="grid grid-cols-[auto_1fr] items-start gap-4 rounded-[var(--radius-sm)] px-2 py-1"
                    >
                      <span className="select-none text-xs font-semibold text-[var(--fg-muted)]">{index + 1}</span>
                      <span>{verse}</span>
                    </p>
                  ))}
                </div>
              ) : (
                <div className="flex min-h-[280px] items-center justify-center text-sm text-[var(--fg-secondary)]">
                  표시할 본문이 없습니다.
                </div>
              )}
            </CardContent>
          </Card>

          <div className="flex flex-wrap justify-between gap-3">
            <Button variant="secondary" size="lg" onClick={() => requestChapterMove('prev')} aria-disabled={isFirstBoundary}>
              <ChevronLeft className="h-4 w-4" />
              이전 장
            </Button>
            <Button variant="secondary" size="lg" onClick={() => requestChapterMove('next')} aria-disabled={isLastBoundary}>
              다음 장
              <MoveRight className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      <Dialog open={Boolean(pendingTransition)} onOpenChange={(open) => !open && setPendingTransition(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>권 경계 이동</DialogTitle>
            <DialogDescription>{pendingTransition?.message}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setPendingTransition(null)}>
              머물기
            </Button>
            <Button onClick={confirmTransition}>이동하기</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isBookmarksOpen} onOpenChange={setIsBookmarksOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <BookMarked className="h-5 w-5 text-[var(--accent-primary)]" aria-hidden="true" />
              북마크 목록
            </DialogTitle>
            <DialogDescription>북마크를 눌러 이동하거나 바로 삭제할 수 있습니다.</DialogDescription>
          </DialogHeader>
          <div className="grid max-h-[60vh] gap-3 overflow-y-auto pr-1">
            {bookmarks.length ? (
              bookmarks.map((bookmark) => (
                <Card key={bookmark.id} className="border-[color:var(--border-subtle)] shadow-none">
                  <CardContent className="flex flex-col gap-4 py-5 md:flex-row md:items-center md:justify-between">
                    <div>
                      <p className="text-lg font-semibold text-[var(--fg-primary)]">{bookmark.bookName} {bookmark.chapter}장</p>
                      <p className="mt-1 text-sm text-[var(--fg-secondary)]">{bookmark.date} {bookmark.time || ''}</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button variant="secondary" onClick={() => loadBookmark(bookmark)} aria-label={`${bookmark.bookName} ${bookmark.chapter}장으로 이동`}>
                        <Bookmark className="h-4 w-4" />
                        이동
                      </Button>
                      <Button variant="ghost" onClick={() => deleteBookmark(bookmark.id)} aria-label={`${bookmark.bookName} ${bookmark.chapter}장 북마크 삭제`}>
                        <Trash2 className="h-4 w-4" />
                        삭제
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))
            ) : (
              <div className="rounded-[var(--radius-sm)] border border-dashed border-[color:var(--border-subtle)] px-4 py-10 text-center text-sm text-[var(--fg-secondary)]">
                저장된 북마크가 없습니다. 읽는 중 현재 장 저장을 눌러 보세요.
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default BibleViewer
