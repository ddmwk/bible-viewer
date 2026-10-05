import { Expand, MapPinned, PanelRightOpen, Pin, Settings2, Shrink } from 'lucide-react'
import { Button } from '@/components/ui/button'

function ReaderHeader({
  isFocusMode,
  onOpenLocation,
  onOpenBookmarks,
  onOpenSettings,
  onSaveBookmark,
  onEnterFocusMode,
  onExitFocusMode,
}) {
  return (
    <header className="reader-toolbar" aria-label="읽기 도구">
      <h2 className="sr-only">읽기 도구</h2>
      <div className="reader-toolbar__actions">
        <Button variant="ghost" onClick={onOpenLocation}>
          <MapPinned className="h-4 w-4" />
          본문 위치 변경
        </Button>
        <Button variant="ghost" onClick={onOpenBookmarks}>
          <PanelRightOpen className="h-4 w-4" />
          북마크 목록
        </Button>
        <Button variant="ghost" onClick={onOpenSettings}>
          <Settings2 className="h-4 w-4" />
          읽기 설정
        </Button>
        <Button variant="ghost" onClick={onSaveBookmark}>
          <Pin className="h-4 w-4" />
          현재 장 저장
        </Button>
        <Button variant={isFocusMode ? 'primary' : 'ghost'} onClick={isFocusMode ? onExitFocusMode : onEnterFocusMode}>
          {isFocusMode ? <Shrink className="h-4 w-4" /> : <Expand className="h-4 w-4" />}
          {isFocusMode ? '집중 모드 종료' : '집중 모드'}
        </Button>
      </div>
    </header>
  )
}

export default ReaderHeader
