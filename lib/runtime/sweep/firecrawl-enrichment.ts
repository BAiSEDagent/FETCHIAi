import {
  CP22B_DEFAULT_FIRECRAWL_CONCURRENCY,
  CP22B_DEFAULT_FIRECRAWL_TIMEOUT_MS,
  CP22B_DEFAULT_MAX_FIRECRAWL_SCRAPES,
  CP22B_HARD_MAX_FIRECRAWL_CONCURRENCY,
  CP22B_HARD_MAX_FIRECRAWL_SCRAPES,
  type SweepEnrichmentInput,
  type SweepEnrichmentResult,
  type SweepEnrichmentStats,
  type SweepLead,
} from './types'

const FIRECRAWL_SCRAPE_ENDPOINT = 'https://api.firecrawl.dev/v2/scrape'

type FirecrawlMetadata = Record<string, unknown>

type FirecrawlScrapePayload = {
  success?: unknown
  data?: {
    markdown?: unknown
    metadata?: unknown
  }
  error?: unknown
}

type ScrapeOutcome = {
  ok: boolean
  email: string | null
  owner: string | null
  hook: string | null
}

function clampInteger(value: number | undefined, fallback: number, min: number, max: number): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) return fallback
  return Math.min(max, Math.max(min, Math.floor(value)))
}

function validWebsiteUrl(value: string | null): string | null {
  if (!value) return null
  try {
    const url = new URL(value)
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return null
    return url.href
  } catch {
    return null
  }
}

function baseStats(leads: readonly SweepLead[], scrapeBudget: number): SweepEnrichmentStats {
  const eligibleWebsiteRows = leads.filter((lead) => validWebsiteUrl(lead.website)).length
  return {
    eligibleWebsiteRows,
    skippedNoWebsiteRows: leads.length - eligibleWebsiteRows,
    scrapeBudget,
    attemptedScrapes: 0,
    successfulScrapes: 0,
    failedScrapes: 0,
    emailsFound: 0,
    ownersFound: 0,
    hooksFound: 0,
  }
}

function cloneLeads(leads: readonly SweepLead[]): SweepLead[] {
  return leads.map((lead) => ({ ...lead }))
}

function metadataString(metadata: FirecrawlMetadata, keys: string[]): string | null {
  for (const key of keys) {
    const value = metadata[key]
    if (typeof value === 'string' && value.trim().length > 0) {
      return value
    }
  }
  return null
}

