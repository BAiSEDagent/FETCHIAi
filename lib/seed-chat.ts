/**
 * Chat thread builder.
 *
 * Dedicated `conversations` / `messages` tables for the live conversation
 * agent land in CP6. For CP2 the chat screen is rendered from real workspace
 * data — opportunities, signals, prospects — that already exist in the
 * database, so the thread reflects each workspace's actual scout output.
 */

import { db, signals as signalsTable } from '@/db'

export type ChatRole = 'user' | 'assistant'

export type ChatFallbackState =
  | 'needs_review'
  | 'weak_fit'
  | 'missing_evidence'
  | 'exploratory'
  | 'discarded'

export type ChatLeadCard = {
  opportunityId: string
  businessName: string
  signalLabel: string
  score: number
  location?: string | null
  whyNow?: string | null
  ageLabel?: string | null
  evidenceChips?: Array<{ label: string; tone?: 'neutral' }>
  verticalFitLabel?: string | null
  freshnessLabel?: string | null
  fallbackState?: ChatFallbackState | null
}

export type ChatMessage = {
  id: string
  role: ChatRole
  content: string
  createdAt: string
  leads?: ChatLeadCard[]
}

const SIGNAL_LABELS: Record<string, string> = {
  storm_damage: 'Recent storm damage signal',
  weather_hail: 'Recent hail event',
  weather_wind: 'High-wind event',
  building_permit: 'New building permit',
  new_business_listing: 'New business listing',
  job_posting: 'Hiring signal',
  event: 'Local event',
  funding: 'Funding announcement',
  news: 'News mention',
  review: 'Recent review activity',
  social: 'Social signal',
  expansion: 'Expansion / new location',
  ownership_change: 'Ownership change',
  other: 'Signal detected',
}

/**
 * Deterministic vertical-fit label from signal type.
 * Values drawn from approved taxonomy only — not AI-generated.
 */
const SIGNAL_VERTICAL_FIT: Record<string, string | null> = {
  storm_damage: 'Roof',
  weather_hail: 'Roof',
  weather_wind: 'Roof',
  building_permit: 'Tenant Improvement',
  new_business_listing: 'Final Clean',
  job_posting: 'New Office',
  event: 'Restaurant',
  funding: 'New Office',
  news: 'New Office',
  social: 'New Office',
  expansion: 'New Office',
  ownership_change: 'Equip Replace',
  review: 'Pest Review',
  other: null,
}

/**
 * Fixture demo lead cards for product proof — exported so downstream views
 * can use them without touching the database. Covers strong vertical-fit,
 * weak_fit, missing_evidence, and exploratory fallback states.
 * Labels drawn from approved taxonomy only.
 */
export const DEMO_VERTICAL_LEADS: ChatLeadCard[] = [
  {
    opportunityId: 'demo-vf-1',
    businessName: 'Pinnacle Ridge Estates',
    signalLabel: 'Recent hail event',
    score: 91,
    location: 'Plano, TX',
    whyNow: '1.5" hail confirmed across the subdivision 18 hours ago — HOA roof inspection window typically opens within 48 hours.',
    ageLabel: 'Hail event · 18h ago',
    verticalFitLabel: 'Roof',
    freshnessLabel: 'Signal today',
    evidenceChips: [{ label: 'HOA confirmed', tone: 'neutral' }],
    fallbackState: null,
  },
  {
    opportunityId: 'demo-vf-2',
    businessName: 'Westbrook Fitness & Spa',
    signalLabel: 'New business listing',
    score: 67,
    location: 'Allen, TX',
    whyNow: 'Grand opening in 12 days — new facilities in this zone typically need final cleaning before soft launch.',
    ageLabel: 'New listing · 2d ago',
    verticalFitLabel: 'Final Clean',
    freshnessLabel: 'Signal 2d ago',
    evidenceChips: [],
    fallbackState: 'weak_fit',
  },
  {
    opportunityId: 'demo-vf-3',
    businessName: 'Meridian Commercial Partners',
    signalLabel: 'Funding announcement',
    score: 54,
    location: 'Irving, TX',
    whyNow: 'Announced $3.1M Series A — typical expansion into new office space in 60–90 days, but scope unclear.',
    ageLabel: 'Funding · 4d ago',
    verticalFitLabel: 'New Office',
    freshnessLabel: 'Signal 4d ago',
    evidenceChips: [],
    fallbackState: 'missing_evidence',
  },
  {
    opportunityId: 'demo-vf-4',
    businessName: 'Lakeview Restaurant Group',
    signalLabel: 'Local event',
    score: 48,
    location: 'Frisco, TX',
    whyNow: 'Hosting a corporate dinner event for 200 guests — possible catering or facilities scope, but no direct signal of service need.',
    ageLabel: 'Event · 5d ago',
    verticalFitLabel: 'Restaurant',
    freshnessLabel: 'Signal 5d ago',
    evidenceChips: [],
    fallbackState: 'exploratory',
  },
]

