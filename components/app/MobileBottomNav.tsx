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
    <nav className="lg:hidden fixed bottom-0 inset-x-0 z-30 bg-white border-t border-brand-near-black/10 flex items-stretch h-16 pb-[env(safe-area-inset-bottom)]">
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
            className={`flex-1 flex flex-col items-center justify-center gap-0.5 min-h-[44px] text-[11px] font-medium transition-colors ${
              active ? 'text-brand-green' : 'text-brand-near-black/55'
            }`}
          >
            <Icon className="h-5 w-5" strokeWidth={active ? 2.2 : 1.8} />
            <span>{item.label}</span>
          </Link>
        )
      })}
    </nav>
  )
}
