'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { MessageSquare, Sun, ListChecks, Map as MapIcon, Settings } from 'lucide-react'

const items = [
  { href: '/app/chat', label: 'Chat', icon: MessageSquare },
  { href: '/app/today', label: 'Today', icon: Sun },
  { href: '/app/leads', label: 'Leads', icon: ListChecks },
  { href: '/app/map', label: 'Map', icon: MapIcon },
  { href: '/app/settings/profile', label: 'Settings', icon: Settings },
]

export function MobileBottomNav() {
  const pathname = usePathname()
  return (
    <nav
      aria-label="Primary"
      className="lg:hidden fixed bottom-0 inset-x-0 z-30 bg-brand-cream shadow-fetchi-sticky flex items-stretch h-16 pb-[env(safe-area-inset-bottom)]"
    >
      {items.map(item => {
        const Icon = item.icon
        const active =
          pathname === item.href ||
          (item.href.startsWith('/app/settings')
            ? pathname?.startsWith('/app/settings')
            : pathname?.startsWith(item.href))
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? 'page' : undefined}
            className={`relative flex-1 flex flex-col items-center justify-center gap-0.5 min-h-[44px] text-[11px] font-semibold transition-colors ${
              active ? 'text-brand-near-black' : 'text-brand-near-black/50 hover:text-brand-near-black/80'
            }`}
          >
            {active && (
              <span
                aria-hidden
                className="absolute top-1.5 h-[3px] w-7 rounded-full bg-brand-green"
              />
            )}
            <Icon
              className="h-[22px] w-[22px] mt-1"
              strokeWidth={active ? 2.2 : 1.8}
            />
            <span>{item.label}</span>
          </Link>
        )
      })}
    </nav>
  )
}
