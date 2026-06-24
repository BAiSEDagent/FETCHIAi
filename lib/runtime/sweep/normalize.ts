import type {
  NormalizeMapsInput,
  SerpApiMapsLocalResult,
  SweepLead,
} from './types'

const FIELD_SALAD_PATTERNS = [
  /project\s*number/i,
  /facility\s*name/i,
  /location\s*ad(?:dress)?/i,
  /tenant\s*phone/i,
  /registration\s*date/i,
  /estimated\s*cost/i,
]

const SERVICE_FILLER_WORDS = new Set([
  'commercial',
  'residential',
  'local',
  'business',
  'service',
  'company',
  'contractor',
  'provider',
  'for',
  'and',
  'the',
  'rental',
  'rent',
  'control',
])

const SERVICE_SYNONYMS: Record<string, string[]> = {
  cleaning: ['cleaning', 'cleaner', 'cleaners', 'janitorial', 'janitor', 'maid'],
  janitorial: ['janitorial', 'janitor', 'cleaning'],
  roof: ['roof', 'roofing', 'roofer', 'roof contractor', 'roofing contractor'],
  roofing: ['roofing', 'roofer', 'roof contractor', 'roofing contractor'],
  dumpster: ['dumpster', 'roll off', 'roll-off', 'waste management', 'junk removal', 'junk', 'debris'],
  waste: ['waste', 'waste management', 'junk removal'],
  junk: ['junk', 'junk removal', 'hauling'],
  pest: ['pest', 'pest control', 'exterminator', 'exterminators'],
  plumbing: ['plumbing', 'plumber', 'plumbers'],
  electrical: ['electrical', 'electrician', 'electricians', 'electrical contractor'],
  electrician: ['electrician', 'electrical contractor'],
  landscaping: ['landscaping', 'landscaper', 'landscapers', 'lawn care', 'lawn service'],
  lawn: ['lawn care', 'lawn service', 'landscaping'],
  painting: ['painting', 'painter', 'painters'],
  hvac: ['hvac', 'heating and air', 'air conditioning', 'heating contractor', 'air conditioning contractor'],
  heating: ['heating and air', 'heating contractor', 'hvac'],
  supply: ['supply', 'supplies', 'supplier', 'suppliers', 'products', 'product'],
  supplier: ['supplier', 'suppliers', 'supply', 'products'],
  product: ['product', 'products', 'supplier', 'supply'],
}

const AMBIGUOUS_NAME_TERMS = new Set([
  'control',
  'debris',
  'product',
  'products',
  'roof',
  'service',
  'supply',
  'supplies',
  'waste',
])

function isString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0
}

function clean(value: unknown): string | null {
  if (!isString(value)) return null
  const compacted = value.replace(/\s+/g, ' ').trim()
  return compacted.length > 0 ? compacted : null
}

function stableId(value: string): string {
  let hash = 5381
  for (let i = 0; i < value.length; i += 1) {
    hash = ((hash << 5) + hash) ^ value.charCodeAt(i)
  }
  return `cp22a-${(hash >>> 0).toString(16)}`
}

function normalizePhone(value: string): string | null {
  const digits = value.replace(/\D/g, '')
  if (digits.length < 7) return null
  return value.trim()
}

function normalizedPhoneKey(value: string): string {
  return value.replace(/\D/g, '')
}

function normalizeWebsite(value: string): string | null {
  const candidate = value.trim()
  const recoverable = /^[a-z0-9.-]+\.[a-z]{2,}(?:\/.*)?$/i.test(candidate)
  const withProtocol = /^https?:\/\//i.test(candidate)
    ? candidate
    : recoverable
      ? `https://${candidate}`
      : candidate

  try {
    const url = new URL(withProtocol)
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return null
    if (!url.hostname.includes('.')) return null
    return url.href
  } catch {
    return null
  }
}

