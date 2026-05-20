'use client'

import * as React from 'react'
import { cn } from '@/lib/utils'
import {
  TODAYS_RUN_PASS_REASONS,
  type TodaysRunPassReason,
} from '@/app/app/leads/[id]/actions'
import {
  ACTION_BUTTON_HEIGHT,
  CARD_RADIUS,
  CARD_SHADOW,
  CARD_SURFACE,
  PRIMARY_BUTTON_SURFACE,
  SECONDARY_BUTTON_SURFACE,
} from './tokens'

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
      role="dialog"
      aria-label="Why are you passing on this lead?"
      className={cn(
        'p-6 lg:p-7 text-brand-near-black',
        CARD_SURFACE,
        CARD_RADIUS,
        CARD_SHADOW,
      )}
    >
      <div className="text-[10.5px] uppercase tracking-[0.12em] font-bold text-brand-near-black/45">
        Tell Fetchi why
      </div>
      <h3 className="font-outfit text-[20px] lg:text-[22px] font-bold mt-1.5 leading-tight">
        Pass on {businessName}
      </h3>
      <p className="text-[13px] text-brand-near-black/60 mt-1.5 leading-relaxed">
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
                'inline-flex items-center rounded-full px-3.5 h-[36px] text-[13px] font-semibold transition-colors min-h-[44px] sm:min-h-0',
                active
                  ? 'bg-brand-near-black text-white'
                  : 'bg-white text-brand-near-black/75 shadow-[inset_0_0_0_1px_rgba(45,43,42,0.12)] hover:text-brand-near-black',
              )}
            >
              {REASON_LABEL[r]}
            </button>
          )
        })}
      </div>

      <label className="block mt-5">
        <span className="text-[11.5px] font-semibold uppercase tracking-wide text-brand-near-black/50">
          Anything else? (optional)
        </span>
        <textarea
          value={note}
          onChange={e => setNote(e.target.value.slice(0, 240))}
          maxLength={240}
          rows={3}
          placeholder="Add context — Fetchi&rsquo;s feedback loop reads this."
          className="mt-1.5 w-full rounded-xl bg-white px-3.5 py-2.5 text-[13.5px] leading-relaxed text-brand-near-black shadow-[inset_0_0_0_1px_rgba(45,43,42,0.10)] placeholder:text-brand-near-black/35 focus:outline-none focus:shadow-[inset_0_0_0_2px_rgba(88,147,126,0.5)]"
        />
        <div className="text-right text-[11px] text-brand-near-black/40 mt-1 tabular-nums">
          {note.length}/240
        </div>
      </label>

      <div className="mt-5 grid grid-cols-2 gap-2.5">
        <button
          type="button"
          onClick={onCancel}
          disabled={pending}
          className={cn(
            'inline-flex items-center justify-center rounded-[18px] text-[14px] font-semibold transition-all disabled:opacity-60',
            ACTION_BUTTON_HEIGHT,
            SECONDARY_BUTTON_SURFACE,
          )}
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={() => onSubmit({ reasons, note: note.trim() ? note.trim() : null })}
          disabled={!canSubmit}
          className={cn(
            'inline-flex items-center justify-center rounded-[18px] text-[14px] font-semibold transition-all disabled:opacity-60 disabled:cursor-not-allowed',
            ACTION_BUTTON_HEIGHT,
            PRIMARY_BUTTON_SURFACE,
          )}
        >
          {pending ? 'Saving…' : 'Submit & pass'}
        </button>
      </div>
    </section>
  )
}
