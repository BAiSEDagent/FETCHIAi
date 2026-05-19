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
        'rounded-2xl bg-brand-cream shadow-fetchi-soft px-6 py-10 lg:py-14 flex flex-col items-center text-center',
        className,
      )}
    >
      {icon && (
        <div
          className="text-[40px] leading-none mb-4 select-none"
          aria-hidden
        >
          {icon}
        </div>
      )}
      <h3 className="font-outfit text-[20px] font-semibold text-brand-near-black">
        {title}
      </h3>
      {body && (
        <p className="text-[14px] text-brand-near-black/65 mt-2 max-w-sm leading-relaxed">
          {body}
        </p>
      )}
      {action && <div className="mt-5">{action}</div>}
    </div>
  )
}
