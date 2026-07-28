/**
 * CP5B — SerpApi SearchProvider (first real discovery call).
 *
 * The first live implementation of the CP4 SearchProvider seam. It makes ONE
 * real SerpApi `google_light` request and normalizes hits into pre-evidence
 * CandidateSignal[] only. Product Law: a snippet is a CANDIDATE, never a lead or
 * opportunity. This provider therefore:
 * - calls SerpApi (and nothing else) only from this file
 * - supports exactly one engine: `google_light`
 * - reads NO env/secret (apiKey is injected via the constructor)
 * - performs NO DB writes, NO Firecrawl/evidence hydration
 * - runs NO scoring, classifier, fit decision, or outreach
 * - never fabricates candidates and never adds score/opportunity/fit/outreach
 *   fields to a candidate
 *
 * Source of truth: docs/PROVIDER_CONTRACTS.md (SearchProvider responsibility),
 * docs/AGENT_WEB_DATA_ARCHITECTURE.md, docs/PLAYBOOK_SEARCH_EXAMPLES.md.
 */

import type { AgentError } from './contracts'
import type {
  CandidateSignal,
  SearchDiscoverResult,
  SearchHit,
  SearchProvider,
  SearchTask,
} from './search-provider'

/** Max candidates normalized from a single discovery run (no pagination). */
const MAX_CANDIDATES = 3

/** Rough per-call cost estimate for a single SerpApi search (audit only). */
const COST_ESTIMATE_USD = 0.01

/** SerpApi REST endpoint. SerpApi is called only from this file. */
const SERPAPI_ENDPOINT = 'https://serpapi.com/search.json'
const DEFAULT_TIMEOUT_MS = 8000

/** Keep surfaced provider errors useful without leaking secrets or long payloads. */
const MAX_PROVIDER_ERROR_MESSAGE_LENGTH = 240

/** Shape of the slice of the SerpApi response this adapter reads. */
interface SerpApiOrganicResult {
  title?: unknown
  link?: unknown
  snippet?: unknown
  source?: unknown
  position?: unknown
}

interface SerpApiResponse {
  error?: unknown
  organic_results?: unknown
}

export interface SerpApiSearchProviderOptions {
  fetch?: typeof fetch
  timeoutMs?: number
  setTimeout?: typeof setTimeout
  clearTimeout?: typeof clearTimeout
}

function newRunId(): string {
  return `serpapi:${Date.now()}:${Math.random().toString(36).slice(2, 10)}`
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0
}