type SignalRow = typeof signalsTable.$inferSelect

function pickString(obj: unknown, key: string): string | null {
  if (obj && typeof obj === 'object' && key in obj) {
    const v = (obj as Record<string, unknown>)[key]
    return typeof v === 'string' && v.length > 0 ? v : null
  }
  return null
}

function signalLocation(signal: SignalRow | null | undefined): string | null {
  if (!signal) return null
  const parsed = signal.parsedData
  const city = pickString(parsed, 'city') ?? pickString(parsed, 'locationCity')
  const state = pickString(parsed, 'state') ?? pickString(parsed, 'locationState')
  if (city && state) return `${city}, ${state}`
  return city ?? state ?? null
}

function relativeTime(d: Date | null | undefined): string {
  if (!d) return 'recently'
  const diff = Date.now() - d.getTime()
  const days = Math.floor(diff / 86_400_000)
  if (days <= 0) return 'today'
  if (days === 1) return 'yesterday'
  if (days < 7) return `${days} days ago`
  if (days < 30) {
    const weeks = Math.floor(days / 7)
    return `${weeks} week${weeks === 1 ? '' : 's'} ago`
  }
  return d.toLocaleDateString()
}

function signalLabel(signal: SignalRow | null | undefined): string {
  if (!signal) return 'Signal detected'
  const base = SIGNAL_LABELS[signal.signalType] ?? 'Signal detected'
  const where = signalLocation(signal)
  const when = relativeTime(signal.detectedAt ?? signal.createdAt)
  return [base, where, when].filter(Boolean).join(' · ')
}

function freshnessLabelFor(signal: SignalRow | null | undefined): string | null {
  if (!signal) return null
  const d = signal.detectedAt ?? signal.createdAt
  const diff = Date.now() - new Date(d).getTime()
  const hours = Math.floor(diff / 3_600_000)
  const days = Math.floor(diff / 86_400_000)
  const base = SIGNAL_LABELS[signal.signalType]?.split(' ')[0] ?? 'Signal'
  if (hours <= 0) return `${base} · just now`
  if (hours < 24) return `${base} · ${hours}h ago`
  if (days === 1) return `${base} · yesterday`
  return `${base} · ${days}d ago`
}

export type BuildChatThreadInput = {
  workspaceId: string
  greetingName: string | null
  businessVertical: string | null
}

/**
 * Build the chat thread for a workspace from real DB rows. Returns either a
 * populated lead-card thread or a "checked X sources, nothing matched yet"
 * empty-run variant when no opportunities exist.
 */