function cleanText(value: string): string {
  return value
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function sanitizeEmail(value: string): string | null {
  const cleaned = value
    .trim()
    .replace(/^[<("'`]+/, '')
    .replace(/[>)"'`.,;:!?]+$/, '')
    .toLowerCase()

  const parts = cleaned.split('@')
  if (parts.length !== 2) return null

  const [local, domain] = parts
  if (!local || !domain || !domain.includes('.')) return null
  if (['noreply', 'no-reply', 'donotreply', 'do-not-reply'].includes(local)) return null
  if (/(^|\.)example\.com$/.test(domain)) return null
  if (/(^|\.)test\.com$/.test(domain)) return null
  if (/placeholder|yourdomain|domain\.com|company\.com/i.test(domain)) return null
  if (/\.(png|jpe?g|gif|svg|webp|pdf|docx?|xlsx?|css|js)$/i.test(local)) return null
  if (/\.(png|jpe?g|gif|svg|webp|pdf|docx?|xlsx?|css|js)$/i.test(domain)) return null

  return cleaned
}

function extractEmail(markdown: string, metadata: FirecrawlMetadata): string | null {
  const text = [
    markdown,
    metadataString(metadata, ['description', 'ogDescription', 'twitterDescription']) ?? '',
  ].join('\n')

  const matches = text.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi) ?? []
  for (const match of matches) {
    const email = sanitizeEmail(match)
    if (email) return email
  }
  return null
}

function cleanOwnerCandidate(value: string): string | null {
  const cleaned = cleanText(value).replace(/[^A-Za-z .'-]/g, '').trim()
  const words = cleaned.split(/\s+/).filter(Boolean)
  if (words.length < 2 || words.length > 4) return null
  if (/\b(owner|founder|president|manager|contact|team|services|restaurant|company)\b/i.test(cleaned)) return null
  if (!words.every((word) => /^[A-Z][A-Za-z'.-]+$/.test(word))) return null
  return words.join(' ')
}

function extractOwner(markdown: string): string | null {
  const lines = markdown
    .split(/\n+/)
    .map(cleanText)
    .filter((line) => line.length > 0 && line.length <= 180)

  const namePattern = "([A-Z][A-Za-z'.-]+(?:\\s+[A-Z][A-Za-z'.-]+){1,3})"
  const titlePattern = '(Owner|Founder|President|General Manager|Manager|Proprietor|Principal)'
  const direct = new RegExp(`\\b${titlePattern}\\b\\s*[:\\-–|,]?\\s*${namePattern}`, 'i')
  const reverse = new RegExp(`${namePattern}\\s*[,\\-–|]\\s*\\b${titlePattern}\\b`, 'i')

  for (const line of lines) {
    const directMatch = line.match(direct)
    const directOwner = directMatch ? cleanOwnerCandidate(directMatch[2] ?? '') : null
    if (directOwner) return directOwner

    const reverseMatch = line.match(reverse)
    const reverseOwner = reverseMatch ? cleanOwnerCandidate(reverseMatch[1] ?? '') : null
    if (reverseOwner) return reverseOwner
  }

  return null
}

function cleanHookCandidate(value: string): string | null {
  const cleaned = cleanText(value)
    .replace(/^#+\s*/, '')
    .replace(/\*\*/g, '')
    .trim()

  if (cleaned.length < 8) return null
  if (/^(home|about|contact|menu|privacy policy|terms)$/i.test(cleaned)) return null
  if (/@/.test(cleaned)) return null

  const sentence = cleaned.split(/(?<=[.!?])\s+/)[0] ?? cleaned
  const compact = sentence.length <= 140
    ? sentence
    : `${sentence.slice(0, 137).replace(/\s+\S*$/, '').trim()}...`

  return compact.length >= 8 ? compact : null
}

function extractHook(markdown: string, metadata: FirecrawlMetadata): string | null {
  const metadataCandidates = [
    metadataString(metadata, ['description', 'ogDescription', 'twitterDescription']),
    metadataString(metadata, ['title', 'ogTitle', 'twitterTitle']),
  ].filter((value): value is string => Boolean(value))

  for (const candidate of metadataCandidates) {
    const hook = cleanHookCandidate(candidate)
    if (hook) return hook
  }

  const lines = markdown
    .split(/\n+/)
    .map(cleanText)
    .filter((line) => line.length > 0 && line.length <= 180)

  for (const line of lines) {
    const hook = cleanHookCandidate(line)
    if (hook) return hook
  }

  return null
}

function parseScrapePayload(payload: FirecrawlScrapePayload): ScrapeOutcome {
  if (payload.success === false) {
    return { ok: false, email: null, owner: null, hook: null }
  }

  const data = payload.data
  if (!data || typeof data !== 'object') {
    return { ok: false, email: null, owner: null, hook: null }
  }

  const markdown = typeof data.markdown === 'string' ? data.markdown : ''
  const metadata = data.metadata && typeof data.metadata === 'object'
    ? data.metadata as FirecrawlMetadata
    : {}

  return {
    ok: true,
    email: extractEmail(markdown, metadata),
    owner: extractOwner(markdown),
    hook: extractHook(markdown, metadata),
  }
}

async function scrapeWebsite(input: {
  url: string
  apiKey: string
  timeoutMs: number
  fetchImpl: typeof fetch
}): Promise<ScrapeOutcome> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), input.timeoutMs)

  try {
    const response = await input.fetchImpl(FIRECRAWL_SCRAPE_ENDPOINT, {
      method: 'POST',
      headers: {
        accept: 'application/json',
        authorization: `Bearer ${input.apiKey}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        url: input.url,
        formats: ['markdown'],
        onlyMainContent: false,
        timeout: input.timeoutMs,
      }),
      signal: controller.signal,
    })

    if (!response.ok) {
      return { ok: false, email: null, owner: null, hook: null }
    }

    const payload = await response.json() as FirecrawlScrapePayload
    return parseScrapePayload(payload)
  } catch {
    return { ok: false, email: null, owner: null, hook: null }
  } finally {
    clearTimeout(timeout)
  }
}

async function mapLimit<T, R>(
  items: readonly T[],
  concurrency: number,
  worker: (item: T) => Promise<R>,
): Promise<R[]> {
  const results: R[] = []
  let nextIndex = 0
  const workerCount = Math.min(Math.max(1, concurrency), items.length)

  await Promise.all(Array.from({ length: workerCount }, async () => {
    while (nextIndex < items.length) {
      const currentIndex = nextIndex
      nextIndex += 1
      results[currentIndex] = await worker(items[currentIndex])
    }
  }))

  return results
}

export async function enrichSweepLeadsWithFirecrawl(
  input: SweepEnrichmentInput,
): Promise<SweepEnrichmentResult> {
  if (!Array.isArray(input.leads)) {
    return {
      ok: false,
      leads: [],
      stats: baseStats([], CP22B_DEFAULT_MAX_FIRECRAWL_SCRAPES),
      error: {
        code: 'invalid_input',
        message: 'Website enrichment needs a lead list.',
      },
    }
  }

  const scrapeBudget = clampInteger(
    input.maxScrapes,
    CP22B_DEFAULT_MAX_FIRECRAWL_SCRAPES,
    0,
    CP22B_HARD_MAX_FIRECRAWL_SCRAPES,
  )
  const stats = baseStats(input.leads, scrapeBudget)
  const leads = cloneLeads(input.leads)
  const apiKey = input.apiKey?.trim()

  if (!apiKey) {
    return {
      ok: false,
      leads,
      stats,
      error: {
        code: 'missing_firecrawl_key',
        message: 'Website enrichment is unavailable.',
      },
    }
  }

  const eligible = leads
    .map((lead, index) => ({ index, url: validWebsiteUrl(lead.website) }))
    .filter((item): item is { index: number; url: string } => Boolean(item.url))
    .slice(0, scrapeBudget)

  stats.attemptedScrapes = eligible.length

  const concurrency = clampInteger(
    input.concurrency,
    CP22B_DEFAULT_FIRECRAWL_CONCURRENCY,
    1,
    CP22B_HARD_MAX_FIRECRAWL_CONCURRENCY,
  )
  const timeoutMs = clampInteger(
    input.timeoutMs,
    CP22B_DEFAULT_FIRECRAWL_TIMEOUT_MS,
    1000,
    30000,
  )
  const fetchImpl = input.fetchImpl ?? fetch

  const outcomes = await mapLimit(eligible, concurrency, async (item) => ({
    index: item.index,
    outcome: await scrapeWebsite({
      url: item.url,
      apiKey,
      timeoutMs,
      fetchImpl,
    }),
  }))

  for (const item of outcomes) {
    if (!item.outcome.ok) {
      stats.failedScrapes += 1
      continue
    }

    stats.successfulScrapes += 1

    const current = leads[item.index]
    if (item.outcome.email) {
      current.email = item.outcome.email
      stats.emailsFound += 1
    }
    if (item.outcome.owner) {
      current.owner = item.outcome.owner
      stats.ownersFound += 1
    }
    if (item.outcome.hook) {
      current.hook = item.outcome.hook
      stats.hooksFound += 1
    }
  }

  return {
    ok: true,
    leads,
    stats,
  }
}
