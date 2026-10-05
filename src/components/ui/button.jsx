import { forwardRef } from 'react'
import { cn } from '@/lib/utils'

const buttonVariants = {
  primary: 'bg-[var(--accent-primary)] text-[var(--accent-foreground)] shadow-none hover:brightness-[1.04]',
  secondary: 'bg-[var(--bg-elevated)] text-[var(--fg-primary)] border border-[color:var(--border-subtle)] hover:bg-[color:var(--bg-panel)]',
  ghost: 'bg-transparent text-[var(--fg-secondary)] hover:bg-[color:color-mix(in_srgb,var(--accent-primary)_10%,transparent)] hover:text-[var(--fg-primary)]',
  destructive: 'bg-[var(--accent-danger)] text-white hover:brightness-[1.03]'
}

const sizeVariants = {
  default: 'h-11 px-4 py-2 text-sm',
  sm: 'h-9 px-3 text-sm',
  lg: 'h-12 px-5 text-base',
  icon: 'h-10 w-10 p-0'
}

const Button = forwardRef(function Button(
  { className, variant = 'primary', size = 'default', type = 'button', ...props },
  ref
) {
  return (
    <button
      ref={ref}
      type={type}
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-[var(--radius-sm)] font-medium transition duration-150 ease-out disabled:pointer-events-none disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring-focus)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg-canvas)]',
        buttonVariants[variant],
        sizeVariants[size],
        className
      )}
      {...props}
    />
  )
})

export { Button }
