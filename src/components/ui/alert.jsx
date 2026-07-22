import { forwardRef } from 'react'
import { AlertCircle } from 'lucide-react'
import { cn } from '@/lib/utils'

const Alert = forwardRef(function Alert({ className, children, ...props }, ref) {
  return (
    <div
      ref={ref}
      role="alert"
      className={cn(
        'relative grid grid-cols-[auto_1fr] gap-x-3 rounded-[var(--radius-sm)] border border-[color:var(--border-subtle)] bg-[color:color-mix(in_srgb,var(--accent-primary)_7%,var(--bg-panel))] px-4 py-3 text-sm text-[var(--fg-primary)]',
        className
      )}
      {...props}
    >
      <AlertCircle className="mt-0.5 h-4 w-4 text-[var(--accent-primary)]" aria-hidden="true" />
      <div className="grid gap-1">{children}</div>
    </div>
  )
})

const AlertTitle = forwardRef(function AlertTitle({ className, ...props }, ref) {
  return <h5 ref={ref} className={cn('font-medium leading-none tracking-tight', className)} {...props} />
})

const AlertDescription = forwardRef(function AlertDescription({ className, ...props }, ref) {
  return <div ref={ref} className={cn('text-[var(--fg-secondary)] [&_p]:leading-relaxed', className)} {...props} />
})

export { Alert, AlertTitle, AlertDescription }
