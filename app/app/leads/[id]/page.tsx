import Link from 'next/link'
import { and, eq } from 'drizzle-orm'
import { db, opportunities, contactRoutes, outreachPlays, savedLeads } from '@/db'
import { requireWorkspaceContext } from '@/lib/workspace'
import { SectionCard } from '@/components/app/SectionCard'
import { Button } from '@/components/ui/button'
import { OutcomeForm } from './OutcomeForm'
import { ChevronLeft, ChevronRight, MoreHorizontal } from 'lucide-react'
import { GlyphTile, glyphForSignalType, type GlyphKey } from '@/components/app/GlyphTile'
import { formatSignalToken } from '@/lib/signals/token'
import { cn } from '@/lib/utils'

export const dynamic = 'force-dynamic'

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
type SavedLeadDetailRow = typeof savedLeads.$inferSelect

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
      return 'Fetchi found a timely signal worth reviewing.'
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

  if (!UUID_PATTERN.test(id)) {
    return <LeadNotFoundState />
  }

  const opp = await db.query.opportunities.findFirst({
    where: (t, { eq: e, and: a }) => a(e(t.id, id), e(t.workspaceId, ctx.workspaceId)),
  })
  if (!opp) {
    const [savedLead] = await db
      .select()
      .from(savedLeads)
      .where(and(eq(savedLeads.workspaceId, ctx.workspaceId), eq(savedLeads.id, id)))
      .limit(1)

    if (savedLead) return <SavedLeadDetailState savedLead={savedLead} />

    return <LeadNotFoundState />
  }

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
  const evidenceCount = (signal?.whyRelevant ? 1 : 0) + contacts.length + drafts.length + (opp.whyNow ? 1 : 0)
  const locationLine = prospect?.city ? `${prospect.city}${prospect.state ? `, ${prospect.state}` : ''}` : null
  const businessName = prospect?.businessName ?? 'Unknown business'
  const summaryLine = summaryForSignalType(signal?.signalType)

  return (
    <div className="max-w-3xl mx-auto">
      <div className="flex items-center justify-between px-4 lg:px-7 pt-5 lg:pt-7 pb-2">
        <Link href="/app/leads" className="inline-flex h-11 w-11 items-center justify-center rounded-lg border border-border bg-surface text-text/75 hover:bg-fetchiOverlayHover hover:text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fetchiAccent/55" aria-label="Back to leads">
          <ChevronLeft className="h-5 w-5" />
        </Link>
        <div className="flex-1 text-center min-w-0 px-4">
          <div className="text-[11px] uppercase tracking-[1px] font-bold text-text/45">Lead detail</div>
        </div>
        <button type="button" className="inline-flex h-11 w-11 items-center justify-center rounded-lg border border-border bg-surface text-text/75 hover:bg-fetchiOverlayHover hover:text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fetchiAccent/55" aria-label="More options">
          <MoreHorizontal className="h-5 w-5" />
        </button>
      </div>

      <div className="px-4 lg:px-7 pb-[calc(env(safe-area-inset-bottom)+96px)] lg:pb-12 space-y-3 lg:space-y-4">
        <section className="rounded-xl border border-border bg-raised px-5 py-7 text-center text-text lg:px-8 lg:py-9">
          <div className="flex items-center justify-center flex-wrap gap-1.5">
            <span className="inline-flex items-center rounded-full px-3 py-1.5 text-[11px] font-bold tracking-[0.04em] tabular-nums bg-text/[0.06] text-text/75" aria-label={`Signal ${signalToken ?? signalTypeLabel}`}>
              {signalToken ?? signalTypeLabel.toUpperCase()}
            </span>
            {opp.status === 'new' && (
              <span className="inline-flex items-center rounded-full px-3 py-1.5 text-[11px] font-semibold bg-surface text-text/65">
                No claim filed
              </span>
            )}
          </div>

          <div className="font-fetchi text-[72px] lg:text-[86px] leading-none font-bold tabular-nums mt-6 text-text">
            {opp.score}
          </div>
          <p className="text-body-lg text-text/65 mt-3 px-2">{summaryLine}</p>
          <h1 className="font-fetchi text-h1 lg:text-[32px] text-text mt-6 px-2">{businessName}</h1>
          {locationLine && <div className="text-caption text-text/55 mt-1.5">{locationLine}</div>}
        </section>

        {opp.whyNow && (
          <SectionCard eyebrow="Why now" tone="highlight">
            <p className="text-body text-text/75">{opp.whyNow}</p>
          </SectionCard>
        )}

        <SectionCard eyebrow="Evidence" actions={<span className="text-[12px] font-semibold text-evidence">{evidenceCount} source{evidenceCount === 1 ? '' : 's'}</span>}>
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
            <InfoTile label="Website" value={prospect?.website ? <a href={`https://${prospect.website}`} target="_blank" rel="noreferrer" className="inline-flex min-h-[44px] max-w-full items-center truncate rounded-sm text-evidence hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fetchiAccent/55">{prospect.website}</a> : '—'} />
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
                      <div className="text-[12px] text-text/55 truncate">{c.contactTitle ?? '—'}{c.contactEmail && <span className="text-evidence"> · {c.contactEmail}</span>}</div>
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
                  <div className="flex flex-wrap gap-2 pt-1"><Button size="sm" variant="secondary" className="min-h-[44px]">Edit</Button></div>
                </div>
              ))}
            </div>
          )}
        </SectionCard>

        <div className="flex flex-col items-center gap-2 pt-1 pb-2">
          <Button size="lg" className="w-full rounded-full">Open draft &amp; contact</Button>
          <div className="flex items-center justify-center gap-3 text-[13px] font-semibold text-text/55">
            <button type="button" className="min-h-[44px] px-2 hover:text-text">Save for later</button>
            <span aria-hidden>·</span>
            <button type="button" className="min-h-[44px] rounded-md px-2 hover:text-bad focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fetchiAccent/55">Pass</button>
          </div>
        </div>

        <OutcomeForm opportunityId={opp.id} currentStatus={opp.status} currentNotes={opp.outcomeNotes} />
      </div>
    </div>
  )
}

