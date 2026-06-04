/**
 * CP5B — SerpApi discovery smoke runner (Replit Shell proof).
 *
 * Proves ONE real SerpApi `google_light` call runs behind the CP4 SearchProvider
 * contract and normalizes hits into pre-evidence CandidateSignal[] only. It is a
 * controlled shell proof, NOT app/runtime wiring. It does NOT:
 * - write to the database (no DB import)
 * - call Firecrawl / hydrate evidence
 * - score, classify, decide fit, or run outreach
 * - create opportunities or leads
 * - wire into any route / UI / app runtime
 *
 * Exactly one secret is read in exactly one place: process.env.SERPAPI_API_KEY,
 * here, and only to inject the key into the provider constructor. The key is
 * never printed.
 *
 * Run directly:
 *   ./node_modules/.bin/tsx scripts/pm/serpapi-discovery-smoke.ts
 *
 * No npm script is added; package.json is not modified.
 */

import { SerpApiSearchProvider } from '@/lib/providers/serpapi-search-provider'
import type { BudgetEnvelope, LocationInput } from '@/lib/providers/contracts'
import type { CandidateSignal, SearchTask } from '@/lib/providers/search-provider'

const FORBIDDEN_CANDIDATE_KEYS = [
  'score',
  'opportunityStatus',
  'verticalFitLabel',
  'outreach',
  'outreachStatus',
  'draft',
]

interface SmokeProof {
  ok: boolean
  mode: 'serpapi_discovery_smoke'
  providerName: string
  engine: string
  query: string
  providerRunId: string
  candidateCount: number
  candidatesPreview: Array<{
    title: string
    url: string
    sourceName?: string
    snippet: string
    rank: number
    vertical: string
    signalType: string
  }>
  preEvidenceOnly: boolean
  createdOpportunities: number
  createdScores: number
  createdOutreach: number
  dbWrites: number
  firecrawlCalls: number
  error?: { code: string; message: string }
}

function candidateIsPreEvidence(candidate: CandidateSignal): boolean {
  const keys = Object.keys(candidate as unknown as Record<string, unknown>)
  if (FORBIDDEN_CANDIDATE_KEYS.some((forbidden) => keys.includes(forbidden))) {
    return false
  }
  return (
    typeof candidate.providerRunId === 'string' &&
    typeof candidate.workspaceId === 'string' &&
    typeof candidate.vertical === 'string' &&
    typeof candidate.signalType === 'string' &&
    typeof candidate.engine === 'string' &&
    typeof candidate.query === 'string' &&
    typeof candidate.discoveredAt === 'string' &&
    typeof candidate.hit === 'object' &&
    candidate.hit !== null &&
    typeof candidate.hit.title === 'string' &&
    typeof candidate.hit.url === 'string' &&
    typeof candidate.hit.snippet === 'string' &&
    typeof candidate.hit.rank === 'number'
  )
}

async function main(): Promise<void> {
  const apiKey = process.env.SERPAPI_API_KEY
  if (!apiKey || apiKey.trim().length === 0) {
    console.error(
      'CP5B SerpApi discovery smoke FAILED: SERPAPI_API_KEY is not set. ' +
        'Add the secret and rerun. The smoke is never faked.',
    )
    process.exit(1)
  }

  const workspaceId = 'smoke-workspace'

  const location: LocationInput = {
    city: 'Austin',
    state: 'TX',
  }

  const budget: BudgetEnvelope = {
    workspaceId,
    maxProviderCalls: 1,
    maxSpendEstimateUsd: 0.02,
    triggeredBy: 'manual_chat',
  }

  const task: SearchTask = {
    workspaceId,
    vertical: 'commercial_cleaning',
    signalType: 'new_business_listing',
    engine: 'google_light',
    query: 'new commercial business Austin TX last 30 days',
    location,
    dateWindow: 'last_30_days',
    budget,
  }

  const provider = new SerpApiSearchProvider(apiKey)
  const result = await provider.discover(task)

  const candidates = result.candidates
  const candidateCount = candidates.length
  const allPreEvidence = candidates.every(candidateIsPreEvidence)

  // Zero valid candidates may still pass only when a providerRunId exists and the
  // only error (if any) is provider_no_results. Any other error fails the proof.
  const errorCode = result.error?.code
  const errorAcceptable = !result.error || errorCode === 'provider_no_results'

  const ok =
    provider.name === 'serpapi' &&
    task.engine === 'google_light' &&
    typeof result.providerRunId === 'string' &&
    result.providerRunId.length > 0 &&
    Array.isArray(candidates) &&
    allPreEvidence &&
    errorAcceptable

  const proof: SmokeProof = {
    ok,
    mode: 'serpapi_discovery_smoke',
    providerName: provider.name,
    engine: task.engine,
    query: task.query,
    providerRunId: result.providerRunId,
    candidateCount,
    candidatesPreview: candidates.map((candidate) => ({
      title: candidate.hit.title,
      url: candidate.hit.url ?? '',
      sourceName: candidate.hit.sourceName,
      snippet: candidate.hit.snippet,
      rank: candidate.hit.rank,
      vertical: candidate.vertical,
      signalType: candidate.signalType,
    })),
    preEvidenceOnly: allPreEvidence,
    createdOpportunities: 0,
    createdScores: 0,
    createdOutreach: 0,
    dbWrites: 0,
    firecrawlCalls: 0,
  }

  if (result.error) {
    proof.error = { code: result.error.code, message: result.error.message }
  }

  console.log(JSON.stringify(proof, null, 2))

  if (!ok) {
    console.error('CP5B SerpApi discovery smoke FAILED: proof assertions did not hold.')
    process.exit(1)
  }

  process.exit(0)
}

main().catch((err) => {
  console.error('CP5B SerpApi discovery smoke FAILED with an unexpected error:')
  console.error(err instanceof Error ? err.message : String(err))
  process.exit(1)
})
