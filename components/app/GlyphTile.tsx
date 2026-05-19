import * as React from 'react'
import {
  Home,
  Snowflake,
  Sparkles,
  Flower2,
  Droplet,
  Plus,
  Sun,
  Map,
  Tent,
  CloudLightning,
  Wind,
  MapPin,
  Briefcase,
  DollarSign,
  Newspaper,
  Star,
  MessageSquare,
  Expand,
  Key,
  User,
  type LucideIcon,
} from 'lucide-react'
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

const SIZE: Record<Size, { tile: string; icon: number }> = {
  sm: { tile: 'w-8 h-8 rounded-[9px]', icon: 16 },
  md: { tile: 'w-10 h-10 rounded-[11px]', icon: 18 },
  lg: { tile: 'w-12 h-12 rounded-[13px]', icon: 22 },
}

const TONE: Record<Tone, string> = {
  green: 'bg-brand-light text-brand-dark',
  coral: 'bg-brand-coral/12 text-brand-coral',
  muted: 'bg-brand-cream-muted text-brand-near-black/70',
  dark: 'bg-brand-near-black/40 text-brand-green',
}

const GLYPHS: Record<GlyphKey, LucideIcon> = {
  house: Home,
  snowflake: Snowflake,
  sparkle: Sparkles,
  flower: Flower2,
  'half-circle': Droplet,
  plus: Plus,
  sun: Sun,
  map: Map,
  tent: Tent,
  storm: CloudLightning,
  wind: Wind,
  pin: MapPin,
  briefcase: Briefcase,
  dollar: DollarSign,
  newspaper: Newspaper,
  star: Star,
  chat: MessageSquare,
  expand: Expand,
  key: Key,
  user: User,
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
  const Icon = GLYPHS[glyph]
  const { tile, icon } = SIZE[size]
  return (
    <span
      className={cn(
        'inline-flex items-center justify-center flex-shrink-0',
        tile,
        TONE[tone],
        className,
      )}
      role={ariaLabel ? 'img' : undefined}
      aria-label={ariaLabel}
      aria-hidden={ariaLabel ? undefined : true}
    >
      <Icon size={icon} strokeWidth={1.75} absoluteStrokeWidth />
    </span>
  )
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
