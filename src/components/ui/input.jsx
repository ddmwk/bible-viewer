import { forwardRef } from 'react'
import { cn } from '@/lib/utils'

const Input = forwardRef(function Input({ className, type = 'text', ...props }, ref) {
  return (
    <input
      ref={ref}
      type={type}
      className={cn(
        'flex h-11 w-full rounded-[var(--radius-sm)] border border-[color:var(--border-subtle)] bg-[var(--bg-elevated)] px-3 py-2 text-base text-[var(--fg-primary)] placeholder:text-[var(--fg-muted)] shadow-none transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring-focus)] disabled:cursor-not-allowed disabled:opacity-50 md:text-sm',
        className
      )}
      {...props}
    />
  )
})

export { Input }
