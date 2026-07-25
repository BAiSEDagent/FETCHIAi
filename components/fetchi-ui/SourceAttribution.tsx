import * as React from 'react'
import {
  Briefcase,
  CloudHail,
  FileText,
  Globe,
  Link2,
  Newspaper,
  type LucideIcon,
} from 'lucide-react'

import { cn } from '@/lib/utils'

export interface SourceAttributionProps
  extends Omit<React.HTMLAttributes<HTMLSpanElement>, 'children'> {
  source: string | null | undefined
  variant?: 'chip' | 'inline'
}

function iconForSource(source: string): LucideIcon {
  const normalized = source.toLowerCase()
  if (/\b(?:noaa|nws|weather)\b/.test(normalized)) return CloudHail
  if (/\bpermits?\b/.test(normalized)) return FileText
  if (/\bjobs?\b/.test(normalized)) return Briefcase
  if (/\bnews\b/.test(normalized)) return Newspaper
  if (/\bmaps?\b/.test(normalized)) return Globe
  return Link2
}

const SourceAttribution = React.forwardRef<
  HTMLSpanElement,
  SourceAttributionProps
>(({ className, source, variant = 'chip', ...props }, ref) => {
  const label = source?.trim()
  if (!label) return null

  if (variant === 'inline') {
    return (
      <span
        aria-label={`Source: ${label}`}
        className={cn(
          'inline-flex min-w-0 items-center gap-1.5 text-[12px] leading-[1.4] text-[var(--fetchi-text-tertiary)]',
          className,
        )}
        data-fetchi-source-attribution="inline"
        ref={ref}
        title={label}
        {...props}
      >
        <span className="shrink-0">source</span>
        <span className="min-w-0 truncate font-medium text-[var(--fetchi-text-secondary)]">
          {label}
        </span>
      </span>
    )
  }

  const Icon = iconForSource(label)

  return (
    <span
      aria-label={`Source: ${label}`}
      className={cn(
        'inline-flex h-[26px] max-w-full min-w-0 shrink-0 items-center gap-[7px] overflow-hidden whitespace-nowrap rounded-[6px] bg-[var(--fetchi-overlay)] px-[10px] text-[12px] font-medium leading-none text-[var(--fetchi-text-secondary)] shadow-[inset_0_0_0_1px_rgba(255,255,255,0.06)]',
        className,
      )}
      data-fetchi-source-attribution="chip"
      ref={ref}
      title={label}
      {...props}
    >
      <Icon
        aria-hidden="true"
        className="h-[13px] w-[13px] shrink-0 text-[var(--fetchi-text-tertiary)]"
        strokeWidth={2}
      />
      <span className="shrink-0 text-[11px] font-semibold tracking-[0.04em] text-[#4A4E54]">
        SOURCE
      </span>
      <span className="min-w-0 truncate text-[12px] font-medium text-[var(--fetchi-text-secondary)]">
        {label}
      </span>
    </span>
  )
})

SourceAttribution.displayName = 'SourceAttribution'

export { SourceAttribution }
