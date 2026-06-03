/**
 * CP4 — Search / discovery contract (inert, compile-only).
 *
 * SearchProvider is the SerpApi-backed DISCOVERY layer. Its only job is to run
 * playbook-resolved query templates and return candidate signals. It never
 * decides fit or score, and a candidate is never an opportunity.
 *
 * Source of truth: docs/PROVIDER_CONTRACTS.md (SearchProvider responsibility),
 * docs/AGENT_WEB_DATA_ARCHITECTURE.md, docs/PLAYBOOK_SEARCH_EXAMPLES.md.
 */

import type {
  AgentError,
  BudgetEnvelope,
  LocationInput,
  ProviderName,
  ProviderRunId,
  QueryEngine,
  SignalType,
} from './contracts'

/**
 * A single resolved discovery task. The `query` string already has all playbook
 * placeholders resolved — providers never invent queries, and agents/routes
 * never freestyle query categories outside the active playbook.
 */
export interface SearchTask {
  workspaceId: string
  vertical: string
  signalType: SignalType
  engine: QueryEngine
  query: string
  location: LocationInput
  dateWindow: string
  budget: BudgetEnvelope
}

/** A raw provider hit. Pre-evidence: a hit is a candidate, never an opportunity. */
export interface SearchHit {
  title: string
  url?: string
  sourceName?: string
  snippet: string
  rank: number
  rawEngineMetadata: unknown
}

/**
 * A discovered candidate signal. PRE-EVIDENCE by contract: it must NOT carry a
 * score, an opportunity status, a confident vertical-fit label, or any outreach
 * field. It only becomes more than a candidate after evidence hydration +
 * classification clear the evidence gate (Product Law: a snippet is not an
 * opportunity).
 */
export interface CandidateSignal {
  providerRunId: ProviderRunId
  workspaceId: string
  vertical: string
  signalType: SignalType
  engine: QueryEngine
  query: string
  hit: SearchHit
  discoveredAt: string
}

/** Result of a single discovery run. */
export interface SearchDiscoverResult {
  providerRunId: ProviderRunId
  candidates: CandidateSignal[]
  costEstimateUsd: number
  error?: AgentError
}

/**
 * Discovery provider abstraction. Implementations live behind this seam; routes,
 * components, and agents call this, never a provider SDK directly. An
 * implementation must NOT decide fit or score.
 */
export interface SearchProvider {
  name: ProviderName
  discover(task: SearchTask): Promise<SearchDiscoverResult>
}
