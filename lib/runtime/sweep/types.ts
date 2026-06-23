export const CP22A_DEFAULT_MAX_SERPAPI_CALLS = 80
export const CP22A_DEFAULT_MAX_PAGES_PER_QUERY = 3
export const CP22A_DEFAULT_CONCURRENCY = 6
export const CP22B_DEFAULT_MAX_FIRECRAWL_SCRAPES = 50
export const CP22B_HARD_MAX_FIRECRAWL_SCRAPES = 100
export const CP22B_DEFAULT_FIRECRAWL_CONCURRENCY = 4
export const CP22B_HARD_MAX_FIRECRAWL_CONCURRENCY = 5
export const CP22B_DEFAULT_FIRECRAWL_TIMEOUT_MS = 12000

export type SweepMarketKind = 'city_metro' | 'state' | 'nationwide'

export type SweepMarketPlan = {
  kind: SweepMarketKind
  input: string
  markets: string[]
}

export type SweepRequest = {
  service: string
  icp: string
  market: string
  apiKey?: string
  maxCalls?: number
  maxPagesPerQuery?: number
  concurrency?: number
}

export type SerpApiMapsCallPlan = {
  engine: 'google_maps'
  query: string
  market: string
  start: number
}

export type SweepLead = {
  id: string
  businessName: string
  website: string | null
  phone: string
  address: string | null
  market: string
  source: 'Google Maps'
  sourceUrl: string
  category: string | null
  latitude: number | null
  longitude: number | null
  email: string | null
  owner: string | null
  hook: string | null
}

export type SweepStats = {
  sourcesHit: string[]
  queriesRun: number
  rawScanned: number
  dedupedLeadCount: number
  exportCount: number
}

export type SweepError = {
  code:
    | 'missing_serpapi_key'
    | 'invalid_input'
    | 'provider_request_failed'
    | 'provider_response_invalid'
  message: string
}

export type SweepEnrichmentStats = {
  eligibleWebsiteRows: number
  skippedNoWebsiteRows: number
  scrapeBudget: number
  attemptedScrapes: number
  successfulScrapes: number
  failedScrapes: number
  emailsFound: number
  ownersFound: number
  hooksFound: number
}

export type SweepEnrichmentError = {
  code: 'missing_firecrawl_key' | 'invalid_input'
  message: string
}

export type SweepEnrichmentInput = {
  leads: SweepLead[]
  apiKey?: string
  maxScrapes?: number
  concurrency?: number
  timeoutMs?: number
  fetchImpl?: typeof fetch
}

export type SweepEnrichmentResult = {
  ok: boolean
  leads: SweepLead[]
  stats: SweepEnrichmentStats
  error?: SweepEnrichmentError
}

export type SweepRunResult = {
  ok: boolean
  leads: SweepLead[]
  stats: SweepStats
  calls: SerpApiMapsCallPlan[]
  error?: SweepError
}

export type SerpApiMapsLocalResult = {
  position?: unknown
  title?: unknown
  phone?: unknown
  website?: unknown
  address?: unknown
  type?: unknown
  types?: unknown
  gps_coordinates?: unknown
}

export type SerpApiMapsPayload = {
  error?: unknown
  local_results?: unknown
}

export type NormalizeMapsInput = {
  payload: SerpApiMapsPayload
  service: string
  icp: string
  market: string
  query: string
  sourceUrl: string
}