function savedLeadStatusLabel(status: string): string {
  switch (status) {
    case 'contacted':
      return 'Contacted'
    case 'won':
      return 'Won'
    case 'lost':
      return 'Lost'
    case 'dismissed':
      return 'Dismissed'
    case 'saved':
    default:
      return 'Saved'
  }
}

function savedLeadStatusClass(status: string): string {
  switch (status) {
    case 'contacted':
      return 'border-lifecycleContacted/25 bg-lifecycleContacted/12 text-lifecycleContacted'
    case 'won':
      return 'border-lifecycleWon/25 bg-lifecycleWon/12 text-lifecycleWon'
    case 'lost':
    case 'dismissed':
      return 'border-lifecycleLost/25 bg-lifecycleLost/12 text-lifecycleLost'
    case 'saved':
    default:
      return 'border-lifecycleSaved/25 bg-lifecycleSaved/12 text-lifecycleSaved'
  }
}

function savedLeadInitials(name: string): string {
  const parts = name
    .replace(/[^a-z0-9\s'-]/gi, ' ')
    .split(/\s+/)
    .map((part) => part.trim())
    .filter(Boolean)
  const first = parts[0]?.[0] ?? 'L'
  const second = parts.length > 1 ? parts[1]?.[0] : parts[0]?.[1]
  return `${first}${second ?? ''}`.toUpperCase()
}

function savedLeadDate(value: Date): string {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(value)
}

function savedLeadWebsiteHref(value: string): string {
  return /^https?:\/\//i.test(value) ? value : `https://${value}`
}

function savedLeadWebsiteLabel(value: string): string {
  try {
    return new URL(savedLeadWebsiteHref(value)).hostname.replace(/^www\./, '')
  } catch {
    return value
  }
}

function SavedLeadDetailState({ savedLead }: { savedLead: SavedLeadDetailRow }) {
  const locationLine = savedLead.market ?? savedLead.address
  const status = savedLeadStatusLabel(savedLead.lifecycleStatus)
  const supportLine = [savedLead.category, locationLine, savedLead.source].filter(Boolean).join(' · ')
  const hasWebsite = Boolean(savedLead.website)
  const hasAddress = Boolean(savedLead.address ?? savedLead.market)

  return (
    <div className="mx-auto max-w-4xl">
      <div className="flex items-center justify-between px-4 pb-2 pt-5 lg:px-7 lg:pt-7">
        <Link href="/app/leads" className="inline-flex h-11 w-11 items-center justify-center rounded-lg border border-border bg-surface text-text/75 hover:bg-fetchiOverlayHover hover:text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fetchiAccent/55" aria-label="Back to leads">
          <ChevronLeft className="h-5 w-5" />
        </Link>
        <div className="min-w-0 flex-1 px-4 text-center">
          <div className="text-[11px] font-bold uppercase tracking-[1px] text-text/45">Saved lead detail</div>
        </div>
        <span className="h-11 w-11" aria-hidden />
      </div>

      <div className="space-y-4 px-4 pb-[calc(env(safe-area-inset-bottom)+96px)] lg:px-7 lg:pb-12">
        <section className="overflow-hidden rounded-xl border border-border bg-surface">
          <div className="grid gap-5 p-5 lg:grid-cols-[minmax(0,1fr)_220px] lg:p-7">
            <div className="flex min-w-0 gap-4">
              <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-xl border border-border bg-raised font-fetchi text-[18px] font-semibold text-text">
                {savedLeadInitials(savedLead.businessName)}
              </div>
              <div className="min-w-0 flex-1">
                <div className={cn('inline-flex rounded-full border px-2.5 py-1 text-[12px] font-bold', savedLeadStatusClass(savedLead.lifecycleStatus))}>
                  {status}
                </div>
                <h1 className="mt-4 font-fetchi text-[34px] font-semibold leading-none text-text lg:text-[42px]">
                  {savedLead.businessName}
                </h1>
                {supportLine && (
                  <p className="mt-3 text-[14px] font-medium leading-relaxed text-text/58">
                    {supportLine}
                  </p>
                )}
              </div>
            </div>

            <div className="rounded-xl border border-border bg-bg p-4">
              <div className="text-[11px] font-bold uppercase tracking-[1px] text-text/42">Saved dates</div>
              <div className="mt-3 space-y-2 text-[13px] text-text/62">
                <div className="flex items-center justify-between gap-3">
                  <span>Saved</span>
                  <span className="font-semibold text-text">{savedLeadDate(savedLead.savedAt)}</span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span>Updated</span>
                  <span className="font-semibold text-text">{savedLeadDate(savedLead.updatedAt)}</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        <SectionCard eyebrow="Contact coverage">
          <div className="grid gap-2.5 sm:grid-cols-3">
            <InfoTile label="Phone" value={<a href={`tel:${savedLead.phone}`} className="inline-flex min-h-[44px] items-center rounded-sm text-text hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fetchiAccent/55">{savedLead.phone}</a>} />
            <InfoTile
              label="Website"
              value={hasWebsite ? (
                <a href={savedLeadWebsiteHref(savedLead.website!)} target="_blank" rel="noreferrer" className="inline-flex min-h-[44px] max-w-full items-center truncate rounded-sm text-evidence hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fetchiAccent/55">
                  {savedLeadWebsiteLabel(savedLead.website!)}
                </a>
              ) : 'Missing website'}
            />
            <InfoTile label="Address" value={hasAddress ? (savedLead.address ?? savedLead.market) : '—'} />
          </div>
        </SectionCard>

        <SectionCard title="Saved lead fields">
          <div className="grid gap-2.5 sm:grid-cols-2">
            <InfoTile label="Category" value={savedLead.category ?? '—'} />
            <InfoTile label="Market" value={savedLead.market ?? '—'} />
            <InfoTile label="Source" value={savedLead.source} />
            <InfoTile label="Lifecycle" value={status} />
          </div>
        </SectionCard>

        <SectionCard eyebrow="User note">
          {savedLead.note ? (
            <p className="whitespace-pre-wrap text-[13.5px] leading-relaxed text-text/75">{savedLead.note}</p>
          ) : (
            <p className="text-[13.5px] text-text/55">No note saved.</p>
          )}
        </SectionCard>
      </div>
    </div>
  )
}

function LeadNotFoundState() {
  return (
    <div className="max-w-3xl mx-auto">
      <div className="flex items-center justify-between px-4 lg:px-7 pt-5 lg:pt-7 pb-2">
        <Link href="/app/leads" className="inline-flex h-11 w-11 items-center justify-center rounded-lg border border-border bg-surface text-text/75 hover:bg-fetchiOverlayHover hover:text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fetchiAccent/55" aria-label="Back to leads">
          <ChevronLeft className="h-5 w-5" />
        </Link>
        <div className="flex-1 text-center min-w-0 px-4">
          <div className="text-[11px] uppercase tracking-[1px] font-bold text-text/45">Lead detail</div>
        </div>
        <span className="w-11 h-11" aria-hidden />
      </div>

      <div className="px-4 lg:px-7 pb-[calc(env(safe-area-inset-bottom)+96px)] lg:pb-12">
        <section className="rounded-xl border border-border bg-raised px-5 py-10 text-center text-text lg:px-8 lg:py-12">
          <div className="inline-flex items-center rounded-full px-3 py-1.5 text-[11px] font-bold tracking-[0.04em] bg-text/[0.06] text-text/65">
            Lead unavailable
          </div>
          <h1 className="font-fetchi text-h1 lg:text-[32px] text-text mt-6 px-2">This lead is not available</h1>
          <p className="text-body text-text/65 mt-3 px-2">Return to My Leads to open a saved lead.</p>
          <Button asChild size="lg" className="mt-7 rounded-full">
            <Link href="/app/leads">Back to leads</Link>
          </Button>
        </section>
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
