'use client'

import * as React from 'react'

type Props = {
  index: number
  total: number
  savedCount: number
  skippedCount: number
}

export function RunProgress({ index, total, savedCount, skippedCount }: Props) {
  // Clamp index for display when we're past the last card (completion view
  // still mounts this for the brief moment between actions).
  const display = Math.min(index + 1, total)
  return (
    <div className="flex items-center justify-between gap-3">
      <div className="text-[12px] uppercase tracking-[1px] font-bold text-brand-near-black/55 tabular-nums">
        Card {display} of {total}
        <span className="text-brand-near-black/30"> · </span>
        <span className="text-brand-green">saved {savedCount}</span>
        <span className="text-brand-near-black/30"> · </span>
        <span className="text-brand-near-black/50">skipped {skippedCount}</span>
      </div>
      <div className="hidden sm:flex items-center gap-1.5" aria-hidden>
        {Array.from({ length: total }, (_, i) => (
          <span
            key={i}
            className={`h-1.5 rounded-full transition-all ${
              i < index
                ? 'w-4 bg-brand-near-black/25'
                : i === index
                  ? 'w-8 bg-brand-green'
                  : 'w-4 bg-brand-near-black/12'
            }`}
          />
        ))}
      </div>
    </div>
  )
}
