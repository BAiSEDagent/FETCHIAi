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

// Roughly 10s of dwell per card feels honest for a morning skim ritual.
const SECONDS_PER_CARD = 10

function timeLabel(remaining: number): string {
  const secs = Math.max(0, remaining * SECONDS_PER_CARD)
  if (secs <= 0) return 'Done'
  if (secs < 90) return `~${Math.max(1, Math.round(secs / 10) * 10)}s`
  return `~${Math.max(1, Math.round(secs / 60))}m`
}

export function RunProgress({ index, total, savedCount, skippedCount }: Props) {
  const reviewed = Math.min(index, total)
  const left = Math.max(0, total - reviewed)
  const isDone = left === 0

  return (
    <div
      className={cn(
        'rounded-[18px] bg-white/70 px-4 py-3.5 lg:px-5 lg:py-4',
        'shadow-[inset_0_0_0_1px_rgba(45,43,42,0.06),0_1px_2px_rgba(45,43,42,0.04)]',
      )}
    >
      <div className="flex items-center gap-3">
        <span
          className={cn(
            'inline-flex items-center justify-center rounded-full px-2.5 h-[28px] min-w-[44px]',
            'text-[12px] font-bold tabular-nums',
            'bg-brand-green/15 text-brand-dark',
          )}
          aria-hidden
        >
          {timeLabel(left)}
        </span>
        <p className="text-[13.5px] lg:text-[14px] font-semibold text-brand-near-black/85 leading-snug">
          {isDone
            ? 'Stack cleared for today.'
            : 'min to clear today\u2019s stack'.length === 0
              ? ''
              : `~${Math.max(1, Math.round((left * SECONDS_PER_CARD) / 60))} min to clear today\u2019s stack`}
        </p>
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
          {reviewed}/{total} reviewed
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
