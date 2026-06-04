/**
 * CP5C — Firecrawl evidence hydration smoke runner (Replit Shell proof).
 *
 * Proves ONE real Firecrawl `/v1/scrape` call runs behind the CP4
 * EvidenceProvider contract and normalizes a known source URL into an
 * EvidenceDocument only. It is a controlled shell proof, NOT app/runtime wiring.
 * It does NOT:
 * - write to the database (no DB import)
 * - call SerpApi / run discovery
 * - score, classify, decide fit, or run outreach
 * - create opportunities or leads
 * - wire into any route / UI / app runtime
 *
 * Exactly one secret is read in exactly one place: process.env.FIRECRAWL_API_KEY,
 * here, and only to inject the key into the provider constructor. The key is
 * never printed.
 *
 * Run directly:
 *   ./node_modules/.bin/tsx scripts/pm/firecrawl-evidence-smoke.ts
 *
 * No npm script is added; package.json is not modified.
 */

import { FirecrawlEvidenceProvider } from '@/lib/providers/firecrawl-evidence-provider'
import type { BudgetEnvelope } from '@/lib/providers/contracts'
import type { EvidenceDocument, ScrapeUrlInput } from '@/lib/providers/evidence-provider'

const SMOKE_URL = 'https://example.com'

const FORBIDDEN_DOC_KEYS = [
  'score',
  'opportunityStatus',
  'verticalFitLabel',
  'outreach',
  'outreachStatus',
  'draft',
]

interface SmokeProof {
  ok: boolean
  mode: 'firecrawl_evidence_smoke'
  providerName: string
  sourceUrl: string
  providerRunId: string
  hasDocument: boolean
  cleanedTextLength: number
  title?: string
  evidenceOnly: boolean
  createdOpportunities: number
  createdScores: number
  createdOutreach: number
  dbWrites: number
  serpApiCalls: number
  liveMethodsUsed: string[]
  error?: { code: string; message: string }
}

function docIsEvidenceOnly(doc: EvidenceDocument): boolean {
  const keys = Object.keys(doc as unknown as Record<string, unknown>)
  if (FORBIDDEN_DOC_KEYS.some((forbidden) => keys.includes(forbidden))) {
    return false
  }
  return (
    typeof doc.providerRunId === 'string' &&
    typeof doc.fetchedAt === 'string' &&
    typeof doc.cleanedText === 'string' &&
    doc.cleanedText.length > 0 &&
    typeof (doc as { sourceUrl?: unknown }).sourceUrl === 'string'
  )
}

async function main(): Promise<void> {
  const apiKey = process.env.FIRECRAWL_API_KEY
  if (!apiKey || apiKey.trim().length === 0) {
    console.error(
      'CP5C Firecrawl evidence smoke FAILED: FIRECRAWL_API_KEY is not set. ' +
        'Add the secret and rerun. The smoke is never faked.',
    )
    process.exit(1)
  }

  const workspaceId = 'smoke-workspace'

  const budget: BudgetEnvelope = {
    workspaceId,
    maxProviderCalls: 1,
    maxSpendEstimateUsd: 0.02,
    triggeredBy: 'manual_chat',
  }

  const input: ScrapeUrlInput = {
    url: SMOKE_URL,
    workspaceId,
    budget,
  }

  const provider = new FirecrawlEvidenceProvider(apiKey)
  const result = await provider.scrapeUrl(input)

  const doc = result.doc
  const hasDocument = typeof doc === 'object' && doc !== null
  const evidenceOnly = hasDocument ? docIsEvidenceOnly(doc as EvidenceDocument) : false

  const ok =
    provider.name === 'firecrawl' &&
    typeof result.providerRunId === 'string' &&
    result.providerRunId.length > 0 &&
    hasDocument &&
    evidenceOnly &&
    (doc as EvidenceDocument).sourceUrl === SMOKE_URL &&
    typeof (doc as EvidenceDocument).fetchedAt === 'string' &&
    typeof (doc as EvidenceDocument).cleanedText === 'string' &&
    (doc as EvidenceDocument).cleanedText.length > 0 &&
    !result.error

  const proof: SmokeProof = {
    ok,
    mode: 'firecrawl_evidence_smoke',
    providerName: provider.name,
    sourceUrl: SMOKE_URL,
    providerRunId: result.providerRunId,
    hasDocument,
    cleanedTextLength: hasDocument ? (doc as EvidenceDocument).cleanedText.length : 0,
    title: hasDocument ? (doc as EvidenceDocument).title : undefined,
    evidenceOnly,
    createdOpportunities: 0,
    createdScores: 0,
    createdOutreach: 0,
    dbWrites: 0,
    serpApiCalls: 0,
    liveMethodsUsed: ['scrapeUrl'],
  }

  if (result.error) {
    proof.error = { code: result.error.code, message: result.error.message }
  }

  console.log(JSON.stringify(proof, null, 2))

  if (!ok) {
    console.error('CP5C Firecrawl evidence smoke FAILED: proof assertions did not hold.')
    process.exit(1)
  }

  process.exit(0)
}

main().catch((err) => {
  console.error('CP5C Firecrawl evidence smoke FAILED with an unexpected error:')
  console.error(err instanceof Error ? err.message : String(err))
  process.exit(1)
})
