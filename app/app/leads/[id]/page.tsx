import { notFound } from 'next/navigation'
import { and, eq } from 'drizzle-orm'
import { db, opportunities, contactRoutes, outreachPlays } from '@/db'
import { requireWorkspaceContext } from '@/lib/workspace'
import { MobileScreenHeader } from '@/components/app/MobileScreenHeader'
import { SectionCard } from '@/components/app/SectionCard'
import { Button } from '@/components/ui/button'
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
    <SectionCard eyebrow="Score breakdown">
      <div className="space-y-3">
        {rows.map(r => (
          <div key={r.label}>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[13px] text-brand-near-black/75">
                {r.label}
              </span>
              <span className="text-[12px] font-semibold text-brand-near-black/55 tabular-nums">
                {r.pct}
              </span>
            </div>
            <div className="h-1.5 rounded-full bg-brand-near-black/8 overflow-hidden">
              <div
                className="h-full bg-brand-green transition-all"
                style={{ width: `${r.pct}%` }}
              />
            </div>
          </div>
        ))}
      </div>
      <p className="text-[12px] text-brand-near-black/45 mt-4 leading-relaxed">
        Live multi-factor scoring ships with the scoring agent in Checkpoint 6.
      </p>
    </SectionCard>
  )
}

function ConfidenceDots({ pct }: { pct: number }) {
  const filled = Math.round((pct / 100) * 5)
  return (
    <div className="flex gap-1" aria-label={`Confidence ${pct}%`}>
      {[0, 1, 2, 3, 4].map(i => (
        <span
          key={i}
          className={`w-1.5 h-1.5 rounded-full ${
            i < filled ? 'bg-brand-green' : 'bg-brand-near-black/12'
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
    <div className="max-w-3xl">
      <MobileScreenHeader
        title={prospect?.businessName ?? 'Unknown business'}
        backHref="/app/leads"
        backLabel="All leads"
        actions={
          <div className="text-right">
            <div className="font-outfit text-[40px] lg:text-[48px] leading-none font-bold text-brand-green tabular-nums">
              {opp.score}
            </div>
            <div className="text-[11px] uppercase tracking-[1px] text-brand-near-black/45 mt-1 font-semibold">
              score
            </div>
          </div>
        }
      />

      <div className="px-4 lg:px-7 pb-10 space-y-3 lg:space-y-4">
        <div className="flex items-center gap-2 flex-wrap -mt-1">
          {signal && (
            <span className="inline-flex items-center gap-1.5 text-[12px] font-semibold bg-brand-light text-brand-dark rounded-full px-3 py-1 border border-brand-green/25">
              <span className="w-1.5 h-1.5 rounded-full bg-brand-green" />
              {signal.signalType.replace(/_/g, ' ')}
            </span>
          )}
          {prospect?.city && (
            <span className="text-[12.5px] text-brand-near-black/55">
              {prospect.city}, {prospect.state}
            </span>
          )}
        </div>

        {opp.whyNow && (
          <SectionCard eyebrow="Why now" tone="highlight">
            <p className="text-[14px] text-brand-dark leading-[1.65]">
              {opp.whyNow}
            </p>
          </SectionCard>
        )}

        {signal?.whyRelevant && (
          <SectionCard eyebrow="Signal evidence">
            <p className="text-[14px] text-brand-near-black/75 leading-[1.65]">
              {signal.whyRelevant}
            </p>
          </SectionCard>
        )}

        <ScoreBreakdown
          score={opp.score}
          signalDetectedAt={signal?.detectedAt ?? null}
          hasWhyNow={Boolean(opp.whyNow)}
          contactCount={contacts.length}
          enrichmentStatus={prospect?.enrichmentStatus ?? null}
        />

        <SectionCard title="Contact routes">
          <div className="grid grid-cols-2 gap-2.5">
            <InfoTile label="Phone" value={prospect?.phone ?? '—'} />
            <InfoTile
              label="Website"
              value={
                prospect?.website ? (
                  <a
                    href={`https://${prospect.website}`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-brand-green hover:text-brand-dark truncate inline-block max-w-full"
                  >
                    {prospect.website}
                  </a>
                ) : (
                  '—'
                )
              }
            />
            <InfoTile
              label="Address"
              value={
                prospect?.address
                  ? `${prospect.address}, ${prospect.city}, ${prospect.state}`
                  : '—'
              }
              wide
            />
          </div>

          <div className="mt-4 pt-4 border-t border-brand-near-black/8">
            <div className="text-[11px] font-bold uppercase tracking-[1px] text-brand-near-black/45 mb-3">
              Contacts
            </div>
            {contacts.length === 0 ? (
              <div className="text-[13px] text-brand-near-black/55">
                No contacts enriched yet.
              </div>
            ) : (
              <div className="space-y-0">
                {contacts.map(c => (
                  <div
                    key={c.id}
                    className="flex items-center gap-3 py-2.5 border-b border-brand-near-black/6 last:border-0"
                  >
                    <div className="w-9 h-9 rounded-lg bg-brand-cream-muted flex items-center justify-center text-[13px] font-semibold text-brand-near-black/60 flex-shrink-0">
                      {c.contactName?.[0] ?? '?'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-[13.5px] font-semibold text-brand-near-black truncate">
                        {c.contactName ?? 'Unknown contact'}
                      </div>
                      <div className="text-[12px] text-brand-near-black/55 truncate">
                        {c.contactTitle ?? '—'}
                        {c.contactEmail && (
                          <>
                            {' · '}
                            <span className="text-brand-green">
                              {c.contactEmail}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                    <ConfidenceDots pct={c.confidence ?? 0} />
                  </div>
                ))}
              </div>
            )}
          </div>
        </SectionCard>

        <SectionCard
          eyebrow={
            <span className="text-brand-green">✦ Outreach draft</span>
          }
        >
          {drafts.length === 0 ? (
            <div className="text-[13px] text-brand-near-black/55 leading-relaxed">
              No draft yet. The outreach agent will write one once it&apos;s live
              (Checkpoint 6).
            </div>
          ) : (
            <div className="space-y-4">
              {drafts.map(d => (
                <div key={d.id} className="space-y-2.5">
                  {d.subjectLine && (
                    <div className="text-[13px] font-semibold text-brand-near-black">
                      {d.subjectLine}
                    </div>
                  )}
                  <p className="text-[13px] text-brand-near-black/75 leading-[1.65] whitespace-pre-wrap">
                    {d.body}
                  </p>
                  <div className="flex flex-wrap gap-2 pt-1">
                    <Button size="sm">Send to my email</Button>
                    <Button size="sm" variant="secondary">
                      Edit
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </SectionCard>

        <OutcomeForm
          opportunityId={opp.id}
          currentStatus={opp.status}
          currentNotes={opp.outcomeNotes}
        />
      </div>
    </div>
  )
}

function InfoTile({
  label,
  value,
  wide,
}: {
  label: string
  value: React.ReactNode
  wide?: boolean
}) {
  return (
    <div
      className={`rounded-xl bg-brand-cream-muted px-3.5 py-3 ${
        wide ? 'col-span-2' : ''
      }`}
    >
      <div className="text-[10.5px] font-bold uppercase tracking-[1px] text-brand-near-black/45 mb-1">
        {label}
      </div>
      <div className="text-[13.5px] text-brand-near-black font-medium break-words">
        {value}
      </div>
    </div>
  )
}
