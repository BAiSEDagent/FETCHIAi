import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'

import { cn } from '@/lib/utils'

const fetchiTextareaVariants = cva(
  'flex w-full resize-y rounded-[var(--fetchi-radius-md)] border border-[var(--fetchi-border)] bg-[var(--fetchi-overlay)] font-fetchi text-[13px] leading-5 text-[var(--fetchi-text)] transition-[background-color,border-color,box-shadow] [transition-duration:var(--fetchi-duration-press)] [transition-timing-function:var(--fetchi-ease)] placeholder:text-[var(--fetchi-text-tertiary)] hover:border-[var(--fetchi-border-strong)] focus-visible:border-[var(--fetchi-accent-border)] focus-visible:outline-none focus-visible:shadow-[var(--fetchi-focus-ring)] aria-invalid:border-[var(--fetchi-red)] aria-invalid:bg-[var(--fetchi-red-subtle)] disabled:cursor-not-allowed disabled:border-[var(--fetchi-border-subtle)] disabled:text-[var(--fetchi-text-disabled)] disabled:opacity-70 motion-reduce:transition-none',
  {
    variants: {
      controlSize: {
        sm: 'min-h-[72px] px-2.5 py-2',
        md: 'min-h-[88px] px-3 py-2.5',
        lg: 'min-h-[104px] px-3.5 py-3 text-[14px]',
      },
    },
    defaultVariants: {
      controlSize: 'md',
    },
  },
)

export interface FetchiTextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement>,
    VariantProps<typeof fetchiTextareaVariants> {}

const FetchiTextarea = React.forwardRef<HTMLTextAreaElement, FetchiTextareaProps>(
  ({ className, controlSize, ...props }, ref) => (
    <textarea
      className={cn(fetchiTextareaVariants({ className, controlSize }))}
      ref={ref}
      {...props}
    />
  ),
)

FetchiTextarea.displayName = 'FetchiTextarea'

export { FetchiTextarea, fetchiTextareaVariants }
