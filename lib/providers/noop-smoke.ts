/**
 * CP5A — No-op provider wiring proof (inert smoke path).
 *
 * Proves the CP4 provider contracts can be CONSUMED through a controlled no-op
 * smoke path, before CP5B introduces any real SerpApi discovery. It wires NO
 * real provider behavior. It does NOT:
 * - make network calls
 * - import any provider SDK
 * - use any HTTP client
 * - read environment variables or any secret
 * - import the DB or touch the database connection string
 * - reference any search or evidence provider API keys
 * - fabricate candidates, scored opportunities, or evidence documents
 * - run any classifier / scoring / outreach behavior
 * - wire into any route / UI / app runtime
 *
 * It calls the two no-op providers behind the SearchProvider / EvidenceProvider
 * seams and confirms each returns a typed, honest, disabled, empty result.
 */

import { noopSearchProvider } from './noop-search-provider'
import { noopEvidenceProvider } from './noop-evidence-provider'
import type { SearchTask } from './search-provider'
import type { ScrapeUrlInput } from './evidence-provider'
import type { AgentError, BudgetEnvelope, LocationInput } from './contracts'

/** Structured, JSON-safe outcome of the no-op smoke proof. */
export interface NoopProviderSmokeResult {
  ok: boolean
  mode: 'noop'
  searchProviderName: string
  evidenceProviderName: string
  candidateCount: number
  evidenceCount: number
  providerErrors: AgentError[]
  guardrails: {
    noLiveSearch: boolean
    noLiveHydration: boolean
    noDbWrites: boolean
    noEnvSecrets: boolean
    noOpportunitiesCreated: boolean
    noScoresCreated: boolean
    noOutreachCreated: boolean
  }
}

const INERT_SOURCE_URL = 'https://example.invalid/noop-source'

/**
 * Run the no-op provider smoke proof. Constructs one safe typed SearchTask for
 * commercial_cleaning / new_business_listing, invokes both no-op providers, and
 * asserts each is disabled and empty. Returns a JSON-safe result object.
 */
export async function runNoopProviderSmoke(): Promise<NoopProviderSmokeResult> {
  const workspaceId = 'noop-workspace'

  const location: LocationInput = {
    city: 'Austin',
    state: 'TX',
  }

  const budget: BudgetEnvelope = {
    workspaceId,
    maxProviderCalls: 0,
    maxSpendEstimateUsd: 0,
    triggeredBy: 'manual_chat',
  }

  const task: SearchTask = {
    workspaceId,
    vertical: 'commercial_cleaning',
    signalType: 'new_business_listing',
    engine: 'google_light',
    query: '[noop] new business listing — commercial cleaning',
    location,
    dateWindow: 'last_30_days',
    budget,
  }

  const providerErrors: AgentError[] = []

  // 1) SearchProvider seam: discovery must be disabled and return zero candidates.
  const discovery = await noopSearchProvider.discover(task)
  if (discovery.error) providerErrors.push(discovery.error)

  const candidateCount = discovery.candidates.length
  const searchDisabled =
    candidateCount === 0 &&
    discovery.costEstimateUsd === 0 &&
    discovery.error?.code === 'provider_disabled'

  // 2) EvidenceProvider seam: hydration must be disabled and return no document.
  const scrapeInput: ScrapeUrlInput = {
    url: INERT_SOURCE_URL,
    workspaceId,
    budget,
  }

  const evidence = await noopEvidenceProvider.scrapeUrl(scrapeInput)
  if (evidence.error) providerErrors.push(evidence.error)

  const evidenceCount = evidence.doc ? 1 : 0
  const evidenceDisabled =
    evidenceCount === 0 && evidence.error?.code === 'provider_disabled'

  const ok = searchDisabled && evidenceDisabled

  return {
    ok,
    mode: 'noop',
    searchProviderName: noopSearchProvider.name,
    evidenceProviderName: noopEvidenceProvider.name,
    candidateCount,
    evidenceCount,
    providerErrors,
    guardrails: {
      noLiveSearch: true,
      noLiveHydration: true,
      noDbWrites: true,
      noEnvSecrets: true,
      noOpportunitiesCreated: true,
      noScoresCreated: true,
      noOutreachCreated: true,
    },
  }
}
