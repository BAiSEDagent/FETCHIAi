import * as React from 'react'
import { CircleAlert } from 'lucide-react'
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
        'rounded-xl bg-bad/[0.08] border border-bad/20 px-5 py-5 lg:px-6 lg:py-6',
        className,
      )}
    >
      <div className="flex items-start gap-3">
        <div className="w-9 h-9 rounded-lg bg-bad/15 text-bad flex items-center justify-center flex-shrink-0" aria-hidden>
          <CircleAlert className="h-[18px] w-[18px]" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-fetchi text-[15px] font-semibold text-text">
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
