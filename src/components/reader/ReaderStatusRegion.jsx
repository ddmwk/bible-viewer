import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'

const DANGER_ALERT_CLASS =
  'border-[color:color-mix(in_srgb,var(--accent-danger)_25%,var(--border-subtle))] bg-[color:color-mix(in_srgb,var(--accent-danger)_8%,var(--bg-panel))]'

function ReaderStatusRegion({ statusMessage, boundaryNotice }) {
  return (
    <div aria-live="polite" className="grid gap-3">
      {statusMessage ? (
        <Alert>
          <AlertTitle>읽기 상태</AlertTitle>
          <AlertDescription>{statusMessage}</AlertDescription>
        </Alert>
      ) : null}
      {boundaryNotice ? (
        <Alert className={DANGER_ALERT_CLASS}>
          <AlertTitle>이동할 수 없는 경계입니다.</AlertTitle>
          <AlertDescription>{boundaryNotice}</AlertDescription>
        </Alert>
      ) : null}
    </div>
  )
}

export default ReaderStatusRegion
