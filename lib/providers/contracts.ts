/**
 * CP4 — Shared provider contract primitives (inert, compile-only).
 *
 * These are the typed seams Fetchi will later use for SerpApi discovery and
 * Firecrawl evidence hydration. NOTHING here implements live behavior, performs
 * network calls, imports a provider SDK, reads env, or touches the DB. The types
 * are not wired into the app runtime in this checkpoint.
 *
 * Source of truth: docs/PROVIDER_CONTRACTS.md, docs/AGENT_WEB_DATA_ARCHITECTURE.md.
 *
 * Provider boundaries (do not violate when these contracts are implemented later):
 * - SerpApi   = discovery only
 * - Firecrawl = evidence hydration only
 * - LLMs      = classify, score, explain, rank, draft
 * - DB/audit  = lineage system of record
 */

/** Named provider behind an abstraction. Open string keeps it provider-agnostic. */
export type ProviderName = 'serpapi' | 'firecrawl' | (string & {})

/** Stable identifier for a single provider run — the unit of replay/lineage. */
export type ProviderRunId = string

/**
 * SerpApi engines approved for the launch adapter. Light variants only, by
 * product rule — never the heavy `google` / `google_news` variants.
 */
export type QueryEngine =
  | 'google_light'
  | 'google_news_light'
  | 'google_maps'
  | 'google_jobs'

/** Public buying-signal categories. Discovery targets one of these per task. */
export type SignalType =
  | 'new_business_listing'
  | 'building_permit'
  | 'tenant_improvement'
  | 'hiring'
  | 'negative_review'
  | 'restaurant_opening'
  | 'property_management_change'
  | 'school_or_daycare_opening'
  | 'medical_office_opening'
  | 'event_or_venue_expansion'

/**
 * Approved fallback states (trust states). A candidate that is not a confident
 * `qualified` opportunity must land in exactly one of these — never an invented
 * label. Mirrors docs/design/lead-card-taxonomy.md.
 */
export type FallbackState =
  | 'needs_review'
  | 'weak_fit'
  | 'missing_evidence'
  | 'exploratory'
  | 'discarded'

/** What triggered a provider run — used for budgeting, gating, and audit. */
export type RunTrigger = 'manual_chat' | 'scheduled_scout' | 'admin_replay'

/**
 * User-safe error shape. `message` is friendly and never a raw stack trace;
 * `code` is a stable machine code for handling/retry decisions.
 */
export interface AgentError {
  code: string
  message: string
  retryable: boolean
  providerRunId?: ProviderRunId
}

/** Hard/soft spend + call ceilings applied to a single provider run. */
export interface BudgetEnvelope {
  workspaceId: string
  maxProviderCalls: number
  maxSpendEstimateUsd: number
  dailySpendCapUsd?: number
  triggeredBy: RunTrigger
}

/** Geographic scope for a search task. */
export interface LocationInput {
  city: string
  state: string
  county?: string
}

/**
 * Lineage metadata attached to every provider interaction so a run can be
 * reconstructed and replayed exactly. This is the audit system-of-record shape.
 */
export interface ProviderResultMeta {
  providerRunId: ProviderRunId
  provider: ProviderName
  engine?: QueryEngine
  startedAt: string
  finishedAt?: string
  costEstimateUsd: number
  resultCount: number
  error?: AgentError
}

/** Generic envelope pairing provider output with its lineage metadata. */
export interface ProviderResult<TData> {
  meta: ProviderResultMeta
  data: TData
}
