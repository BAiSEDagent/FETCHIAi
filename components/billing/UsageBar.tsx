import * as React from 'react'
import { cn } from '@/lib/utils'

interface Props {
  used: number
  limit: number | null
  label?: string
}

export function UsageBar({ used, limit, label }: Props) {
  if (limit == null) {
    return (
      <div className="text-[13px] text-brand-near-black/70">
        {label ?? 'Opportunities used'}: <span className="font-semibold">{used}</span> &middot; unlimited
      </div>
    )
  }
  const pct = Math.min(100, Math.round((used / Math.max(1, limit)) * 100))
  const tone =
    pct >= 90 ? 'bg-brand-coral' : pct >= 70 ? 'bg-amber-500' : 'bg-brand-green'
  return (
    <div>
      <div className="flex items-baseline justify-between mb-2">
        <span className="text-[13px] text-brand-near-black/70">{label ?? 'Opportunities used'}</span>
        <span className="text-[13px] font-semibold text-brand-near-black">
          {used} / {limit}
        </span>
      </div>
      <div className="h-2 rounded-full bg-brand-near-black/10 overflow-hidden">
        <div className={cn('h-full transition-all', tone)} style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}
