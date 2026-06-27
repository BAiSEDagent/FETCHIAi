import {
  CP22A_DEFAULT_CONCURRENCY,
  type SerpApiMapsCallPlan,
  type SerpApiMapsPayload,
  type SweepError,
  type SweepRequest,
  type SweepRunResult,
  type SweepStats,
} from './types'
import { dedupeSweepLeads, normalizeSerpApiMapsResults } from './normalize'
import { planSerpApiMapsCalls } from './query-variants'

const SERPAPI_ENDPOINT = 'https://serpapi.com/search.json'

function compact(value: string): string {
  return value.replace(/\s+/g, ' ').trim()
}

function isPresent(value: string | undefined): value is string {
  return typeof value === 'string' && value.trim().length > 0
}

function emptyStats(): SweepStats {
  return {
    sourcesHit: [],
    queriesRun: 0,
    rawScanned: 0,
    dedupedLeadCount: 0,
    exportCount: 0,
  }
}

function errorResult(error: SweepError, calls: SerpApiMapsCallPlan[] = []): SweepRunResult {
  return {
    ok: false,
    leads: [],
    calls,
    stats: emptyStats(),
    error,
  }
}

function publicSourceUrl(call: SerpApiMapsCallPlan): string {
  const params = new URLSearchParams({
    engine: 'google_maps',
    type: 'search',
    q: call.query,
    start: String(call.start),
  })
  return `https://serpapi.com/search?${params.toString()}`
}

function providerUrl(call: SerpApiMapsCallPlan, apiKey: string): string {
  const params = new URLSearchParams({
    engine: 'google_maps',
    type: 'search',
    q: call.query,
    hl: 'en',
    gl: 'us',
    start: String(call.start),
    api_key: apiKey,
  })
  return `${SERPAPI_ENDPOINT}?${params.toString()}`
}

function sanitizeProviderError(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const cleaned = value
    .replace(/api_key=([^&\s]+)/gi, 'api_key=[redacted]')
    .replace(/(api[_ -]?key\s*[:=]\s*)["']?[^"'\s,}]+/gi, '$1[redacted]')
    .replace(/\s+/g, ' ')
    .trim()
  if (!cleaned) return null
  return cleaned.length > 180 ? `${cleaned.slice(0, 177).trim()}...` : cleaned
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

async function fetchMapsCall(call: SerpApiMapsCallPlan, apiKey: string): Promise<{
  call: SerpApiMapsCallPlan
  payload: SerpApiMapsPayload | null
  error: SweepError | null
}> {
  let response: Response
  try {
    response = await fetch(providerUrl(call, apiKey), {
      method: 'GET',
      headers: { accept: 'application/json' },
    })
  } catch {
    return {
      call,
      payload: null,
      error: {
        code: 'provider_request_failed',
        message: 'SerpApi Maps request could not be completed.',
      },
    }
  }

  let payload: SerpApiMapsPayload
  try {
    payload = (await response.json()) as SerpApiMapsPayload
  } catch {
    return {
      call,
      payload: null,
      error: {
        code: 'provider_response_invalid',
        message: 'SerpApi Maps returned a response that could not be parsed.',
      },
    }
  }

  const providerError = sanitizeProviderError(payload.error)
  if (!response.ok || providerError) {
    return {
      call,
      payload,
      error: {
        code: response.status >= 500 ? 'provider_request_failed' : 'provider_response_invalid',
        message: providerError
          ? `SerpApi Maps returned an error: ${providerError}`
          : `SerpApi Maps request failed with status ${response.status}.`,
      },
    }
  }

  return {
    call,
    payload,
    error: null,
  }
}

export async function runSerpApiMapsSweep(request: SweepRequest): Promise<SweepRunResult> {
  const service = compact(request.service)
  const icp = compact(request.icp)
  const market = compact(request.market)

  if (!service || !icp || !market) {
    return errorResult({
      code: 'invalid_input',
      message: 'Add what you sell, who you want, and a market to target.',
    })
  }

  const calls = planSerpApiMapsCalls({ ...request, service, icp, market })

  if (!isPresent(request.apiKey)) {
    return errorResult({
      code: 'missing_serpapi_key',
      message: 'SERPAPI_KEY is required for a live Maps sweep.',
    }, calls)
  }

  const concurrency = Math.max(1, Math.floor(request.concurrency ?? CP22A_DEFAULT_CONCURRENCY))
  const responses = await mapLimit(calls, concurrency, (call) => fetchMapsCall(call, request.apiKey!.trim()))
  const rawScanned = responses.reduce((sum, item) => {
    return sum + (Array.isArray(item.payload?.local_results) ? item.payload.local_results.length : 0)
  }, 0)

  const leads = dedupeSweepLeads(responses.flatMap((item) => {
    if (!item.payload) return []
    return normalizeSerpApiMapsResults({
      payload: item.payload,
      service,
      icp: item.call.buyerLane,
      market: item.call.market,
      query: item.call.query,
      sourceUrl: publicSourceUrl(item.call),
    })
  }))

  const stats: SweepStats = {
    sourcesHit: responses.length > 0 ? ['Google Maps'] : [],
    queriesRun: responses.length,
    rawScanned,
    dedupedLeadCount: leads.length,
    exportCount: leads.length,
  }

  const firstError = responses.find((item) => item.error)?.error ?? null
  if (leads.length === 0 && firstError) {
    return {
      ok: false,
      leads,
      stats,
      calls,
      error: firstError,
    }
  }

  return {
    ok: true,
    leads,
    stats,
    calls,
  }
}
