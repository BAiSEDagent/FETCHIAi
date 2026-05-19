import { notFound } from 'next/navigation'
import Link from 'next/link'
import { and, eq } from 'drizzle-orm'
import { db, opportunities, contactRoutes, outreachPlays } from '@/db'
import { requireWorkspaceContext } from '@/lib/workspace'
import { SectionCard } from '@/components/app/SectionCard'
import { Button } from '@/components/ui/button'
import { OutcomeForm } from './OutcomeForm'
import { ChevronLeft, ChevronRight, MoreHorizontal } from 'lucide-react'
import { GlyphTile, glyphForSignalType, type GlyphKey } from '@/components/app/GlyphTile'
import { formatSignalToken } from '@/lib/signals/token'

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
        Score combines signal strength, recency, fit, and reachability.
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

// Picks the first complete sentence from a paragraph. Falls back to the full
// trimmed string when no sentence-end punctuation is present, then to a
// generic line so the hero never reads as truncated.
function firstSentence(text: string | null | undefined, fallback: string): string {
  if (!text) return fallback
  const trimmed = text.trim()
  if (!trimmed) return fallback
  const match = trimmed.match(/^[^.!?]+[.!?]/)
  if (match) return match[0].trim()
  // No terminator — return the whole line if it's short, otherwise fallback.
  if (trimmed.length <= 140) return trimmed
  return fallback
}

