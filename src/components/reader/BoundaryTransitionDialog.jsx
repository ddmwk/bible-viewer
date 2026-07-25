import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

function BoundaryTransitionDialog({ transition, onCancel, onConfirm }) {
  return (
    <Dialog open={Boolean(transition)} onOpenChange={(open) => !open && onCancel()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>권 경계 이동</DialogTitle>
          <DialogDescription>{transition?.message}</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="secondary" onClick={onCancel}>
            머물기
          </Button>
          <Button onClick={onConfirm}>이동하기</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default BoundaryTransitionDialog
