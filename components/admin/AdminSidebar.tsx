'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const NAV = [
  { href: '/admin', label: 'Dashboard', icon: '📊', exact: true },
  { href: '/admin/pricing', label: 'Pricing & plans', icon: '💵' },
  { href: '/admin/system-settings', label: 'System settings', icon: '⚙️' },
  { href: '/admin/email-templates', label: 'Email templates', icon: '✉️' },
  { href: '/admin/agents', label: 'Agent registry', icon: '🤖' },
  { href: '/admin/prompts', label: 'Prompts', icon: '💬' },
]

const CP_LATER = [
  'Workspaces', 'Billing ops', 'Support', 'Abuse', 'Metrics',
  'Feature flags', 'Announcements', 'Data export',
  'Search Ops', 'Cost & Margin', 'Provider Keys', 'Source Registry',
  'Deployment Health', 'Signal Quality',
]

export function AdminSidebar() {
  const pathname = usePathname()
  return (
    <aside className="w-[220px] bg-[#1a1918] text-white flex-shrink-0 flex flex-col">
      <div className="px-4 pt-5 pb-4 border-b border-white/10">
        <div className="font-outfit font-semibold text-[18px] text-brand-green tracking-[-0.045em]">
          fetchi
        </div>
        <div className="text-[10px] uppercase tracking-[0.08em] text-white/40 mt-0.5">
          Admin console
        </div>
      </div>
      <nav className="flex-1 py-3 overflow-y-auto">
        {NAV.map(item => {
          const active = item.exact
            ? pathname === item.href
            : pathname === item.href || pathname.startsWith(item.href + '/')
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-2.5 px-4 py-2.5 text-[13px] min-h-[44px] transition-colors border-l-[3px] ${
                active
                  ? 'text-white bg-brand-green/15 border-brand-green'
                  : 'text-white/55 hover:text-white/90 hover:bg-white/5 border-transparent'
              }`}
            >
              <span className="w-4 text-center text-[14px]">{item.icon}</span>
              <span>{item.label}</span>
            </Link>
          )
        })}
        <div className="px-4 pt-6 pb-2 text-[10px] uppercase tracking-[0.08em] text-white/30">
          Later checkpoints
        </div>
        <ul className="px-4 pb-4 space-y-1">
          {CP_LATER.map(label => (
            <li key={label} className="text-[12px] text-white/25 leading-snug">
              · {label}
            </li>
          ))}
        </ul>
      </nav>
      <div className="px-4 py-3 border-t border-white/10">
        <Link
          href="/app"
          className="text-[12px] text-white/50 hover:text-white inline-flex items-center gap-1.5 min-h-[44px]"
        >
          ← Back to app
        </Link>
      </div>
    </aside>
  )
}
