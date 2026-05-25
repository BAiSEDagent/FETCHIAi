'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { MessageSquare, Sun, ListChecks, Map as MapIcon, Settings } from 'lucide-react'
import { cn } from '@/lib/utils'

const items = [
  { href: '/app/chat', label: 'Chat', icon: MessageSquare, match: '/app/chat' },
  { href: '/app/today', label: 'Today', icon: Sun, match: '/app/today' },
  { href: '/app/leads', label: 'Leads', icon: ListChecks, match: '/app/leads' },
  { href: '/app/map', label: 'Map', icon: MapIcon, match: '/app/map' },
  { href: '/app/settings/profile', label: 'Settings', icon: Settings, match: '/app/settings' },
]

export function MobileBottomNav() {
  const pathname = usePathname() ?? ''
  return (
    <nav
      aria-label="Primary"
      className="lg:hidden fixed bottom-0 inset-x-0 z-30 bg-brand-cream pb-[env(safe-area-inset-bottom)] shadow-fetchi-sticky"
    >
      <div className="bg-brand-cream px-1 pt-2 pb-1 flex items-stretch gap-0.5">
        {items.map(item => {
          const Icon = item.icon
          const active = pathname === item.href || pathname.startsWith(item.match)
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? 'page' : undefined}
              className={cn(
                'group relative flex-1 flex flex-col items-center justify-center gap-1 min-h-[64px] rounded-xl outline-none transition-colors',
                'focus-visible:ring-2 focus-visible:ring-brand-green/40',
                active ? 'text-brand-near-black' : 'text-brand-near-black/55',
              )}
            >
              {active && (
                <span
                  aria-hidden
                  className="absolute top-1.5 left-1/2 -translate-x-1/2 h-1 w-7 rounded-full bg-brand-green"
                />
              )}
              <Icon
                className="h-[22px] w-[22px]"
                strokeWidth={active ? 2.2 : 1.8}
              />
              <span
                className={cn(
                  'text-[11px] leading-none',
                  active ? 'font-bold' : 'font-semibold',
                )}
              >
                {item.label}
              </span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
