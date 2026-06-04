'use client'

import { useEffect, useState } from 'react'
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
  Monitor,
} from 'lucide-react'
import { FetchiWordmark } from '@/components/brand'
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

type Appearance = 'dark' | 'light' | 'system'
type ResolvedTheme = 'dark' | 'light'

const APPEARANCE_STORAGE_KEY = 'fetchi-appearance'
const THEME_ROOT_SELECTOR = '[data-fetchi-theme-root]'

function isAppearance(value: string | null): value is Appearance {
  return value === 'dark' || value === 'light' || value === 'system'
}

function systemTheme(): ResolvedTheme {
  if (typeof window === 'undefined') return 'dark'
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

function resolveAppearanceTheme(appearance: Appearance): ResolvedTheme {
  return appearance === 'system' ? systemTheme() : appearance
}

function applyAppearanceTheme(appearance: Appearance) {
  if (typeof document === 'undefined') return

  const theme = resolveAppearanceTheme(appearance)
  document.documentElement.dataset.fetchiAppearance = appearance
  document.documentElement.dataset.fetchiResolvedTheme = theme
  document.documentElement.classList.toggle('theme-dark', theme === 'dark')
  document.documentElement.classList.toggle('theme-light', theme === 'light')
  document.documentElement.classList.toggle('dark', theme === 'dark')

  document.querySelectorAll<HTMLElement>(THEME_ROOT_SELECTOR).forEach(root => {
    root.classList.toggle('theme-dark', theme === 'dark')
    root.classList.toggle('theme-light', theme === 'light')
  })
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
  const [appearance, setAppearance] = useState<Appearance>('dark')
  const [hydrated, setHydrated] = useState(false)

  useEffect(() => {
    const saved = window.localStorage.getItem(APPEARANCE_STORAGE_KEY)
    const initialAppearance = isAppearance(saved) ? saved : 'dark'
    setAppearance(initialAppearance)
    applyAppearanceTheme(initialAppearance)
    setHydrated(true)
  }, [])

  useEffect(() => {
    if (!hydrated) return

    window.localStorage.setItem(APPEARANCE_STORAGE_KEY, appearance)
    applyAppearanceTheme(appearance)

    if (appearance !== 'system') return

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    const handleSystemThemeChange = () => applyAppearanceTheme('system')

    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', handleSystemThemeChange)
      return () => mediaQuery.removeEventListener('change', handleSystemThemeChange)
    }

    mediaQuery.addListener(handleSystemThemeChange)
    return () => mediaQuery.removeListener(handleSystemThemeChange)
  }, [appearance, hydrated])

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
            ? 'text-text bg-text/[0.08]'
            : 'text-text/60 hover:text-text hover:bg-text/[0.04]',
        ].join(' ')}
      >
        {active && (
          <span
            aria-hidden
            className="absolute left-0 top-1.5 bottom-1.5 w-[3px] rounded-full bg-ok"
          />
        )}
        <Icon
          className={`h-[16px] w-[16px] flex-shrink-0 transition-colors ${
            active ? 'text-ok' : 'text-text/55 group-hover:text-text/80'
          }`}
        />
        <span className="flex-1 font-medium">{item.label}</span>
        {badgeText !== undefined && (
          <span
            className={`text-[10.5px] font-bold rounded-full px-1.5 py-0.5 ${
              active ? 'bg-ok/30 text-text' : 'bg-text/8 text-text/55'
            }`}
          >
            {badgeText}
          </span>
        )}
      </Link>
    )
  }

  return (
    <aside className="h-full w-[220px] bg-surface flex flex-col py-5">
      <Link
        href="/app/chat"
        onClick={onNavigate}
        className="flex items-center gap-2.5 px-5 pb-5 mb-3 border-b border-text/8 hover:opacity-90 transition-opacity"
      >
        <FetchiWordmark markSize={28} />
      </Link>

      <div className="text-[10px] font-bold uppercase tracking-[1.4px] text-text/30 px-5 mt-2 mb-1.5">
        Workspace
      </div>
      <nav className="flex flex-col gap-0.5">{workspaceNav.map(renderLink)}</nav>

      <div className="text-[10px] font-bold uppercase tracking-[1.4px] text-text/30 px-5 mt-5 mb-1.5">
        Settings
      </div>
      <nav className="flex flex-col gap-0.5">{settingsNav.map(renderLink)}</nav>

      <div className="mt-auto">
        {creditsSlot}
        <div className="mx-3 mb-2 rounded-xl bg-text/[0.04] px-3 py-2.5">
          <div className="flex items-center gap-2 min-h-[44px]">
            <span className="w-8 h-8 rounded-lg bg-raised text-text/70 flex items-center justify-center flex-shrink-0" aria-hidden>
              <Monitor className="h-4 w-4" />
            </span>
            <div className="min-w-0 flex-1">
              <div className="text-[12.5px] font-semibold text-text">Appearance</div>
              <div className="text-[11.5px] text-text/45 capitalize">{appearance}</div>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-1 mt-2" role="group" aria-label="Appearance">
            {(['dark', 'light', 'system'] as Appearance[]).map(option => (
              <button
                key={option}
                type="button"
                onClick={() => setAppearance(option)}
                className={`min-h-[44px] rounded-lg text-[11px] font-semibold capitalize transition-colors ${
                  appearance === option
                    ? 'bg-text text-bg'
                    : 'bg-raised text-text/60 hover:text-text'
                }`}
              >
                {option}
              </button>
            ))}
          </div>
        </div>
        <SignOutControl variant="sidebar" />
      </div>
    </aside>
  )
}
