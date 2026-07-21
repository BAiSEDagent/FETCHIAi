import * as React from 'react'

import { cn } from '@/lib/utils'

interface FieldControlProps {
  id?: string
  required?: boolean
  'aria-describedby'?: string
  'aria-errormessage'?: string
  'aria-invalid'?: React.AriaAttributes['aria-invalid']
}

export interface FetchiFieldProps {
  children: React.ReactElement<FieldControlProps>
  className?: string
  error?: string
  hint?: string
  id?: string
  label: React.ReactNode
  required?: boolean
}

function FetchiField({
  children,
  className,
  error,
  hint,
  id: providedId,
  label,
  required = false,
}: FetchiFieldProps) {
  const generatedId = React.useId()
  const id = providedId ?? `fetchi-field-${generatedId}`
  const hintId = hint ? `${id}-hint` : undefined
  const errorId = error ? `${id}-error` : undefined
  const messageId = errorId ?? hintId
  const describedBy = [children.props['aria-describedby'], messageId]
    .filter(Boolean)
    .join(' ') || undefined

  const control = React.cloneElement(children, {
    id,
    required: required || children.props.required,
    'aria-describedby': describedBy,
    'aria-errormessage': errorId ?? children.props['aria-errormessage'],
    'aria-invalid': error ? true : children.props['aria-invalid'],
  })

  return (
    <div className={cn('grid gap-1.5 font-fetchi', className)}>
      <label
        className="text-[12px] font-medium leading-[1.4] text-[var(--fetchi-text)]"
        htmlFor={id}
      >
        {label}
        {required ? (
          <span aria-hidden="true" className="ml-1 text-[var(--fetchi-text-secondary)]">
            *
          </span>
        ) : null}
      </label>
      {control}
      {error || hint ? (
        <p
          className={cn(
            'text-[12px] leading-[1.4]',
            error
              ? 'text-[var(--fetchi-red)]'
              : 'text-[var(--fetchi-text-secondary)]',
          )}
          id={messageId}
          role={error ? 'alert' : undefined}
        >
          {error ?? hint}
        </p>
      ) : null}
    </div>
  )
}

FetchiField.displayName = 'FetchiField'

export { FetchiField }
