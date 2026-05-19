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
      className="lg:hidden fixed bottom-0 inset-x-0 z-30 bg-brand-parchment pb-[env(safe-area-inset-bottom)]"
    >
      <div className="mx-3 mb-3 mt-2 rounded-[22px] bg-brand-cream border border-brand-near-black/8 shadow-[0_8px_24px_-12px_rgba(45,43,42,0.25)] px-2 py-2 flex items-stretch gap-1">
        {items.map(item => {
          const Icon = item.icon
          const active = pathname === item.href || pathname.startsWith(item.match)
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? 'page' : undefined}
              className={cn(
                'group relative flex-1 flex flex-col items-center justify-center gap-0.5 min-h-[56px] rounded-[16px] outline-none transition-all',
                'focus-visible:ring-2 focus-visible:ring-brand-green/40',
                active
                  ? 'bg-white shadow-[0_2px_6px_-2px_rgba(45,43,42,0.18)] border border-brand-near-black/8'
                  : 'hover:bg-brand-near-black/[0.03]',
              )}
            >
              {active && (
                <span
                  aria-hidden
                  className="absolute -top-[1px] left-1/2 -translate-x-1/2 h-[3px] w-8 rounded-full bg-brand-green"
                />
              )}
              <Icon
                className={cn(
                  'h-[20px] w-[20px]',
                  active ? 'text-brand-near-black' : 'text-brand-near-black/55',
                )}
                strokeWidth={active ? 2.2 : 1.75}
              />
              <span
                className={cn(
                  'text-[10.5px] leading-none',
                  active
                    ? 'font-bold text-brand-near-black'
                    : 'font-semibold text-brand-near-black/55',
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
