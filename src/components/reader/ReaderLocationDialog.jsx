import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import ReaderLocationBar from './ReaderLocationBar'

function ReaderLocationDialog({
  open,
  selectedBook,
  chapter,
  onOpenChange,
  onBookChange,
  onChapterChange,
  onRequestMove,
}) {
  const handleBookChange = (bookName) => {
    onBookChange(bookName)
  }

  const handleChapterChange = (nextChapter) => {
    onChapterChange(nextChapter)
  }

  const handleRequestMove = (direction) => {
    onRequestMove(direction)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="reader-dialog__content" aria-label="본문 위치 변경">
        <DialogHeader>
          <DialogTitle>본문 위치 변경</DialogTitle>
          <DialogDescription>책과 장을 고르거나 이전·다음 장으로 바로 이동할 수 있습니다.</DialogDescription>
        </DialogHeader>
        <ReaderLocationBar
          selectedBook={selectedBook}
          chapter={chapter}
          onBookChange={handleBookChange}
          onChapterChange={handleChapterChange}
          onRequestMove={handleRequestMove}
        />
      </DialogContent>
    </Dialog>
  )
}

export default ReaderLocationDialog
