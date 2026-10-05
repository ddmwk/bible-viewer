import { forwardRef } from 'react'
import { cn } from '@/lib/utils'

const Card = forwardRef(function Card({ className, ...props }, ref) {
  return (
    <div
      ref={ref}
      data-slot="card"
      className={cn(
        'rounded-[var(--radius-md)] border border-[color:var(--border-subtle)] bg-[var(--bg-panel)] text-[var(--fg-primary)] shadow-none',
        className
      )}
      {...props}
    />
  )
})

const CardHeader = forwardRef(function CardHeader({ className, ...props }, ref) {
  return <div ref={ref} data-slot="card-header" className={cn('flex flex-col gap-2 p-6', className)} {...props} />
})

const CardTitle = forwardRef(function CardTitle({ className, ...props }, ref) {
  return <h3 ref={ref} className={cn('font-[(family-name:var(--font-display))] text-xl font-semibold tracking-tight', className)} {...props} />
})

const CardDescription = forwardRef(function CardDescription({ className, ...props }, ref) {
  return <p ref={ref} className={cn('text-sm text-[var(--fg-secondary)]', className)} {...props} />
})

const CardContent = forwardRef(function CardContent({ className, ...props }, ref) {
  return <div ref={ref} data-slot="card-content" className={cn('px-6 pb-6', className)} {...props} />
})

const CardFooter = forwardRef(function CardFooter({ className, ...props }, ref) {
  return <div ref={ref} className={cn('flex items-center gap-3 px-6 pb-6', className)} {...props} />
})

export { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle }
