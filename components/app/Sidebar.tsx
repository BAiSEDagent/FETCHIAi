'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  MessageSquare,
  Sun,
  ListChecks,
  Map as MapIcon,
  User,
  Sparkles,
  Gauge,
  Bell,
  CreditCard,
} from 'lucide-react'
import { FetchiAvatar } from './FetchiAvatar'
import { SignOutControl } from './SignOutControl'

type NavItem = {
  href: string
  label: string
  icon: React.ComponentType<{ className?: string }>
  badge?: string | number
}

type Props = {
  leadsCount: number
  creditsSlot?: React.ReactNode
  onNavigate?: () => void
}

const workspaceNav: NavItem[] = [
  { href: '/app/chat', label: 'Chat', icon: MessageSquare },
  { href: '/app/today', label: 'Today', icon: Sun },
  { href: '/app/leads', label: 'My Leads', icon: ListChecks },
  { href: '/app/map', label: 'Map', icon: MapIcon },
]

const settingsNav: NavItem[] = [
  { href: '/app/settings/profile', label: 'Business Profile', icon: User },
  { href: '/app/settings/signals', label: 'Signal Preferences', icon: Sparkles },
  { href: '/app/settings/notifications', label: 'Notifications', icon: Bell },
  { href: '/app/settings/billing', label: 'Plan & Billing', icon: CreditCard },
  { href: '/app/settings/usage', label: 'Usage', icon: Gauge },
]

export function Sidebar({ leadsCount, creditsSlot, onNavigate }: Props) {
  const pathname = usePathname()

  const renderLink = (item: NavItem) => {
    const active =
      pathname === item.href ||
      (item.href !== '/app/chat' && pathname?.startsWith(item.href))
    const Icon = item.icon
    const badgeText =
      item.label === 'My Leads' && leadsCount > 0 ? String(leadsCount) : item.badge
    return (
      <Link
        key={item.href}
        href={item.href}
        onClick={onNavigate}
        className={[
          'group relative flex items-center gap-3 mx-3 px-3 rounded-xl text-[13.5px] transition-colors min-h-[44px]',
          active
            ? 'text-brand-near-black bg-brand-light'
            : 'text-brand-near-black/60 hover:text-brand-near-black hover:bg-brand-near-black/5',
        ].join(' ')}
      >
        {active && (
          <span
            aria-hidden
            className="absolute left-0 top-1.5 bottom-1.5 w-[3px] rounded-full bg-brand-green"
          />
        )}
        <Icon
          className={`h-[16px] w-[16px] flex-shrink-0 transition-colors ${
            active ? 'text-brand-green' : 'text-brand-near-black/45 group-hover:text-brand-near-black/75'
          }`}
        />
        <span className="flex-1 font-medium">{item.label}</span>
        {badgeText !== undefined && (
          <span
            className={`text-[10.5px] font-bold rounded-full px-1.5 py-0.5 ${
              active ? 'bg-brand-green/20 text-brand-dark' : 'bg-brand-near-black/5 text-brand-near-black/55'
            }`}
          >
            {badgeText}
          </span>
        )}
      </Link>
    )
  }

  return (
    <aside className="h-full w-[220px] bg-brand-cream flex flex-col py-5 shadow-fetchi-soft">
      <Link
        href="/app/chat"
        onClick={onNavigate}
        className="flex items-center gap-2.5 px-5 pb-5 mb-3 border-b border-brand-near-black/8 hover:opacity-90 transition-opacity"
      >
        <FetchiAvatar size={28} />
        <span className="fetchi-wordmark text-[19px] text-brand-near-black">Fetchi</span>
      </Link>

      <div className="text-[10px] font-bold uppercase tracking-[1.4px] text-brand-near-black/35 px-5 mt-2 mb-1.5">
        Workspace
      </div>
      <nav className="flex flex-col gap-0.5">{workspaceNav.map(renderLink)}</nav>

      <div className="text-[10px] font-bold uppercase tracking-[1.4px] text-brand-near-black/35 px-5 mt-5 mb-1.5">
        Settings
      </div>
      <nav className="flex flex-col gap-0.5">{settingsNav.map(renderLink)}</nav>

      <div className="mt-auto">
        {creditsSlot}
        <SignOutControl variant="sidebar" />
      </div>
    </aside>
  )
}
