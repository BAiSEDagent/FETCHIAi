import * as React from 'react'
import { cn } from '@/lib/utils'

type Props = {
  icon?: React.ReactNode
  title: React.ReactNode
  body?: React.ReactNode
  action?: React.ReactNode
  className?: string
}

export function EmptyState({ icon, title, body, action, className }: Props) {
  return (
    <div
      className={cn(
        'rounded-xl border border-text/[0.06] bg-[var(--fetchi-surface)] px-6 py-10 lg:py-14 flex flex-col items-center text-center',
        className,
      )}
    >
      {icon && <div className="mb-4 flex items-center justify-center">{icon}</div>}
      <h3 className="font-fetchi text-[17px] font-semibold tracking-[-0.02em] text-text">
        {title}
      </h3>
      {body && (
        <p className="text-[14px] text-text/65 mt-2 max-w-sm leading-relaxed">
          {body}
        </p>
      )}
      {action && <div className="mt-5">{action}</div>}
    </div>
  )
}
