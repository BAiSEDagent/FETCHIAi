'use client'

import * as React from 'react'
import { Eye, Check, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  ACTION_BUTTON_HEIGHT,
  PRIMARY_BUTTON_SURFACE,
  SECONDARY_BUTTON_SURFACE,
} from './tokens'

type Props = {
  onPass: () => void
  onEvidence: () => void
  onAdd: () => void
  disabled?: boolean
  flipped?: boolean
}

export function RunActionBar({ onPass, onEvidence, onAdd, disabled, flipped }: Props) {
  return (
    <div className="grid grid-cols-3 gap-2.5">
      <ActionButton
        onClick={onPass}
        disabled={disabled}
        tone="secondary"
        icon={<X className="h-4 w-4" />}
        label="Pass"
        ariaKey="Pass — left arrow"
      />
      <ActionButton
        onClick={onEvidence}
        disabled={disabled}
        tone="secondary"
        icon={<Eye className="h-4 w-4" />}
        label={flipped ? 'Back' : 'Evidence'}
        ariaKey="Evidence — up arrow"
      />
      <ActionButton
        onClick={onAdd}
        disabled={disabled}
        tone="primary"
        icon={<Check className="h-4 w-4" />}
        label="Add"
        ariaKey="Add to My Leads — right arrow"
      />
    </div>
  )
}

function ActionButton({
  onClick,
  disabled,
  tone,
  icon,
  label,
  ariaKey,
}: {
  onClick: () => void
  disabled?: boolean
  tone: 'primary' | 'secondary'
  icon: React.ReactNode
  label: string
  ariaKey: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={ariaKey}
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-[18px] text-[14px] font-semibold transition-all',
        'disabled:opacity-60 disabled:cursor-not-allowed',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-green/40 focus-visible:ring-offset-2 focus-visible:ring-offset-brand-parchment',
        ACTION_BUTTON_HEIGHT,
        tone === 'primary' ? PRIMARY_BUTTON_SURFACE : SECONDARY_BUTTON_SURFACE,
      )}
    >
      {icon}
      <span className="truncate">{label}</span>
    </button>
  )
}
