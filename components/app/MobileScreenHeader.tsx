import * as React from 'react'
import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'
import { cn } from '@/lib/utils'

type Props = {
  title: React.ReactNode
  description?: React.ReactNode
  backHref?: string
  backLabel?: string
  actions?: React.ReactNode
  className?: string
}

/**
 * Consistent page header for customer routes. Renders backlink (when given),
 * an h1 title, optional supporting copy, and right-aligned actions slot.
 */
export function MobileScreenHeader({
  title,
  description,
  backHref,
  backLabel = 'Back',
  actions,
  className,
}: Props) {
  return (
    <header
      className={cn(
        'px-5 lg:px-7 pt-[max(env(safe-area-inset-top),1.25rem)] lg:pt-7 pb-4 lg:pb-5',
        className,
      )}
    >
      {backHref && (
        <Link
          href={backHref}
          className="inline-flex items-center gap-1 text-[12.5px] text-text/55 hover:text-text mb-3 min-h-[44px]"
        >
          <ChevronLeft className="h-4 w-4" />
          {backLabel}
        </Link>
      )}
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="font-outfit text-[26px] lg:text-[28px] font-semibold text-text leading-tight">
            {title}
          </h1>
          {description && (
            <p className="text-[14px] text-text/60 mt-1.5 leading-relaxed max-w-2xl">
              {description}
            </p>
          )}
        </div>
        {actions && <div className="flex-shrink-0">{actions}</div>}
      </div>
    </header>
  )
}
