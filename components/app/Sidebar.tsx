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
          'flex items-center gap-2.5 px-[18px] py-2 text-[13px] transition-colors min-h-[40px]',
          active
            ? 'text-white bg-[rgba(29,158,117,0.2)]'
            : 'text-white/55 hover:text-white hover:bg-white/5',
        ].join(' ')}
      >
        <Icon
          className={`h-[15px] w-[15px] flex-shrink-0 ${
            active ? 'text-brand-green opacity-100' : 'opacity-60'
          }`}
        />
        <span className="flex-1">{item.label}</span>
        {badgeText !== undefined && (
          <span className="text-[10px] bg-white/10 text-white/50 rounded-full px-1.5 py-0.5">
            {badgeText}
          </span>
        )}
      </Link>
    )
  }

  return (
    <aside className="h-full w-[220px] bg-brand-near-black flex flex-col py-5">
      <div className="flex items-center gap-2 px-[18px] pb-5 border-b border-white/10 mb-4">
        <FetchiAvatar size={28} />
        <span className="fetchi-wordmark text-[18px] text-white">Fetchi</span>
      </div>

      <div className="text-[10px] font-semibold uppercase tracking-[1.2px] text-white/25 px-[18px] mt-3 mb-1.5">
        Workspace
      </div>
      <nav className="flex flex-col">{workspaceNav.map(renderLink)}</nav>

      <div className="text-[10px] font-semibold uppercase tracking-[1.2px] text-white/25 px-[18px] mt-4 mb-1.5">
        Settings
      </div>
      <nav className="flex flex-col">{settingsNav.map(renderLink)}</nav>

      <div className="mt-auto">{creditsSlot}</div>
    </aside>
  )
}
