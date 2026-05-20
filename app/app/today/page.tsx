import { and, desc, eq, inArray } from 'drizzle-orm'
import {
  db,
  opportunities,
  prospects,
  signals,
  contactRoutes,
  outreachPlays,
} from '@/db'
import { requireWorkspaceContext } from '@/lib/workspace'
import { MobileScreenHeader } from '@/components/app/MobileScreenHeader'
import { formatSignalToken } from '@/lib/signals/token'
import { TodayRunPage } from '@/components/app/today/TodayRunPage'
import type {
  ContactItem,
  EvidenceItem,
  EvidenceKind,
  TodayRunCardData,
} from '@/components/app/today/types'

export const dynamic = 'force-dynamic'

const DAILY_QUEUE_LIMIT = 5

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

const SIGNAL_TYPE_TO_EVIDENCE_KIND: Record<string, EvidenceKind> = {
  storm_damage: 'storm',
  weather_hail: 'storm',
  weather_wind: 'storm',
  building_permit: 'permit',
  new_business_listing: 'market',
  job_posting: 'market',
  event: 'market',
  funding: 'market',
  news: 'market',
  review: 'market',
  social: 'market',
  expansion: 'market',
  ownership_change: 'ownership',
}

function labelForSignalType(t: string | null | undefined): string {
  if (!t) return 'Signal'
  return SIGNAL_TYPE_LABEL[t] ?? t.replace(/_/g, ' ')
}

function locationFor(p: { city: string | null; state: string | null } | null): string | null {
  if (!p?.city) return null
  return p.state ? `${p.city}, ${p.state}` : p.city
}

function ageLabel(at: Date | string | null | undefined): string | null {
  if (!at) return null
  const ms = typeof at === 'string' ? new Date(at).getTime() : at.getTime()
  if (Number.isNaN(ms)) return null
  const diff = Date.now() - ms
  if (diff < 0) return null
  const hours = Math.floor(diff / 3_600_000)
  if (hours < 1) return 'just now'
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(diff / 86_400_000)
  if (days < 7) return `${days}d ago`
  const weeks = Math.floor(days / 7)
  if (weeks < 5) return `${weeks}w ago`
  const months = Math.floor(days / 30)
  return `${months}mo ago`
}

function readStr(obj: unknown, key: string): string | null {
  if (!obj || typeof obj !== 'object') return null
  const v = (obj as Record<string, unknown>)[key]
  return typeof v === 'string' && v.length > 0 ? v : null
}
function readNum(obj: unknown, key: string): number | null {
  if (!obj || typeof obj !== 'object') return null
  const v = (obj as Record<string, unknown>)[key]
  if (typeof v === 'number' && Number.isFinite(v)) return v
  if (typeof v === 'string') {
    const n = parseFloat(v)
    return Number.isFinite(n) ? n : null
  }
  return null
}
function squareFootageLabelFor(parsed: unknown): string | null {
  const sqft = readNum(parsed, 'sqft') ?? readNum(parsed, 'square_footage')
  if (!sqft || sqft < 100) return null
  if (sqft >= 1000) return `${(Math.round(sqft / 100) / 10).toFixed(1).replace(/\.0$/, '')}k sqft`
  return `${sqft} sqft`
}
function sourceDomainFor(parsed: unknown): string | null {
  const url = readStr(parsed, 'source_url') ?? readStr(parsed, 'sourceUrl') ?? readStr(parsed, 'url')
  if (!url) return null
  try {
    return new URL(url).hostname.replace(/^www\./, '')
  } catch {
    return null
  }
}
function firstLines(text: string | null | undefined, max = 3, charLimit = 220): string {
  if (!text) return ''
  const lines = text.split(/\n+/).slice(0, max).join('\n').trim()
  return lines.length > charLimit ? `${lines.slice(0, charLimit).trimEnd()}…` : lines
}

