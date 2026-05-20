'use client'

import * as React from 'react'
import { ArrowRight, Check, RotateCcw } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  ACTION_BUTTON_HEIGHT,
  CARD_RADIUS,
  CARD_SHADOW,
  CARD_SURFACE,
  PRIMARY_BUTTON_SURFACE,
  SECONDARY_BUTTON_SURFACE,
} from './tokens'
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
      aria-live="polite"
      className={cn(
        'relative p-6 lg:p-7 text-brand-near-black',
        CARD_SURFACE,
        CARD_RADIUS,
        CARD_SHADOW,
      )}
    >
      {/* Brand-green "Added" stamp */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-[10.5px] uppercase tracking-[0.12em] font-bold text-brand-green">
            Added to My Leads
          </div>
          <h3 className="font-outfit text-[22px] lg:text-[24px] font-bold mt-1 leading-tight">
            {businessName}
          </h3>
          <p className="text-[13px] text-brand-near-black/65 mt-1.5">
            Saved to My Leads. Draft is ready to review when you are.
          </p>
        </div>
        <span
          className="flex items-center gap-1.5 rounded-full bg-brand-green px-3 h-[34px] text-[12px] font-bold uppercase tracking-[0.08em] text-white -rotate-[9deg] shadow-[0_8px_18px_-10px_rgba(88,147,126,0.7)] flex-shrink-0"
          aria-hidden
        >
          <Check className="h-3.5 w-3.5" />
          Saved
        </span>
      </div>

      {/* Draft preview (read-only) */}
      <div className="mt-5 rounded-2xl bg-brand-cream/70 p-4">
        <div className="text-[10.5px] uppercase tracking-[0.12em] font-bold text-brand-near-black/45">
          Draft prepared, not sent
        </div>
        {draft ? (
          <>
            {draft.subjectLine && (
              <div className="mt-2 text-[13.5px] font-semibold text-brand-near-black leading-snug">
                {draft.subjectLine}
              </div>
            )}
            <p className="mt-1.5 text-[13px] text-brand-near-black/70 leading-relaxed whitespace-pre-line">
              {draft.bodyFirstLines}
            </p>
          </>
        ) : (
          <p className="mt-2 text-[13px] text-brand-near-black/60 italic leading-relaxed">
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
            'inline-flex items-center justify-center gap-2 rounded-[18px] text-[13.5px] font-semibold transition-all px-4 disabled:opacity-55 disabled:cursor-not-allowed',
            ACTION_BUTTON_HEIGHT,
            SECONDARY_BUTTON_SURFACE,
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
            'inline-flex items-center justify-center rounded-[18px] text-[14px] font-semibold transition-all disabled:opacity-60',
            ACTION_BUTTON_HEIGHT,
            SECONDARY_BUTTON_SURFACE,
          )}
        >
          Stop run
        </button>
        <button
          type="button"
          onClick={onNext}
          disabled={pending}
          className={cn(
            'inline-flex items-center justify-center gap-2 rounded-[18px] text-[14px] font-semibold transition-all px-5 disabled:opacity-60',
            ACTION_BUTTON_HEIGHT,
            PRIMARY_BUTTON_SURFACE,
          )}
        >
          Next lead
          <ArrowRight className="h-4 w-4" />
        </button>
      </div>
    </section>
  )
}
