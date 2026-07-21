import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'

import { cn } from '@/lib/utils'

const fetchiInputVariants = cva(
  'flex w-full rounded-[var(--fetchi-radius-md)] border border-[var(--fetchi-border)] bg-[var(--fetchi-overlay)] font-fetchi text-[13px] text-[var(--fetchi-text)] transition-[background-color,border-color,box-shadow] [transition-duration:var(--fetchi-duration-press)] [transition-timing-function:var(--fetchi-ease)] placeholder:text-[var(--fetchi-text-tertiary)] hover:border-[var(--fetchi-border-strong)] focus-visible:border-[var(--fetchi-accent-border)] focus-visible:outline-none focus-visible:shadow-[var(--fetchi-focus-ring)] aria-invalid:border-[var(--fetchi-red)] aria-invalid:bg-[var(--fetchi-red-subtle)] disabled:cursor-not-allowed disabled:border-[var(--fetchi-border-subtle)] disabled:text-[var(--fetchi-text-disabled)] disabled:opacity-70 motion-reduce:transition-none',
  {
    variants: {
      controlSize: {
        sm: 'h-[28px] px-2.5',
        md: 'h-[32px] px-3',
        lg: 'h-[40px] px-3.5 text-[14px]',
      },
    },
    defaultVariants: {
      controlSize: 'md',
    },
  },
)

export interface FetchiInputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'>,
    VariantProps<typeof fetchiInputVariants> {}

const FetchiInput = React.forwardRef<HTMLInputElement, FetchiInputProps>(
  ({ className, controlSize, type, ...props }, ref) => (
    <input
      className={cn(fetchiInputVariants({ className, controlSize }))}
      ref={ref}
      type={type}
      {...props}
    />
  ),
)

FetchiInput.displayName = 'FetchiInput'

export { FetchiInput, fetchiInputVariants }
