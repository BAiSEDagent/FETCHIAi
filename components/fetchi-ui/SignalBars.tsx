import * as React from 'react'

import { cn } from '@/lib/utils'

export type SignalBarsLevel =
  | 'unchecked'
  | 'none'
  | 'weak'
  | 'moderate'
  | 'strong'
  | 'time-sensitive'

export interface SignalBarsProps
  extends Omit<React.SVGProps<SVGSVGElement>, 'children'> {
  level?: SignalBarsLevel
  size?: number
}

const SIGNAL_LABEL: Record<SignalBarsLevel, string> = {
  unchecked: 'Signal not checked',
  none: 'No signal',
  weak: 'Weak',
  moderate: 'Moderate',
  strong: 'Strong',
  'time-sensitive': 'Time-sensitive',
}

const SIGNAL_CLASS: Record<SignalBarsLevel, string> = {
  unchecked: 'text-[#4A4E54]',
  none: 'text-[#4A4E54]',
  weak: 'text-[var(--fetchi-text-secondary)]',
  moderate: 'text-[var(--fetchi-text-secondary)]',
  strong: 'text-fetchiAccent',
  'time-sensitive': 'text-[#F1BC63]',
}

const BARS = [
  { x: 2, y: 9, width: 3, height: 5 },
  { x: 6.5, y: 6, width: 3, height: 8 },
  { x: 11, y: 3, width: 3, height: 11 },
] as const

function activeBarCount(level: SignalBarsLevel): number {
  if (level === 'weak') return 1
  if (level === 'moderate') return 2
  if (level === 'strong') return 3
  return 0
}

const SignalBars = React.forwardRef<SVGSVGElement, SignalBarsProps>(
  (
    {
      'aria-label': ariaLabel,
      className,
      level = 'none',
      size = 16,
      style,
      ...props
    },
    ref,
  ) => {
    const label = ariaLabel ?? SIGNAL_LABEL[level]
    const activeBars = activeBarCount(level)

    return (
      <svg
        aria-label={label}
        className={cn('block shrink-0', SIGNAL_CLASS[level], className)}
        data-fetchi-signal-bars
        data-fetchi-signal-level={level}
        fill="none"
        focusable="false"
        height={size}
        ref={ref}
        role="img"
        style={{ width: size, height: size, ...style }}
        viewBox="0 0 16 16"
        width={size}
        {...props}
      >
        {level === 'unchecked'
          ? BARS.map((bar, index) => (
              <rect
                data-fetchi-signal-unchecked-bar={index + 1}
                fill="none"
                height={bar.height}
                key={bar.x}
                rx="1"
                stroke="currentColor"
                strokeDasharray="2 1.5"
                strokeWidth="1.25"
                width={bar.width}
                x={bar.x}
                y={bar.y}
              />
            ))
          : null}

        {level === 'none'
          ? [3.6, 8, 12.4].map((cx, index) => (
              <circle
                cx={cx}
                cy="8"
                data-fetchi-signal-none-dot={index + 1}
                fill="currentColor"
                key={cx}
                r="1.2"
              />
            ))
          : null}

        {level === 'weak' || level === 'moderate' || level === 'strong'
          ? BARS.map((bar, index) => (
              <rect
                data-fetchi-signal-strength-bar={index + 1}
                fill={
                  index < activeBars
                    ? 'currentColor'
                    : 'var(--fetchi-text-quaternary)'
                }
                height={bar.height}
                key={bar.x}
                rx="1"
                width={bar.width}
                x={bar.x}
                y={bar.y}
              />
            ))
          : null}

        {level === 'time-sensitive' ? (
          <>
            <rect
              data-fetchi-signal-time-sensitive
              fill="currentColor"
              height="12"
              rx="3"
              width="12"
              x="2"
              y="2"
            />
            <path
              d="M8 4.6v4.1"
              stroke="#08090A"
              strokeLinecap="round"
              strokeWidth="1.7"
            />
            <circle cx="8" cy="11.4" fill="#08090A" r="1" />
          </>
        ) : null}
      </svg>
    )
  },
)

SignalBars.displayName = 'SignalBars'

export { SignalBars }
