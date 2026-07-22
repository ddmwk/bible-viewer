import {
  cloneElement,
  createContext,
  isValidElement,
  useContext,
  useEffect,
  useId,
  useMemo,
  useRef,
} from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'

const DialogContext = createContext(null)

function useDialogContext(name) {
  const context = useContext(DialogContext)
  if (!context) {
    throw new Error(`${name} must be used within Dialog`)
  }
  return context
}

function Dialog({ open, onOpenChange, children }) {
  const titleId = useId()
  const descriptionId = useId()

  const value = useMemo(
    () => ({ open, onOpenChange, titleId, descriptionId }),
    [descriptionId, onOpenChange, open, titleId]
  )

  return <DialogContext.Provider value={value}>{children}</DialogContext.Provider>
}

function DialogTrigger({ children, ...props }) {
  const { onOpenChange } = useDialogContext('DialogTrigger')

  if (!isValidElement(children)) {
    return null
  }

  return cloneElement(children, {
    ...props,
    ...children.props,
    onClick: (event) => {
      children.props.onClick?.(event)
      if (!event.defaultPrevented) onOpenChange(true)
    },
  })
}

function DialogClose({ children, ...props }) {
  const { onOpenChange } = useDialogContext('DialogClose')

  if (!isValidElement(children)) {
    return null
  }

  return cloneElement(children, {
    ...props,
    ...children.props,
    onClick: (event) => {
      children.props.onClick?.(event)
      if (!event.defaultPrevented) onOpenChange(false)
    },
  })
}

const focusableSelectors = [
  'a[href]',
  'button:not([disabled])',
  'textarea:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',')

function DialogContent({ className, children, showClose = true, side = 'center', ...props }) {
  const { open, onOpenChange, titleId, descriptionId } = useDialogContext('DialogContent')
  const localRef = useRef(null)

  useEffect(() => {
    if (!open) return undefined

    const previousActive = document.activeElement
    const node = localRef.current
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    const focusable = node?.querySelectorAll(focusableSelectors)
    const firstTarget = focusable?.[0] ?? node
    firstTarget?.focus()

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        onOpenChange(false)
        return
      }

      if (event.key !== 'Tab' || !node) return

      const elements = Array.from(node.querySelectorAll(focusableSelectors))
      if (!elements.length) {
        event.preventDefault()
        node.focus()
        return
      }

      const first = elements[0]
      const last = elements[elements.length - 1]

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }

    document.addEventListener('keydown', handleKeyDown)

    return () => {
      document.body.style.overflow = previousOverflow
      document.removeEventListener('keydown', handleKeyDown)
      if (previousActive instanceof HTMLElement) previousActive.focus()
    }
  }, [onOpenChange, open])

  if (!open) return null

  const sideClassName =
    side === 'left'
      ? 'mr-auto h-full max-h-none w-full max-w-sm rounded-none rounded-r-[var(--radius-lg)]'
      : 'my-auto w-full max-w-lg rounded-[var(--radius-lg)]'

  return createPortal(
    <div className="fixed inset-0 z-50 flex bg-black/45 backdrop-blur-[2px]" onMouseDown={() => onOpenChange(false)}>
      <div
        ref={localRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        tabIndex={-1}
        className={cn(
          'relative border border-[color:var(--border-strong)] bg-[var(--bg-panel)] p-6 text-[var(--fg-primary)] shadow-[var(--shadow-raised)] focus:outline-none',
          sideClassName,
          className
        )}
        onMouseDown={(event) => event.stopPropagation()}
        {...props}
      >
        {showClose ? (
          <button
            type="button"
            className="absolute right-4 top-4 inline-flex h-10 w-10 items-center justify-center rounded-full text-[var(--fg-muted)] transition hover:bg-[color:color-mix(in_srgb,var(--fg-primary)_6%,transparent)] hover:text-[var(--fg-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring-focus)]"
            onClick={() => onOpenChange(false)}
            aria-label="닫기"
          >
            <X className="h-5 w-5" />
          </button>
        ) : null}
        {children}
      </div>
    </div>,
    document.body
  )
}

function DialogHeader({ className, ...props }) {
  return <div className={cn('mb-5 flex flex-col gap-2 pr-10', className)} {...props} />
}

function DialogTitle({ className, ...props }) {
  const { titleId } = useDialogContext('DialogTitle')
  return <h2 id={titleId} className={cn('font-[(family-name:var(--font-display))] text-xl font-semibold', className)} {...props} />
}

function DialogDescription({ className, ...props }) {
  const { descriptionId } = useDialogContext('DialogDescription')
  return <p id={descriptionId} className={cn('text-sm text-[var(--fg-secondary)]', className)} {...props} />
}

function DialogFooter({ className, ...props }) {
  return <div className={cn('mt-6 flex flex-wrap items-center justify-end gap-3', className)} {...props} />
}

export {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
}
