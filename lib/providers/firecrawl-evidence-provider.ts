/**
 * CP5C — Firecrawl EvidenceProvider (first real evidence hydration call).
 *
 * The first live implementation of the CP4 EvidenceProvider seam. It makes ONE
 * real Firecrawl `/v1/scrape` request and normalizes the result into an
 * EvidenceDocument only. Product Law: a hydrated document is EVIDENCE, never a
 * lead, opportunity, score, fit decision, contact route, or outreach draft.
 * This provider therefore:
 * - calls Firecrawl (and nothing else) only from this file
 * - supports exactly one live method for this checkpoint: `scrapeUrl`
 * - reads NO env/secret (apiKey is injected via the constructor)
 * - performs NO DB writes, NO SerpApi/discovery calls
 * - runs NO scoring, classifier, fit decision, or outreach
 * - never fabricates cleanedText and never adds score/opportunity/fit/outreach
 *   fields to a document
 *
 * mapDomain, batchScrape, extract, and interact are intentionally NOT live in
 * CP5C: each returns a typed `unsupported_method` error with an empty result
 * shape. Live behavior for those paths arrives in a later checkpoint.
 *
 * Source of truth: docs/PROVIDER_CONTRACTS.md (EvidenceProvider responsibility),
 * docs/AGENT_WEB_DATA_ARCHITECTURE.md.
 */

import type { AgentError } from './contracts'
import type {
  EvidenceProvider,
  EvidenceDocument,
  ScrapeUrlInput,
  MapDomainInput,
  BatchScrapeInput,
  ExtractInput,
  InteractInput,
  EvidenceDocResult,
  EvidenceUrlsResult,
  EvidenceDocsResult,
  EvidenceDataResult,
} from './evidence-provider'

/** Rough per-call cost estimate for a single Firecrawl scrape (audit only). */
const COST_ESTIMATE_USD = 0.01

/** Firecrawl REST endpoint. Firecrawl is called only from this file. */
const FIRECRAWL_SCRAPE_ENDPOINT = 'https://api.firecrawl.dev/v1/scrape'
const DEFAULT_TIMEOUT_MS = 8000

/** Shape of the slice of the Firecrawl scrape response this adapter reads. */
interface FirecrawlScrapeData {
  markdown?: unknown
  metadata?: {
    title?: unknown
    sourceURL?: unknown
    [key: string]: unknown
  }
  [key: string]: unknown
}

interface FirecrawlScrapeResponse {
  success?: unknown
  error?: unknown
  data?: FirecrawlScrapeData
}

export interface FirecrawlEvidenceProviderOptions {
  fetch?: typeof fetch
  timeoutMs?: number
  setTimeout?: typeof setTimeout
  clearTimeout?: typeof clearTimeout
}

