import Link from 'next/link'
import { notFound } from 'next/navigation'
import { and, eq } from 'drizzle-orm'
import { db, opportunities, contactRoutes, outreachPlays } from '@/db'
import { requireWorkspaceContext } from '@/lib/workspace'
import { ChevronLeft } from 'lucide-react'
import { OutcomeForm } from './OutcomeForm'

export const dynamic = 'force-dynamic'

function ScoreBreakdown({
  score,
  signalDetectedAt,
  hasWhyNow,
  contactCount,
  enrichmentStatus,
}: {
  score: number
  signalDetectedAt: Date | null
  hasWhyNow: boolean
  contactCount: number
  enrichmentStatus: string | null
}) {
  // Lightweight, deterministic breakdown derived from existing fields. The
  // live multi-factor scorer lands with the scoring agent (CP6) — until then
  // this gives the user a transparent read on *why* the score is what it is.
  const signalStrength = Math.max(0, Math.min(100, score))
  const ageDays = signalDetectedAt
    ? Math.max(
        0,
        Math.floor((Date.now() - signalDetectedAt.getTime()) / 86_400_000),
      )
    : null
  const recency =
    ageDays === null ? 50 : Math.max(0, Math.min(100, 100 - ageDays * 7))
  const fit = hasWhyNow ? 85 : 60
  const reachability =
    enrichmentStatus === 'complete'
      ? Math.min(100, 50 + contactCount * 15)
      : contactCount > 0
        ? Math.min(100, 35 + contactCount * 15)
        : 25

  const rows = [
    { label: 'Signal strength', pct: signalStrength },
    { label: 'Recency', pct: recency },
    { label: 'Fit to your business', pct: fit },
    { label: 'Reachability', pct: reachability },
  ]

  return (
    <div className="bg-white border border-brand-near-black/10 rounded-xl p-4 lg:p-5 mb-5">
      <div className="text-[10px] font-bold uppercase tracking-[1px] text-brand-near-black/45 mb-3">
        Score breakdown
      </div>
      <div className="space-y-2.5">
        {rows.map(r => (
          <div key={r.label}>
            <div className="flex items-center justify-between mb-1">
              <span className="text-[12px] text-brand-near-black/70">
                {r.label}
              </span>
              <span className="text-[11px] font-semibold text-brand-near-black/55 tabular-nums">
                {r.pct}
              </span>
            </div>
            <div className="h-1.5 rounded-full bg-brand-near-black/8 overflow-hidden">
              <div
                className="h-full bg-brand-green"
                style={{ width: `${r.pct}%` }}
              />
            </div>
          </div>
        ))}
      </div>
      <div className="text-[11px] text-brand-near-black/45 mt-3 leading-snug">
        Live multi-factor scoring ships with the scoring agent in Checkpoint 6.
      </div>
    </div>
  )
}

function ConfidenceDots({ pct }: { pct: number }) {
  const filled = Math.round((pct / 100) * 5)
  return (
    <div className="flex gap-1">
      {[0, 1, 2, 3, 4].map(i => (
        <span
          key={i}
          className={`w-1.5 h-1.5 rounded-full ${
            i < filled ? 'bg-brand-green' : 'bg-brand-near-black/10'
          }`}
        />
      ))}
    </div>
  )
}

