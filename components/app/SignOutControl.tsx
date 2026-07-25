'use client'

import { useEffect, useState } from 'react'
import { SignOutButton, useUser } from '@clerk/nextjs'
import { LogOut } from 'lucide-react'

type Variant = 'sidebar' | 'mobile-header'

export function SignOutControl({ variant = 'sidebar' }: { variant?: Variant }) {
  const { user, isLoaded } = useUser()
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])

  const ready = mounted && isLoaded && !!user
  const initial = ready
    ? (user!.firstName?.[0] ??
        user!.primaryEmailAddress?.emailAddress?.[0] ??
        '?').toUpperCase()
    : '·'
  const label = ready
    ? (user!.firstName ??
        user!.fullName ??
        user!.primaryEmailAddress?.emailAddress ??
        'Account')
    : 'Account'

  if (variant === 'mobile-header') {
    return (
      <SignOutButton>
        <button
          type="button"
          aria-label="Sign out"
          className="fetchi-focus-ring h-11 w-11 flex items-center justify-center text-text/75 hover:text-text rounded-lg hover:bg-[var(--fetchi-overlay-hover)] outline-none transition-colors"
        >
          <LogOut className="h-[18px] w-[18px]" />
        </button>
      </SignOutButton>
    )
  }

  return (
    <div className="mx-3 mt-3 rounded-xl border border-text/[0.06] bg-[var(--fetchi-surface)] px-3 py-2.5 flex items-center gap-2.5 min-h-[52px]">
      <div
        className="w-8 h-8 rounded-lg bg-[var(--fetchi-accent-subtle)] text-fetchiAccent text-[12px] font-bold flex items-center justify-center flex-shrink-0"
        aria-hidden
      >
        {initial}
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-[12.5px] font-semibold text-text truncate">
          {label}
        </div>
        <SignOutButton>
          <button
            type="button"
            className="fetchi-focus-ring -my-2.5 mt-0.5 inline-flex min-h-[44px] items-center gap-1 rounded-sm py-2.5 text-[11.5px] text-text/55 outline-none hover:text-text"
          >
            <LogOut className="h-3 w-3" />
            Sign out
          </button>
        </SignOutButton>
      </div>
    </div>
  )
}
