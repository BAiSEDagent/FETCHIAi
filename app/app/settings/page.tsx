import Link from 'next/link'
import { Sparkles, Megaphone, MapPin, Users, CreditCard, Gauge, Bell, User as UserIcon, ChevronRight } from 'lucide-react'
import { requireWorkspaceContext } from '@/lib/workspace'
import { db } from '@/db'
import { MobileScreenHeader } from '@/components/app/MobileScreenHeader'

export const dynamic = 'force-dynamic'

type Row = { href: string; icon: React.ComponentType<{ className?: string }>; iconTone: 'accent' | 'neutral'; label: string; hint: string; value: string }

export default async function SettingsHomePage() {
  const ctx = await requireWorkspaceContext()
  const [profile, sub, signalPrefs] = await Promise.all([
    db.query.serviceProfiles.findFirst({ where: (t, { eq }) => eq(t.workspaceId, ctx.workspaceId) }),
    db.query.workspaceSubscriptions.findFirst({ where: (t, { eq }) => eq(t.workspaceId, ctx.workspaceId) }),
    db.query.signalPreferences.findFirst({ where: (t, { eq }) => eq(t.workspaceId, ctx.workspaceId) }),
  ])
  const tier = sub?.tier ?? ''
  const inTrial = (sub?.status ?? 'trialing') === 'trialing'
  const used = inTrial ? sub?.trialOpportunitiesUsed ?? 0 : sub?.opportunitiesUsed ?? 0
  const cap = inTrial ? sub?.trialOpportunitiesLimit ?? 5 : sub?.opportunitiesLimit ?? null
  const PLAN_REQUIRED_STATUSES = new Set(['trialing', 'expired', 'canceled', 'unpaid', 'incomplete', 'incomplete_expired', 'paused'])
  const planRequired = !sub || tier === 'trial' || !sub.status || PLAN_REQUIRED_STATUSES.has(sub.status)
  const usageLabel = planRequired ? '—' : (cap === null ? `${used} leads` : `${used} / ${cap} leads`)
  const initials = (ctx.workspace.businessName ?? 'Fetchi').split(' ').map(w => w[0]).filter(Boolean).slice(0, 2).join('').toUpperCase() || 'FA'
  const locationLine = profile?.locationCity ? `${profile.locationCity}${profile.locationState ? `, ${profile.locationState}` : ''} · ${profile.locationRadiusMiles ?? 50}-mi radius` : 'Set your service area'
  const sensitivity = (signalPrefs?.minScoreThreshold ?? 70) >= 85 ? 'Conservative' : (signalPrefs?.minScoreThreshold ?? 70) <= 60 ? 'Aggressive' : 'Balanced'

  const howFetchiWorks: Row[] = [
    { href: '/app/settings/signals', icon: Sparkles, iconTone: 'accent', label: 'Signal sensitivity', hint: 'Which signals trigger a lead', value: sensitivity },
    { href: '/app/settings/notifications', icon: Megaphone, iconTone: 'neutral', label: 'Outreach voice', hint: 'How drafts sound', value: 'Warm' },
    { href: '/app/settings/profile', icon: MapPin, iconTone: 'neutral', label: 'Territory', hint: 'Where you work', value: profile?.locationRadiusMiles ? `${profile.locationRadiusMiles} mi` : 'Set radius' },
    { href: '/app/settings/profile', icon: Users, iconTone: 'neutral', label: 'Customer list', hint: 'Existing customers to skip', value: '—' },
  ]
  const account: Row[] = [
    { href: '/app/settings/profile', icon: UserIcon, iconTone: 'neutral', label: 'Business Profile', hint: 'Who you are and what you sell', value: profile?.vertical ?? 'Set up' },
    { href: '/app/settings/notifications', icon: Bell, iconTone: 'neutral', label: 'Notifications', hint: 'Email-only at launch', value: 'Email' },
    { href: '/app/settings/billing', icon: CreditCard, iconTone: 'neutral', label: 'Plan & Billing', hint: 'Subscription and top-ups', value: planRequired ? 'Plan required' : (tier.charAt(0).toUpperCase() + tier.slice(1)) },
    { href: '/app/settings/usage', icon: Gauge, iconTone: 'accent', label: 'Usage', hint: 'Opportunities this cycle', value: usageLabel },
  ]

  return (
    <div data-fetchi-settings-v5 className="max-w-3xl">
      <MobileScreenHeader title="Settings" />
      <div className="space-y-5 px-4 pb-10 lg:px-7 lg:space-y-6">
        <div className="rounded-xl border border-[var(--fetchi-border-subtle)] bg-[var(--fetchi-surface)] p-4 lg:p-5">
          <div className="flex items-center gap-3.5">
            <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-lg bg-fetchiOverlay text-[14px] font-semibold text-text" aria-hidden>{initials}</div>
            <div className="min-w-0 flex-1">
              <div className="truncate font-fetchi text-[17px] font-semibold leading-tight tracking-[-0.02em] text-text">{ctx.workspace.businessName ?? 'Your workspace'}</div>
              <div className="mt-0.5 truncate text-[12.5px] text-text/55">{locationLine}</div>
              <div className="mt-2 flex items-center gap-2">
                {planRequired ? (
                  <Link data-fetchi-settings-plan-link-v5 href="/app/settings/billing" className="fetchi-focus-ring inline-flex min-h-[44px] items-center rounded-full border border-text/15 bg-fetchiOverlay px-2.5 py-0.5 text-[11px] font-semibold text-text/60 hover:bg-fetchiOverlayHover">Plan required</Link>
                ) : (
                  <>
                    <span className="inline-flex min-h-[22px] items-center rounded-full border border-semanticGreen/25 bg-semanticGreen/15 px-2.5 py-0.5 text-[11px] font-semibold capitalize text-semanticGreen">{tier} plan</span>
                    <span className="inline-flex min-h-[22px] items-center rounded-full border border-text/10 bg-fetchiOverlay px-2.5 py-0.5 text-[11px] font-medium text-text/65">{usageLabel}</span>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
        <SettingsCardGroup eyebrow="How Fetchi works for you" rows={howFetchiWorks} />
        <SettingsCardGroup eyebrow="Account" rows={account} />
      </div>
    </div>
  )
}

function SettingsCardGroup({ eyebrow, rows }: { eyebrow: string; rows: Row[] }) {
  return <div><div className="mb-2 px-1 text-[10.5px] font-semibold uppercase tracking-[0.14em] text-text/45">{eyebrow}</div><div className="overflow-hidden rounded-xl border border-[var(--fetchi-border-subtle)] bg-[var(--fetchi-surface)]">{rows.map((r, i) => <SettingsCardRow key={r.label + i} row={r} divider={i < rows.length - 1} />)}</div></div>
}

function SettingsCardRow({ row, divider }: { row: Row; divider: boolean }) {
  const Icon = row.icon
  const toneClass = row.iconTone === 'accent' ? 'bg-[var(--fetchi-accent-tint)] text-fetchiAccent' : 'bg-fetchiOverlay text-text/60'
  return (
    <Link data-fetchi-settings-row-v5 href={row.href} className={`flex min-h-[64px] items-center gap-3 px-4 py-3 transition-[background-color,box-shadow,transform] duration-150 hover:bg-fetchiOverlayHover active:scale-[0.99] active:bg-[var(--fetchi-overlay-active)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-fetchiAccent motion-reduce:transform-none lg:px-5 ${divider ? 'border-b border-text/10' : ''}`}>
      <div className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg ${toneClass}`} aria-hidden><Icon className="h-[18px] w-[18px]" /></div>
      <div className="min-w-0 flex-1"><div className="truncate text-[14px] font-semibold leading-tight text-text">{row.label}</div><div className="mt-0.5 truncate text-[12.5px] text-text/55">{row.hint}</div></div>
      <div className="flex flex-shrink-0 items-center gap-1.5"><span className="max-w-[120px] truncate text-[13px] font-medium text-text/75">{row.value}</span><ChevronRight className="h-4 w-4 text-text/30" /></div>
    </Link>
  )
}
