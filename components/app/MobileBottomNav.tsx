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
      className="lg:hidden fixed bottom-0 inset-x-0 z-30 bg-bg pb-[env(safe-area-inset-bottom)]"
    >
      <div className="bg-surface border-t border-text/8 px-1 pt-2 pb-1 flex items-stretch gap-0.5">
        {items.map(item => {
          const Icon = item.icon
          const active = pathname === item.href || pathname.startsWith(item.match)
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? 'page' : undefined}
              className={cn(
                'group relative flex-1 flex flex-col items-center justify-center gap-1 min-h-[56px] rounded-xl outline-none transition-colors',
                'focus-visible:ring-2 focus-visible:ring-coral/40',
              )}
            >
              {active && (
                <span
                  aria-hidden
                  className="absolute -top-2 left-1/2 -translate-x-1/2 h-[3px] w-7 rounded-full bg-ok"
                />
              )}
              <Icon
                className={cn(
                  'h-[22px] w-[22px]',
                  active ? 'text-text' : 'text-text/55',
                )}
                strokeWidth={active ? 2.4 : 1.75}
              />
              <span
                className={cn(
                  'text-[11px] leading-none',
                  active
                    ? 'font-bold text-text'
                    : 'font-semibold text-text/55',
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
