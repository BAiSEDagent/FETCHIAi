/**
 * CP4 — No-op SearchProvider (inert compile proof).
 *
 * An intentionally disabled discovery provider. It exists only to prove the
 * SearchProvider seam compiles and can be satisfied. It does NOT:
 * - make network calls
 * - import any provider SDK
 * - use fetch/axios
 * - read process.env
 * - import the DB
 * - read secrets
 * - fabricate candidates or scored opportunities
 *
 * It returns zero candidates plus a typed `provider_disabled` error so callers
 * can tell discovery is not wired up yet. Live behavior arrives in a later
 * checkpoint (CP5 smoke proof).
 */

import type { SearchProvider, SearchTask, SearchDiscoverResult } from './search-provider'

const DISABLED_RUN_ID = 'noop:search:disabled'

export const noopSearchProvider: SearchProvider = {
  name: 'noop',
  async discover(_task: SearchTask): Promise<SearchDiscoverResult> {
    return {
      providerRunId: DISABLED_RUN_ID,
      candidates: [],
      costEstimateUsd: 0,
      error: {
        code: 'provider_disabled',
        message: 'Search discovery is not enabled in this build.',
        retryable: false,
        providerRunId: DISABLED_RUN_ID,
      },
    }
  },
}
