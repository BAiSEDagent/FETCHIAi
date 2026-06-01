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

// Humanize raw business-type enums like `commercial_office` or `retail_strip`
// so they never leak into the UI as snake_case.
function humanizeCategory(raw: string | null | undefined): string | null {
  if (!raw) return null
  const cleaned = raw.replace(/[_-]+/g, ' ').trim()
  if (!cleaned) return null
  return cleaned.charAt(0).toUpperCase() + cleaned.slice(1).toLowerCase()
}

const MONTH_SHORT = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC']

function shortDateLabel(at: Date | string | null | undefined): string | null {
  if (!at) return null
  const d = typeof at === 'string' ? new Date(at) : at
  if (Number.isNaN(d.getTime())) return null
  return `${MONTH_SHORT[d.getMonth()]} ${d.getDate()}`
}

function chipSuffixFor(
  kind: EvidenceKind,
  detectedAt: Date | string | null | undefined,
  parsed: unknown,
): string | null {
  if (kind === 'permit') {
    // Try to pull a year from parsed data; fall back to date.
    const year = readNum(parsed, 'permit_year') ?? readNum(parsed, 'year')
    if (year && year > 1900 && year < 2200) return String(Math.round(year))
    return shortDateLabel(detectedAt)
  }
  if (kind === 'ownership') {
    const src = readStr(parsed, 'source') ?? readStr(parsed, 'agency')
    if (src && src.length <= 8) return src.toUpperCase()
    return 'SOS'
  }
  return shortDateLabel(detectedAt)
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
  return [
    {
      opportunityId: 'demo-1',
      score: 94,
      signalType: 'weather_hail',
      signalLabel: 'Hail event',
      signalToken: 'HAIL \u00b7 1.8" \u00b7 4D',
      signalAgeLabel: '4d ago',
      status: 'new',
      outcomeNotesSnapshot: null,
      businessName: 'Parkview Office Complex',
      cityState: 'Irving, TX',
      vertical: 'Commercial',
      squareFootageLabel: '86,400 sqft',
      claimStatusLabel: 'No claim filed',
      reason: '94 \u2014 Fresh storm + commercial roof',
      evidence: [
        {
          id: 'd1-e1',
          kind: 'storm',
          title: 'NOAA event 8772-DFW',
          chipSuffix: 'MAY 14',
          sourceDomain: 'noaa.gov',
          recencyLabel: 'May 14, 4:17pm',
          detailLine: 'Hail 1.75\u20132.0" corridor across Irving',
          confidence: 100,
          accent: 'blue',
        },
        {
          id: 'd1-e2',
          kind: 'property',
          title: '2200 W Airport Fwy \u00b7 86.4k sqft',
          chipSuffix: 'CLASS A',
          sourceDomain: 'Dallas County records',
          recencyLabel: null,
          detailLine: '4-building commercial complex \u00b7 18-yr roof age',
          confidence: 100,
          accent: 'green',
        },
        {
          id: 'd1-e3',
          kind: 'permit',
          title: '2007 re-roof on file',
          chipSuffix: '2007',
          sourceDomain: 'Irving permits',
          recencyLabel: '3 Sep 2007',
          detailLine: 'Original installer no longer trading',
          confidence: 80,
          accent: 'green',
        },
        {
          id: 'd1-e4',
          kind: 'ownership',
          title: 'Parkview Holdings LLC',
          chipSuffix: 'SOS',
          sourceDomain: 'Texas SOS',
          recencyLabel: 'active filing',
          detailLine: 'Agent on 7 commercial properties',
          confidence: 100,
          accent: 'green',
        },
        {
          id: 'd1-e5',
          kind: 'market',
          title: 'Adjacent block damage photo',
          chipSuffix: 'MAY 15',
          sourceDomain: 'local news',
          recencyLabel: 'May 15, 8am',
          detailLine: 'Visible roof-AC dents \u00b7 same hail cell',
          confidence: 75,
          accent: 'green',
        },
      ],
      contacts: [
        {
          name: 'Tom Avery',
          title: 'Facilities Manager \u00b7 Parkview Holdings',
          email: 'tom.avery@parkview.example',
          phone: '+1 214 555 0118',
          confidence: 100,
          isBest: true,
        },
        {
          name: 'Marisol Vega',
          title: 'Property Management Agent \u00b7 CBRE',
          email: 'mvega@cbre.example',
          phone: null,
          confidence: 80,
          isBest: false,
        },
      ],
      draftPreview: {
        subjectLine: 'About the storm cell that hit Parkview Tuesday',
        bodyFirstLines:
          'Hi Tom \u2014 Tuesday\u2019s cell dropped 1.8" stones on your block. I pull free inspection reports for buildings your size.\nWould a 20-minute walk-through next week help?',
      },
    },
    {
      opportunityId: 'demo-2',
      score: 81,
      signalType: 'building_permit',
      signalLabel: 'Building permit',
      signalToken: 'PERMIT \u00b7 KITCHEN \u00b7 6D',
      signalAgeLabel: '6d ago',
      status: 'new',
      outcomeNotesSnapshot: null,
      businessName: 'Cedar & Co. Bistro',
      cityState: 'Plano, TX',
      vertical: 'Restaurant',
      squareFootageLabel: '4.2k sqft',
      claimStatusLabel: null,
      reason: '81 \u2014 Permit filed + equipment refresh window',
      evidence: [
        {
          id: 'd2-e1',
          kind: 'permit',
          title: 'Commercial kitchen permit \u2014 equipment refresh',
          chipSuffix: 'MAY 12',
          sourceDomain: 'planopermits.gov',
          recencyLabel: '6d ago',
          detailLine: 'HVAC + line refurb scope',
          confidence: 90,
          accent: 'green',
        },
        {
          id: 'd2-e2',
          kind: 'market',
          title: 'New menu launch press release',
          chipSuffix: 'APR 28',
          sourceDomain: 'planostar.com',
          recencyLabel: '2w ago',
          detailLine: null,
          confidence: 60,
          accent: 'green',
        },
      ],
      contacts: [
        {
          name: 'Alex Kim',
          title: 'Owner / GM',
          email: 'alex@cedarbistro.example',
          phone: null,
          confidence: 70,
          isBest: true,
        },
      ],
      draftPreview: null,
    },
    {
      opportunityId: 'demo-3',
      score: 76,
      signalType: 'job_posting',
      signalLabel: 'Job posting',
      signalToken: 'JOB \u00b7 3 ROLES \u00b7 4D',
      signalAgeLabel: '4d ago',
      status: 'saved',
      outcomeNotesSnapshot: null,
      businessName: 'High Desert Garage',
      cityState: 'Frisco, TX',
      vertical: 'Auto service',
      squareFootageLabel: null,
      claimStatusLabel: null,
      reason: '76 \u2014 Active hiring + vendor refresh window',
      evidence: [
        {
          id: 'd3-e1',
          kind: 'market',
          title: 'Indeed \u2014 3 service tech postings in 14 days',
          chipSuffix: 'MAY 16',
          sourceDomain: 'indeed.com',
          recencyLabel: '4d ago',
          detailLine: 'Roles indicate bay expansion',
          confidence: 70,
          accent: 'green',
        },
      ],
      contacts: [
        {
          name: 'A. Patel',
          title: 'General Manager',
          email: null,
          phone: '+1 469 555 0142',
          confidence: 55,
          isBest: true,
        },
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
      const detectedAt = s.detectedAt ?? s.createdAt
      evidence.push({
        id: `${o.id}-sig`,
        kind,
        title: s.whyRelevant ?? labelForSignalType(s.signalType),
        chipSuffix: chipSuffixFor(kind, detectedAt, s.parsedData),
        sourceDomain: sourceDomainFor(s.parsedData),
        recencyLabel: ageLabel(detectedAt),
        detailLine:
          readStr(s.parsedData, 'detail') ??
          readStr(s.parsedData, 'summary') ??
          null,
        confidence: 75,
        accent: kind === 'storm' ? 'blue' : 'green',
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
      vertical: humanizeCategory(p?.businessType),
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

  return (
    <div className="max-w-2xl mx-auto">
      <div className="px-4 lg:px-7 pt-[max(env(safe-area-inset-top),1.25rem)] lg:pt-7 pb-[calc(env(safe-area-inset-bottom)+200px)] lg:pb-12">
        <TodayRunPage queue={renderQueue} isDemo={useDemo} />
      </div>
    </div>
  )
}
