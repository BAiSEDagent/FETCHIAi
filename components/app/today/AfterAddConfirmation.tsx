'use client'

import * as React from 'react'
import { ArrowRight, Check, RotateCcw } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { DraftPreview } from './types'

const UNDO_WINDOW_MS = 10_000

type Props = {
  businessName: string
  draft: DraftPreview | null
  /** Snapshot is null when the previous status/notes could not be captured. */
  canUndo: boolean
  pending?: boolean
  onUndo: () => void
  onNext: () => void
  onStop: () => void
}

export function AfterAddConfirmation({
  businessName,
  draft,
  canUndo,
  pending,
  onUndo,
  onNext,
  onStop,
}: Props) {
  // 10-second undo countdown.
  const [remaining, setRemaining] = React.useState(UNDO_WINDOW_MS)
  React.useEffect(() => {
    if (!canUndo) return
    const start = Date.now()
    const tick = window.setInterval(() => {
      const left = Math.max(0, UNDO_WINDOW_MS - (Date.now() - start))
      setRemaining(left)
      if (left === 0) window.clearInterval(tick)
    }, 100)
    return () => window.clearInterval(tick)
  }, [canUndo])

  const undoActive = canUndo && remaining > 0 && !pending
  const secondsLeft = Math.ceil(remaining / 1000)

  return (
    <section
      data-fetchi-flat-panel-v5
      aria-live="polite"
      className={cn(
        'relative rounded-xl border border-text/10 bg-raised p-6 text-text lg:p-7',
      )}
    >
      {/* Success-green saved state. */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-[10.5px] font-bold uppercase tracking-[0.12em] text-semanticGreen">
            Added to My Leads
          </div>
          <h3 className="mt-1 text-[22px] font-semibold leading-tight tracking-[-0.02em] lg:text-[24px]">
            {businessName}
          </h3>
          <p className="text-[13px] text-text/65 mt-1.5">
            Saved to My Leads. Draft is ready to review when you are.
          </p>
        </div>
        <span
          className="flex h-[32px] flex-shrink-0 items-center gap-1.5 rounded-full border border-semanticGreen/25 bg-semanticGreen/10 px-3 text-[12px] font-bold uppercase tracking-[0.08em] text-semanticGreen"
          aria-hidden
        >
          <Check className="h-3.5 w-3.5" />
          Saved
        </span>
      </div>

      {/* Draft preview (read-only) */}
      <div className="mt-5 rounded-lg border border-text/10 bg-fetchiOverlay p-4">
        <div className="text-[10.5px] uppercase tracking-[0.12em] font-bold text-text/45">
          Draft prepared, not sent
        </div>
        {draft ? (
          <>
            {draft.subjectLine && (
              <div className="mt-2 text-[13.5px] font-semibold text-text leading-snug">
                {draft.subjectLine}
              </div>
            )}
            <p className="mt-1.5 text-[13px] text-text/70 leading-relaxed whitespace-pre-line">
              {draft.bodyFirstLines}
            </p>
          </>
        ) : (
          <p className="mt-2 text-[13px] text-text/60 italic leading-relaxed">
            Draft will be ready when you open this lead.
          </p>
        )}
      </div>

      {/* Undo + actions */}
      <div className="mt-5 grid gap-2.5 sm:grid-cols-[auto_1fr_auto]">
        <button
          type="button"
          onClick={onUndo}
          disabled={!undoActive}
          title={
            canUndo
              ? undefined
              : 'TODO: undo unavailable — previous state could not be captured.'
          }
          className={cn(
            'inline-flex h-11 min-h-[44px] items-center justify-center gap-2 rounded-lg border border-text/10 bg-fetchiOverlay px-4 text-[13.5px] font-semibold text-text/85 transition-colors',
            'hover:bg-fetchiOverlayHover hover:text-text disabled:cursor-not-allowed disabled:opacity-55',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fetchiAccent focus-visible:ring-offset-2 focus-visible:ring-offset-bg',
          )}
        >
          <RotateCcw className="h-4 w-4" />
          {canUndo ? `Undo (${secondsLeft}s)` : 'Undo unavailable'}
        </button>
        <button
          type="button"
          onClick={onStop}
          disabled={pending}
          className={cn(
            'inline-flex h-11 min-h-[44px] items-center justify-center rounded-lg border border-text/10 bg-fetchiOverlay px-4 text-[14px] font-semibold text-text/85 transition-colors',
            'hover:bg-fetchiOverlayHover hover:text-text disabled:opacity-60',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fetchiAccent focus-visible:ring-offset-2 focus-visible:ring-offset-bg',
          )}
        >
          Stop run
        </button>
        <button
          type="button"
          onClick={onNext}
          disabled={pending}
          className={cn(
            'inline-flex h-11 min-h-[44px] items-center justify-center gap-2 rounded-lg bg-fetchiAccent px-5 text-[14px] font-semibold text-white transition-colors',
            'hover:bg-[var(--fetchi-accent-hover)] active:bg-[var(--fetchi-accent-press)] disabled:opacity-60',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fetchiAccent focus-visible:ring-offset-2 focus-visible:ring-offset-bg',
          )}
        >
          Next lead
          <ArrowRight className="h-4 w-4" />
        </button>
      </div>
    </section>
  )
}
