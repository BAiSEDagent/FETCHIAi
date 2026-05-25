'use client'

import { SignOutButton, useUser } from '@clerk/nextjs'
import { LogOut } from 'lucide-react'

type Variant = 'sidebar' | 'mobile-header'

export function SignOutControl({ variant = 'sidebar' }: { variant?: Variant }) {
  const { user, isLoaded } = useUser()
  if (!isLoaded || !user) return null

  const initial =
    (user.firstName?.[0] ??
      user.primaryEmailAddress?.emailAddress?.[0] ??
      '?').toUpperCase()
  const label =
    user.firstName ??
    user.fullName ??
    user.primaryEmailAddress?.emailAddress ??
    'Account'

  if (variant === 'mobile-header') {
    return (
      <SignOutButton>
        <button
          type="button"
          aria-label="Sign out"
          className="h-11 w-11 flex items-center justify-center text-white/75 hover:text-white rounded-xl hover:bg-white/5 transition-colors"
        >
          <LogOut className="h-[18px] w-[18px]" />
        </button>
      </SignOutButton>
    )
  }

  return (
    <div className="mx-3 mt-3 rounded-xl bg-white/[0.04] px-3 py-2.5 flex items-center gap-2.5 min-h-[52px]">
      <div
        className="w-8 h-8 rounded-full bg-ok text-white text-[12px] font-bold flex items-center justify-center flex-shrink-0"
        aria-hidden
      >
        {initial}
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-[12.5px] font-semibold text-white truncate">
          {label}
        </div>
        <SignOutButton>
          <button
            type="button"
            className="text-[11.5px] text-white/55 hover:text-white inline-flex items-center gap-1 mt-0.5"
          >
            <LogOut className="h-3 w-3" />
            Sign out
          </button>
        </SignOutButton>
      </div>
    </div>
  )
}
