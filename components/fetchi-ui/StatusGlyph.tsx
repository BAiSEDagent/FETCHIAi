import * as React from 'react'
import {
  Bookmark,
  Circle,
  CircleCheck,
  CircleDashed,
  CircleX,
  Phone,
  type LucideIcon,
} from 'lucide-react'

import { cn } from '@/lib/utils'

export type StatusGlyphState =
  | 'new'
  | 'reviewing'
  | 'saved'
  | 'contacted'
  | 'won'
  | 'lost'

export interface StatusGlyphProps
  extends Omit<React.HTMLAttributes<HTMLSpanElement>, 'children'> {
  size?: number
  state?: StatusGlyphState
  strokeWidth?: number
}

const STATE_CLASS: Record<StatusGlyphState, string> = {
  new: 'text-[var(--fetchi-text-tertiary)]',
  reviewing: 'text-[var(--fetchi-text-tertiary)]',
  saved: 'text-lifecycleSaved',
  contacted: 'text-lifecycleContacted',
  won: 'text-lifecycleWon',
  lost: 'text-lifecycleLost',
}

const CENTER_ICON: Partial<Record<StatusGlyphState, LucideIcon>> = {
  saved: Bookmark,
  contacted: Phone,
}

const CENTER_ICON_SCALE: Partial<Record<StatusGlyphState, number>> = {
  saved: 0.425,
  contacted: 0.35,
}

const StatusGlyph = React.forwardRef<HTMLSpanElement, StatusGlyphProps>(
  (
    {
      className,
      size = 16,
      state = 'new',
      strokeWidth = 1.65,
      style,
      ...props
    },
    ref,
  ) => {
    const CenterIcon = CENTER_ICON[state]
    const centerIconSize = Math.max(
      8,
      Math.round(size * (CENTER_ICON_SCALE[state] ?? 0.425)),
    )
    const RingIcon =
      state === 'reviewing'
        ? CircleDashed
        : state === 'won'
          ? CircleCheck
          : state === 'lost'
            ? CircleX
            : Circle

    return (
      <span
        className={cn(
          'relative inline-flex shrink-0 items-center justify-center',
          STATE_CLASS[state],
          className,
        )}
        data-fetchi-status-glyph={state}
        ref={ref}
        style={{ width: size, height: size, ...style }}
        {...props}
      >
        <RingIcon
          aria-hidden="true"
          className="absolute inset-0 h-full w-full"
          strokeWidth={strokeWidth}
        />
        {CenterIcon ? (
          <CenterIcon
            aria-hidden="true"
            data-fetchi-status-center-icon={state}
            size={centerIconSize}
            strokeWidth={strokeWidth}
          />
        ) : null}
      </span>
    )
  },
)

StatusGlyph.displayName = 'StatusGlyph'

export { StatusGlyph }