function demoQueue(): TodayRunCardData[] {
  const baseDate = Date.now() - 2 * 86_400_000
  return [
    {
      opportunityId: 'demo-1',
      score: 92,
      signalType: 'weather_hail',
      signalLabel: 'Hail event',
      signalToken: 'HAIL · 1.8" · 2D',
      signalAgeLabel: '2d ago',
      status: 'new',
      outcomeNotesSnapshot: null,
      businessName: 'Parkview Office Complex',
      cityState: 'Dallas, TX',
      vertical: 'Commercial',
      squareFootageLabel: '86.4k sqft',
      claimStatusLabel: 'No claim filed',
      reason:
        'Tuesday\u2019s hail event dropped 1.8" stones across the Parkview corridor. Roof age and policy renewal window line up.',
      evidence: [
        {
          id: 'd1-e1',
          kind: 'storm',
          title: 'NOAA hail report — 1.8" stones, Parkview cell',
          sourceDomain: 'noaa.gov',
          recencyLabel: ageLabel(new Date(baseDate)),
          accent: 'coral',
        },
        {
          id: 'd1-e2',
          kind: 'property',
          title: 'County property record — Class A office, 1998 roof',
          sourceDomain: 'dallascad.org',
          recencyLabel: '3d ago',
          accent: 'green',
        },
        {
          id: 'd1-e3',
          kind: 'permit',
          title: 'No active roofing permit on file',
          sourceDomain: 'dallaspermits.gov',
          recencyLabel: '1d ago',
          accent: 'green',
        },
      ],
      contacts: [
        { name: 'Tom Avery', title: 'Facilities Manager', email: null, phone: null, confidence: 92, isBest: true },
        { name: 'Morgan Reyes', title: 'Property Director', email: null, phone: null, confidence: 70, isBest: false },
      ],
      draftPreview: {
        subjectLine: 'About the storm cell that hit Parkview Tuesday',
        bodyFirstLines:
          'Hi Tom — Tuesday\u2019s cell dropped 1.8" stones on your block. I\u2019m local and pull free inspection reports for buildings of your size.\nWould a 20-minute walk-through next week help?',
      },
    },
    {
      opportunityId: 'demo-2',
      score: 81,
      signalType: 'building_permit',
      signalLabel: 'Building permit',
      signalToken: 'PERMIT · COMMERCIAL · 6D',
      signalAgeLabel: '6d ago',
      status: 'new',
      outcomeNotesSnapshot: null,
      businessName: 'Cedar & Co. Bistro',
      cityState: 'Plano, TX',
      vertical: 'Restaurant',
      squareFootageLabel: '4.2k sqft',
      claimStatusLabel: null,
      reason:
        'New commercial kitchen permit filed last week — typically signals a vendor refresh on HVAC and equipment service.',
      evidence: [
        { id: 'd2-e1', kind: 'permit', title: 'Commercial kitchen permit — equipment refresh', sourceDomain: 'planopermits.gov', recencyLabel: '6d ago', accent: 'green' },
        { id: 'd2-e2', kind: 'market', title: 'New menu launch press release', sourceDomain: 'planostar.com', recencyLabel: '2w ago', accent: 'green' },
      ],
      contacts: [],
      draftPreview: null,
    },
    {
      opportunityId: 'demo-3',
      score: 76,
      signalType: 'job_posting',
      signalLabel: 'Job posting',
      signalToken: 'JOB · 3 ROLES · 4D',
      signalAgeLabel: '4d ago',
      status: 'saved',
      outcomeNotesSnapshot: null,
      businessName: 'High Desert Garage',
      cityState: 'Frisco, TX',
      vertical: 'Auto service',
      squareFootageLabel: null,
      claimStatusLabel: null,
      reason:
        'Just posted three service tech roles in the last 14 days — active growth tends to precede vendor expansion.',
      evidence: [
        { id: 'd3-e1', kind: 'market', title: 'Indeed — 3 service tech postings in 14 days', sourceDomain: 'indeed.com', recencyLabel: '4d ago', accent: 'green' },
      ],
      contacts: [
        { name: 'A. Patel', title: 'General Manager', email: null, phone: null, confidence: 55, isBest: true },
      ],
      draftPreview: null,
    },
  ]
}

