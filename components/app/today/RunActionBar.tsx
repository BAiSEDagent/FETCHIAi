'use client'

import * as React from 'react'
import { Plus, X } from 'lucide-react'
import { cn } from '@/lib/utils'

type Props = {
  onPass: () => void
  onAdd: () => void
  disabled?: boolean
}

export function RunActionBar({ onPass, onAdd, disabled }: Props) {
  return (
    // Mobile: fixed rail above MobileBottomNav (which is bottom-0 z-30, ~88px tall).
    // Desktop: static, flows under the deck.
    <div
      className={cn(
        'flex items-center gap-2.5',
        'lg:static lg:px-0 lg:pb-0 lg:z-auto',
        'fixed inset-x-0 bottom-[calc(env(safe-area-inset-bottom)+96px)] z-40 px-4',
      )}
    >
      <Pill
        onClick={onPass}
        disabled={disabled}
        tone="ghost"
        flex={1}
        icon={<X className="h-4 w-4" />}
        ariaLabel="Pass — left arrow"
      >
        Pass
      </Pill>
      <Pill
        onClick={onAdd}
        disabled={disabled}
        tone="primary"
        flex={1.35}
        icon={<Plus className="h-4 w-4" />}
        ariaLabel="Add to My Leads — right arrow"
        responsiveLabel={{ short: 'Add', long: 'Add to My Leads' }}
      />
    </div>
  )
}

type PillTone = 'primary' | 'ghost'

function Pill({
  onClick,
  disabled,
  tone,
  flex,
  icon,
  ariaLabel,
  children,
  responsiveLabel,
}: {
  onClick: () => void
  disabled?: boolean
  tone: PillTone
  flex: number
  icon?: React.ReactNode
  ariaLabel: string
  children?: React.ReactNode
  responsiveLabel?: { short: string; long: string }
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={ariaLabel}
      style={{ flex: `${flex} 1 0` }}
      className={cn(
        'group inline-flex items-center justify-center gap-1.5 rounded-full',
        'h-[54px] lg:h-[56px] px-4 text-[14px] lg:text-[14.5px] font-semibold transition-all',
        'min-w-0 whitespace-nowrap',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-green/40 focus-visible:ring-offset-2 focus-visible:ring-offset-brand-parchment',
        'disabled:opacity-55 disabled:cursor-not-allowed',
        'motion-safe:active:translate-y-[1px]',
        tone === 'primary' && [
          'bg-brand-green text-white',
          'shadow-[0_10px_22px_-14px_rgba(88,147,126,0.7),inset_0_1px_0_rgba(255,255,255,0.18)]',
          'hover:bg-brand-dark',
        ],
        tone === 'ghost' && [
          'bg-white/80 text-brand-near-black/75',
          'shadow-[inset_0_0_0_1px_rgba(45,43,42,0.10),0_1px_2px_rgba(45,43,42,0.04)]',
          'hover:bg-white hover:text-brand-near-black',
        ],
      )}
    >
      {icon ? <span aria-hidden className="inline-flex">{icon}</span> : null}
      {responsiveLabel ? (
        <>
          <span className="sm:hidden">{responsiveLabel.short}</span>
          <span className="hidden sm:inline">{responsiveLabel.long}</span>
        </>
      ) : (
        children
      )}
    </button>
  )
}
