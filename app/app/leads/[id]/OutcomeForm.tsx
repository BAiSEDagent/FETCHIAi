'use client'

import { useState, useTransition } from 'react'
import { updateLeadOutcome } from './actions'
import { SectionCard } from '@/components/app/SectionCard'
import { Textarea } from '@/components/ui/textarea'

type Status = 'new' | 'saved' | 'contacted' | 'responded' | 'won' | 'lost' | 'skipped'

// Calm CP2.5B-aligned tones: positive outcomes use ok (success), negative
// outcomes use a near-black wash so the destructive choices still read
// clearly without screaming.
type ActiveTone = 'positive' | 'negative'

const OPTIONS: { id: Status; label: string; tone: ActiveTone }[] = [
  { id: 'saved',     label: 'Save for later', tone: 'positive' },
  { id: 'contacted', label: 'Contacted',      tone: 'positive' },
  { id: 'responded', label: 'Responded',      tone: 'positive' },
  { id: 'won',       label: 'Won',            tone: 'positive' },
  { id: 'lost',      label: 'Lost',           tone: 'negative' },
  { id: 'skipped',   label: 'Skip',           tone: 'negative' },
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
    <SectionCard title="Outcome" description="What happened? Wins and losses both teach Fetchi who to find next.">
      <div className="flex flex-wrap gap-2 mb-4">
        {OPTIONS.map(o => {
          const active = status === o.id
          const activeClass =
            o.tone === 'positive'
              ? 'bg-ok text-white border-ok'
              : 'bg-text/15 text-text border-text/25'
          return (
            <button
              key={o.id}
              type="button"
              onClick={() => save(o.id)}
              disabled={pending}
              aria-pressed={active}
              className={`text-[13px] font-semibold px-4 rounded-xl transition-colors min-h-[44px] border ${
                active
                  ? activeClass
                  : 'bg-raised text-text border-text/10 hover:border-text/25 hover:bg-text/[0.06]'
              }`}
            >
              {o.label}
            </button>
          )
        })}
      </div>

      <label
        htmlFor="outcome-notes"
        className="block text-[11px] font-bold uppercase tracking-[1px] text-text/45 mb-1.5"
      >
        Notes (for Outcome Learning)
      </label>
      <Textarea
        id="outcome-notes"
        value={notes}
        onChange={e => setNotes(e.target.value)}
        onBlur={saveNotes}
        placeholder="What happened?"
      />
      {saved && (
        <div className="text-[12px] text-ok mt-2 font-semibold">
          Saved.
        </div>
      )}
    </SectionCard>
  )
}