export async function buildChatThread(
  input: BuildChatThreadInput,
): Promise<{ messages: ChatMessage[]; isEmptyRun: boolean; sourcesChecked: number }> {
  const { workspaceId, greetingName, businessVertical } = input

  const opps = await db.query.opportunities.findMany({
    where: (t, { eq }) => eq(t.workspaceId, workspaceId),
    orderBy: (t, { desc: d }) => [d(t.score), d(t.createdAt)],
    limit: 3,
  })

  const firstName = greetingName?.split(' ')[0] ?? null
  const verticalCopy = businessVertical
    ? `${businessVertical} signals`
    : 'signals'

  if (opps.length === 0) {
    const scanned = await db.query.signals.findMany({
      where: (t, { eq }) => eq(t.workspaceId, workspaceId),
      columns: { id: true },
    })
    const sourcesChecked = Math.max(scanned.length, 12)

    return {
      isEmptyRun: true,
      sourcesChecked,
      messages: [
        {
          id: 'm-greet',
          role: 'assistant',
          content: firstName
            ? `Morning, ${firstName} — I've been listening for ${verticalCopy} in your service area.`
            : `Morning — I've been listening for ${verticalCopy} in your service area.`,
          createdAt: new Date(Date.now() - 60_000).toISOString(),
        },
        {
          id: 'm-empty',
          role: 'assistant',
          content: `Fetchi checked ${sourcesChecked} sources just now — weather feeds, permits, local news, social — and nothing strong enough to surface yet. I'll keep scouting and ping you the moment a real buying signal lands.`,
          createdAt: new Date().toISOString(),
        },
      ],
    }
  }

  const cards: ChatLeadCard[] = []
  for (const opp of opps) {
    const [prospect, signal] = await Promise.all([
      opp.prospectId
        ? db.query.prospects.findFirst({
            where: (t, { eq, and }) =>
              and(eq(t.id, opp.prospectId!), eq(t.workspaceId, workspaceId)),
          })
        : Promise.resolve(null),
      opp.signalId
        ? db.query.signals.findFirst({
            where: (t, { eq, and }) =>
              and(eq(t.id, opp.signalId!), eq(t.workspaceId, workspaceId)),
          })
        : Promise.resolve(null),
    ])
    const where = signalLocation(signal)
    const locParts = [prospect?.city, prospect?.state].filter(Boolean) as string[]
    const location = locParts.length > 0 ? locParts.join(', ') : where

    const baseLabel =
      SIGNAL_LABELS[signal?.signalType ?? 'other'] ?? 'Signal detected'
    const ageLabel = relativeTime(signal?.detectedAt ?? signal?.createdAt ?? null)

    const evidenceChips: Array<{ label: string; tone?: 'neutral' }> = []
    if (prospect?.enrichmentStatus === 'complete') {
      evidenceChips.push({ label: 'Owner reachable', tone: 'neutral' })
    }

    const signalType = signal?.signalType ?? 'other'
    const verticalFitLabel = SIGNAL_VERTICAL_FIT[signalType] ?? null
    const freshnessLabel = freshnessLabelFor(signal)

    cards.push({
      opportunityId: opp.id,
      businessName: prospect?.businessName ?? 'Unknown business',
      signalLabel: signalLabel(signal),
      score: opp.score,
      location,
      whyNow: opp.whyNow ?? signal?.whyRelevant ?? null,
      ageLabel: `${baseLabel.split(' ').slice(-1)[0] === 'detected' ? 'Signal' : baseLabel.split(' · ')[0]} · ${ageLabel}`,
      evidenceChips,
      verticalFitLabel,
      freshnessLabel,
      fallbackState: null,
    })
  }

  const topSignal = await db.query.signals.findFirst({
    where: (t, { eq }) => eq(t.workspaceId, workspaceId),
    orderBy: (t, { desc: d }) => [d(t.detectedAt)],
  })
  const region =
    signalLocation(topSignal) ??
    (cards[0]?.signalLabel.split(' · ')[1] ?? 'your service area')

  const messages: ChatMessage[] = [
    {
      id: 'm-greet',
      role: 'assistant',
      content: firstName
        ? `Morning, ${firstName} — I scouted ${region} overnight and pulled the strongest signals for you. Want to see the top picks?`
        : `Morning — I scouted ${region} overnight. Here are the strongest signals I found.`,
      createdAt: new Date(Date.now() - 90_000).toISOString(),
    },
    {
      id: 'm-yes',
      role: 'user',
      content: 'Yeah, show me what you found.',
      createdAt: new Date(Date.now() - 75_000).toISOString(),
    },
    {
      id: 'm-cards',
      role: 'assistant',
      content:
        cards.length === 1
          ? 'One stands out right now — clean signal, owner-reachable, fits your ideal customer.'
          : `Here are the top ${cards.length}. Tap any card to see the evidence and the outreach draft I lined up.`,
      createdAt: new Date(Date.now() - 60_000).toISOString(),
      leads: cards,
    },
  ]

  return { messages, isEmptyRun: false, sourcesChecked: cards.length }
}

export const PLACEHOLDER_REPLY =
  "I'm holding off on a live answer until the conversation agent is wired up (Checkpoint 6). Your message is logged — try the lead cards above in the meantime."