export default async function LeadProfilePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const ctx = await requireWorkspaceContext()

  const opp = await db.query.opportunities.findFirst({
    where: (t, { eq: e, and: a }) =>
      a(e(t.id, id), e(t.workspaceId, ctx.workspaceId)),
  })
  if (!opp) notFound()

  const [prospect, signal, contacts, drafts] = await Promise.all([
    opp.prospectId
      ? db.query.prospects.findFirst({
          where: (t, { eq: e, and: a }) =>
            a(e(t.id, opp.prospectId!), e(t.workspaceId, ctx.workspaceId)),
        })
      : Promise.resolve(null),
    opp.signalId
      ? db.query.signals.findFirst({
          where: (t, { eq: e, and: a }) =>
            a(e(t.id, opp.signalId!), e(t.workspaceId, ctx.workspaceId)),
        })
      : Promise.resolve(null),
    opp.prospectId
      ? db
          .select()
          .from(contactRoutes)
          .where(
            and(
              eq(contactRoutes.workspaceId, ctx.workspaceId),
              eq(contactRoutes.prospectId, opp.prospectId),
            ),
          )
      : Promise.resolve([]),
    db
      .select()
      .from(outreachPlays)
      .where(
        and(
          eq(outreachPlays.workspaceId, ctx.workspaceId),
          eq(outreachPlays.opportunityId, opp.id),
        ),
      ),
  ])

  return (
    <div className="px-4 lg:px-7 py-5 lg:py-7 max-w-3xl">
      <Link
        href="/app/leads"
        className="inline-flex items-center gap-1.5 text-[12px] text-brand-near-black/55 hover:text-brand-near-black mb-5 min-h-[44px]"
      >
        <ChevronLeft className="h-4 w-4" /> All leads
      </Link>

      <div className="flex items-start justify-between gap-4 mb-6">
        <div className="min-w-0">
          <h1 className="font-outfit text-2xl lg:text-[26px] text-brand-near-black break-words">
            {prospect?.businessName ?? 'Unknown business'}
          </h1>
          <div className="flex items-center gap-2 mt-2 flex-wrap">
            {signal && (
              <span className="inline-flex items-center gap-1.5 text-[12px] font-medium bg-brand-light text-brand-dark rounded-md px-2.5 py-1 border border-brand-green/20">
                {signal.signalType.replace(/_/g, ' ')}
              </span>
            )}
            {prospect?.city && (
              <span className="text-[12px] text-brand-near-black/55">
                {prospect.city}, {prospect.state}
              </span>
            )}
          </div>
        </div>
        <div className="text-right flex-shrink-0">
          <div className="font-outfit text-[48px] leading-none text-brand-green">
            {opp.score}
          </div>
          <div className="text-[11px] text-brand-near-black/55 mt-1">score</div>
        </div>
      </div>

      <ScoreBreakdown
        score={opp.score}
        signalDetectedAt={signal?.detectedAt ?? null}
        hasWhyNow={Boolean(opp.whyNow)}
        contactCount={contacts.length}
        enrichmentStatus={prospect?.enrichmentStatus ?? null}
      />

      {opp.whyNow && (
        <div className="bg-brand-light border-[1.5px] border-brand-green/20 rounded-xl p-4 lg:p-5 mb-5">
          <div className="text-[10px] font-bold uppercase tracking-[1px] text-brand-dark mb-1.5">
            Why now
          </div>
          <p className="text-[13px] text-brand-dark leading-[1.65]">{opp.whyNow}</p>
        </div>
      )}

      {signal?.whyRelevant && (
        <div className="bg-white border border-brand-near-black/10 rounded-xl p-4 lg:p-5 mb-5">
          <div className="text-[10px] font-bold uppercase tracking-[1px] text-brand-near-black/45 mb-1.5">
            Signal evidence
          </div>
          <p className="text-[13px] text-brand-near-black/75 leading-[1.65]">
            {signal.whyRelevant}
          </p>
        </div>
      )}

      <div className="grid grid-cols-2 gap-2.5 mb-5">
        <div className="bg-white border border-brand-near-black/10 rounded-xl p-3.5">
          <div className="text-[10px] font-semibold uppercase tracking-[1px] text-brand-near-black/40 mb-1">
            Phone
          </div>
          <div className="text-[13px] text-brand-near-black font-medium">
            {prospect?.phone ?? '—'}
          </div>
        </div>
        <div className="bg-white border border-brand-near-black/10 rounded-xl p-3.5">
          <div className="text-[10px] font-semibold uppercase tracking-[1px] text-brand-near-black/40 mb-1">
            Website
          </div>
          <div className="text-[13px] text-brand-green font-medium truncate">
            {prospect?.website ? (
              <a href={`https://${prospect.website}`} target="_blank" rel="noreferrer">
                {prospect.website}
              </a>
            ) : (
              '—'
            )}
          </div>
        </div>
        <div className="bg-white border border-brand-near-black/10 rounded-xl p-3.5 col-span-2">
          <div className="text-[10px] font-semibold uppercase tracking-[1px] text-brand-near-black/40 mb-1">
            Address
          </div>
          <div className="text-[13px] text-brand-near-black font-medium">
            {prospect?.address
              ? `${prospect.address}, ${prospect.city}, ${prospect.state}`
              : '—'}
          </div>
        </div>
      </div>

      <div className="bg-white border border-brand-near-black/10 rounded-xl p-4 lg:p-5 mb-5">
        <div className="text-[12px] font-semibold text-brand-near-black mb-3">
          Contacts
        </div>
        {contacts.length === 0 && (
          <div className="text-[12px] text-brand-near-black/55">
            No contacts enriched yet.
          </div>
        )}
        {contacts.map(c => (
          <div
            key={c.id}
            className="flex items-center gap-3 py-2 border-b border-brand-near-black/6 last:border-0"
          >
            <div className="w-8 h-8 rounded-lg bg-[#F0EDE4] flex items-center justify-center text-[12px] text-brand-near-black/60 flex-shrink-0">
              {c.contactName?.[0] ?? '?'}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[13px] font-semibold text-brand-near-black truncate">
                {c.contactName ?? 'Unknown contact'}
              </div>
              <div className="text-[11px] text-brand-near-black/55 truncate">
                {c.contactTitle ?? '—'}
                {c.contactEmail && (
                  <>
                    {' · '}
                    <span className="text-brand-green">{c.contactEmail}</span>
                  </>
                )}
              </div>
            </div>
            <ConfidenceDots pct={c.confidence ?? 0} />
          </div>
        ))}
      </div>

      <div className="bg-white border border-brand-near-black/10 rounded-xl p-4 lg:p-5 mb-5">
        <div className="text-[10px] font-bold uppercase tracking-[1px] text-brand-green mb-2.5">
          ✦ Outreach draft
        </div>
        {drafts.length === 0 ? (
          <div className="text-[12px] text-brand-near-black/55">
            No draft yet. The outreach agent will write one once it&apos;s live (Checkpoint 6).
          </div>
        ) : (
          drafts.map(d => (
            <div key={d.id} className="space-y-2">
              {d.subjectLine && (
                <div className="text-[12px] font-semibold text-brand-near-black">
                  {d.subjectLine}
                </div>
              )}
              <p className="text-[12px] text-brand-near-black/70 leading-[1.65] whitespace-pre-wrap">
                {d.body}
              </p>
              <div className="flex gap-2 pt-2">
                <button className="text-[12px] font-medium px-3.5 py-2 rounded-lg bg-brand-near-black text-white hover:bg-brand-green min-h-[40px]">
                  Send to my email
                </button>
                <button className="text-[12px] font-medium px-3.5 py-2 rounded-lg border border-brand-near-black/15 text-brand-near-black/65 hover:border-brand-near-black hover:text-brand-near-black min-h-[40px]">
                  Edit
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      <OutcomeForm
        opportunityId={opp.id}
        currentStatus={opp.status}
        currentNotes={opp.outcomeNotes}
      />
    </div>
  )
}
