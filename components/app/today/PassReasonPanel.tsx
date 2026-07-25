'use client'

import * as React from 'react'
import { cn } from '@/lib/utils'
import {
  TODAYS_RUN_PASS_REASONS,
  type TodaysRunPassReason,
} from '@/lib/today/pass-reasons'

const REASON_LABEL: Record<TodaysRunPassReason, string> = {
  wrong_contact: 'Wrong contact',
  already_has_vendor: 'Already has vendor',
  too_small: 'Too small',
  out_of_area: 'Out of area',
  bad_signal: 'Bad signal',
}

type Props = {
  businessName: string
  pending?: boolean
  onCancel: () => void
  onSubmit: (input: { reasons: TodaysRunPassReason[]; note: string | null }) => void
}

export function PassReasonPanel({ businessName, pending, onCancel, onSubmit }: Props) {
  const [reasons, setReasons] = React.useState<TodaysRunPassReason[]>([])
  const [note, setNote] = React.useState('')

  const toggle = (r: TodaysRunPassReason) => {
    setReasons(prev => (prev.includes(r) ? prev.filter(x => x !== r) : [...prev, r]))
  }

  const canSubmit = reasons.length > 0 && !pending

  return (
    <section
      data-fetchi-pass-panel-v5
      data-fetchi-flat-panel-v5
      role="dialog"
      aria-label="Why are you passing on this lead?"
      className={cn(
        'rounded-xl border border-text/10 bg-raised p-6 text-text lg:p-7',
      )}
    >
      <div className="text-[10.5px] uppercase tracking-[0.12em] font-bold text-text/45">
        Tell Fetchi why
      </div>
      <h3 className="mt-1.5 text-[20px] font-semibold leading-tight tracking-[-0.02em] lg:text-[22px]">
        Pass on {businessName}
      </h3>
      <p className="text-[13px] text-text/60 mt-1.5 leading-relaxed">
        Pick one or more reasons. Fetchi will use this feedback to improve future
        stacks.
      </p>

      <div className="mt-5 flex flex-wrap gap-2">
        {TODAYS_RUN_PASS_REASONS.map(r => {
          const active = reasons.includes(r)
          return (
            <button
              key={r}
              type="button"
              onClick={() => toggle(r)}
              aria-pressed={active}
              className={cn(
                'inline-flex h-11 min-h-[44px] items-center rounded-full border px-3.5 text-[13px] font-semibold transition-colors',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fetchiAccent focus-visible:ring-offset-2 focus-visible:ring-offset-bg',
                active
                  ? 'border-semanticRed/30 bg-semanticRed/10 text-semanticRed'
                  : 'border-text/10 bg-fetchiOverlay text-text/75 hover:bg-fetchiOverlayHover hover:text-text',
              )}
            >
              {REASON_LABEL[r]}
            </button>
          )
        })}
      </div>

      <label className="block mt-5">
        <span className="text-[11.5px] font-semibold uppercase tracking-wide text-text/50">
          Anything else? (optional)
        </span>
        <textarea
          value={note}
          onChange={e => setNote(e.target.value.slice(0, 240))}
          maxLength={240}
          rows={3}
          placeholder="Add context — Fetchi&rsquo;s feedback loop reads this."
          className="mt-1.5 min-h-[96px] w-full rounded-lg border border-text/10 bg-fetchiOverlay px-3.5 py-2.5 text-[13.5px] leading-relaxed text-text placeholder:text-text/35 focus:border-fetchiAccent focus:outline-none focus:ring-2 focus:ring-fetchiAccent/30"
        />
        <div className="text-right text-[11px] text-text/40 mt-1 tabular-nums">
          {note.length}/240
        </div>
      </label>

      <div className="mt-5 grid grid-cols-2 gap-2.5">
        <button
          type="button"
          onClick={onCancel}
          disabled={pending}
          className={cn(
            'inline-flex h-11 min-h-[44px] items-center justify-center rounded-lg border border-text/10 bg-fetchiOverlay px-4 text-[14px] font-semibold text-text/85 transition-colors',
            'hover:bg-fetchiOverlayHover hover:text-text disabled:opacity-60',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fetchiAccent focus-visible:ring-offset-2 focus-visible:ring-offset-bg',
          )}
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={() => onSubmit({ reasons, note: note.trim() ? note.trim() : null })}
          disabled={!canSubmit}
          className={cn(
            'inline-flex h-11 min-h-[44px] items-center justify-center rounded-lg bg-semanticRed px-4 text-[14px] font-semibold text-[#08090A] transition-colors',
            'hover:bg-semanticRed/85 disabled:cursor-not-allowed disabled:opacity-60',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fetchiAccent focus-visible:ring-offset-2 focus-visible:ring-offset-bg',
          )}
        >
          {pending ? 'Saving…' : 'Submit & pass'}
        </button>
      </div>
    </section>
  )
}
