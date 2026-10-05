import { ChevronLeft, MoveRight } from 'lucide-react'
import { Button } from '@/components/ui/button'

function ChapterNavigation({ onRequestMove }) {
  return (
    <nav className="reader-chapter-navigation" aria-label="장 이동">
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
    </nav>
  )
}

export default ChapterNavigation
