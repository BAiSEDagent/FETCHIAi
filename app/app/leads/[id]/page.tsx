import { notFound } from 'next/navigation'
import Link from 'next/link'
import { and, eq } from 'drizzle-orm'
import { db, opportunities, contactRoutes, outreachPlays } from '@/db'
import { requireWorkspaceContext } from '@/lib/workspace'
import { SectionCard } from '@/components/app/SectionCard'
import { Button } from '@/components/ui/button'
import { OutcomeForm } from './OutcomeForm'
import { ChevronLeft, ChevronRight, MoreHorizontal } from 'lucide-react'

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

function relativeAge(d: Date | null): string | null {
  if (!d) return null
  const days = Math.floor((Date.now() - d.getTime()) / 86_400_000)
  if (days <= 0) return 'today'
  if (days === 1) return 'yesterday'
  if (days < 30) return `${days} days ago`
  return d.toLocaleDateString()
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

  const signalTypeLabel = signal?.signalType
    ? signal.signalType.replace(/_/g, ' ')
    : 'Signal'
  const ageLabel = relativeAge(signal?.detectedAt ?? signal?.createdAt ?? null)
  const evidenceCount =
    (signal?.whyRelevant ? 1 : 0) +
    contacts.length +
    drafts.length +
    (opp.whyNow ? 1 : 0)
  const locationLine = [
    prospect?.city && prospect?.state ? `${prospect.city}, ${prospect.state}` : null,
  ]
    .filter(Boolean)
    .join(' · ')

  return (
    <div className="max-w-3xl mx-auto">
      {/* Page-level back / breadcrumb / more — calm, not a sticky header */}
      <div className="flex items-center justify-between px-4 lg:px-7 pt-5 lg:pt-7 pb-2">
        <Link
          href="/app/leads"
          className="inline-flex items-center justify-center w-11 h-11 rounded-full bg-brand-cream shadow-fetchi-soft text-brand-near-black/75 hover:text-brand-near-black"
          aria-label="Back to leads"
        >
          <ChevronLeft className="h-5 w-5" />
        </Link>
        <div className="flex-1 text-center min-w-0 px-4">
          <div className="text-[11px] uppercase tracking-[1px] font-bold text-brand-near-black/45">
            Today&apos;s stack
          </div>
          <div className="text-[14px] font-semibold text-brand-near-black truncate">
            Lead · {opp.id.slice(0, 8).toUpperCase()}
          </div>
        </div>
        <button
          type="button"
          className="inline-flex items-center justify-center w-11 h-11 rounded-full bg-brand-cream shadow-fetchi-soft text-brand-near-black/75 hover:text-brand-near-black"
          aria-label="More options"
        >
          <MoreHorizontal className="h-5 w-5" />
        </button>
      </div>

      <div className="px-4 lg:px-7 pb-32 lg:pb-10 space-y-3 lg:space-y-4">
        {/* Transaction-card hero */}
        <div className="text-center pt-3 pb-2">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-coral/12 text-brand-coral px-3 py-1.5 text-[12px] font-semibold">
            <span className="w-1.5 h-1.5 rounded-full bg-brand-coral" />
            {signalTypeLabel}
            {ageLabel ? ` · ${ageLabel}` : ''}
            {opp.status === 'new' ? ' · No claim filed' : ''}
          </span>

          <div className="font-outfit text-[68px] lg:text-[76px] leading-none font-bold text-brand-green tabular-nums mt-5">
            {opp.score}
          </div>
          <div className="text-[13px] text-brand-near-black/55 mt-2 font-medium">
            {opp.whyNow ? opp.whyNow.split('.')[0] : 'Fresh signal worth a look'}
          </div>

          <h1 className="font-outfit text-[26px] lg:text-[30px] font-bold text-brand-near-black leading-tight mt-5 px-2">
            {prospect?.businessName ?? 'Unknown business'}
          </h1>
          {locationLine && (
            <div className="text-[13px] text-brand-near-black/55 mt-1.5">
              {locationLine}
            </div>
          )}
        </div>

        {opp.whyNow && (
          <SectionCard eyebrow="Why now" tone="highlight">
            <p className="text-[14px] text-brand-dark leading-[1.65]">
              {opp.whyNow}
            </p>
          </SectionCard>
        )}

        <SectionCard
          eyebrow="Evidence"
          actions={
            <span className="text-[12px] font-semibold text-brand-green">
              {evidenceCount} source{evidenceCount === 1 ? '' : 's'}
            </span>
          }
        >
          <div className="space-y-0 -mx-1">
            {signal?.whyRelevant && (
              <EvidenceRow
                icon="⛈️"
                tone="coral"
                title={`${signalTypeLabel.charAt(0).toUpperCase()}${signalTypeLabel.slice(1)} report`}
                meta={
                  signal.detectedAt
                    ? `${signal.detectedAt.toLocaleDateString()} · ${signal.detectedAt.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}`
                    : 'Signal detected'
                }
              />
            )}
            {prospect?.address && (
              <EvidenceRow
                icon="🏗️"
                tone="muted"
                title="Property record"
                meta={`${prospect.address}, ${prospect.city ?? ''} ${prospect.state ?? ''}`.trim()}
              />
            )}
            {contacts.length > 0 && (
              <EvidenceRow
                icon="👤"
                tone="muted"
                title="Contacts enriched"
                meta={`${contacts.length} contact${contacts.length === 1 ? '' : 's'} on file`}
              />
            )}
            {drafts.length > 0 && (
              <EvidenceRow
                icon="✦"
                tone="muted"
                title="Outreach draft ready"
                meta="Reviewable below"
              />
            )}
            {evidenceCount === 0 && (
              <div className="text-[13px] text-brand-near-black/55 py-2">
                Evidence enrichment lands with the enrichment agent (Checkpoint 6).
              </div>
            )}
          </div>
        </SectionCard>

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

      {/* Sticky primary action — single decision */}
      <div
        className="lg:hidden sticky bottom-0 left-0 right-0 bg-brand-parchment/95 backdrop-blur px-4 pt-3"
        style={{ paddingBottom: 'max(env(safe-area-inset-bottom), 12px)' }}
      >
        <button
          type="button"
          className="w-full h-14 rounded-full bg-brand-green text-white text-[16px] font-semibold hover:bg-brand-dark transition-colors shadow-fetchi-card"
        >
          Open draft &amp; contact
        </button>
        <div className="flex items-center justify-center gap-6 mt-2.5 text-[13px] text-brand-near-black/55">
          <button type="button" className="font-medium hover:text-brand-near-black">
            Save for later
          </button>
          <span aria-hidden>·</span>
          <button type="button" className="font-medium hover:text-brand-near-black">
            Pass
          </button>
        </div>
      </div>
    </div>
  )
}

function EvidenceRow({
  icon,
  title,
  meta,
  tone = 'muted',
}: {
  icon: string
  title: string
  meta: string
  tone?: 'coral' | 'muted'
}) {
  return (
    <div className="flex items-center gap-3 py-3 border-b border-brand-near-black/6 last:border-0">
      <div
        className={`w-9 h-9 rounded-xl flex items-center justify-center text-[15px] flex-shrink-0 ${
          tone === 'coral'
            ? 'bg-brand-coral/12 text-brand-coral'
            : 'bg-brand-cream-muted text-brand-near-black/65'
        }`}
        aria-hidden
      >
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-[13.5px] font-semibold text-brand-near-black truncate">
          {title}
        </div>
        <div className="text-[12px] text-brand-near-black/55 truncate">
          {meta}
        </div>
      </div>
      <ChevronRight className="h-4 w-4 text-brand-near-black/30 flex-shrink-0" />
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
