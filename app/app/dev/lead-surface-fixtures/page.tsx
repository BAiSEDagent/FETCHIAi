import { ChevronRight } from 'lucide-react'
import { LeadCard } from '@/components/app/LeadCard'
import { SectionCard } from '@/components/app/SectionCard'
import { GlyphTile, glyphForSignalType, type GlyphKey } from '@/components/app/GlyphTile'
import { leadStatusLabel, resolveLeadSurface } from '@/components/app/leadSurfaceResolver'
import { TodayRunCard } from '@/components/app/today/TodayRunCard'
import type { TodayRunCardData } from '@/components/app/today/types'
import { cn } from '@/lib/utils'

const todayStorm: TodayRunCardData = {
  opportunityId: 'fixture-today-storm',
  score: 94,
  signalType: 'weather_hail',
  signalLabel: 'Hail event',
  signalToken: 'HAIL · 1.8" · 4D',
  signalAgeLabel: '4d ago',
  status: 'new',
  outcomeNotesSnapshot: null,
  businessName: 'Parkview Office Complex',
  cityState: 'Irving, TX',
  vertical: 'Commercial',
  squareFootageLabel: '86.4k sqft',
  claimStatusLabel: 'No claim filed',
  reason: 'Fresh storm signal matched to a high-fit commercial roof opportunity.',
  evidence: [
    {
      id: 'fixture-e1',
      kind: 'storm',
      title: 'NOAA hail corridor confirms 1.75-2.0" impact',
      chipSuffix: 'MAY 14',
      sourceDomain: 'noaa.gov',
      recencyLabel: '4d ago',
      detailLine: 'Same cell crossed the target address.',
      confidence: 95,
      accent: 'coral',
    },
    {
      id: 'fixture-e2',
      kind: 'property',
      title: 'Commercial property record matched',
      chipSuffix: 'CLASS A',
      sourceDomain: 'county records',
      recencyLabel: null,
      detailLine: '86.4k sqft office complex.',
      confidence: 90,
      accent: 'green',
    },
  ],
  contacts: [
    {
      name: 'Tom Avery',
      title: 'Facilities Manager',
      email: 'tom@example.com',
      phone: '+1 214 555 0118',
      confidence: 88,
      isBest: true,
    },
  ],
  draftPreview: {
    subjectLine: 'Storm inspection for Parkview',
    bodyFirstLines: 'Hi Tom — the hail cell crossed your block this week. Worth a quick roof walk-through?',
  },
}

const listExamples = [
  {
    title: 'My Leads storm / urgent',
    props: {
      href: '/app/leads/fixture-storm',
      businessName: 'Parkview Office Complex',
      signalLabel: 'Hail event',
      signalToken: 'HAIL · 1.8" · 4D',
      signalType: 'weather_hail',
      score: 94,
      status: 'new',
      location: 'Irving, TX',
      ageLabel: '4d ago',
      whyNow: 'Fresh hail corridor crossed the property this week; roof inspection window is active now.',
      contactName: 'Tom Avery',
      contactConfidence: 3,
    },
  },
  {
    title: 'My Leads permit / record',
    props: {
      href: '/app/leads/fixture-permit',
      businessName: 'Frisco Medical Center',
      signalLabel: 'Building permit',
      signalToken: 'PERMIT · TI · 6D',
      signalType: 'building_permit',
      score: 86,
      status: 'contacted',
      location: 'Frisco, TX',
      ageLabel: '6d ago',
      whyNow: 'Tenant-improvement permit indicates a formal vendor window.',
      contactName: 'Mara Lee',
      contactConfidence: 2,
    },
  },
  {
    title: 'My Leads default / discovery',
    props: {
      href: '/app/leads/fixture-discovery',
      businessName: 'Lumen Coworking',
      signalLabel: 'New listing',
      signalToken: 'NEW BIZ · 6H',
      signalType: 'new_business_listing',
      score: 81,
      status: 'new',
      location: 'Austin, TX',
      ageLabel: '6h ago',
      whyNow: 'New tenant announcement suggests a timely services conversation.',
      contactName: null,
      contactConfidence: null,
    },
  },
  {
    title: 'Pipeline / saved',
    props: {
      href: '/app/leads/fixture-saved',
      businessName: 'Apex Distribution',
      signalLabel: 'Hail event',
      signalToken: 'HAIL · 2.1" · 11D',
      signalType: 'weather_hail',
      score: 91,
      status: 'saved',
      location: 'Carrollton, TX',
      ageLabel: '11d ago',
      whyNow: 'Already saved for follow-up, so the surface is quiet pipeline with green accent.',
      contactName: 'Nina Patel',
      contactConfidence: 3,
    },
  },
  {
    title: 'Pipeline / responded',
    props: {
      href: '/app/leads/fixture-responded',
      businessName: 'Westridge Retail',
      signalLabel: 'New listing',
      signalToken: 'NEW · 2D',
      signalType: 'new_business_listing',
      score: 82,
      status: 'responded',
      location: 'Plano, TX',
      ageLabel: '2d ago',
      whyNow: 'Prospect has replied; green belongs to status, not the full card.',
      contactName: 'Luis Romero',
      contactConfidence: 2,
    },
  },
  {
    title: 'Pipeline / won',
    props: {
      href: '/app/leads/fixture-won',
      businessName: 'Alder Hotel',
      signalLabel: 'Building permit',
      signalToken: 'PERMIT · 14D',
      signalType: 'building_permit',
      score: 72,
      status: 'won',
      location: 'Las Colinas, TX',
      ageLabel: '14d ago',
      whyNow: 'Closed opportunity stays calm and uses only the success status accent.',
      contactName: 'Jamie Chen',
      contactConfidence: 3,
    },
  },
  {
    title: 'Aging / expiring',
    props: {
      href: '/app/leads/fixture-aging',
      businessName: 'Lakeshore Hotel',
      signalLabel: 'Expansion',
      signalToken: 'EXPANSION · 21D',
      signalType: 'expansion',
      score: 72,
      status: 'expired',
      location: 'Las Colinas, TX',
      ageLabel: '21d ago',
      whyNow: 'Signal is stale-soon, so it keeps a dark surface with warning accent only.',
      contactName: 'Rina Shah',
      contactConfidence: 1,
    },
  },
]

