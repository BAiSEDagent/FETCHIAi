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
        'h-[44px] lg:h-[46px] px-4 text-[13.5px] lg:text-[14px] font-semibold transition-all',
        'min-w-0 whitespace-nowrap',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-coral/40 focus-visible:ring-offset-2 focus-visible:ring-offset-bg',
        'disabled:opacity-55 disabled:cursor-not-allowed',
        'motion-safe:active:translate-y-[1px]',
        tone === 'primary' && [
          'bg-ok text-white',
          'shadow-[0_4px_10px_-6px_rgba(88,147,126,0.55),inset_0_1px_0_rgba(255,255,255,0.15)]',
          'hover:bg-coralDeep',
        ],
        tone === 'ghost' && [
          'bg-white/70 text-text/70',
          'shadow-[inset_0_0_0_1px_rgba(45,43,42,0.08)]',
          'hover:bg-white hover:text-text',
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
