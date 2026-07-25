import { ChevronLeft, MoveRight } from 'lucide-react'
import { Button } from '@/components/ui/button'

function ChapterNavigation({ onRequestMove }) {
  return (
    <div className="flex flex-wrap justify-between gap-3">
      <Button
        variant="secondary"
        size="lg"
        onClick={() => onRequestMove('prev')}
      >
        <ChevronLeft className="h-4 w-4" />
        이전 장
      </Button>
      <Button
        variant="secondary"
        size="lg"
        onClick={() => onRequestMove('next')}
      >
        다음 장
        <MoveRight className="h-4 w-4" />
      </Button>
    </div>
  )
}

export default ChapterNavigation
