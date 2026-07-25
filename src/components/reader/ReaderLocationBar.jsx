import { ChevronLeft, ChevronRight } from 'lucide-react'
import BibleBookSelect from '../BibleBookSelect'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'

function ReaderLocationBar({
  selectedBook,
  chapter,
  onBookChange,
  onChapterChange,
  onRequestMove,
}) {
  return (
    <div className="sticky top-4 z-10 rounded-[var(--radius-md)] border border-[color:var(--border-subtle)] bg-[color:color-mix(in_srgb,var(--bg-panel)_94%,transparent)] p-4 shadow-[var(--shadow-soft)] backdrop-blur">
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_120px_auto] xl:items-end">
        <BibleBookSelect
          value={selectedBook.name}
          onChange={onBookChange}
          idPrefix="viewer-book"
          legend="읽을 책 선택"
        />

        <div className="grid gap-2">
          <Label htmlFor="viewer-chapter">장 선택</Label>
          <select
            id="viewer-chapter"
            value={chapter}
            onChange={(event) => onChapterChange(Number(event.target.value))}
          >
            {Array.from({ length: selectedBook.chapters }, (_, index) => index + 1).map((number) => (
              <option key={number} value={number}>
                {number}장
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-wrap gap-3 xl:justify-end">
          <Button
            variant="secondary"
            onClick={() => onRequestMove('prev')}
          >
            <ChevronLeft className="h-4 w-4" />
            이전
          </Button>
          <Button
            variant="secondary"
            onClick={() => onRequestMove('next')}
          >
            다음
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}

export default ReaderLocationBar
