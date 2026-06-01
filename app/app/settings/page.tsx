import Link from 'next/link'
import { Sparkles, Megaphone, MapPin, Users, CreditCard, Gauge, Bell, User as UserIcon, ChevronRight } from 'lucide-react'
import { requireWorkspaceContext } from '@/lib/workspace'
import { db } from '@/db'
import { MobileScreenHeader } from '@/components/app/MobileScreenHeader'

export const dynamic = 'force-dynamic'

type Row = { href: string; icon: React.ComponentType<{ className?: string }>; iconTone: 'green' | 'neutral' | 'dark' | 'blue'; label: string; hint: string; value: string }

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
    { href: '/app/settings/signals', icon: Sparkles, iconTone: 'green', label: 'Signal sensitivity', hint: 'Which signals trigger a lead', value: sensitivity },
    { href: '/app/settings/notifications', icon: Megaphone, iconTone: 'neutral', label: 'Outreach voice', hint: 'How drafts sound', value: 'Warm' },
    { href: '/app/settings/profile', icon: MapPin, iconTone: 'dark', label: 'Territory', hint: 'Where you work', value: profile?.locationRadiusMiles ? `${profile.locationRadiusMiles} mi` : 'Set radius' },
    { href: '/app/settings/profile', icon: Users, iconTone: 'neutral', label: 'Customer list', hint: 'Existing customers to skip', value: '—' },
  ]
  const account: Row[] = [
    { href: '/app/settings/profile', icon: UserIcon, iconTone: 'dark', label: 'Business Profile', hint: 'Who you are and what you sell', value: profile?.vertical ?? 'Set up' },
    { href: '/app/settings/notifications', icon: Bell, iconTone: 'neutral', label: 'Notifications', hint: 'Email-only at launch', value: 'Email' },
    { href: '/app/settings/billing', icon: CreditCard, iconTone: 'dark', label: 'Plan & Billing', hint: 'Subscription and top-ups', value: planRequired ? 'Plan required' : (tier.charAt(0).toUpperCase() + tier.slice(1)) },
    { href: '/app/settings/usage', icon: Gauge, iconTone: 'green', label: 'Usage', hint: 'Opportunities this cycle', value: usageLabel },
  ]

  return (
    <div className="max-w-3xl">
      <MobileScreenHeader title="Settings" />
      <div className="px-4 lg:px-7 pb-10 space-y-5 lg:space-y-6">
        <div className="rounded-2xl bg-surface shadow-fetchi-soft p-4 lg:p-5">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-full bg-ok/15 text-ok text-[15px] font-bold flex items-center justify-center flex-shrink-0" aria-hidden>{initials}</div>
            <div className="min-w-0 flex-1">
              <div className="font-outfit text-[17px] font-bold text-text leading-tight truncate">{ctx.workspace.businessName ?? 'Your workspace'}</div>
              <div className="text-[12.5px] text-text/55 mt-0.5 truncate">{locationLine}</div>
              <div className="flex items-center gap-2 mt-2">
                {planRequired ? (
                  <Link href="/app/settings/billing" className="inline-flex items-center rounded-full bg-text/8 text-text/60 px-2.5 py-0.5 text-[11px] font-bold border border-text/15">Plan required</Link>
                ) : (
                  <>
                    <span className="inline-flex items-center rounded-full bg-ok/15 text-ok px-2.5 py-0.5 text-[11px] font-bold border border-ok/25 capitalize">{tier} plan</span>
                    <span className="inline-flex items-center rounded-full bg-raised text-text/65 px-2.5 py-0.5 text-[11px] font-semibold border border-text/10">{usageLabel}</span>
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
  return <div><div className="text-[11px] font-bold uppercase tracking-[1.2px] text-text/45 px-1 mb-2.5">{eyebrow}</div><div className="rounded-2xl bg-surface shadow-fetchi-soft overflow-hidden">{rows.map((r, i) => <SettingsCardRow key={r.label + i} row={r} divider={i < rows.length - 1} />)}</div></div>
}

function SettingsCardRow({ row, divider }: { row: Row; divider: boolean }) {
  const Icon = row.icon
  const toneClass = row.iconTone === 'green' ? 'bg-ok/15 text-ok' : row.iconTone === 'blue' ? 'bg-blue/10 text-blue' : row.iconTone === 'dark' ? 'bg-text/10 text-text' : 'bg-raised text-text/60'
  return (
    <Link href={row.href} className={`flex items-center gap-3.5 px-4 lg:px-5 py-3.5 min-h-[68px] hover:bg-raised/60 transition-colors ${divider ? 'border-b border-text/8' : ''}`}>
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${toneClass}`} aria-hidden><Icon className="h-[18px] w-[18px]" /></div>
      <div className="flex-1 min-w-0"><div className="text-[14.5px] font-bold text-text leading-tight truncate">{row.label}</div><div className="text-[12.5px] text-text/55 mt-0.5 truncate">{row.hint}</div></div>
      <div className="flex items-center gap-1.5 flex-shrink-0"><span className="text-[13px] font-semibold text-text/75 truncate max-w-[120px]">{row.value}</span><ChevronRight className="h-4 w-4 text-text/30" /></div>
    </Link>
  )
}