function newRunId(): string {
  return `firecrawl:${Date.now()}:${Math.random().toString(36).slice(2, 10)}`
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0
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

/**
 * The launch Firecrawl evidence-hydration adapter. Construct with an apiKey
 * (read by the caller from the environment — never here) and call scrapeUrl().
 */
export class FirecrawlEvidenceProvider implements EvidenceProvider {
  public readonly name = 'firecrawl' as const

  private readonly apiKey: string
  private readonly fetcher: typeof fetch
  private readonly timeoutMs: number
  private readonly setTimer: typeof setTimeout
  private readonly clearTimer: typeof clearTimeout

  constructor(apiKey: string, options: FirecrawlEvidenceProviderOptions = {}) {
    this.apiKey = apiKey
    this.fetcher = options.fetch ?? fetch
    this.timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS
    this.setTimer = options.setTimeout ?? setTimeout
    this.clearTimer = options.clearTimeout ?? clearTimeout
  }

  async scrapeUrl(input: ScrapeUrlInput): Promise<EvidenceDocResult> {
    const providerRunId = newRunId()

    if (!isNonEmptyString(this.apiKey)) {
      return this.errorResult(providerRunId, {
        code: 'missing_api_key',
        message: 'Firecrawl evidence hydration is missing its API key.',
        retryable: false,
        providerRunId,
      })
    }

    if (!isNonEmptyString(input.url)) {
      return this.errorResult(providerRunId, {
        code: 'provider_request_failed',
        message: 'Firecrawl evidence hydration requires a source URL.',
        retryable: false,
        providerRunId,
      })
    }

    let response: Response
    const controller = new AbortController()
    const timer = this.setTimer(() => controller.abort(), Math.max(1, this.timeoutMs))
    try {
      response = await this.fetcher(FIRECRAWL_SCRAPE_ENDPOINT, {
        method: 'POST',
        headers: {
          authorization: `Bearer ${this.apiKey}`,
          'content-type': 'application/json',
          accept: 'application/json',
        },
        body: JSON.stringify({
          url: input.url,
          formats: ['markdown'],
        }),
        signal: controller.signal,
      })
    } catch (error) {
      if (controller.signal.aborted || isAbortError(error)) {
        return this.errorResult(providerRunId, {
          code: 'provider_timeout',
          message: 'Firecrawl evidence hydration request timed out.',
          retryable: true,
          providerRunId,
        })
      }
      return this.errorResult(providerRunId, {
        code: 'provider_request_failed',
        message: 'Firecrawl evidence hydration request could not be completed.',
        retryable: true,
        providerRunId,
      })
    } finally {
      this.clearTimer(timer)
    }

    if (!response.ok) {
      return this.errorResult(providerRunId, {
        code: 'provider_request_failed',
        message: `Firecrawl evidence hydration request failed with status ${response.status}.`,
        retryable: response.status >= 500,
        providerRunId,
      })
    }

    let payload: FirecrawlScrapeResponse
    try {
      payload = (await response.json()) as FirecrawlScrapeResponse
    } catch {
      return this.errorResult(providerRunId, {
        code: 'provider_response_invalid',
        message: 'Firecrawl evidence hydration returned a response that could not be parsed.',
        retryable: false,
        providerRunId,
      })
    }

    if (payload.success === false || isNonEmptyString(payload.error)) {
      return this.errorResult(providerRunId, {
        code: 'provider_request_failed',
        message: 'Firecrawl evidence hydration reported an error for this URL.',
        retryable: false,
        providerRunId,
      })
    }

    const data = payload.data
    if (typeof data !== 'object' || data === null) {
      return this.errorResult(providerRunId, {
        code: 'provider_response_invalid',
        message: 'Firecrawl evidence hydration response did not include a document.',
        retryable: false,
        providerRunId,
      })
    }

    // Never fabricate cleanedText: if Firecrawl returns no usable markdown, the
    // hydration produced no evidence — return a typed no-content error, no doc.
    if (!isNonEmptyString(data.markdown)) {
      return this.errorResult(providerRunId, {
        code: 'provider_no_content',
        message: 'Firecrawl evidence hydration returned no usable content for this URL.',
        retryable: false,
        providerRunId,
      })
    }

    const cleanedText = data.markdown.trim()
    const metadata = data.metadata

    const doc: EvidenceDocument = {
      providerRunId,
      sourceUrl: input.url,
      fetchedAt: new Date().toISOString(),
      cleanedText,
      rawProviderMetadata: payload,
    }

    if (metadata && isNonEmptyString(metadata.title)) {
      doc.title = metadata.title.trim()
    }

    return { providerRunId, doc }
  }

  async mapDomain(_input: MapDomainInput): Promise<EvidenceUrlsResult> {
    const providerRunId = newRunId()
    return {
      providerRunId,
      urls: [],
      error: this.unsupportedMethodError('mapDomain', providerRunId),
    }
  }

  async batchScrape(_input: BatchScrapeInput): Promise<EvidenceDocsResult> {
    const providerRunId = newRunId()
    return {
      providerRunId,
      docs: [],
      error: this.unsupportedMethodError('batchScrape', providerRunId),
    }
  }

  async extract(_input: ExtractInput): Promise<EvidenceDataResult> {
    const providerRunId = newRunId()
    return {
      providerRunId,
      error: this.unsupportedMethodError('extract', providerRunId),
    }
  }

  async interact(_input: InteractInput): Promise<EvidenceDocResult> {
    const providerRunId = newRunId()
    return {
      providerRunId,
      error: this.unsupportedMethodError('interact', providerRunId),
    }
  }

  private unsupportedMethodError(method: string, providerRunId: string): AgentError {
    return {
      code: 'unsupported_method',
      message: `Firecrawl evidence provider does not support "${method}" in this build.`,
      retryable: false,
      providerRunId,
    }
  }

  private errorResult(providerRunId: string, error: AgentError): EvidenceDocResult {
    return { providerRunId, error }
  }
}

/** Convenience factory mirroring the constructor-injected apiKey contract. */
export function createFirecrawlEvidenceProvider({
  apiKey,
}: {
  apiKey: string
}): EvidenceProvider {
  return new FirecrawlEvidenceProvider(apiKey)
}
