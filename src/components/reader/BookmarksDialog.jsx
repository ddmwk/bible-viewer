import { BookMarked, Bookmark, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

function BookmarksDialog({ open, bookmarks, onOpenChange, onLoad, onDelete }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
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
                    <p className="text-lg font-semibold text-[var(--fg-primary)]">
                      {bookmark.bookName} {bookmark.chapter}장
                    </p>
                    <p className="mt-1 text-sm text-[var(--fg-secondary)]">
                      {bookmark.date} {bookmark.time || ''}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      variant="secondary"
                      onClick={() => onLoad(bookmark)}
                      aria-label={`${bookmark.bookName} ${bookmark.chapter}장으로 이동`}
                    >
                      <Bookmark className="h-4 w-4" />
                      이동
                    </Button>
                    <Button
                      variant="ghost"
                      onClick={() => onDelete(bookmark.id)}
                      aria-label={`${bookmark.bookName} ${bookmark.chapter}장 북마크 삭제`}
                    >
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
  )
}

export default BookmarksDialog