function nameKey(value: string): string {
  return value
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\b(llc|inc|co|company|corp|corporation)\b/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

export type SweepLeadDedupeInput = {
  businessName?: string | null
  phone?: string | null
}

export function buildSweepLeadDedupeKey(input: SweepLeadDedupeInput): string | null {
  const businessName = clean(input.businessName)
  const phone = clean(input.phone)
  if (!businessName || !phone) return null

  const normalizedPhoneValue = normalizePhone(phone)
  if (!normalizedPhoneValue) return null

  const normalizedName = nameKey(businessName)
  const normalizedPhone = normalizedPhoneKey(normalizedPhoneValue)
  if (!normalizedName || !normalizedPhone) return null

  return [normalizedName, normalizedPhone].join('|')
}

function normalizeText(value: string): string {
  return value
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function singularizeToken(value: string): string {
  if (value.endsWith('ies') && value.length > 4) return `${value.slice(0, -3)}y`
  if (/(ches|shes|sses|xes|zes)$/.test(value) && value.length > 4) return value.slice(0, -2)
  if (value.endsWith('s') && !value.endsWith('ss') && value.length > 3) return value.slice(0, -1)
  return value
}

function tokenizeMeaningful(value: string): string[] {
  return normalizeText(value)
    .split(' ')
    .map(singularizeToken)
    .filter((token) => token.length > 1 && !SERVICE_FILLER_WORDS.has(token))
}

function normalizeMatchText(value: string): string {
  return normalizeText(value)
    .split(' ')
    .map(singularizeToken)
    .join(' ')
}

function normalizedTerm(value: string): string {
  return normalizeMatchText(value)
}

function hasTerm(text: string, term: string): boolean {
  const normalized = normalizeMatchText(text)
  const normalizedNeedle = normalizedTerm(term)
  if (!normalized || !normalizedNeedle) return false
  return new RegExp(`(^| )${normalizedNeedle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}( |$)`).test(normalized)
}

function sellerExclusionTerms(service: string, icp: string): Array<{
  term: string
  nameSafe: boolean
}> {
  const icpTokens = new Set(tokenizeMeaningful(icp))
  const terms = new Map<string, { term: string; nameSafe: boolean }>()

  for (const token of tokenizeMeaningful(service)) {
    if (icpTokens.has(token)) continue
    for (const term of [token, ...(SERVICE_SYNONYMS[token] ?? [])]) {
      const normalized = normalizedTerm(term)
      if (!normalized || SERVICE_FILLER_WORDS.has(normalized)) continue
      const isPhrase = normalized.includes(' ')
      const nameSafe = isPhrase || !AMBIGUOUS_NAME_TERMS.has(normalized)
      const existing = terms.get(normalized)
      terms.set(normalized, {
        term: normalized,
        nameSafe: existing?.nameSafe || nameSafe,
      })
    }
  }

  return [...terms.values()]
}

function cleanTypeList(value: unknown): string | null {
  if (!Array.isArray(value)) return null
  const types = value
    .filter(isString)
    .map((item) => clean(item))
    .filter(isString)
  return types.length > 0 ? types.join(', ') : null
}

function parseCoordinate(value: unknown): number | null {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null
  if (typeof value !== 'string') return null

  const trimmed = value.trim()
  if (!/^-?\d+(?:\.\d+)?$/.test(trimmed)) return null

  const parsed = Number(trimmed)
  return Number.isFinite(parsed) ? parsed : null
}

function coordinateFromGps(
  value: unknown,
  key: 'latitude' | 'longitude',
): number | null {
  if (!value || typeof value !== 'object') return null
  return parseCoordinate((value as Record<string, unknown>)[key])
}

function isSellerSideResult(input: {
  service: string
  icp: string
  businessName: string
  category: string | null
}): boolean {
  const terms = sellerExclusionTerms(input.service, input.icp)
  if (terms.length === 0) return false

  if (input.category && terms.some((term) => hasTerm(input.category!, term.term))) {
    return true
  }

  return terms.some((term) => term.nameSafe && hasTerm(input.businessName, term.term))
}

function isMalformedBusinessName(value: string): boolean {
  if (value.length < 2) return true
  if (/https?:\/\//i.test(value)) return true
  if (FIELD_SALAD_PATTERNS.some((pattern) => pattern.test(value))) return true
  const letters = value.replace(/[^a-z]/gi, '')
  return letters.length < 2
}

export function normalizeSerpApiMapsResults(input: NormalizeMapsInput): SweepLead[] {
  const rawResults = Array.isArray(input.payload.local_results)
    ? input.payload.local_results
    : []
  const leads: SweepLead[] = []

  for (const raw of rawResults) {
    if (!raw || typeof raw !== 'object') continue
    const result = raw as SerpApiMapsLocalResult
    const businessName = clean(result.title)
    const phone = clean(result.phone)
    const website = clean(result.website)
    const address = clean(result.address)

    if (!businessName || !phone) continue
    if (isMalformedBusinessName(businessName)) continue

    const normalizedPhone = normalizePhone(phone)
    if (!normalizedPhone) continue

    const normalizedWebsite = website ? normalizeWebsite(website) : null

    const category = clean(result.type) ?? cleanTypeList(result.types)
    const latitude = coordinateFromGps(result.gps_coordinates, 'latitude')
    const longitude = coordinateFromGps(result.gps_coordinates, 'longitude')
    if (isSellerSideResult({
      service: input.service,
      icp: input.icp,
      businessName,
      category,
    })) {
      continue
    }

    const key = buildSweepLeadDedupeKey({ businessName, phone: normalizedPhone })
    if (!key) continue

    leads.push({
      id: stableId(key),
      businessName,
      website: normalizedWebsite,
      phone: normalizedPhone,
      address,
      market: input.market,
      source: 'Google Maps',
      sourceUrl: input.sourceUrl,
      category,
      latitude,
      longitude,
      email: null,
      owner: null,
      hook: category ? `${category} listed on Google Maps for "${input.query}".` : null,
    })
  }

  return leads
}

function richnessScore(lead: SweepLead): number {
  return [
    lead.website ? 4 : 0,
    lead.address ? 2 : 0,
    lead.category || lead.hook ? 1 : 0,
  ].reduce((sum, value) => sum + value, 0)
}

export function dedupeSweepLeads(leads: readonly SweepLead[]): SweepLead[] {
  const byContactRoute = new Map<string, SweepLead>()

  for (const lead of leads) {
    const key = buildSweepLeadDedupeKey(lead)
    if (!key) continue
    const existing = byContactRoute.get(key)
    if (!existing || richnessScore(lead) > richnessScore(existing)) {
      byContactRoute.set(key, lead)
    }
  }

  return [...byContactRoute.values()]
}
