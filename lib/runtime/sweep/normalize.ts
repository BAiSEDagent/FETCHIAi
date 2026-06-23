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

function normalizeDomain(hostname: string): string {
  return hostname.toLowerCase().replace(/^www\./, '')
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

function domainKey(value: string): string {
  try {
    return normalizeDomain(new URL(value).hostname)
  } catch {
    return value.toLowerCase()
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

function addressKey(value: string): string {
  return value
    .toLowerCase()
    .replace(/\bstreet\b/g, 'st')
    .replace(/\bavenue\b/g, 'ave')
    .replace(/\broad\b/g, 'rd')
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
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

    if (!businessName || !phone || !website || !address) continue
    if (isMalformedBusinessName(businessName)) continue

    const normalizedPhone = normalizePhone(phone)
    const normalizedWebsite = normalizeWebsite(website)
    if (!normalizedPhone || !normalizedWebsite) continue

    const category = clean(result.type)
    const key = [
      nameKey(businessName),
      domainKey(normalizedWebsite),
      normalizedPhoneKey(normalizedPhone),
      addressKey(address),
    ].join('|')

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
      email: null,
      owner: null,
      hook: category ? `${category} listed on Google Maps for "${input.query}".` : null,
    })
  }

  return leads
}

export function dedupeSweepLeads(leads: readonly SweepLead[]): SweepLead[] {
  const seen = new Set<string>()
  const deduped: SweepLead[] = []

  for (const lead of leads) {
    const key = [
      nameKey(lead.businessName),
      domainKey(lead.website),
      normalizedPhoneKey(lead.phone),
      addressKey(lead.address),
    ].join('|')
    if (seen.has(key)) continue
    seen.add(key)
    deduped.push(lead)
  }

  return deduped
}
