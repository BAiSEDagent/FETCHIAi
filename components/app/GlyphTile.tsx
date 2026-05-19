import * as React from 'react'
import { cn } from '@/lib/utils'

export type GlyphKey =
  | 'house'
  | 'snowflake'
  | 'sparkle'
  | 'flower'
  | 'half-circle'
  | 'plus'
  | 'sun'
  | 'map'
  | 'tent'
  | 'storm'
  | 'wind'
  | 'pin'
  | 'briefcase'
  | 'dollar'
  | 'newspaper'
  | 'star'
  | 'chat'
  | 'expand'
  | 'key'
  | 'user'

type Size = 'sm' | 'md' | 'lg'
type Tone = 'green' | 'coral' | 'muted' | 'dark'

const SIZE: Record<Size, { tile: string; glyph: string }> = {
  sm: { tile: 'w-8 h-8 rounded-[9px]', glyph: 'h-[15px] w-[15px]' },
  md: { tile: 'w-10 h-10 rounded-[11px]', glyph: 'h-[18px] w-[18px]' },
  lg: { tile: 'w-12 h-12 rounded-[13px]', glyph: 'h-[22px] w-[22px]' },
}

const TONE: Record<Tone, string> = {
  green: 'bg-brand-light text-brand-dark',
  coral: 'bg-brand-coral/12 text-brand-coral',
  muted: 'bg-brand-cream-muted text-brand-near-black/70',
  dark: 'bg-brand-near-black/40 text-brand-green',
}

type Props = {
  glyph: GlyphKey
  size?: Size
  tone?: Tone
  className?: string
  'aria-label'?: string
}

export function GlyphTile({
  glyph,
  size = 'md',
  tone = 'green',
  className,
  'aria-label': ariaLabel,
}: Props) {
  return (
    <span
      className={cn(
        'inline-flex items-center justify-center flex-shrink-0',
        SIZE[size].tile,
        TONE[tone],
        className,
      )}
      role={ariaLabel ? 'img' : undefined}
      aria-label={ariaLabel}
      aria-hidden={ariaLabel ? undefined : true}
    >
      <Glyph name={glyph} className={SIZE[size].glyph} />
    </span>
  )
}

