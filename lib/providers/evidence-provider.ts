/**
 * CP4 — Evidence / hydration contract (inert, compile-only).
 *
 * EvidenceProvider is the Firecrawl-backed evidence HYDRATION layer. Its job is
 * to turn a candidate's source into a dated, cited evidence document, plus domain
 * mapping, batch scraping, and structured extraction. It never decides fit or
 * score. `interact` is an EXCEPTIONAL path only — never the default MVP loop.
 *
 * Source of truth: docs/PROVIDER_CONTRACTS.md (EvidenceProvider responsibility),
 * docs/AGENT_WEB_DATA_ARCHITECTURE.md.
 */

import type {
  AgentError,
  BudgetEnvelope,
  ProviderName,
  ProviderRunId,
} from './contracts'

/** Fields common to every evidence document, regardless of source locator. */
export interface EvidenceDocumentBase {
  providerRunId: ProviderRunId
  fetchedAt: string
  publishedAt?: string
  title?: string
  cleanedText: string
  structured?: Record<string, unknown>
  rawProviderMetadata: unknown
}

/**
 * A normalized evidence document derived from a hydrated source. Must carry a
 * `providerRunId` and AT LEAST ONE of `sourceUrl` / `sourceName` — the contract
 * rule is enforced in the type via the union below, so a document with neither
 * source locator is not assignable. `publishedAt` captures the dated public
 * artifact that feeds the evidence gate.
 */
export type EvidenceDocument = EvidenceDocumentBase &
  (
    | { sourceUrl: string; sourceName?: string }
    | { sourceUrl?: string; sourceName: string }
  )

export interface ScrapeUrlInput {
  url: string
  workspaceId: string
  budget: BudgetEnvelope
}

export interface MapDomainInput {
  domain: string
  workspaceId: string
  budget: BudgetEnvelope
}

export interface BatchScrapeInput {
  urls: string[]
  workspaceId: string
  budget: BudgetEnvelope
}

export interface ExtractInput {
  url: string
  schemaHint: Record<string, unknown>
  workspaceId: string
  budget: BudgetEnvelope
}

export interface InteractInput {
  url: string
  steps: unknown
  workspaceId: string
  budget: BudgetEnvelope
}

export interface EvidenceDocResult {
  providerRunId: ProviderRunId
  doc?: EvidenceDocument
  error?: AgentError
}

export interface EvidenceUrlsResult {
  providerRunId: ProviderRunId
  urls: string[]
  error?: AgentError
}

export interface EvidenceDocsResult {
  providerRunId: ProviderRunId
  docs: EvidenceDocument[]
  error?: AgentError
}

export interface EvidenceDataResult {
  providerRunId: ProviderRunId
  data?: Record<string, unknown>
  error?: AgentError
}

/**
 * Evidence hydration provider abstraction. Implementations live behind this
 * seam; routes/components/agents never call a provider SDK directly. An
 * implementation must NOT decide fit or score.
 */
export interface EvidenceProvider {
  name: ProviderName

  /** Hydrate a single source behind a candidate. */
  scrapeUrl(input: ScrapeUrlInput): Promise<EvidenceDocResult>

  /** Discover relevant pages within a known domain. */
  mapDomain(input: MapDomainInput): Promise<EvidenceUrlsResult>

  /** Hydrate several sources in one bounded run. */
  batchScrape(input: BatchScrapeInput): Promise<EvidenceDocsResult>

  /** Structured field extraction against a schema hint. */
  extract(input: ExtractInput): Promise<EvidenceDataResult>

  /**
   * EXCEPTIONAL path only: browser interaction for sources that require it.
   * Never the default discovery/hydration mechanism. Must be justified and
   * budgeted explicitly when implemented.
   */
  interact?(input: InteractInput): Promise<EvidenceDocResult>
}
