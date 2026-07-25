import { PanelRightOpen, Pin } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

function ReaderHeader({ onOpenBookmarks, onSaveBookmark }) {
  return (
    <CardHeader className="gap-3 pb-4">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <CardTitle className="text-2xl">성경 읽기</CardTitle>
          <CardDescription className="mt-2 leading-6">
            긴 읽기에 적합한 툴바와 본문 레이아웃으로 정리했습니다.
          </CardDescription>
        </div>
        <div className="flex flex-wrap gap-3">
          <Button variant="secondary" onClick={onOpenBookmarks}>
            <PanelRightOpen className="h-4 w-4" />
            북마크 목록
          </Button>
          <Button onClick={onSaveBookmark}>
            <Pin className="h-4 w-4" />
            현재 장 저장
          </Button>
        </div>
      </div>
    </CardHeader>
  )
}

export default ReaderHeader