function Glyph({ name, className }: { name: GlyphKey; className?: string }) {
  const common = {
    viewBox: '0 0 18 18',
    fill: 'none',
    xmlns: 'http://www.w3.org/2000/svg',
    className,
  }
  const s = 1.6
  switch (name) {
    case 'house':
      return (
        <svg {...common}>
          <path
            d="M3 8.5 9 3.5l6 5V14a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V8.5Z"
            stroke="currentColor"
            strokeWidth={s}
            strokeLinejoin="round"
            strokeLinecap="round"
          />
        </svg>
      )
    case 'snowflake':
      return (
        <svg {...common} stroke="currentColor" strokeWidth={s} strokeLinecap="round">
          <path d="M9 2v14M2.5 5.25l13 7.5M2.5 12.75l13-7.5" />
          <path d="M7 3.5 9 5l2-1.5M7 14.5 9 13l2 1.5M3.5 8 5 9l-1.5 2M14.5 8 13 9l1.5 2" />
        </svg>
      )
    case 'sparkle':
      return (
        <svg {...common}>
          <path
            d="M9 1.5c0 3 1.5 4.5 4.5 4.5C10.5 6 9 7.5 9 10.5 9 7.5 7.5 6 4.5 6 7.5 6 9 4.5 9 1.5Z"
            fill="currentColor"
          />
          <path
            d="M9 7.5c0 3 1.5 4.5 4.5 4.5C10.5 12 9 13.5 9 16.5c0-3-1.5-4.5-4.5-4.5 3 0 4.5-1.5 4.5-4.5Z"
            fill="currentColor"
          />
        </svg>
      )
    case 'flower':
      return (
        <svg {...common} fill="currentColor">
          <circle cx="9" cy="4.5" r="2.2" />
          <circle cx="4.4" cy="7.8" r="2.2" />
          <circle cx="13.6" cy="7.8" r="2.2" />
          <circle cx="6.4" cy="13" r="2.2" />
          <circle cx="11.6" cy="13" r="2.2" />
        </svg>
      )
    case 'half-circle':
      return (
        <svg {...common}>
          <circle cx="9" cy="9" r="6" stroke="currentColor" strokeWidth={s} />
          <path d="M9 3a6 6 0 0 1 0 12V3Z" fill="currentColor" />
        </svg>
      )
    case 'plus':
      return (
        <svg {...common} stroke="currentColor" strokeWidth={s + 0.2} strokeLinecap="round">
          <path d="M9 3v12M3 9h12" />
        </svg>
      )
    case 'sun':
      return (
        <svg {...common} stroke="currentColor" strokeWidth={s} strokeLinecap="round">
          <circle cx="9" cy="9" r="3" />
          <path d="M9 1.5v2M9 14.5v2M1.5 9h2M14.5 9h2M3.7 3.7l1.4 1.4M12.9 12.9l1.4 1.4M3.7 14.3l1.4-1.4M12.9 5.1l1.4-1.4" />
        </svg>
      )
    case 'map':
      return (
        <svg {...common} stroke="currentColor" strokeWidth={s} strokeLinejoin="round" strokeLinecap="round">
          <path d="M2 4.5 6.5 3l5 1.5L16 3v10.5L11.5 15l-5-1.5L2 15V4.5Z" />
          <path d="M6.5 3v10.5M11.5 4.5V15" />
        </svg>
      )
    case 'tent':
      return (
        <svg {...common} stroke="currentColor" strokeWidth={s} strokeLinejoin="round" strokeLinecap="round">
          <path d="M2 15 9 3l7 12H2Z" />
          <path d="M9 15V8" />
        </svg>
      )
    case 'storm':
      return (
        <svg {...common}>
          <path
            d="M5 11a3 3 0 0 1 0-6 4 4 0 0 1 7.7-1A3 3 0 0 1 13 11H5Z"
            stroke="currentColor"
            strokeWidth={s}
            strokeLinejoin="round"
          />
          <path
            d="m9 11-2 3h2.5l-1.5 2.5"
            stroke="currentColor"
            strokeWidth={s}
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />
        </svg>
      )
    case 'wind':
      return (
        <svg {...common} stroke="currentColor" strokeWidth={s} strokeLinecap="round" strokeLinejoin="round">
          <path d="M2.5 7.5h9a2 2 0 1 0-2-2" />
          <path d="M2.5 11h12a2 2 0 1 1-2 2" />
          <path d="M2.5 14h6" />
        </svg>
      )
    case 'pin':
      return (
        <svg {...common}>
          <path
            d="M9 2c2.8 0 5 2.1 5 4.8 0 3.4-5 8.7-5 8.7s-5-5.3-5-8.7C4 4.1 6.2 2 9 2Z"
            stroke="currentColor"
            strokeWidth={s}
            strokeLinejoin="round"
          />
          <circle cx="9" cy="7" r="1.8" fill="currentColor" />
        </svg>
      )
    case 'briefcase':
      return (
        <svg {...common} stroke="currentColor" strokeWidth={s} strokeLinejoin="round">
          <rect x="2.5" y="6" width="13" height="9" rx="1.5" />
          <path d="M6.5 6V4.5A1.5 1.5 0 0 1 8 3h2a1.5 1.5 0 0 1 1.5 1.5V6" />
        </svg>
      )
    case 'dollar':
      return (
        <svg {...common} stroke="currentColor" strokeWidth={s} strokeLinecap="round">
          <path d="M9 2v14" />
          <path d="M12.5 5.2A3.2 3.2 0 0 0 9.8 4H8.2a2.2 2.2 0 0 0 0 4.4h1.6a2.2 2.2 0 0 1 0 4.4H8a3.2 3.2 0 0 1-2.7-1.2" strokeLinejoin="round" fill="none" />
        </svg>
      )
    case 'newspaper':
      return (
        <svg {...common} stroke="currentColor" strokeWidth={s} strokeLinejoin="round">
          <rect x="2.5" y="3.5" width="13" height="11" rx="1.4" />
          <path d="M5 6.5h8M5 9h8M5 11.5h5" strokeLinecap="round" />
        </svg>
      )
    case 'star':
      return (
        <svg {...common}>
          <path
            d="m9 2 1.95 4.5L15.5 7l-3.4 3 1 4.8L9 12.3 4.9 14.8l1-4.8L2.5 7l4.55-.5L9 2Z"
            fill="currentColor"
          />
        </svg>
      )
    case 'chat':
      return (
        <svg {...common} stroke="currentColor" strokeWidth={s} strokeLinejoin="round">
          <path d="M2.5 4.5a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2H7l-3 3v-3H4.5a2 2 0 0 1-2-2v-6Z" />
        </svg>
      )
    case 'expand':
      return (
        <svg {...common} stroke="currentColor" strokeWidth={s} strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 7V3h4M15 7V3h-4M3 11v4h4M15 11v4h-4" />
        </svg>
      )
    case 'key':
      return (
        <svg {...common} stroke="currentColor" strokeWidth={s} strokeLinejoin="round" strokeLinecap="round">
          <circle cx="6" cy="12" r="2.8" />
          <path d="m8 10 7-7M12 6l2 2M10 8l1.5 1.5" />
        </svg>
      )
    case 'user':
      return (
        <svg {...common} stroke="currentColor" strokeWidth={s} strokeLinejoin="round">
          <circle cx="9" cy="6.5" r="2.8" />
          <path d="M3.5 15.5c.8-2.5 3-4 5.5-4s4.7 1.5 5.5 4" strokeLinecap="round" />
        </svg>
      )
  }
}

// Canonical signal-type → glyph mapping. Used by LeadCard and Lead Detail so
// the icon language stays consistent across surfaces.
export function glyphForSignalType(type: string | null | undefined): GlyphKey {
  switch (type) {
    case 'storm_damage':
      return 'storm'
    case 'weather_hail':
      return 'snowflake'
    case 'weather_wind':
      return 'wind'
    case 'building_permit':
      return 'house'
    case 'new_business_listing':
      return 'pin'
    case 'job_posting':
      return 'briefcase'
    case 'event':
      return 'tent'
    case 'funding':
      return 'dollar'
    case 'news':
      return 'newspaper'
    case 'review':
      return 'star'
    case 'social':
      return 'chat'
    case 'expansion':
      return 'expand'
    case 'ownership_change':
      return 'key'
    default:
      return 'sparkle'
  }
}