export default function LeadSurfaceFixturesPage() {
  return (
    <div className="max-w-6xl mx-auto px-4 lg:px-7 pt-6 lg:pt-8 pb-28 space-y-8">
      <header>
        <div className="text-[11px] uppercase tracking-[1px] font-bold text-text/45">Issue #4 fixture</div>
        <h1 className="font-outfit text-[30px] lg:text-[36px] font-bold text-text mt-1">Lead surface grammar</h1>
        <p className="text-[13.5px] text-text/60 mt-2 max-w-2xl leading-relaxed">
          Static QA surface for the shared resolver across Chat, Today, My Leads, and Lead Detail.
        </p>
      </header>

      <section className="space-y-3">
        <h2 className="font-outfit text-[20px] font-semibold text-text">Chat compact storm / urgent</h2>
        <div className="max-w-md">
          <LeadCard
            href="/app/leads/fixture-chat-storm"
            businessName="Parkview Office Complex"
            signalLabel="Hail event"
            signalToken={'HAIL · 1.8" · 4D'}
            signalType="weather_hail"
            score={94}
            status="new"
            location="Irving, TX"
            ageLabel="4d ago"
            variant="chat"
          />
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="font-outfit text-[20px] font-semibold text-text">Today storm / urgent</h2>
        <div className="h-[620px] max-w-xl">
          <TodayRunCard card={todayStorm} />
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="font-outfit text-[20px] font-semibold text-text">My Leads states</h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 lg:gap-4">
          {listExamples.map(example => (
            <div key={example.title} className="space-y-1.5">
              <div className="text-[11px] uppercase tracking-[1px] font-bold text-text/45">{example.title}</div>
              <LeadCard {...example.props} variant="list" />
            </div>
          ))}
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="font-outfit text-[20px] font-semibold text-text">Lead Detail storm hero with evidence</h2>
        <DetailStormFixture />
      </section>
    </div>
  )
}

function DetailStormFixture() {
  const visual = resolveLeadSurface({ context: 'detail', signalType: 'weather_hail', status: 'new', score: 94 })
  return (
    <div className="max-w-3xl space-y-3">
      <section className={cn('rounded-[20px] px-5 py-7 lg:px-8 lg:py-9 text-center', visual.surface)}>
        <div className="flex items-center justify-center flex-wrap gap-1.5">
          <span className={cn('inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-bold tracking-[0.04em] tabular-nums', visual.signalPill)}>
            <span className={cn('w-1.5 h-1.5 rounded-full', visual.signalDot)} />
            HAIL · 1.8" · 4D
          </span>
          <span className={cn('inline-flex items-center rounded-full px-3 py-1.5 text-[11px] font-semibold', visual.statusPill)}>{leadStatusLabel('new')}</span>
        </div>
        <div className={cn('font-outfit text-[72px] lg:text-[86px] leading-none font-bold tabular-nums mt-6', visual.score)}>94</div>
        <p className={cn('text-body-lg mt-3 px-2', visual.muted)}>Fresh storm signal matched to a commercial roof opportunity.</p>
        <h3 className={cn('font-outfit text-h1 lg:text-[32px] mt-6 px-2', visual.title)}>Parkview Office Complex</h3>
        <div className={cn('text-caption mt-1.5', visual.muted)}>Irving, TX</div>
      </section>

      <SectionCard eyebrow="Evidence" actions={<span className="text-[12px] font-semibold text-blue">3 sources</span>}>
        <div className="space-y-0 -mx-1">
          <EvidenceFixtureRow glyph={glyphForSignalType('weather_hail')} title="Storm report" meta="NOAA event · 4d ago" />
          <EvidenceFixtureRow glyph="house" title="Property record" meta="86.4k sqft commercial complex" />
          <EvidenceFixtureRow glyph="sparkle" title="Outreach draft ready" meta="Reviewable below" />
        </div>
      </SectionCard>
    </div>
  )
}

function EvidenceFixtureRow({ glyph, title, meta }: { glyph: GlyphKey; title: string; meta: string }) {
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
