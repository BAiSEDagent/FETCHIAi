import * as React from 'react'
import { cn } from '@/lib/utils'

type Props = {
  eyebrow?: React.ReactNode
  title?: React.ReactNode
  description?: React.ReactNode
  actions?: React.ReactNode
  children?: React.ReactNode
  className?: string
  bodyClassName?: string
  tone?: 'default' | 'highlight' | 'muted'
}

const TONE: Record<NonNullable<Props['tone']>, string> = {
  default: 'bg-surface',
  highlight: 'bg-ok/15',
  muted: 'bg-raised',
}

export function SectionCard({
  eyebrow,
  title,
  description,
  actions,
  children,
  className,
  bodyClassName,
  tone = 'default',
}: Props) {
  const hasHeader = eyebrow || title || description || actions
  return (
    <section
      className={cn(
        'rounded-2xl shadow-fetchi-soft overflow-hidden',
        TONE[tone],
        className,
      )}
    >
      {hasHeader && (
        <div className="flex items-start justify-between gap-4 px-5 lg:px-6 pt-5 lg:pt-6 pb-3">
          <div className="min-w-0 flex-1">
            {eyebrow && (
              <div className="text-[11px] font-bold uppercase tracking-[1px] text-text/45 mb-1.5">
                {eyebrow}
              </div>
            )}
            {title && (
              <h2 className="font-outfit text-[17px] font-semibold text-text leading-tight">
                {title}
              </h2>
            )}
            {description && (
              <p className="text-[13px] text-text/60 mt-1 leading-relaxed">
                {description}
              </p>
            )}
          </div>
          {actions && <div className="flex-shrink-0">{actions}</div>}
        </div>
      )}
      <div
        className={cn(
          'px-5 lg:px-6 pb-5 lg:pb-6',
          !hasHeader && 'pt-5 lg:pt-6',
          bodyClassName,
        )}
      >
        {children}
      </div>
    </section>
  )
}
