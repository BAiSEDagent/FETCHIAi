import * as React from 'react'
import { cn } from '@/lib/utils'

type Props = {
  title: React.ReactNode
  body?: React.ReactNode
  retry?: React.ReactNode
  className?: string
}

export function ErrorState({ title, body, retry, className }: Props) {
  return (
    <div
      role="alert"
      className={cn(
        'rounded-2xl bg-coral/8 border border-coral/20 px-5 py-5 lg:px-6 lg:py-6',
        className,
      )}
    >
      <div className="flex items-start gap-3">
        <div className="w-9 h-9 rounded-full bg-coral/15 text-coral flex items-center justify-center font-bold flex-shrink-0">
          !
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-outfit text-[16px] font-semibold text-text">
            {title}
          </h3>
          {body && (
            <p className="text-[13px] text-text/70 mt-1 leading-relaxed">
              {body}
            </p>
          )}
          {retry && <div className="mt-3">{retry}</div>}
        </div>
      </div>
    </div>
  )
}
