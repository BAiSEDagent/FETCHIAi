import { and, eq, desc, inArray } from 'drizzle-orm'
import { formatDistanceToNow } from 'date-fns'
import { db, opportunities, prospects, signals } from '@/db'
import { requireWorkspaceContext } from '@/lib/workspace'
import { MyLeadsView, type LeadRow } from '@/components/app/MyLeadsView'
import { formatSignalToken } from '@/lib/signals/token'

export const dynamic = 'force-dynamic'

const SIGNAL_LABELS: Record<string, string> = {
  storm_damage: 'Storm damage',
  weather_hail: 'Hail event',
  weather_wind: 'High-wind event',
  building_permit: 'Building permit',
  new_business_listing: 'New listing',
  job_posting: 'Job posting',
  event: 'Local event',
  funding: 'Funding announcement',
  news: 'News mention',
  review: 'Review activity',
  social: 'Social signal',
  expansion: 'Expansion',
  ownership_change: 'Ownership change',
  other: 'Signal detected',
}

// Approved vertical-fit taxonomy — mirrors SIGNAL_VERTICAL_FIT in lib/seed-chat.ts.
// Keep in sync with that map; never call seed-chat.ts from a route file.
const VERTICAL_FIT_MAP: Record<string, string | null> = {
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

// Deterministic freshness label from a signal detection timestamp.
// Used for real DB rows only — demo rows set freshnessLabel inline.
function freshnessLabelFromDate(d: Date | string | null | undefined): string | null {
  if (!d) return null
  const diff = Date.now() - new Date(d).getTime()
  const hours = Math.floor(diff / 3_600_000)
  const days = Math.floor(diff / 86_400_000)
  if (hours <= 0) return 'Just now'
  if (hours < 24) return `${hours}h ago`
  if (days === 1) return 'Yesterday'
  return `${days}d ago`
}

// Dev-only UI fallback so the redesign can be visually QA'd in workspaces
// that haven't ingested any real opportunities yet. Never shipped to prod
// and never written to the database — purely a client-side render aid.
//
// Covers all four Product Proof CP1 fallback states:
//   demo-1, demo-2 → strong vertical-fit, no fallback
//   demo-3         → weak_fit
//   demo-4         → missing_evidence
//   demo-5         → exploratory
//   demo-6 … demo-9 → strong fit or no fallback (other statuses)
function devDemoLeads(): LeadRow[] {
  const now = Date.now()
  const m = (mins: number) => now - mins * 60 * 1000
  return [
    {
      id: 'demo-1', href: '/app/leads', businessName: 'Pine & Co. Construction',
      signalLabel: 'Building permit', signalToken: 'PERMIT · RESIDENTIAL · 4H',
      signalType: 'building_permit', score: 92,
      whyNow: 'New roofing permit filed last Thursday for a 4,200 sqft single-family rebuild in Plano — your service zone, your trade.',
      status: 'new', location: 'Plano, TX', ageLabel: '4h ago', createdAtMs: m(240),
      contactName: 'Marcus Pine', contactConfidence: 3,
      verticalFitLabel: 'Tenant Improvement',
      freshnessLabel: '4h ago',
      fallbackState: null,
    },
    {
      id: 'demo-2', href: '/app/leads', businessName: 'Hillside Storage LLC',
      signalLabel: 'Hail event', signalToken: 'HAIL · 1.25" · 11H',
      signalType: 'weather_hail', score: 88,
      whyNow: '1.25" hail confirmed within 2 miles of their address two nights ago — likely roof inspection request inbound.',
      status: 'new', location: 'Frisco, TX', ageLabel: '11h ago', createdAtMs: m(660),
      contactName: 'Dana Reyes', contactConfidence: 2,
      verticalFitLabel: 'Roof',
      freshnessLabel: '11h ago',
      fallbackState: null,
    },
    {
      id: 'demo-3', href: '/app/leads', businessName: 'North Loop Dental',
      signalLabel: 'New listing', signalToken: 'NEW · 1D',
      signalType: 'new_business_listing', score: 81,
      whyNow: 'Just opened a second location last week — typically need signage, HVAC commissioning, and exterior cleanup in the first 30 days.',
      status: 'saved', location: 'Allen, TX', ageLabel: '1d ago', createdAtMs: m(1500),
      contactName: 'Office Manager', contactConfidence: 1,
      verticalFitLabel: 'Final Clean',
      freshnessLabel: '1d ago',
      fallbackState: 'weak_fit',
    },
    {
      id: 'demo-4', href: '/app/leads', businessName: 'Maple Ridge HOA',
      signalLabel: 'High-wind event', signalToken: 'WIND · 62 MPH · 2D',
      signalType: 'weather_wind', score: 76,
      whyNow: '62 mph wind gusts logged over the community Saturday. HOAs in this zone historically request fence and roof inspections within the week.',
      status: 'saved', location: 'McKinney, TX', ageLabel: '2d ago', createdAtMs: m(2880),
      contactName: 'Karen Walsh', contactConfidence: 2,
      verticalFitLabel: 'Roof',
      freshnessLabel: '2d ago',
      fallbackState: 'missing_evidence',
    },
    {
      id: 'demo-5', href: '/app/leads', businessName: 'Brewhouse 12',
      signalLabel: 'Local event', signalToken: 'EVENT · 3D',
      signalType: 'event', score: 74,
      whyNow: 'Hosting a 400-person taproom anniversary event in 16 days — likely needs signage, light retrofit, and patio prep.',
      status: 'contacted', location: 'Dallas, TX', ageLabel: '3d ago', createdAtMs: m(4320),
      contactName: 'Sam Whitlow', contactConfidence: 3,
      verticalFitLabel: 'Restaurant',
      freshnessLabel: '3d ago',
      fallbackState: 'exploratory',
    },
    {
      id: 'demo-6', href: '/app/leads', businessName: 'Vega Boutique Hotel',
      signalLabel: 'Funding announcement', signalToken: 'FUNDING · $2.4M · 5D',
      signalType: 'funding', score: 69,
      whyNow: 'Closed a $2.4M renovation round — historically expand spend across construction trades in first 60 days.',
      status: 'responded', location: 'Fort Worth, TX', ageLabel: '5d ago', createdAtMs: m(7200),
      contactName: 'Priya Devan', contactConfidence: 2,
      verticalFitLabel: 'New Office',
      freshnessLabel: '5d ago',
      fallbackState: null,
    },
    {
      id: 'demo-7', href: '/app/leads', businessName: 'Ridgepoint Properties',
      signalLabel: 'Building permit', signalToken: 'PERMIT · TI · 1W',
      signalType: 'building_permit', score: 64,
      whyNow: 'Filed a tenant-improvement permit for a strip-mall remodel — typical timeline for trade subs starts in ~10 days.',
      status: 'won', location: 'Garland, TX', ageLabel: '1w ago', createdAtMs: m(10080),
      contactName: 'Jeff Ridge', contactConfidence: 3,
      verticalFitLabel: 'Tenant Improvement',
      freshnessLabel: '1w ago',
      fallbackState: null,
    },
    {
      id: 'demo-8', href: '/app/leads', businessName: 'Ortega & Sons Auto',
      signalLabel: 'Storm damage', signalToken: 'HAIL · SAME CELL · 1W',
      signalType: 'storm_damage', score: 58,
      whyNow: 'Reported lot flooding after Tuesday\u2019s storm — possible drainage, signage, and asphalt patch scope.',
      status: 'skipped', location: 'Arlington, TX', ageLabel: '1w ago', createdAtMs: m(10500),
      contactName: null, contactConfidence: null,
      verticalFitLabel: 'Roof',
      freshnessLabel: '1w ago',
      fallbackState: null,
    },
    {
      id: 'demo-9', href: '/app/leads', businessName: 'Westgate Athletic Club',
      signalLabel: 'Expansion', signalToken: 'EXPANSION · 2W',
      signalType: 'expansion', score: 52,
      whyNow: 'Announced a 12,000 sqft fitness annex — slated to break ground in Q3 per their LinkedIn.',
      status: 'expired', location: 'Irving, TX', ageLabel: '2w ago', createdAtMs: m(21600),
      contactName: 'Connor Hayes', contactConfidence: 1,
      verticalFitLabel: 'New Office',
      freshnessLabel: '2w ago',
      fallbackState: null,
    },
  ]
}

export default async function LeadsPage() {
  const ctx = await requireWorkspaceContext()

  const rows = await db
    .select()
    .from(opportunities)
    .where(eq(opportunities.workspaceId, ctx.workspaceId))
    .orderBy(desc(opportunities.score), desc(opportunities.createdAt))

  const prospectIds = Array.from(
    new Set(rows.map(r => r.prospectId).filter((v): v is string => Boolean(v))),
  )
  const signalIds = Array.from(
    new Set(rows.map(r => r.signalId).filter((v): v is string => Boolean(v))),
  )
  const [prospectRows, signalRows] = await Promise.all([
    prospectIds.length > 0
      ? db
          .select()
          .from(prospects)
          .where(
            and(
              eq(prospects.workspaceId, ctx.workspaceId),
              inArray(prospects.id, prospectIds),
            ),
          )
      : Promise.resolve([] as Array<typeof prospects.$inferSelect>),
    signalIds.length > 0
      ? db
          .select()
          .from(signals)
          .where(
            and(
              eq(signals.workspaceId, ctx.workspaceId),
              inArray(signals.id, signalIds),
            ),
          )
      : Promise.resolve([] as Array<typeof signals.$inferSelect>),
  ])
  const prospectById = new Map(prospectRows.map(p => [p.id, p]))
  const signalById = new Map(signalRows.map(s => [s.id, s]))

  const realLeads: LeadRow[] = rows.map(opp => {
    const prospect = opp.prospectId ? prospectById.get(opp.prospectId) ?? null : null
    const signal = opp.signalId ? signalById.get(opp.signalId) ?? null : null
    const createdAt = new Date(opp.createdAt)
    const signalType = signal?.signalType ?? null
    const signalToken = signal
      ? formatSignalToken({
          signalType: signal.signalType,
          detectedAt: signal.detectedAt ?? signal.createdAt,
          parsedData: (signal.parsedData ?? null) as Record<string, unknown> | null,
        })
      : null
    return {
      id: opp.id,
      href: `/app/leads/${opp.id}`,
      businessName: prospect?.businessName ?? 'Unknown business',
      signalLabel: SIGNAL_LABELS[signalType ?? ''] ?? 'Signal',
      signalToken,
      signalType,
      score: opp.score,
      whyNow: opp.whyNow ?? signal?.whyRelevant ?? null,
      status: opp.status ?? 'new',
      location: prospect?.city ? `${prospect.city}${prospect.state ? `, ${prospect.state}` : ''}` : null,
      ageLabel: formatDistanceToNow(createdAt, { addSuffix: true }),
      createdAtMs: createdAt.getTime(),
      contactName: null,
      contactConfidence: null,
      verticalFitLabel: signalType ? (VERTICAL_FIT_MAP[signalType] ?? null) : null,
      freshnessLabel: freshnessLabelFromDate(signal ? (signal.detectedAt ?? signal.createdAt) : null),
      fallbackState: null,
    }
  })

  const isDev = process.env.NODE_ENV !== 'production'
  const useDemo = isDev && realLeads.length === 0
  const leads = useDemo ? devDemoLeads() : realLeads

  const dayMs = 24 * 60 * 60 * 1000
  const since = Date.now() - dayMs
  const newTodayCount = leads.filter(l => l.createdAtMs >= since && l.status === 'new').length

  // Today's Run is a session view; for the CTA count we surface unreviewed
  // 'new' leads scored high enough to be considered queued — schema for the
  // formal Today's Run session is out of scope for CP2.5A.
  const todaysRunCount = Math.min(
    leads.filter(l => l.status === 'new' && l.score >= 70).length,
    3,
  )

  return (
    <MyLeadsView
      leads={leads}
      newTodayCount={newTodayCount}
      todaysRunCount={todaysRunCount}
      isDemoData={useDemo}
    />
  )
}
