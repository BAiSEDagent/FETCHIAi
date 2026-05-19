'use client'

import { useState, useTransition } from 'react'
import { updateLeadOutcome } from './actions'

type Status = 'new' | 'saved' | 'contacted' | 'responded' | 'won' | 'lost' | 'skipped'

const OPTIONS: { id: Status; label: string }[] = [
  { id: 'saved', label: 'Save for later' },
  { id: 'contacted', label: 'Contacted' },
  { id: 'responded', label: 'Responded' },
  { id: 'won', label: 'Won' },
  { id: 'lost', label: 'Lost' },
  { id: 'skipped', label: 'Skip' },
]

const VALID_STATUSES: readonly Status[] = [
  'new', 'saved', 'contacted', 'responded', 'won', 'lost', 'skipped',
] as const

function parseStatus(input: string | null | undefined): Status {
  if (input && (VALID_STATUSES as readonly string[]).includes(input)) {
    return input as Status
  }
  // Anything we don't recognize (e.g. legacy `expired`) lands on `new` so the
  // outcome buttons stay valid and the next save won't fail zod validation.
  return 'new'
}

type Props = {
  opportunityId: string
  currentStatus: string
  currentNotes: string | null
}

export function OutcomeForm({ opportunityId, currentStatus, currentNotes }: Props) {
  const [status, setStatus] = useState<Status>(parseStatus(currentStatus))
  const [notes, setNotes] = useState(currentNotes ?? '')
  const [pending, startTransition] = useTransition()
  const [saved, setSaved] = useState(false)

  function save(next: Status) {
    setStatus(next)
    setSaved(false)
    startTransition(async () => {
      await updateLeadOutcome({ opportunityId, status: next, outcomeNotes: notes })
      setSaved(true)
    })
  }

  function saveNotes() {
    setSaved(false)
    startTransition(async () => {
      await updateLeadOutcome({ opportunityId, status, outcomeNotes: notes })
      setSaved(true)
    })
  }

  return (
    <div className="bg-white border border-brand-near-black/10 rounded-xl p-4 lg:p-5">
      <div className="text-[12px] font-semibold text-brand-near-black mb-3">
        Outcome
      </div>
      <div className="flex flex-wrap gap-2 mb-4">
        {OPTIONS.map(o => (
          <button
            key={o.id}
            onClick={() => save(o.id)}
            disabled={pending}
            className={`text-[12px] font-medium px-4 py-2.5 rounded-lg border-[1.5px] transition-colors min-h-[44px] min-w-[44px] ${
              status === o.id
                ? 'bg-brand-near-black text-white border-brand-near-black'
                : 'bg-white text-brand-near-black/65 border-brand-near-black/15 hover:border-brand-near-black hover:text-brand-near-black'
            }`}
          >
            {o.label}
          </button>
        ))}
      </div>

      <label className="block text-[11px] font-semibold uppercase tracking-wider text-brand-near-black/45 mb-1.5">
        Notes (for Outcome Learning)
      </label>
      <textarea
        value={notes}
        onChange={e => setNotes(e.target.value)}
        onBlur={saveNotes}
        placeholder="What happened? — wins and losses both teach Fetchi who to find next."
        className="w-full px-3 py-2.5 border-[1.5px] border-brand-near-black/12 rounded-lg text-[13px] outline-none focus:border-brand-green resize-y min-h-[80px]"
      />
      {saved && (
        <div className="text-[11px] text-brand-green mt-2">Saved.</div>
      )}
    </div>
  )
}
