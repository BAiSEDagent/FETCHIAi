'use client'

import * as React from 'react'
import { cn } from '@/lib/utils'

type Props = {
  /** Zero-based index of the active card. Set to `total` when finished. */
  index: number
  total: number
  savedCount: number
  skippedCount: number
}

export function RunProgress({ index, total, savedCount, skippedCount }: Props) {
  const reviewed = Math.min(index, total)
  const left = Math.max(0, total - reviewed)
  const isDone = left === 0

  const headline = isDone
    ? 'Stack cleared for today.'
    : `${total} high-fit ${total === 1 ? 'lead' : 'leads'} ready`

  return (
    <div
      className={cn(
        'rounded-[18px] bg-white/70 px-4 py-3.5 lg:px-5 lg:py-4',
        'shadow-[inset_0_0_0_1px_rgba(45,43,42,0.06),0_1px_2px_rgba(45,43,42,0.04)]',
      )}
    >
      <div className="flex items-baseline justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[10.5px] uppercase tracking-[0.12em] font-bold text-brand-near-black/45">
            Morning stack
          </p>
          <p className="mt-0.5 text-[14px] lg:text-[14.5px] font-semibold text-brand-near-black/85 leading-snug">
            {headline}
          </p>
        </div>
        <span
          className={cn(
            'inline-flex items-center justify-center rounded-full px-2.5 h-[26px] min-w-[44px]',
            'text-[11px] uppercase tracking-[0.1em] font-bold tabular-nums',
            'bg-brand-green/15 text-brand-dark',
          )}
          aria-hidden
        >
          {reviewed}/{total}
        </span>
      </div>

      {/* Segmented progress bar */}
      <div
        className="mt-3 flex items-center gap-1"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={total}
        aria-valuenow={reviewed}
        aria-label={`${reviewed} of ${total} reviewed`}
      >
        {Array.from({ length: total }, (_, i) => (
          <span
            key={i}
            className={cn(
              'h-1.5 flex-1 rounded-full transition-colors',
              i < reviewed
                ? 'bg-brand-green'
                : i === reviewed
                  ? 'bg-brand-green/55'
                  : 'bg-brand-near-black/10',
            )}
          />
        ))}
      </div>

      {/* Reviewed / left footer */}
      <div className="mt-2 flex items-center justify-between text-[11px] uppercase tracking-[0.1em] font-bold tabular-nums">
        <span className="text-brand-near-black/55">
          {reviewed} reviewed
          {savedCount > 0 || skippedCount > 0 ? (
            <span className="ml-2 text-brand-near-black/35 normal-case tracking-normal font-medium">
              <span className="text-brand-green">{savedCount} saved</span>
              <span className="mx-1.5">·</span>
              <span>{skippedCount} passed</span>
            </span>
          ) : null}
        </span>
        <span className="text-brand-near-black/55">{left} left</span>
      </div>
    </div>
  )
}
