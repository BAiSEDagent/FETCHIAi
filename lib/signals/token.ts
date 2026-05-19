// Compact signal token formatter for LeadCard list/chat surfaces.
//
// Examples:
//   HAIL · 1.8" · 3D
//   HAIL · SAME CELL · 3D
//   PERMIT · COMMERCIAL · 5D
//   PERMIT · 1D
//   WIND · 62 MPH · 2D
//   NEW · 1D
//
// All metadata is read defensively from `signals.parsedData` (jsonb) — any
// missing field is silently dropped. Schema is unchanged; this is purely a
// presentation helper.

export type SignalTokenInput = {
  signalType: string | null | undefined
  detectedAt?: Date | string | number | null
  parsedData?: Record<string, unknown> | null
}

const TYPE_PREFIX: Record<string, string> = {
  storm_damage: 'HAIL',
  weather_hail: 'HAIL',
  weather_wind: 'WIND',
  building_permit: 'PERMIT',
  new_business_listing: 'NEW',
  job_posting: 'JOB',
  event: 'EVENT',
  funding: 'FUNDING',
  news: 'NEWS',
  review: 'REVIEW',
  social: 'SOCIAL',
  expansion: 'EXPANSION',
  ownership_change: 'OWNER',
  other: 'SIGNAL',
}

const PERMIT_TYPE_SHORT: Record<string, string> = {
  commercial_new: 'COMMERCIAL',
  commercial: 'COMMERCIAL',
  residential: 'RESIDENTIAL',
  roof_replacement: 'ROOF',
  tenant_improvement: 'TI',
  demolition: 'DEMO',
}

function toAgeChunk(at: Date | string | number | null | undefined): string | null {
  if (!at) return null
  const ms = typeof at === 'number' ? at : new Date(at).getTime()
  if (Number.isNaN(ms)) return null
  const diff = Date.now() - ms
  if (diff < 0) return null
  const hours = Math.floor(diff / 3_600_000)
  if (hours < 24) return `${Math.max(1, hours)}H`
  const days = Math.floor(diff / 86_400_000)
  if (days < 14) return `${days}D`
  const weeks = Math.floor(days / 7)
  if (weeks < 8) return `${weeks}W`
  const months = Math.floor(days / 30)
  return `${months}MO`
}

function readNumber(parsed: Record<string, unknown> | null | undefined, key: string): number | null {
  if (!parsed) return null
  const v = parsed[key]
  if (typeof v === 'number' && Number.isFinite(v)) return v
  if (typeof v === 'string') {
    const n = parseFloat(v)
    return Number.isFinite(n) ? n : null
  }
  return null
}

function readString(parsed: Record<string, unknown> | null | undefined, key: string): string | null {
  if (!parsed) return null
  const v = parsed[key]
  return typeof v === 'string' && v.length > 0 ? v : null
}

function readBool(parsed: Record<string, unknown> | null | undefined, key: string): boolean {
  if (!parsed) return false
  return parsed[key] === true
}

function formatHailSize(inches: number): string {
  // Trim trailing zeros: 1.80 → 1.8, 2.00 → 2"
  const rounded = Math.round(inches * 100) / 100
  const str = rounded.toString()
  return `${str}"`
}

/**
 * Build a compact uppercase signal token like `HAIL · 1.8" · 3D`.
 * Returns null when there isn't enough data to render anything meaningful.
 */
export function formatSignalToken(input: SignalTokenInput): string | null {
  const type = input.signalType ?? null
  if (!type) return null
  const prefix = TYPE_PREFIX[type] ?? 'SIGNAL'
  const parts: string[] = [prefix]
  const parsed = input.parsedData ?? null

  // Type-specific metadata
  if (type === 'storm_damage' || type === 'weather_hail') {
    const hail = readNumber(parsed, 'hail_size_inches') ?? readNumber(parsed, 'hailSizeInches')
    if (hail !== null) parts.push(formatHailSize(hail))
    if (readBool(parsed, 'same_cell') || readBool(parsed, 'sameCell')) {
      parts.push('SAME CELL')
    }
  } else if (type === 'weather_wind') {
    const mph =
      readNumber(parsed, 'wind_mph') ??
      readNumber(parsed, 'windMph') ??
      readNumber(parsed, 'gust_mph')
    if (mph !== null) parts.push(`${Math.round(mph)} MPH`)
  } else if (type === 'building_permit') {
    const ptype = readString(parsed, 'permit_type') ?? readString(parsed, 'permitType')
    if (ptype) {
      const short = PERMIT_TYPE_SHORT[ptype] ?? ptype.toUpperCase().replace(/_/g, ' ')
      parts.push(short)
    }
    const sqft = readNumber(parsed, 'sqft')
    if (sqft && sqft >= 1000) {
      const k = Math.round(sqft / 1000)
      parts.push(`${k}K SQFT`)
    }
  } else if (type === 'job_posting') {
    const role = readString(parsed, 'role') ?? readString(parsed, 'title')
    if (role) parts.push(role.toUpperCase().slice(0, 16))
  } else if (type === 'funding') {
    const amount = readNumber(parsed, 'amount_usd') ?? readNumber(parsed, 'amountUsd')
    if (amount) {
      if (amount >= 1_000_000) parts.push(`$${Math.round(amount / 100_000) / 10}M`)
      else if (amount >= 1_000) parts.push(`$${Math.round(amount / 1_000)}K`)
    }
  }

  const age = toAgeChunk(input.detectedAt)
  if (age) parts.push(age)

  return parts.join(' · ')
}
