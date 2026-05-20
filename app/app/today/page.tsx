import { and, desc, eq, inArray } from 'drizzle-orm'
import {
  db,
  opportunities,
  prospects,
  signals,
  contactRoutes,
} from '@/db'
import { requireWorkspaceContext } from '@/lib/workspace'
import { MobileScreenHeader } from '@/components/app/MobileScreenHeader'
import { formatSignalToken } from '@/lib/signals/token'
import {
  TodaysRunView,
  type TodaysRunItem,
} from '@/components/app/TodaysRunView'

export const dynamic = 'force-dynamic'

const DAILY_QUEUE_LIMIT = 3

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

function labelForSignalType(t: string | null | undefined): string {
  if (!t) return 'Signal'
  return SIGNAL_TYPE_LABEL[t] ?? t.replace(/_/g, ' ')
}

function locationFor(p: { city: string | null; state: string | null } | null): string | null {
  if (!p?.city) return null
  return p.state ? `${p.city}, ${p.state}` : p.city
}

// Dev-only visual fallback so the page renders cleanly when a workspace has
// no opportunities yet. Gated outside production; never writes to the DB.
function demoQueue(): TodaysRunItem[] {
  return [
    {
      id: 'demo-1',
      status: 'new',
      score: 92,
      businessName: 'Parkview Office Complex',
      location: 'Dallas, TX',
      whyNow:
        'Tuesday\u2019s hail event dropped 1.8" stones across the Parkview corridor. Roof age and policy renewal window line up.',
      signalLabel: 'Hail event',
      signalType: 'weather_hail',
      signalToken: 'HAIL · 1.8" · 2D',
      contactName: 'Morgan Reyes',
      contactConfidence: 2,
      evidenceCount: 4,
    },
    {
      id: 'demo-2',
      status: 'new',
      score: 81,
      businessName: 'Cedar & Co. Bistro',
      location: 'Plano, TX',
      whyNow:
        'New commercial kitchen permit filed last week — typically signals a vendor refresh on HVAC and equipment service.',
      signalLabel: 'Building permit',
      signalType: 'building_permit',
      signalToken: 'PERMIT · COMMERCIAL · 6D',
      contactName: null,
      contactConfidence: null,
      evidenceCount: 2,
    },
    {
      id: 'demo-3',
      status: 'saved',
      score: 76,
      businessName: 'High Desert Garage',
      location: 'Frisco, TX',
      whyNow:
        'Just posted three service tech roles in the last 14 days — active growth tends to precede vendor expansion.',
      signalLabel: 'Job posting',
      signalType: 'job_posting',
      signalToken: 'JOB · 3 ROLES · 4D',
      contactName: 'A. Patel',
      contactConfidence: 1,
      evidenceCount: 3,
    },
  ]
}

export default async function TodayPage() {
  const ctx = await requireWorkspaceContext()

  // Top scored unreviewed (or just-saved) opportunities for this workspace.
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

  const [prospectRows, signalRows, contactRows] = await Promise.all([
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
  ])

  const prospectById = new Map(prospectRows.map(p => [p.id, p]))
  const signalById = new Map(signalRows.map(s => [s.id, s]))
  const bestContactByProspect = new Map<string, (typeof contactRows)[number]>()
  for (const c of contactRows) {
    if (!c.prospectId) continue
    const existing = bestContactByProspect.get(c.prospectId)
    if (!existing || (c.confidence ?? 0) > (existing.confidence ?? 0)) {
      bestContactByProspect.set(c.prospectId, c)
    }
  }

  const queue: TodaysRunItem[] = opps.map(o => {
    const p = o.prospectId ? prospectById.get(o.prospectId) ?? null : null
    const s = o.signalId ? signalById.get(o.signalId) ?? null : null
    const c = o.prospectId ? bestContactByProspect.get(o.prospectId) ?? null : null
    const token = s
      ? formatSignalToken({
          signalType: s.signalType,
          detectedAt: s.detectedAt ?? s.createdAt,
          parsedData: (s.parsedData ?? null) as Record<string, unknown> | null,
        })
      : null
    const contactsForProspect = o.prospectId
      ? contactRows.filter(cr => cr.prospectId === o.prospectId).length
      : 0
    const evidenceCount =
      (s?.whyRelevant ? 1 : 0) +
      (o.whyNow ? 1 : 0) +
      contactsForProspect

    return {
      id: o.id,
      status: o.status,
      score: o.score,
      businessName: p?.businessName ?? 'Unknown business',
      location: locationFor(p),
      whyNow: o.whyNow,
      signalLabel: labelForSignalType(s?.signalType),
      signalType: s?.signalType ?? null,
      signalToken: token,
      contactName: c?.contactName ?? null,
      contactConfidence:
        typeof c?.confidence === 'number'
          ? Math.round((c.confidence / 100) * 3)
          : null,
      evidenceCount,
    }
  })

  const useDemo = queue.length === 0 && process.env.NODE_ENV !== 'production'
  const renderQueue = useDemo ? demoQueue() : queue
  const queuedLabel = `${renderQueue.length} ${renderQueue.length === 1 ? 'lead' : 'leads'} queued for review`

  return (
    <div className="max-w-2xl mx-auto">
      <MobileScreenHeader
        title="Today's Run"
        description={renderQueue.length > 0 ? queuedLabel : 'No leads queued right now.'}
      />
      <div className="px-4 lg:px-7 pb-[calc(env(safe-area-inset-bottom)+96px)] lg:pb-12">
        <TodaysRunView initialQueue={renderQueue} isDemo={useDemo} />
      </div>
    </div>
  )
}
