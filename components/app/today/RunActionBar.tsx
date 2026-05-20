'use client'

import * as React from 'react'
import { ArrowRight, ArrowUp, X } from 'lucide-react'
import { cn } from '@/lib/utils'

type Props = {
  onPass: () => void
  onEvidence: () => void
  onAdd: () => void
  disabled?: boolean
  flipped?: boolean
  hasDraft?: boolean
}

export function RunActionBar({
  onPass,
  onEvidence,
  onAdd,
  disabled,
  flipped,
  hasDraft,
}: Props) {
  return (
    <div className="grid grid-cols-3 gap-2.5">
      <ActionCard
        onClick={onPass}
        disabled={disabled}
        tone="secondary"
        icon={<X className="h-[18px] w-[18px]" />}
        label="Pass"
        sublabel="TAG WHY"
        ariaKey="Pass — left arrow"
      />
      <ActionCard
        onClick={onEvidence}
        disabled={disabled}
        tone="secondary"
        icon={<ArrowUp className="h-[18px] w-[18px]" />}
        label={flipped ? 'Back' : 'Evidence'}
        sublabel={flipped ? 'TAP TO RETURN' : 'FLIP CARD'}
        ariaKey="Evidence — up arrow"
      />
      <ActionCard
        onClick={onAdd}
        disabled={disabled}
        tone="primary"
        icon={<ArrowRight className="h-[18px] w-[18px]" />}
        label="Add to My Leads"
        sublabel={hasDraft ? 'DRAFT PREPARED' : 'READY TO QUEUE'}
        ariaKey="Add to My Leads — right arrow"
      />
    </div>
  )
}

function ActionCard({
  onClick,
  disabled,
  tone,
  icon,
  label,
  sublabel,
  ariaKey,
}: {
  onClick: () => void
  disabled?: boolean
  tone: 'primary' | 'secondary'
  icon: React.ReactNode
  label: string
  sublabel: string
  ariaKey: string
}) {
  const isPrimary = tone === 'primary'
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={ariaKey}
      className={cn(
        'group relative flex flex-col items-center justify-center gap-1 rounded-[20px]',
        'min-h-[82px] px-2 py-3 text-center transition-all',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-green/40 focus-visible:ring-offset-2 focus-visible:ring-offset-brand-parchment',
        'disabled:opacity-60 disabled:cursor-not-allowed',
        'motion-safe:active:translate-y-[1px]',
        isPrimary
          ? [
              'bg-brand-green text-white',
              'shadow-[0_14px_28px_-14px_rgba(88,147,126,0.7),0_2px_4px_rgba(45,43,42,0.08),inset_0_1px_0_rgba(255,255,255,0.18)]',
              'hover:bg-brand-dark',
            ]
          : [
              'bg-white text-brand-near-black/85',
              'shadow-[inset_0_0_0_1px_rgba(45,43,42,0.08),0_2px_6px_-2px_rgba(45,43,42,0.06)]',
              'hover:shadow-[inset_0_0_0_1px_rgba(45,43,42,0.18),0_2px_6px_-2px_rgba(45,43,42,0.08)]',
            ],
      )}
    >
      <span
        className={cn(
          'inline-flex items-center justify-center w-7 h-7 rounded-full',
          isPrimary
            ? 'bg-white/15 text-white'
            : 'bg-brand-light text-brand-dark',
        )}
        aria-hidden
      >
        {icon}
      </span>
      <span
        className={cn(
          'font-semibold leading-tight',
          'text-[13px] lg:text-[13.5px]',
          isPrimary ? 'text-white' : 'text-brand-near-black',
        )}
      >
        {label}
      </span>
      <span
        className={cn(
          'text-[9.5px] uppercase tracking-[0.12em] font-bold leading-none',
          isPrimary ? 'text-white/75' : 'text-brand-near-black/45',
        )}
      >
        {sublabel}
      </span>
    </button>
  )
}
