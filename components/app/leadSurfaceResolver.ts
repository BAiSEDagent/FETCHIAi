import { cn } from '@/lib/utils'

export type LeadSurfaceSignalType = string | null | undefined
export type LeadSignalSurface = 'urgent' | 'record' | 'discovery'
export type LeadLifecycleAccent =
  | 'new'
  | 'saved'
  | 'contacted'
  | 'responded'
  | 'won'
  | 'expiring'
  | 'none'
export type LeadSurfaceContext = 'chat' | 'today' | 'list' | 'detail'
export type LeadSurfaceTone = 'urgent' | 'pipeline' | 'intentRecord' | 'discovery' | 'aging'
export type LeadSurfaceKind = 'coral' | 'parchment' | 'dark'

export type LeadSurfaceInput = {
  signalType?: LeadSurfaceSignalType
  status?: string | null
  score?: number | null
  context: LeadSurfaceContext
  signalSurface?: LeadSignalSurface
  lifecycleAccent?: LeadLifecycleAccent
}

export type LeadSurfaceVisual = {
  tone: LeadSurfaceTone
  signalSurface: LeadSignalSurface
  lifecycleAccent: LeadLifecycleAccent
  surfaceKind: LeadSurfaceKind
  surface: string
  title: string
  body: string
  muted: string
  statusPill: string
  signalPill: string
  signalDot: string
  glyphTile: string
  score: string
  chevron: string
  accent: string
  contactAvatar: string
  confidenceDot: string
  confidenceDotOff: string
  metadataPill: string
  inset: string
}

const URGENT_SIGNAL_TYPES = new Set(['storm_damage', 'weather_hail', 'weather_wind'])
const RECORD_SIGNAL_TYPES = new Set(['building_permit', 'permit'])
const PIPELINE_LIFECYCLES = new Set<LeadLifecycleAccent>(['saved', 'responded', 'won'])

export function resolveLeadSignalSurface(signalType: LeadSurfaceSignalType): LeadSignalSurface {
  if (typeof signalType === 'string' && URGENT_SIGNAL_TYPES.has(signalType)) return 'urgent'
  if (typeof signalType === 'string' && RECORD_SIGNAL_TYPES.has(signalType)) return 'record'
  return 'discovery'
}

export function resolveLeadLifecycleAccent(status: string | null | undefined): LeadLifecycleAccent {
  switch (status) {
    case 'saved':
    case 'contacted':
    case 'responded':
    case 'won':
      return status
    case 'expired':
    case 'expiring':
      return 'expiring'
    case 'new':
    case null:
    case undefined:
      return 'new'
    default:
      return 'none'
  }
}

export function resolveLeadSurfaceTone(
  signalSurface: LeadSignalSurface,
  lifecycleAccent: LeadLifecycleAccent,
): LeadSurfaceTone {
  if (lifecycleAccent === 'expiring') return 'aging'
  if (PIPELINE_LIFECYCLES.has(lifecycleAccent)) return 'pipeline'
  if (signalSurface === 'urgent') return 'urgent'
  if (signalSurface === 'record') return 'intentRecord'
  return 'discovery'
}

export function leadStatusLabel(status: string | null | undefined): string {
  if (!status) return 'New'
  if (status === 'expiring') return 'Expiring'
  return status.charAt(0).toUpperCase() + status.slice(1)
}

function statusPill(surfaceKind: LeadSurfaceKind, lifecycleAccent: LeadLifecycleAccent): string {
  switch (lifecycleAccent) {
    case 'new':
      return surfaceKind === 'coral'
        ? 'bg-coralDeep text-white border border-coralDeep/80'
        : 'bg-coral text-white border border-coralDeep/20'
    case 'responded':
    case 'won':
      return 'bg-ok/12 text-ok border border-ok/25'
    case 'saved':
    case 'contacted':
      if (surfaceKind === 'parchment') return 'bg-[#2D2B2A]/10 text-[#2D2B2A] border border-[#2D2B2A]/10'
      if (surfaceKind === 'coral') return 'bg-white/16 text-white border border-white/20'
      return 'bg-text/[0.06] text-text/65 border border-text/10'
    case 'expiring':
      return surfaceKind === 'parchment'
        ? 'bg-[#2D2B2A]/8 text-[#2D2B2A]/60 border border-[#2D2B2A]/10'
        : 'bg-warn/14 text-warn border border-warn/25'
    case 'none':
      return surfaceKind === 'parchment'
        ? 'bg-[#2D2B2A]/8 text-[#2D2B2A]/65 border border-[#2D2B2A]/10'
        : 'bg-text/[0.08] text-text/65 border border-text/10'
  }
}

function surfaceKindFor(tone: LeadSurfaceTone): LeadSurfaceKind {
  if (tone === 'urgent') return 'coral'
  if (tone === 'intentRecord') return 'parchment'
  return 'dark'
}

