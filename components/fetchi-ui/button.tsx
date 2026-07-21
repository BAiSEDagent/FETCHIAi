import * as React from 'react'
import { Slot } from '@radix-ui/react-slot'
import { cva, type VariantProps } from 'class-variance-authority'
import { LoaderCircle } from 'lucide-react'

import { cn } from '@/lib/utils'

const fetchiButtonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-[var(--fetchi-radius-md)] font-fetchi text-[13px] font-medium text-[var(--fetchi-text)] transition-[background-color,color,border-color,box-shadow,transform] [transition-duration:var(--fetchi-duration-press)] [transition-timing-function:var(--fetchi-ease)] focus-visible:outline-none focus-visible:shadow-[var(--fetchi-focus-ring)] active:scale-[0.98] disabled:pointer-events-none disabled:cursor-not-allowed disabled:text-[var(--fetchi-text-disabled)] disabled:opacity-60 motion-reduce:transition-none motion-reduce:transform-none [&_svg]:pointer-events-none [&_svg]:shrink-0',
  {
    variants: {
      variant: {
        primary:
          'bg-[var(--fetchi-accent)] text-[var(--fetchi-accent-contrast)] shadow-[0_1px_2px_rgba(0,0,0,0.30),0_8px_20px_-10px_rgba(94,106,210,0.50)] hover:bg-[var(--fetchi-accent-hover)] active:bg-[var(--fetchi-accent-press)]',
        secondary:
          'border border-[var(--fetchi-border)] bg-[var(--fetchi-overlay)] hover:border-[var(--fetchi-border-strong)] hover:bg-[var(--fetchi-overlay-hover)] active:bg-[var(--fetchi-overlay-active)]',
        ghost:
          'bg-transparent text-[var(--fetchi-text-secondary)] hover:bg-[var(--fetchi-accent-tint)] hover:text-[var(--fetchi-text)] active:bg-[var(--fetchi-accent-subtle)]',
        subtle:
          'bg-[var(--fetchi-accent-tint)] text-[var(--fetchi-text)] hover:bg-[var(--fetchi-accent-subtle)] active:bg-[var(--fetchi-accent-border)]',
        danger:
          'bg-[var(--fetchi-red)] text-white hover:brightness-110 active:brightness-95',
      },
      size: {
        sm: 'h-[28px] px-2.5 text-[12px]',
        md: 'h-[32px] px-3',
        lg: 'h-[40px] px-4 text-[14px]',
      },
      fullWidth: {
        true: 'w-full',
        false: '',
      },
    },
    defaultVariants: {
      variant: 'primary',
      size: 'md',
      fullWidth: false,
    },
  },
)

export interface FetchiButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof fetchiButtonVariants> {
  asChild?: boolean
  isLoading?: boolean
}

const FetchiButton = React.forwardRef<HTMLButtonElement, FetchiButtonProps>(
  (
    {
      asChild = false,
      children,
      className,
      disabled,
      fullWidth,
      isLoading = false,
      size,
      type = 'button',
      variant,
      ...props
    },
    ref,
  ) => {
    const loadingSpinner = isLoading ? (
      <LoaderCircle
        aria-hidden="true"
        className="size-3.5 animate-spin motion-reduce:animate-none"
      />
    ) : null

    const content = (
      <>
        {loadingSpinner}
        {children}
      </>
    )

    const classes = cn(
      fetchiButtonVariants({ className, fullWidth, size, variant }),
    )

    if (asChild) {
      if (!React.isValidElement(children)) {
        throw new Error('FetchiButton with asChild requires one React element')
      }

      const child = children as React.ReactElement<{ children?: React.ReactNode }>
      const slottedChild = React.cloneElement(
        child,
        undefined,
        <>
          {loadingSpinner}
          {child.props.children}
        </>,
      )

      return (
        <Slot
          aria-busy={isLoading || undefined}
          aria-disabled={disabled || isLoading || undefined}
          className={classes}
          ref={ref}
          {...props}
        >
          {slottedChild}
        </Slot>
      )
    }

    return (
      <button
        aria-busy={isLoading || undefined}
        className={classes}
        disabled={disabled || isLoading}
        ref={ref}
        type={type}
        {...props}
      >
        {content}
      </button>
    )
  },
)

FetchiButton.displayName = 'FetchiButton'

export { FetchiButton, fetchiButtonVariants }
