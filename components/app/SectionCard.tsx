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
  density?: 'default' | 'compact'
}

const TONE: Record<NonNullable<Props['tone']>, string> = {
  default: 'bg-[var(--fetchi-surface)]',
  highlight: 'bg-[var(--fetchi-raised)]',
  muted: 'bg-[var(--fetchi-raised)]',
}

const DENSITY: Record<NonNullable<Props['density']>, {
  frame: string
  header: string
  eyebrow: string
  title: string
  description: string
  body: string
  bodyWithoutHeader: string
}> = {
  default: {
    frame: 'rounded-xl border border-text/[0.06] overflow-hidden',
    header: 'flex items-start justify-between gap-4 px-5 lg:px-6 pt-5 lg:pt-6 pb-3',
    eyebrow: 'text-[11px] font-bold uppercase tracking-[1px] text-text/45 mb-1.5',
    title: 'font-fetchi text-h3 tracking-[-0.02em] text-text',
    description: 'text-[13px] text-text/60 mt-1 leading-relaxed',
    body: 'px-5 lg:px-6 pb-5 lg:pb-6',
    bodyWithoutHeader: 'pt-5 lg:pt-6',
  },
  compact: {
    frame: 'overflow-hidden rounded-xl border border-[var(--fetchi-border-subtle)]',
    header: 'flex items-start justify-between gap-4 px-4 pb-3 pt-4 lg:px-5 lg:pt-5',
    eyebrow: 'mb-1.5 text-[10.5px] font-semibold uppercase tracking-[0.14em] text-text/45',
    title: 'font-fetchi text-[15px] font-semibold leading-[1.4] tracking-[-0.02em] text-text',
    description: 'mt-1 text-[13px] leading-[1.45] text-text/60',
    body: 'px-4 pb-4 lg:px-5 lg:pb-5',
    bodyWithoutHeader: 'pt-4 lg:pt-5',
  },
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
  density = 'default',
}: Props) {
  const hasHeader = eyebrow || title || description || actions
  const styles = DENSITY[density]
  return (
    <section
      data-fetchi-section-card-v5
      className={cn(styles.frame, TONE[tone], className)}
    >
      {hasHeader && (
        <div className={styles.header}>
          <div className="min-w-0 flex-1">
            {eyebrow && (
              <div className={styles.eyebrow}>
                {eyebrow}
              </div>
            )}
            {title && (
              <h2 className={styles.title}>
                {title}
              </h2>
            )}
            {description && (
              <p className={styles.description}>
                {description}
              </p>
            )}
          </div>
          {actions && <div className="flex-shrink-0">{actions}</div>}
        </div>
      )}
      <div className={cn(styles.body, !hasHeader && styles.bodyWithoutHeader, bodyClassName)}>
        {children}
      </div>
    </section>
  )
}