const SIGNAL_TYPE_LABEL: Record<string, string> = {
  storm_damage: 'Storm damage',
  weather_hail: 'Hail event',
  weather_wind: 'High-wind event',
  building_permit: 'Building permit',
  new_business_listing: 'New listing',
  job_posting: 'Job posting',
  event: 'Local event',
  funding: 'Funding',
  news: 'News',
  review: 'Review',
  social: 'Social',
  expansion: 'Expansion',
  ownership_change: 'Ownership change',
  other: 'Signal',
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
    ? (SIGNAL_TYPE_LABEL[signal.signalType] ?? signal.signalType.replace(/_/g, ' '))
    : 'Signal'
  const signalToken = signal
    ? formatSignalToken({
        signalType: signal.signalType,
        detectedAt: signal.detectedAt ?? signal.createdAt,
        parsedData: (signal.parsedData ?? null) as Record<string, unknown> | null,
      })
    : null
  const evidenceCount =
    (signal?.whyRelevant ? 1 : 0) +
    contacts.length +
    drafts.length +
    (opp.whyNow ? 1 : 0)
  const locationLine = prospect?.city
    ? `${prospect.city}${prospect.state ? `, ${prospect.state}` : ''}`
    : null
  const businessName = prospect?.businessName ?? 'Unknown business'
  const summaryLine = firstSentence(
    opp.whyNow ?? signal?.whyRelevant,
    'Fresh signal matched to an opportunity worth a closer look.',
  )

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
            Lead detail
          </div>
          <div className="text-[14px] font-semibold text-brand-near-black truncate">
            {businessName}
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

      {/* Bottom padding leaves room for the fixed CTA (~76px) + bottom nav
          (~68px + safe-area) on mobile; desktop drops back to a normal pad. */}
      <div className="px-4 lg:px-7 pb-[calc(env(safe-area-inset-bottom)+200px)] lg:pb-12 space-y-3 lg:space-y-4">
        {/* Transaction-card hero */}
        <div className="text-center pt-3 pb-2">
          <div className="flex items-center justify-center flex-wrap gap-1.5">
            <span
              className="inline-flex items-center rounded-full h-[24px] px-2.5 text-[11px] font-bold tracking-[0.04em] tabular-nums bg-brand-near-black/[0.05] text-brand-near-black/75"
              aria-label={`Signal ${signalToken ?? signalTypeLabel}`}
            >
              {signalToken ?? signalTypeLabel.toUpperCase()}
            </span>
            {opp.status === 'new' && (
              <span className="inline-flex items-center rounded-full h-[24px] px-2.5 text-[11px] font-semibold bg-brand-cream-muted text-brand-near-black/65">
                No claim filed
              </span>
            )}
          </div>

          <div className="font-outfit text-[68px] lg:text-[76px] leading-none font-bold text-brand-green tabular-nums mt-5">
            {opp.score}
          </div>
          <div className="text-[13px] text-brand-near-black/55 mt-2 font-medium px-4">
            {summaryLine}
          </div>

          <h1 className="font-outfit text-[26px] lg:text-[30px] font-bold text-brand-near-black leading-tight mt-5 px-2">
            {businessName}
          </h1>
          {locationLine && (
            <div className="text-[13px] text-brand-near-black/55 mt-1.5">
              {locationLine}
            </div>
          )}
        </div>

        {opp.whyNow && (
          <SectionCard eyebrow="Why now" tone="highlight">
            <p className="text-[14px] text-brand-dark leading-[1.6]">
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
                glyph={glyphForSignalType(signal?.signalType ?? null)}
                tone="muted"
                title={`${signalTypeLabel} report`}
                meta={
                  signal.detectedAt
                    ? `${signal.detectedAt.toLocaleDateString()} · ${signal.detectedAt.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}`
                    : 'Signal detected'
                }
              />
            )}
            {prospect?.address && (
              <EvidenceRow
                glyph="house"
                tone="muted"
                title="Property record"
                meta={`${prospect.address}, ${prospect.city ?? ''} ${prospect.state ?? ''}`.trim()}
              />
            )}
            {contacts.length > 0 && (
              <EvidenceRow
                glyph="user"
                tone="muted"
                title="Contacts enriched"
                meta={`${contacts.length} contact${contacts.length === 1 ? '' : 's'} on file`}
              />
            )}
            {drafts.length > 0 && (
              <EvidenceRow
                glyph="sparkle"
                tone="muted"
                title="Outreach draft ready"
                meta="Reviewable below"
              />
            )}
            {evidenceCount === 0 && (
              <div className="text-[13px] text-brand-near-black/55 py-2">
                Evidence unavailable for this lead yet.
              </div>
            )}
          </div>
        </SectionCard>

        {signal?.whyRelevant && (
          <SectionCard eyebrow="Signal evidence">
            <p className="text-[14px] text-brand-near-black/75 leading-[1.6]">
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
              <div className="flex items-center gap-1.5 text-[12.5px] text-brand-near-black/55">
                <span className="w-1.5 h-1.5 rounded-full bg-brand-near-black/20" />
                Finding best contact
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
              Draft will appear here once outreach is enabled.
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
                    {/* TODO follow-up #13 — wire to real outreach send flow */}
                    <Button size="sm">Open draft &amp; contact</Button>
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

      {/* Sticky primary action — sits ABOVE the MobileBottomNav (z-30, ~68px
          high + safe-area). CTA uses z-40 so the two bars stack cleanly:
          nav at the absolute bottom, action bar one row up. Desktop hides
          the entire bar — actions live in the page body there. */}
      <div
        className="lg:hidden fixed inset-x-0 z-40 bg-brand-parchment/95 backdrop-blur-md border-t border-brand-near-black/8 px-4 pt-3 pb-3"
        style={{ bottom: 'calc(env(safe-area-inset-bottom) + 68px)' }}
      >
        <button
          type="button"
          className="w-full h-14 rounded-full bg-brand-green text-white text-[16px] font-semibold hover:bg-brand-dark transition-colors shadow-fetchi-card"
        >
          {drafts.length > 0 ? 'Open draft & contact' : 'Save for later'}
        </button>
        <div className="flex items-center justify-center gap-6 mt-2.5 text-[13px] text-brand-near-black/55">
          {/* TODO follow-up #13 — wire Save / Pass to updateLeadOutcome */}
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
  glyph,
  title,
  meta,
  tone = 'muted',
}: {
  glyph: GlyphKey
  title: string
  meta: string
  tone?: 'coral' | 'muted'
}) {
  return (
    <div className="flex items-center gap-3 py-3 border-b border-brand-near-black/6 last:border-0">
      <GlyphTile glyph={glyph} tone={tone} size="md" />
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