function surfaceClasses(tone: LeadSurfaceTone, context: LeadSurfaceContext): string {
  const detailShadow = context === 'detail' ? 'shadow-fetchi-card' : 'shadow-fetchi-soft'
  const commonShadow = context === 'today' ? '' : detailShadow

  switch (tone) {
    case 'urgent':
      return cn('bg-coral text-white', commonShadow)
    case 'intentRecord':
      return cn('bg-parch text-[#2D2B2A] ring-1 ring-inset ring-[#2D2B2A]/10', commonShadow)
    case 'pipeline':
      return cn('bg-raised text-text border-l-[3px] border-l-ok', commonShadow)
    case 'aging':
      return cn('bg-raised text-text border-l-[3px] border-l-warn', commonShadow)
    case 'discovery':
      return cn('bg-raised text-text', commonShadow)
  }
}

function scoreClasses(tone: LeadSurfaceTone, context: LeadSurfaceContext): string {
  if (context === 'detail') {
    if (tone === 'urgent') return 'text-white'
    if (tone === 'intentRecord') return 'text-[#2D2B2A]'
    if (tone === 'aging') return 'text-warn'
    return 'text-text'
  }

  if (tone === 'urgent') return 'bg-darkSlab text-white border border-darkSlab'
  if (tone === 'intentRecord') return 'bg-[#B8B0A2]/45 text-[#2D2B2A] border border-[#2D2B2A]/10'
  if (tone === 'aging') return 'bg-warn/14 text-warn border border-warn/25'
  return 'bg-bg/80 text-text border border-text/10'
}

export function resolveLeadSurface(input: LeadSurfaceInput): LeadSurfaceVisual {
  const signalSurface = input.signalSurface ?? resolveLeadSignalSurface(input.signalType)
  const lifecycleAccent = input.lifecycleAccent ?? resolveLeadLifecycleAccent(input.status)
  const tone = resolveLeadSurfaceTone(signalSurface, lifecycleAccent)
  const surfaceKind = surfaceKindFor(tone)
  const isCoral = surfaceKind === 'coral'
  const isParchment = surfaceKind === 'parchment'

  return {
    tone,
    signalSurface,
    lifecycleAccent,
    surfaceKind,
    surface: surfaceClasses(tone, input.context),
    title: isCoral ? 'text-white' : isParchment ? 'text-[#2D2B2A]' : 'text-text',
    body: isCoral ? 'text-white/90' : isParchment ? 'text-[#2D2B2A]/85' : 'text-text/75',
    muted: isCoral ? 'text-white/75' : isParchment ? 'text-[#2D2B2A]/65' : 'text-text/55',
    statusPill: statusPill(surfaceKind, lifecycleAccent),
    signalPill: isCoral
      ? 'bg-white/16 text-white border border-white/20'
      : isParchment
        ? 'bg-[#B8B0A2]/40 text-[#2D2B2A] border border-[#2D2B2A]/10'
        : 'bg-text/[0.06] text-text/70 border border-text/10',
    signalDot: isCoral ? 'bg-white/85' : isParchment ? 'bg-[#2D2B2A]/65' : 'bg-text/35',
    glyphTile: isCoral
      ? 'bg-coralDeep/35 text-white ring-1 ring-coralDeep/20'
      : isParchment
        ? 'bg-[#B8B0A2]/45 text-[#2D2B2A] ring-1 ring-[#2D2B2A]/10'
        : 'bg-text/[0.06] text-text/65 ring-1 ring-text/10',
    score: scoreClasses(tone, input.context),
    chevron: isCoral
      ? 'text-white/70 group-hover:text-white'
      : isParchment
        ? 'text-[#2D2B2A]/55 group-hover:text-[#2D2B2A]'
        : 'text-text/30 group-hover:text-text/60',
    accent: tone === 'pipeline' ? 'border-l-ok' : tone === 'aging' ? 'border-l-warn' : '',
    contactAvatar: isCoral
      ? 'bg-white/20 text-white'
      : isParchment
        ? 'bg-[#2D2B2A]/10 text-[#2D2B2A]'
        : 'bg-text/[0.08] text-text/75',
    confidenceDot: isCoral ? 'bg-white' : isParchment ? 'bg-[#2D2B2A]' : 'bg-text/45',
    confidenceDotOff: isCoral ? 'bg-white/30' : isParchment ? 'bg-[#2D2B2A]/20' : 'bg-text/15',
    metadataPill: isCoral
      ? 'bg-white/14 text-white border border-white/18'
      : isParchment
        ? 'bg-[#2D2B2A]/8 text-[#2D2B2A]/70 border border-[#2D2B2A]/10'
        : 'bg-text/[0.06] text-text/65 border border-text/10',
    inset: isCoral
      ? 'bg-white/14 text-white/90 border border-white/10'
      : isParchment
        ? 'bg-[#2D2B2A]/8 text-[#2D2B2A]/85 border border-[#2D2B2A]/10'
        : 'bg-text/[0.05] text-text/85 border border-text/8',
  }
}
