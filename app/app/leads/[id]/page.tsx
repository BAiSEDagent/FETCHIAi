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
import { leadStatusLabel, resolveLeadSurface } from '@/components/app/leadSurfaceResolver'
import { formatSignalToken } from '@/lib/signals/token'
import { cn } from '@/lib/utils'

export const dynamic = 'force-dynamic'

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

function summaryForSignalType(signalType: string | null | undefined): string {
  switch (signalType) {
    case 'storm_damage':
    case 'weather_hail':
    case 'weather_wind':
      return 'Fresh storm signal matched to a commercial roof opportunity.'
    case 'building_permit':
    case 'permit':
      return 'Recent permit activity suggests upcoming vendor need.'
    case 'new_business_listing':
    case 'expansion':
    case 'ownership_change':
      return 'New business activity suggests a timely outreach opportunity.'
    case 'job_posting':
      return 'Hiring activity suggests active growth and vendor demand.'
    default:
      return 'Fetchi found a timely signal worth reviewing.'
  }
}

export default async function LeadProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const ctx = await requireWorkspaceContext()

  const opp = await db.query.opportunities.findFirst({
    where: (t, { eq: e, and: a }) => a(e(t.id, id), e(t.workspaceId, ctx.workspaceId)),
  })
  if (!opp) notFound()

  const [prospect, signal, contacts, drafts] = await Promise.all([
    opp.prospectId
      ? db.query.prospects.findFirst({
          where: (t, { eq: e, and: a }) => a(e(t.id, opp.prospectId!), e(t.workspaceId, ctx.workspaceId)),
        })
      : Promise.resolve(null),
    opp.signalId
      ? db.query.signals.findFirst({
          where: (t, { eq: e, and: a }) => a(e(t.id, opp.signalId!), e(t.workspaceId, ctx.workspaceId)),
        })
      : Promise.resolve(null),
    opp.prospectId
      ? db.select().from(contactRoutes).where(and(eq(contactRoutes.workspaceId, ctx.workspaceId), eq(contactRoutes.prospectId, opp.prospectId)))
      : Promise.resolve([]),
    db.select().from(outreachPlays).where(and(eq(outreachPlays.workspaceId, ctx.workspaceId), eq(outreachPlays.opportunityId, opp.id))),
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
  const visual = resolveLeadSurface({
    context: 'detail',
    signalType: signal?.signalType ?? null,
    status: opp.status,
    score: opp.score,
  })
  const signalText = signalToken?.trim() || signalTypeLabel.toUpperCase()
  const evidenceCount = (signal?.whyRelevant ? 1 : 0) + contacts.length + drafts.length + (opp.whyNow ? 1 : 0)
  const locationLine = prospect?.city ? `${prospect.city}${prospect.state ? `, ${prospect.state}` : ''}` : null
  const businessName = prospect?.businessName ?? 'Unknown business'
  const summaryLine = summaryForSignalType(signal?.signalType)

  return (
    <div className="max-w-3xl mx-auto">
      <div className="flex items-center justify-between px-4 lg:px-7 pt-5 lg:pt-7 pb-2">
        <Link href="/app/leads" className="inline-flex items-center justify-center w-11 h-11 rounded-full bg-surface shadow-fetchi-soft text-text/75 hover:text-text" aria-label="Back to leads">
          <ChevronLeft className="h-5 w-5" />
        </Link>
        <div className="flex-1 text-center min-w-0 px-4">
          <div className="text-[11px] uppercase tracking-[1px] font-bold text-text/45">Lead detail</div>
        </div>
        <button type="button" className="inline-flex items-center justify-center w-11 h-11 rounded-full bg-surface shadow-fetchi-soft text-text/75 hover:text-text" aria-label="More options">
          <MoreHorizontal className="h-5 w-5" />
        </button>
      </div>

      <div className="px-4 lg:px-7 pb-[calc(env(safe-area-inset-bottom)+96px)] lg:pb-12 space-y-3 lg:space-y-4">
        <section className={cn('rounded-[20px] px-5 py-7 lg:px-8 lg:py-9 text-center', visual.surface)}>
          <div className="flex items-center justify-center flex-wrap gap-1.5">
            <span className={cn('inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-bold tracking-[0.04em] tabular-nums', visual.signalPill)} aria-label={`Signal ${signalText}`}>
              <span className={cn('w-1.5 h-1.5 rounded-full', visual.signalDot)} />
              {signalText}
            </span>
            <span className={cn('inline-flex items-center rounded-full px-3 py-1.5 text-[11px] font-semibold', visual.statusPill)}>
              {leadStatusLabel(opp.status)}
            </span>
            {opp.status === 'new' && (
              <span className={cn('inline-flex items-center rounded-full px-3 py-1.5 text-[11px] font-semibold', visual.metadataPill)}>
                No claim filed
              </span>
            )}
          </div>

          <div className={cn('font-outfit text-[72px] lg:text-[86px] leading-none font-bold tabular-nums mt-6', visual.score)}>
            {opp.score}
          </div>
          <p className={cn('text-body-lg mt-3 px-2', visual.muted)}>{summaryLine}</p>
          <h1 className={cn('font-outfit text-h1 lg:text-[32px] mt-6 px-2', visual.title)}>{businessName}</h1>
          {locationLine && <div className={cn('text-caption mt-1.5', visual.muted)}>{locationLine}</div>}
        </section>

        {opp.whyNow && (
          <SectionCard eyebrow="Why now" tone="highlight">
            <p className="text-body text-text/75">{opp.whyNow}</p>
          </SectionCard>
        )}

        <SectionCard eyebrow="Evidence" actions={<span className="text-[12px] font-semibold text-blue">{evidenceCount} source{evidenceCount === 1 ? '' : 's'}</span>}>
          <div className="space-y-0 -mx-1">
            {signal?.whyRelevant && <EvidenceRow glyph={glyphForSignalType(signal?.signalType ?? null)} title={`${signalTypeLabel} report`} meta={signal.detectedAt ? `${signal.detectedAt.toLocaleDateString()} · ${signal.detectedAt.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}` : 'Signal detected'} />}
            {prospect?.address && <EvidenceRow glyph="house" title="Property record" meta={`${prospect.address}, ${prospect.city ?? ''} ${prospect.state ?? ''}`.trim()} />}
            {contacts.length > 0 && <EvidenceRow glyph="user" title="Contacts enriched" meta={`${contacts.length} contact${contacts.length === 1 ? '' : 's'} on file`} />}
            {drafts.length > 0 && <EvidenceRow glyph="sparkle" title="Outreach draft ready" meta="Reviewable below" />}
            {evidenceCount === 0 && <div className="text-[13px] text-text/55 py-2">Evidence unavailable for this lead yet.</div>}
          </div>
        </SectionCard>

        {signal?.whyRelevant && (
          <SectionCard eyebrow="Signal evidence">
            <p className="text-body text-text/75">{signal.whyRelevant}</p>
          </SectionCard>
        )}

        <SectionCard title="Contact routes">
          <div className="grid grid-cols-2 gap-2.5">
            <InfoTile label="Phone" value={prospect?.phone ?? '—'} />
            <InfoTile label="Website" value={prospect?.website ? <a href={`https://${prospect.website}`} target="_blank" rel="noreferrer" className="text-blue hover:underline truncate inline-block max-w-full">{prospect.website}</a> : '—'} />
            <InfoTile label="Address" value={prospect?.address ? `${prospect.address}, ${prospect.city}, ${prospect.state}` : '—'} wide />
          </div>

          <div className="mt-4 pt-4 border-t border-text/8">
            <div className="text-[11px] font-bold uppercase tracking-[1px] text-text/45 mb-3">Contacts</div>
            {contacts.length === 0 ? (
              <div className="flex items-center gap-1.5 text-[12.5px] text-text/55"><span className="w-1.5 h-1.5 rounded-full bg-text/20" />Finding best contact</div>
            ) : (
              <div className="space-y-0">
                {contacts.map(c => (
                  <div key={c.id} className="flex items-center gap-3 py-2.5 border-b border-text/8 last:border-0">
                    <div className="w-9 h-9 rounded-lg bg-raised flex items-center justify-center text-[13px] font-semibold text-text/60 flex-shrink-0">{c.contactName?.[0] ?? '?'}</div>
                    <div className="flex-1 min-w-0">
                      <div className="text-[13.5px] font-semibold text-text truncate">{c.contactName ?? 'Unknown contact'}</div>
                      <div className="text-[12px] text-text/55 truncate">{c.contactTitle ?? '—'}{c.contactEmail && <span className="text-blue"> · {c.contactEmail}</span>}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </SectionCard>

        <SectionCard eyebrow="Outreach draft">
          {drafts.length === 0 ? (
            <div className="text-[13px] text-text/55 leading-relaxed">Draft will appear here once outreach is enabled.</div>
          ) : (
            <div className="space-y-4">
              {drafts.map(d => (
                <div key={d.id} className="space-y-2.5">
                  {d.subjectLine && <div className="text-[13px] font-semibold text-text">{d.subjectLine}</div>}
                  <p className="text-[13px] text-text/75 leading-[1.65] whitespace-pre-wrap">{d.body}</p>
                  <div className="flex flex-wrap gap-2 pt-1"><Button size="sm" variant="secondary">Edit</Button></div>
                </div>
              ))}
            </div>
          )}
        </SectionCard>

        <div className="sticky bottom-[calc(env(safe-area-inset-bottom)+76px)] z-20 flex flex-col items-center gap-2 pt-3 pb-2 bg-bg/90 backdrop-blur">
          <Button size="lg" className="w-full rounded-full">Open draft &amp; contact</Button>
          <div className="flex items-center justify-center gap-3 text-[13px] font-semibold text-text/55">
            <button type="button" className="min-h-[44px] px-2 hover:text-text">Save for later</button>
            <span aria-hidden>·</span>
            <button type="button" className="min-h-[44px] px-2 hover:text-coral">Pass</button>
          </div>
        </div>

        <OutcomeForm opportunityId={opp.id} currentStatus={opp.status} currentNotes={opp.outcomeNotes} />
      </div>
    </div>
  )
}

function EvidenceRow({ glyph, title, meta }: { glyph: GlyphKey; title: string; meta: string }) {
  return (
    <div className="flex items-center gap-3 py-3 border-b border-text/8 last:border-0">
      <GlyphTile glyph={glyph} tone="blue" size="md" />
      <div className="flex-1 min-w-0">
        <div className="text-[13.5px] font-semibold text-text truncate">{title}</div>
        <div className="text-[12px] text-text/55 truncate">{meta}</div>
      </div>
      <ChevronRight className="h-4 w-4 text-text/30 flex-shrink-0" />
    </div>
  )
}

function InfoTile({ label, value, wide }: { label: string; value: React.ReactNode; wide?: boolean }) {
  return (
    <div className={`rounded-xl bg-raised px-3.5 py-3 ${wide ? 'col-span-2' : ''}`}>
      <div className="text-[10.5px] font-bold uppercase tracking-[1px] text-text/45 mb-1">{label}</div>
      <div className="text-[13.5px] text-text font-medium break-words">{value}</div>
    </div>
  )
}
