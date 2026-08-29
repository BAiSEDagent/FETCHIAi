import * as React from 'react'

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

const OUTER_DIAMETER = 40
const OUTER_RING_RADIUS = 18
const OUTER_RING_STROKE = 4
const SAVED_DOT_RADIUS = 7.2
const CONTACTED_DISC_RADIUS = 10.4
const TERMINAL_CORE_RADIUS = 14.4

const StatusGlyph = React.forwardRef<HTMLSpanElement, StatusGlyphProps>(
  (
    {
      className,
      size = 16,
      state = 'new',
      strokeWidth: legacyStrokeWidth,
      style,
      ...props
    },
    ref,
  ) => {
    // The legacy prop remains accepted for call-site compatibility. Lifecycle
    // geometry is intentionally fixed so every state shares literal v5 bounds.
    void legacyStrokeWidth

    const isTerminal = state === 'won' || state === 'lost'
    const isReviewing = state === 'reviewing'

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
        <svg
          aria-hidden="true"
          className="block h-full w-full"
          data-fetchi-status-outer-diameter={OUTER_DIAMETER}
          focusable="false"
          shapeRendering="geometricPrecision"
          viewBox={`0 0 ${OUTER_DIAMETER} ${OUTER_DIAMETER}`}
        >
          <circle
            cx="20"
            cy="20"
            data-fetchi-status-outer-ring={state}
            fill="none"
            r={OUTER_RING_RADIUS}
            stroke="currentColor"
            strokeDasharray={isReviewing ? '5 9.137' : undefined}
            strokeLinecap={isReviewing ? 'round' : undefined}
            strokeWidth={OUTER_RING_STROKE}
          />

          {isTerminal ? (
            <circle
              cx="20"
              cy="20"
              data-fetchi-status-terminal-core={state}
              fill="currentColor"
              r={TERMINAL_CORE_RADIUS}
            />
          ) : null}

          {state === 'saved' ? (
            <circle
              cx="20"
              cy="20"
              data-fetchi-status-center-dot="saved"
              fill="currentColor"
              r={SAVED_DOT_RADIUS}
            />
          ) : null}

          {state === 'contacted' ? (
            <circle
              cx="20"
              cy="20"
              data-fetchi-status-center-disc="contacted"
              fill="currentColor"
              r={CONTACTED_DISC_RADIUS}
            />
          ) : null}

          {state === 'won' ? (
            <path
              d="M12 20.5 17.5 26 28 14.5"
              data-fetchi-status-terminal-mark="check"
              fill="none"
              stroke="#08090A"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="3.2"
            />
          ) : null}

          {state === 'lost' ? (
            <path
              d="M12.5 12.5 27.5 27.5 M27.5 12.5 12.5 27.5"
              data-fetchi-status-terminal-mark="x"
              fill="none"
              stroke="#08090A"
              strokeLinecap="round"
              strokeWidth="3.2"
            />
          ) : null}
        </svg>
      </span>
    )
  },
)

StatusGlyph.displayName = 'StatusGlyph'

export { StatusGlyph }
