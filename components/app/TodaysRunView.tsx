'use client'

import * as React from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Eye, Check, X, ArrowRight } from 'lucide-react'
import { LeadCard, type LeadCardSignalType } from '@/components/app/LeadCard'
import { EmptyState } from '@/components/app/EmptyState'
import { GlyphTile } from '@/components/app/GlyphTile'
import { updateLeadOutcome } from '@/app/app/leads/[id]/actions'

export type TodaysRunItem = {
  id: string
  status: string | null
  score: number
  businessName: string
  location: string | null
  whyNow: string | null
  signalLabel: string
  signalType: LeadCardSignalType
  signalToken: string | null
  contactName: string | null
  contactConfidence: number | null
  evidenceCount: number
}

type Props = {
  initialQueue: TodaysRunItem[]
  /** When true the queue is in-memory only (dev fallback). Pass/Add do not call the server. */
  isDemo?: boolean
}

export function TodaysRunView({ initialQueue, isDemo = false }: Props) {
  const router = useRouter()
  const [index, setIndex] = React.useState(0)
  const [pending, startTransition] = React.useTransition()

  const total = initialQueue.length
  const current = initialQueue[index]
  const completed = index >= total

  const act = React.useCallback(
    (nextStatus: 'saved' | 'skipped') => {
      if (!current) return
      const targetId = current.id
      // Optimistic local advance — the addendum requires the card to leave the
      // session immediately after the user acts on it, regardless of the
      // server query window.
      setIndex(i => i + 1)
      if (isDemo) return
      startTransition(async () => {
        try {
          await updateLeadOutcome({
            opportunityId: targetId,
            status: nextStatus,
          })
          // Refresh server cache for /app/leads so the moved card is reflected.
          router.refresh()
        } catch (err) {
          console.error('[todays-run] updateLeadOutcome failed', err)
        }
      })
    },
    [current, isDemo, router],
  )

  if (total === 0) {
    return (
      <CompleteState
        title="No leads in the queue"
        body="Fetchi has nothing fresh waiting for review right now. New signals show up here as soon as scouting finds them."
      />
    )
  }

  if (completed) {
    return (
      <CompleteState
        title="Today's Run complete"
        body={`You reviewed ${total} ${total === 1 ? 'lead' : 'leads'}. Nice work — Fetchi will queue up the next batch.`}
      />
    )
  }

  const progressLabel = `${index + 1} of ${total}`

  return (
    <div className="space-y-4 lg:space-y-5">
      {/* Progress strip */}
      <div className="flex items-center justify-between">
        <div className="text-[12px] uppercase tracking-[1px] font-bold text-brand-near-black/45">
          {progressLabel}
        </div>
        <div className="flex items-center gap-1.5">
          {initialQueue.map((_, i) => (
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

      {/* Focused run card */}
      <LeadCard
        variant="run"
        href={`/app/leads/${current.id}`}
        businessName={current.businessName}
        signalLabel={current.signalLabel}
        signalType={current.signalType}
        signalToken={current.signalToken}
        score={current.score}
        whyNow={current.whyNow}
        status={current.status}
        location={current.location}
        contactName={current.contactName}
        contactConfidence={current.contactConfidence}
        evidenceChips={
          current.evidenceCount > 0
            ? Array.from({ length: current.evidenceCount }, (_, i) => ({
                label: `s${i}`,
              }))
            : undefined
        }
      />

      {/* Action row — buttons only (no drag/swipe yet) */}
      <div className="grid grid-cols-3 gap-2.5">
        <ActionButton
          tone="ghost"
          onClick={() => act('skipped')}
          disabled={pending}
          icon={<X className="h-4 w-4" />}
          label="Pass"
        />
        <Link
          href={`/app/leads/${current.id}`}
          className="inline-flex items-center justify-center gap-1.5 h-12 rounded-full bg-brand-cream shadow-fetchi-soft text-[13px] font-semibold text-brand-near-black/80 hover:text-brand-near-black transition-colors"
        >
          <Eye className="h-4 w-4" />
          Open evidence
        </Link>
        <ActionButton
          tone="primary"
          onClick={() => act('saved')}
          disabled={pending}
          icon={<Check className="h-4 w-4" />}
          label="Add to My Leads"
        />
      </div>

      {isDemo && (
        <p className="text-[11px] text-brand-near-black/45 text-center">
          Showing a sample queue — your real Today&rsquo;s Run will appear here
          once Fetchi finds fresh signals for this workspace.
        </p>
      )}
    </div>
  )
}

function ActionButton({
  tone,
  onClick,
  disabled,
  icon,
  label,
}: {
  tone: 'primary' | 'ghost'
  onClick: () => void
  disabled?: boolean
  icon: React.ReactNode
  label: string
}) {
  const base =
    'inline-flex items-center justify-center gap-1.5 h-12 rounded-full text-[13px] font-semibold transition-colors disabled:opacity-60 disabled:cursor-not-allowed'
  const palette =
    tone === 'primary'
      ? 'bg-brand-green text-white hover:bg-brand-dark'
      : 'bg-white border border-brand-near-black/10 text-brand-near-black/75 hover:border-brand-near-black/25 hover:text-brand-near-black'
  return (
    <button type="button" onClick={onClick} disabled={disabled} className={`${base} ${palette}`}>
      {icon}
      <span className="truncate">{label}</span>
    </button>
  )
}

function CompleteState({ title, body }: { title: string; body: string }) {
  return (
    <EmptyState
      icon={<GlyphTile glyph="sparkle" size="lg" />}
      title={title}
      body={body}
      action={
        <Link
          href="/app/leads"
          className="inline-flex items-center gap-1.5 h-11 px-5 rounded-full bg-brand-near-black text-white text-[13px] font-semibold hover:bg-brand-dark transition-colors"
        >
          Back to My Leads
          <ArrowRight className="h-4 w-4" />
        </Link>
      }
    />
  )
}