function sanitizeProviderErrorMessage(value: unknown): string | null {
  if (!isNonEmptyString(value)) return null

  const cleaned = value
    .replace(/https?:\/\/\S+/gi, '[provider-url-redacted]')
    .replace(/api_key=([^&\s]+)/gi, 'api_key=[redacted]')
    .replace(/(api[_ -]?key\s*[:=]\s*)["']?[^"'\s,}]+/gi, '$1[redacted]')
    .replace(/\s+/g, ' ')
    .trim()

  if (cleaned.length === 0) return null

  return cleaned.length > MAX_PROVIDER_ERROR_MESSAGE_LENGTH
    ? `${cleaned.slice(0, MAX_PROVIDER_ERROR_MESSAGE_LENGTH - 3).trim()}...`
    : cleaned
}

function parseSerpApiErrorPayload(value: unknown): string | null {
  if (typeof value !== 'object' || value === null) return null

  const payload = value as SerpApiResponse
  return sanitizeProviderErrorMessage(payload.error)
}

function isAbortError(error: unknown): boolean {
  return (
    (typeof DOMException !== 'undefined' &&
      error instanceof DOMException &&
      error.name === 'AbortError') ||
    (typeof error === 'object' &&
      error !== null &&
      'name' in error &&
      error.name === 'AbortError')
  )
}

async function parseSerpApiErrorResponse(response: Response): Promise<string | null> {
  try {
    const body = await response.text()
    if (!isNonEmptyString(body)) return null

    try {
      return parseSerpApiErrorPayload(JSON.parse(body)) ?? sanitizeProviderErrorMessage(body)
    } catch {
      return sanitizeProviderErrorMessage(body)
    }
  } catch {
    return null
  }
}

/**
 * The launch SerpApi discovery adapter. Construct with an apiKey (read by the
 * caller from the environment — never here) and call discover(task).
 */
export class SerpApiSearchProvider implements SearchProvider {
  public readonly name = 'serpapi' as const

  private readonly apiKey: string
  private readonly fetcher: typeof fetch
  private readonly timeoutMs: number
  private readonly setTimer: typeof setTimeout
  private readonly clearTimer: typeof clearTimeout

  constructor(apiKey: string, options: SerpApiSearchProviderOptions = {}) {
    this.apiKey = apiKey
    this.fetcher = options.fetch ?? fetch
    this.timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS
    this.setTimer = options.setTimeout ?? setTimeout
    this.clearTimer = options.clearTimeout ?? clearTimeout
  }

  async discover(task: SearchTask): Promise<SearchDiscoverResult> {
    const providerRunId = newRunId()

    if (!isNonEmptyString(this.apiKey)) {
      return this.errorResult(providerRunId, {
        code: 'missing_api_key',
        message: 'SerpApi discovery is missing its API key.',
        retryable: false,
        providerRunId,
      })
    }

    // Launch adapter supports only the light Google engine, by product rule.
    if (task.engine !== 'google_light') {
      return this.errorResult(providerRunId, {
        code: 'unsupported_engine',
        message: `SerpApi discovery adapter supports only "google_light", not "${task.engine}".`,
        retryable: false,
        providerRunId,
      })
    }

    const params = new URLSearchParams({
      engine: 'google_light',
      q: task.query,
      location: `${task.location.city}, ${task.location.state}`,
      hl: 'en',
      gl: 'us',
      api_key: this.apiKey,
    })

    let response: Response
    const controller = new AbortController()
    const timer = this.setTimer(() => controller.abort(), Math.max(1, this.timeoutMs))
    try {
      response = await this.fetcher(`${SERPAPI_ENDPOINT}?${params.toString()}`, {
        method: 'GET',
        headers: { accept: 'application/json' },
        signal: controller.signal,
      })
    } catch (error) {
      if (controller.signal.aborted || isAbortError(error)) {
        return this.errorResult(providerRunId, {
          code: 'provider_timeout',
          message: 'SerpApi discovery request timed out.',
          retryable: true,
          providerRunId,
        })
      }
      return this.errorResult(providerRunId, {
        code: 'provider_request_failed',
        message: 'SerpApi discovery request could not be completed.',
        retryable: true,
        providerRunId,
      })
    } finally {
      this.clearTimer(timer)
    }

    if (!response.ok) {
      const providerMessage = await parseSerpApiErrorResponse(response)

      return this.errorResult(providerRunId, {
        code: 'provider_request_failed',
        message: providerMessage
          ? `SerpApi discovery request failed with status ${response.status}: ${providerMessage}`
          : `SerpApi discovery request failed with status ${response.status}.`,
        retryable: response.status >= 500,
        providerRunId,
      })
    }

    let payload: SerpApiResponse
    try {
      payload = (await response.json()) as SerpApiResponse
    } catch {
      return this.errorResult(providerRunId, {
        code: 'provider_response_invalid',
        message: 'SerpApi discovery returned a response that could not be parsed.',
        retryable: false,
        providerRunId,
      })
    }

    const providerMessage = parseSerpApiErrorPayload(payload)
    if (providerMessage) {
      return this.errorResult(providerRunId, {
        code: 'provider_request_failed',
        message: `SerpApi discovery reported an error for this query: ${providerMessage}`,
        retryable: false,
        providerRunId,
      })
    }

    if (!Array.isArray(payload.organic_results)) {
      return this.errorResult(providerRunId, {
        code: 'provider_response_invalid',
        message: 'SerpApi discovery response did not include organic results.',
        retryable: false,
        providerRunId,
      })
    }

    const candidates = this.normalize(task, providerRunId, payload.organic_results)

    if (candidates.length === 0) {
      return {
        providerRunId,
        candidates: [],
        costEstimateUsd: COST_ESTIMATE_USD,
        error: {
          code: 'provider_no_results',
          message: 'SerpApi discovery returned no usable candidate signals.',
          retryable: false,
          providerRunId,
        },
      }
    }

    return {
      providerRunId,
      candidates,
      costEstimateUsd: COST_ESTIMATE_USD,
    }
  }

  /**
   * Normalize raw SerpApi organic results into pre-evidence CandidateSignal[].
   * Skips any result missing title + snippet + url. Never fabricates a result
   * and never attaches score/opportunity/fit/outreach data.
   */
  private normalize(
    task: SearchTask,
    providerRunId: string,
    organicResults: unknown[],
  ): CandidateSignal[] {
    const discoveredAt = new Date().toISOString()
    const candidates: CandidateSignal[] = []

    for (const raw of organicResults) {
      if (candidates.length >= MAX_CANDIDATES) break
      if (typeof raw !== 'object' || raw === null) continue

      const result = raw as SerpApiOrganicResult
      const title = result.title
      const url = result.link
      const snippet = result.snippet

      if (!isNonEmptyString(title) || !isNonEmptyString(url) || !isNonEmptyString(snippet)) {
        continue
      }

      const hit: SearchHit = {
        title: title.trim(),
        url: url.trim(),
        snippet: snippet.trim(),
        rank: candidates.length + 1,
        rawEngineMetadata: raw,
      }

      if (isNonEmptyString(result.source)) {
        hit.sourceName = result.source.trim()
      }

      candidates.push({
        providerRunId,
        workspaceId: task.workspaceId,
        vertical: task.vertical,
        signalType: task.signalType,
        engine: task.engine,
        query: task.query,
        hit,
        discoveredAt,
      })
    }

    return candidates
  }

  private errorResult(providerRunId: string, error: AgentError): SearchDiscoverResult {
    return {
      providerRunId,
      candidates: [],
      costEstimateUsd: 0,
      error,
    }
  }
}
