'use client'

import * as React from 'react'
import * as CheckboxPrimitive from '@radix-ui/react-checkbox'
import { Check, Minus } from 'lucide-react'

import { cn } from '@/lib/utils'

export interface FetchiCheckboxProps
  extends Omit<
    React.ComponentPropsWithoutRef<typeof CheckboxPrimitive.Root>,
    'children' | 'asChild'
  > {
  description?: React.ReactNode
  label: React.ReactNode
  rowClassName?: string
}

const FetchiCheckbox = React.forwardRef<
  React.ElementRef<typeof CheckboxPrimitive.Root>,
  FetchiCheckboxProps
>(
  (
    {
      checked,
      className,
      defaultChecked,
      description,
      disabled,
      id: providedId,
      label,
      rowClassName,
      ...props
    },
    ref,
  ) => {
    const generatedId = React.useId()
    const id = providedId ?? `fetchi-checkbox-${generatedId}`
    const descriptionId = description ? `${id}-description` : undefined
    return (
      <label
        className={cn(
          'flex min-h-[var(--fetchi-touch-min)] items-start gap-2.5 py-1.5 font-fetchi',
          disabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer',
          rowClassName,
        )}
        htmlFor={id}
      >
        <CheckboxPrimitive.Root
          aria-describedby={descriptionId}
          checked={checked}
          className={cn(
            'mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-[4px] border border-[var(--fetchi-border-strong)] bg-[var(--fetchi-overlay)] text-[var(--fetchi-accent-contrast)] transition-[background-color,border-color,box-shadow] [transition-duration:var(--fetchi-duration-press)] [transition-timing-function:var(--fetchi-ease)] hover:border-[var(--fetchi-accent-border)] focus-visible:outline-none focus-visible:shadow-[var(--fetchi-focus-ring)] data-[state=checked]:border-[var(--fetchi-accent)] data-[state=checked]:bg-[var(--fetchi-accent)] data-[state=indeterminate]:border-[var(--fetchi-accent)] data-[state=indeterminate]:bg-[var(--fetchi-accent)] disabled:pointer-events-none disabled:bg-[var(--fetchi-border-subtle)] disabled:text-[var(--fetchi-text-disabled)] motion-reduce:transition-none',
            className,
          )}
          defaultChecked={defaultChecked}
          disabled={disabled}
          id={id}
          ref={ref}
          {...props}
        >
          <CheckboxPrimitive.Indicator className="group/indicator flex items-center justify-center">
            <Check
              aria-hidden="true"
              className="size-3 group-data-[state=indeterminate]/indicator:hidden"
              strokeWidth={2.25}
            />
            <Minus
              aria-hidden="true"
              className="hidden size-3 group-data-[state=indeterminate]/indicator:block"
              strokeWidth={2.25}
            />
          </CheckboxPrimitive.Indicator>
        </CheckboxPrimitive.Root>
        <span className="grid gap-0.5">
          <span className="text-[13px] font-medium leading-[1.45] text-[var(--fetchi-text)]">
            {label}
          </span>
          {description ? (
            <span
              className="text-[12px] leading-[1.4] text-[var(--fetchi-text-secondary)]"
              id={descriptionId}
            >
              {description}
            </span>
          ) : null}
        </span>
      </label>
    )
  },
)

FetchiCheckbox.displayName = 'FetchiCheckbox'

export { FetchiCheckbox }
