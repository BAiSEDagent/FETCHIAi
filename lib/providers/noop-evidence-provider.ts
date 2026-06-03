/**
 * CP4 — No-op EvidenceProvider (inert compile proof).
 *
 * An intentionally disabled evidence-hydration provider. It exists only to prove
 * the EvidenceProvider seam compiles and can be satisfied. It does NOT:
 * - make network calls
 * - import any provider SDK
 * - use fetch/axios
 * - read process.env
 * - import the DB
 * - read secrets
 * - fabricate evidence documents
 *
 * Every method returns an empty result plus a typed `provider_disabled` error so
 * callers can tell hydration is not wired up yet. Live behavior arrives in a
 * later checkpoint (CP5 smoke proof).
 */

import type {
  EvidenceProvider,
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
import type { AgentError } from './contracts'

const DISABLED_RUN_ID = 'noop:evidence:disabled'

const disabledError: AgentError = {
  code: 'provider_disabled',
  message: 'Evidence hydration is not enabled in this build.',
  retryable: false,
  providerRunId: DISABLED_RUN_ID,
}

export const noopEvidenceProvider: EvidenceProvider = {
  name: 'noop',
  async scrapeUrl(_input: ScrapeUrlInput): Promise<EvidenceDocResult> {
    return { providerRunId: DISABLED_RUN_ID, error: disabledError }
  },
  async mapDomain(_input: MapDomainInput): Promise<EvidenceUrlsResult> {
    return { providerRunId: DISABLED_RUN_ID, urls: [], error: disabledError }
  },
  async batchScrape(_input: BatchScrapeInput): Promise<EvidenceDocsResult> {
    return { providerRunId: DISABLED_RUN_ID, docs: [], error: disabledError }
  },
  async extract(_input: ExtractInput): Promise<EvidenceDataResult> {
    return { providerRunId: DISABLED_RUN_ID, error: disabledError }
  },
  async interact(_input: InteractInput): Promise<EvidenceDocResult> {
    return { providerRunId: DISABLED_RUN_ID, error: disabledError }
  },
}