export default async function TodayPage() {
  const ctx = await requireWorkspaceContext()

  // Today's Run = client-session view over status IN ('new','saved').
  // No queued status. No server-side run-state table.
  const opps = await db
    .select()
    .from(opportunities)
    .where(
      and(
        eq(opportunities.workspaceId, ctx.workspaceId),
        inArray(opportunities.status, ['new', 'saved']),
      ),
    )
    .orderBy(desc(opportunities.score))
    .limit(DAILY_QUEUE_LIMIT)

  const prospectIds = Array.from(
    new Set(opps.map(o => o.prospectId).filter((v): v is string => Boolean(v))),
  )
  const signalIds = Array.from(
    new Set(opps.map(o => o.signalId).filter((v): v is string => Boolean(v))),
  )
  const opportunityIds = opps.map(o => o.id)

  const [prospectRows, signalRows, contactRows, draftRows] = await Promise.all([
    prospectIds.length
      ? db
          .select()
          .from(prospects)
          .where(
            and(
              eq(prospects.workspaceId, ctx.workspaceId),
              inArray(prospects.id, prospectIds),
            ),
          )
      : Promise.resolve([]),
    signalIds.length
      ? db
          .select()
          .from(signals)
          .where(
            and(
              eq(signals.workspaceId, ctx.workspaceId),
              inArray(signals.id, signalIds),
            ),
          )
      : Promise.resolve([]),
    prospectIds.length
      ? db
          .select()
          .from(contactRoutes)
          .where(
            and(
              eq(contactRoutes.workspaceId, ctx.workspaceId),
              inArray(contactRoutes.prospectId, prospectIds),
            ),
          )
      : Promise.resolve([]),
    opportunityIds.length
      ? db
          .select()
          .from(outreachPlays)
          .where(
            and(
              eq(outreachPlays.workspaceId, ctx.workspaceId),
              inArray(outreachPlays.opportunityId, opportunityIds),
            ),
          )
          .orderBy(desc(outreachPlays.createdAt))
      : Promise.resolve([]),
  ])

  const prospectById = new Map(prospectRows.map(p => [p.id, p]))
  const signalById = new Map(signalRows.map(s => [s.id, s]))
  const contactsByProspect = new Map<string, typeof contactRows>()
  for (const c of contactRows) {
    if (!c.prospectId) continue
    const list = contactsByProspect.get(c.prospectId) ?? []
    list.push(c)
    contactsByProspect.set(c.prospectId, list)
  }
  const draftByOpportunity = new Map<string, (typeof draftRows)[number]>()
  for (const d of draftRows) {
    if (!d.opportunityId) continue
    if (!draftByOpportunity.has(d.opportunityId)) {
      draftByOpportunity.set(d.opportunityId, d) // first = latest (ordered desc)
    }
  }

  const queue: TodayRunCardData[] = opps.map(o => {
    const p = o.prospectId ? prospectById.get(o.prospectId) ?? null : null
    const s = o.signalId ? signalById.get(o.signalId) ?? null : null
    const rawContacts = (o.prospectId ? contactsByProspect.get(o.prospectId) : null) ?? []
    const sortedContacts = [...rawContacts].sort(
      (a, b) => (b.confidence ?? 0) - (a.confidence ?? 0),
    )
    const contacts: ContactItem[] = sortedContacts.slice(0, 4).map((c, i) => ({
      name: c.contactName ?? 'Unknown contact',
      title: c.contactTitle ?? null,
      email: c.contactEmail ?? null,
      phone: c.contactPhone ?? null,
      confidence: typeof c.confidence === 'number' ? c.confidence : 0,
      isBest: i === 0,
    }))

    const evidence: EvidenceItem[] = []
    if (s) {
      const kind = SIGNAL_TYPE_TO_EVIDENCE_KIND[s.signalType] ?? 'other'
      evidence.push({
        id: `${o.id}-sig`,
        kind,
        title: s.whyRelevant ?? labelForSignalType(s.signalType),
        sourceDomain: sourceDomainFor(s.parsedData),
        recencyLabel: ageLabel(s.detectedAt ?? s.createdAt),
        accent: kind === 'storm' ? 'coral' : 'green',
      })
    }

    const token = s
      ? formatSignalToken({
          signalType: s.signalType,
          detectedAt: s.detectedAt ?? s.createdAt,
          parsedData: (s.parsedData ?? null) as Record<string, unknown> | null,
        })
      : null

    const draft = draftByOpportunity.get(o.id) ?? null

    // Narrow status to the two values we actually allow in the queue.
    const status: 'new' | 'saved' = o.status === 'saved' ? 'saved' : 'new'

    return {
      opportunityId: o.id,
      score: o.score,
      signalType: s?.signalType ?? null,
      signalLabel: labelForSignalType(s?.signalType),
      signalToken: token,
      signalAgeLabel: ageLabel(s?.detectedAt ?? s?.createdAt ?? null),
      status,
      outcomeNotesSnapshot: o.outcomeNotes ?? null,
      businessName: p?.businessName ?? 'Unknown business',
      cityState: locationFor(p),
      vertical: p?.businessType ?? null,
      squareFootageLabel: squareFootageLabelFor(s?.parsedData),
      claimStatusLabel: null,
      reason: o.whyNow,
      evidence,
      contacts,
      draftPreview: draft
        ? {
            subjectLine: draft.subjectLine ?? null,
            bodyFirstLines: firstLines(draft.body, 3, 220),
          }
        : null,
    }
  })

  const useDemo = queue.length === 0 && process.env.NODE_ENV !== 'production'
  const renderQueue = useDemo ? demoQueue() : queue
  const queuedLabel =
    renderQueue.length > 0
      ? `${renderQueue.length} ${renderQueue.length === 1 ? 'lead' : 'leads'} queued for review`
      : 'No leads queued right now.'

  return (
    <div className="max-w-2xl mx-auto">
      <MobileScreenHeader title="Today's Run" description={queuedLabel} />
      <div className="px-4 lg:px-7 pb-[calc(env(safe-area-inset-bottom)+96px)] lg:pb-12">
        <TodayRunPage queue={renderQueue} isDemo={useDemo} />
      </div>
    </div>
  )
}
