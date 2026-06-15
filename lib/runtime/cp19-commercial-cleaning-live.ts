import { createHash } from 'crypto'
import { evaluateClaimGuard } from '@/lib/gates/claim-guard'
import { evaluateEvidenceGate } from '@/lib/gates/evidence-gate'
import {
  APPROVED_COMMERCIAL_CLEANING_SIGNAL_LABELS,
  APPROVED_COMMERCIAL_CLEANING_VERTICAL_FIT_LABELS,
  COMMERCIAL_CLEANING_VERTICAL_ID,
  classifyCommercialCleaningSignal,
  type CommercialCleaningSignalLabel,
  type CommercialCleaningVerticalFitLabel,
} from '@/lib/classification/commercial-cleaning-classification-contract'
import { evaluateOpportunityScoring } from '@/lib/scoring/opportunity-scoring-contract'
import { FirecrawlEvidenceProvider } from '@/lib/providers/firecrawl-evidence-provider'
import { SerpApiSearchProvider } from '@/lib/providers/serpapi-search-provider'
import type { BudgetEnvelope } from '@/lib/providers/contracts'
import type { EvidenceDocument } from '@/lib/providers/evidence-provider'
import type { CandidateSignal, SearchTask } from '@/lib/providers/search-provider'

export const CP19_PROOF_ROUTE = '/internal/cp19'
export const CP19_SIGNAL_ID = 'building_permit'
export const CP19_SIGNAL_LABEL = 'BUILDOUT' satisfies CommercialCleaningSignalLabel

type Cp19ProofStatus = 'ready' | 'blocked'
type Cp19ProviderMode = 'LIVE'
type Cp19ProviderName = 'serpapi' | 'firecrawl'
type Cp19ProviderCallStatus = 'ok' | 'error' | 'skipped'

export type Cp19ProviderCall = {
  provider: Cp19ProviderName
  status: Cp19ProviderCallStatus
  runId: string | null
  detail: string
  sourceUrl?: string
  estimatedCostUsd: number
}

type Cp19BaseProof = {
  status: Cp19ProofStatus
  providerMode: Cp19ProviderMode
  providerModeReason: string
  proof: {
    capturedAt: string
    evaluatedAt: string
    searchQuery: string
    market: 'DFW'
    providerCalls: Cp19ProviderCall[]
    estimatedCostUsd: number
  }
}

export type Cp19LiveOpportunity = Cp19BaseProof & {
  status: 'ready'
  prospect: {
    businessName: string
    location: string
    address: string | null
  }
  evidence: {
    signalId: typeof CP19_SIGNAL_ID
    signalLabel: typeof CP19_SIGNAL_LABEL
    verticalFitLabel: CommercialCleaningVerticalFitLabel
    sourceUrl: string
    sourceDate: string
    sourceTitle: string
    sourceExcerpt: string
  }
  score: {
    value: number
    reason: string
    whyNow: string
  }
  lineage: {
    searchProvider: 'serpapi'
    searchProviderRunId: string
    evidenceProvider: 'firecrawl'
    evidenceProviderRunId: string
    liveFingerprint: string
  }
  nextAction: {
    label: 'Draft outreach'
    detail: string
  }
  proof: Cp19BaseProof['proof'] & {
    evidenceGateReasons: string[]
    classificationGateReasons: string[]
    scoringGateReasons: string[]
    claimGuardReasons: string[]
    replayableLineage: string
  }
}

export type Cp19BlockedProof = Cp19BaseProof & {
  status: 'blocked'
  blockerCode:
    | 'missing_provider_keys'
    | 'search_provider_failed'
    | 'no_live_candidates'
    | 'evidence_provider_failed'
    | 'no_surfaceable_live_opportunity'
  blocker: string
  missingEnv: string[]
  liveLineage: {
    searchProviderRunId: string | null
    evidenceProviderRunId: string | null
  }
}

export type Cp19ProofResult = Cp19LiveOpportunity | Cp19BlockedProof

const CP19_WORKSPACE_ID = 'cp19-admin-live-proof'
const CP19_VERTICAL_FIT_LABEL =
  'Post-Construction Clean' satisfies CommercialCleaningVerticalFitLabel
const CP19_QUERY =
  'commercial buildout permit Dallas TX last 45 days'

function hasValue(value: string | undefined): value is string {
  return typeof value === 'string' && value.trim().length > 0
}

function nowIso(): string {
  return new Date().toISOString()
}

function sourceDateIso(date: string): string {
  return `${date}T00:00:00.000Z`
}

function replayFingerprint(text: string): string {
  return createHash('sha256').update(text).digest('hex').slice(0, 16)
}

function buildBudget(workspaceId: string): BudgetEnvelope {
  return {
    workspaceId,
    maxProviderCalls: 4,
    maxSpendEstimateUsd: 0.05,
    triggeredBy: 'admin_replay',
  }
}

function providerCost(calls: readonly Cp19ProviderCall[]): number {
  return Number(
    calls
      .reduce((sum, call) => sum + call.estimatedCostUsd, 0)
      .toFixed(2),
  )
}

function liveRunId(value: string): string {
  if (!hasValue(value) || value.startsWith('recorded-')) {
    throw new Error('CP19 requires non-recorded live provider run IDs.')
  }

  return value
}

function firstPresentEnv(
  primary: string | undefined,
  secondary: string | undefined,
): string | null {
  if (hasValue(primary)) return primary.trim()
  if (hasValue(secondary)) return secondary.trim()
  return null
}

function missingProviderEnv(): string[] {
  const missing: string[] = []

  if (!firstPresentEnv(process.env.SERPAPI_API_KEY, process.env.SERPAPI_KEY)) {
    missing.push('SERPAPI_API_KEY or SERPAPI_KEY')
  }

  if (!hasValue(process.env.FIRECRAWL_API_KEY)) {
    missing.push('FIRECRAWL_API_KEY')
  }

  return missing
}

function blockedProof({
  blockerCode,
  blocker,
  capturedAt,
  evaluatedAt,
  calls,
  missingEnv = [],
}: {
  blockerCode: Cp19BlockedProof['blockerCode']
  blocker: string
  capturedAt: string
  evaluatedAt: string
  calls: Cp19ProviderCall[]
  missingEnv?: string[]
}): Cp19BlockedProof {
  const searchCall = calls.find((call) => call.provider === 'serpapi')
  const evidenceCall = [...calls]
    .reverse()
    .find((call) => call.provider === 'firecrawl')

  return {
    status: 'blocked',
    providerMode: 'LIVE',
    providerModeReason:
      'CP19 has no recorded-real fallback. It can surface only a live SerpApi discovery plus live Firecrawl evidence result.',
    blockerCode,
    blocker,
    missingEnv,
    liveLineage: {
      searchProviderRunId: searchCall?.runId ?? null,
      evidenceProviderRunId: evidenceCall?.runId ?? null,
    },
    proof: {
      capturedAt,
      evaluatedAt,
      searchQuery: CP19_QUERY,
      market: 'DFW',
      providerCalls: calls,
      estimatedCostUsd: providerCost(calls),
    },
  }
}

function makeFreshnessLabel(sourceDate: string, evaluatedAt: string): string {
  const evaluatedAtMs = Date.parse(evaluatedAt)
  const sourceAtMs = Date.parse(sourceDateIso(sourceDate))
  const days = Math.max(0, Math.floor((evaluatedAtMs - sourceAtMs) / 86_400_000))

  if (days === 0) return 'Just now'
  if (days === 1) return 'Yesterday'
  if (days < 14) return `${days}d ago`
  return `${Math.max(1, Math.floor(days / 7))}w ago`
}

function cleanValue(value: string | null): string | null {
  if (!value) return null

  const cleaned = value
    .replace(/\[[^\]]+\]\([^)]+\)/g, '')
    .replace(/\s+/g, ' ')
    .replace(/[|*_`#]+/g, '')
    .replace(/\s+(Location County|Start Date|Completion Date|Estimated Cost):.*$/i, '')
    .trim()

  return cleaned.length > 0 ? cleaned : null
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function extractLabeledValue(text: string, labels: readonly string[]): string | null {
  for (const label of labels) {
    const escaped = escapeRegExp(label)
    const tableMatch = text.match(
      new RegExp(`\\|\\s*${escaped}\\s*\\|\\s*([^|\\n\\r]+)\\|`, 'i'),
    )
    const lineMatch = text.match(
      new RegExp(`${escaped}\\s*:?\\s*([^\\n\\r]+)`, 'i'),
    )

    const value = cleanValue(tableMatch?.[1] ?? lineMatch?.[1] ?? null)
    if (value) return value
  }

  return null
}

function extractTitleName(candidate: CandidateSignal, evidence: EvidenceDocument): string | null {
  const title = evidence.title ?? candidate.hit.title
  const afterColon = title.split(':').pop()
  const cleaned = cleanValue(afterColon ?? title)

  if (!cleaned) return null

  const generic = /^(tdlr|tabs|project details|permit|search)$/i
  return generic.test(cleaned) ? null : cleaned
}

function extractDateFromParts(month: string, day: string, year: string): string {
  return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`
}

function extractSourceDate(text: string): string | null {
  const labeledDate = text.match(
    /\b(?:Registration|Issue|Issued|Filed|Filing|Application|Permit)\s*Date\s*:?\s*(\d{1,2})\/(\d{1,2})\/(\d{4})/i,
  )
  if (labeledDate) {
    return extractDateFromParts(labeledDate[1], labeledDate[2], labeledDate[3])
  }

  const isoDate = text.match(/\b(20\d{2})-(\d{2})-(\d{2})\b/)
  if (isoDate) return `${isoDate[1]}-${isoDate[2]}-${isoDate[3]}`

  const fallbackDate = text.match(/\b(\d{1,2})\/(\d{1,2})\/(20\d{2})\b/)
  if (fallbackDate) {
    return extractDateFromParts(fallbackDate[1], fallbackDate[2], fallbackDate[3])
  }

  return null
}

function extractCityState(text: string): string | null {
  const match = text.match(
    /\b([A-Z][A-Za-z .'-]{2,}),\s*(TX|Texas)\b/,
  )
  if (!match) return null

  const city = cleanValue(match[1])
  if (!city) return null

  return `${city}, TX`
}

function extractAddress(text: string): string | null {
  const labeled = extractLabeledValue(text, [
    'Location Address',
    'Project Address',
    'Address',
    'Site Address',
  ])

  if (labeled) return labeled

  const addressMatch = text.match(
    /\b\d{2,6}\s+[A-Za-z0-9 .'-]+,\s*[A-Z][A-Za-z .'-]+,\s*TX\s+\d{5}\b/,
  )

  return cleanValue(addressMatch?.[0] ?? null)
}

function extractProspect(
  candidate: CandidateSignal,
  evidence: EvidenceDocument,
): Cp19LiveOpportunity['prospect'] | null {
  const text = `${candidate.hit.title}\n${candidate.hit.snippet}\n${evidence.title ?? ''}\n${evidence.cleanedText}`
  const projectName = extractLabeledValue(text, [
    'Project Name',
    'Business Name',
    'Tenant Name',
    'Permit For',
    'Applicant',
  ])
  const facilityName = extractLabeledValue(text, ['Facility Name', 'Property Name'])
  const businessName = projectName ?? facilityName ?? extractTitleName(candidate, evidence)
  const address = extractAddress(text)
  const location = extractCityState(address ?? text)

  if (!businessName || !location) return null

  return {
    businessName,
    location,
    address,
  }
}

function excerptFromEvidence(text: string): string {
  const lines = text
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean)
  const preferred = lines.find((line) =>
    /\b(buildout|build-out|tenant improvement|renovation|alteration|remodel|construction|permit)\b/i.test(line),
  )
  const excerpt = preferred ?? lines[0] ?? 'Live evidence was hydrated by Firecrawl.'

  return excerpt.length > 240 ? `${excerpt.slice(0, 237).trim()}...` : excerpt
}

function inferVerticalFitLabel(text: string): CommercialCleaningVerticalFitLabel {
  if (/\boffice\b/i.test(text)) return 'New Office'
  if (/\b(final clean|final cleaning)\b/i.test(text)) return 'Final Clean'
  return CP19_VERTICAL_FIT_LABEL
}

function buildSearchTask(capturedAt: string, budget: BudgetEnvelope): SearchTask {
  return {
    workspaceId: CP19_WORKSPACE_ID,
    vertical: COMMERCIAL_CLEANING_VERTICAL_ID,
    signalType: CP19_SIGNAL_ID,
    engine: 'google_light',
    query: CP19_QUERY,
    location: { city: 'Dallas-Fort Worth', state: 'TX' },
    dateWindow: '45 days',
    budget,
  }
}

function candidateRank(candidate: CandidateSignal): number {
  const text = `${candidate.hit.title}\n${candidate.hit.snippet}\n${candidate.hit.url ?? ''}`
  let rank = 0

  if (/permit|TABS|building|construction/i.test(text)) rank += 3
  if (/buildout|build-out|tenant improvement|renovation|alteration|remodel/i.test(text)) rank += 3
  if (/Dallas|Fort Worth|Arlington|Plano|Frisco|Irving|Denton|Highland Village/i.test(text)) rank += 2
  if (candidate.hit.url) rank += 1

  return rank
}

function sortedCandidates(candidates: CandidateSignal[]): CandidateSignal[] {
  return [...candidates].sort((a, b) => candidateRank(b) - candidateRank(a))
}

function assertContract<T extends { ok: boolean; gateReasons: string[] }>(
  result: T,
  label: string,
): T {
  if (!result.ok) {
    throw new Error(`${label} failed: ${result.gateReasons.join(' ')}`)
  }

  return result
}

function makeReadyProof({
  capturedAt,
  evaluatedAt,
  calls,
  candidate,
  evidence,
  sourceDate,
}: {
  capturedAt: string
  evaluatedAt: string
  calls: Cp19ProviderCall[]
  candidate: CandidateSignal
  evidence: EvidenceDocument
  sourceDate: string
}): Cp19LiveOpportunity {
  const prospect = extractProspect(candidate, evidence)
  if (!prospect) {
    throw new Error('Live evidence did not include a usable prospect name and location.')
  }

  if (!hasValue(evidence.sourceUrl)) {
    throw new Error('CP19 requires a live source URL for the rendered proof.')
  }

  const sourceUrl = evidence.sourceUrl
  const evidenceSourceUrls = [sourceUrl]
  const providerRunIds = [
    liveRunId(candidate.providerRunId),
    liveRunId(evidence.providerRunId),
  ]
  const sourceExcerpt = excerptFromEvidence(evidence.cleanedText)
  const evidenceSummary =
    `${prospect.businessName} has source-linked live building-permit/buildout evidence for ${prospect.location}.`
  const verticalFitLabel = inferVerticalFitLabel(evidence.cleanedText)
  const whyNow =
    `A dated public buildout/permit record from ${sourceDate} creates a final or post-construction cleaning review window.`
  const scoreReason =
    'Live SerpApi discovery, Firecrawl evidence, dated source, approved BUILDOUT label, and provider lineage support the score.'

  const evidenceGate = assertContract(
    evaluateEvidenceGate({
      candidate,
      evidence: [evidence],
      requiredSignalType: CP19_SIGNAL_ID,
      minCleanedTextLength: 80,
    }),
    'CP19 evidence gate',
  )

  const classification = assertContract(
    classifyCommercialCleaningSignal({
      verticalId: COMMERCIAL_CLEANING_VERTICAL_ID,
      rawSignalId: candidate.hit.url ?? candidate.hit.title,
      proposedSignalLabel: CP19_SIGNAL_LABEL,
      proposedVerticalFitLabel: verticalFitLabel,
      proposedFreshnessLabel: makeFreshnessLabel(sourceDate, evaluatedAt),
      proposedSurface: 'default',
      evidenceSummary,
      evidenceSourceUrls,
      whyNowReasons: [whyNow],
    }),
    'CP19 Commercial Cleaning classification',
  )

  const scoring = assertContract(
    evaluateOpportunityScoring({
      leadKind: 'signal_backed_opportunity',
      signalType: CP19_SIGNAL_ID,
      signalLabel: CP19_SIGNAL_LABEL,
      evidenceSourceUrls,
      providerRunIds,
      evidenceSummary,
      whyNowReasons: [whyNow],
      freshnessWindow: '45 days',
      actionWindow: 'Final or post-construction cleaning quote window',
      signalObservedAt: sourceDateIso(sourceDate),
      publishedAt: evidence.publishedAt,
      scoreComponents: [
        {
          key: 'live_buildout_discovery',
          weight: 0.3,
          value: 1,
          reason: 'SerpApi returned a live building_permit candidate for the DFW proof slice.',
        },
        {
          key: 'live_source_linked_evidence',
          weight: 0.3,
          value: 1,
          reason: 'Firecrawl hydrated source-linked evidence with dated public content.',
        },
        {
          key: 'commercial_cleaning_fit',
          weight: 0.25,
          value: 1,
          reason: `Approved vertical-fit label "${verticalFitLabel}" maps the buildout to cleaning work.`,
        },
        {
          key: 'bounded_action_window',
          weight: 0.15,
          value: 0.85,
          reason: 'The dated buildout source supports a bounded quote-review window without sending outreach.',
        },
      ],
    }),
    'CP19 scoring',
  )

  const claimGuard = assertContract(
    evaluateClaimGuard({
      evaluatedAt,
      config: {
        approvedSignalLabels: APPROVED_COMMERCIAL_CLEANING_SIGNAL_LABELS,
        approvedVerticalFitLabels: APPROVED_COMMERCIAL_CLEANING_VERTICAL_FIT_LABELS,
        maxSignalAgeDays: 45,
      },
      artifact: {
        workspaceId: CP19_WORKSPACE_ID,
        leadKind: 'signal_backed_opportunity',
        signalLabel: CP19_SIGNAL_LABEL,
        verticalFitLabel,
        claimsUrgency: true,
        score: scoring.opportunityUrgencyScore ?? 0,
        scoreReasons: [
          {
            code: 'live_buildout_discovery',
            text: scoreReason,
            evidenceIndexes: [0],
          },
        ],
        recommendedAction: 'Draft outreach',
        claims: [
          {
            kind: 'source_date',
            text: `The live source includes a public building-permit/buildout date of ${sourceDate}.`,
            evidenceIndexes: [0],
          },
          {
            kind: 'cleaning_fit',
            text: sourceExcerpt,
            evidenceIndexes: [0],
          },
        ],
        evidence: [evidence],
      },
    }),
    'CP19 Claim Guard',
  )

  return {
    status: 'ready',
    providerMode: 'LIVE',
    providerModeReason:
      'SerpApi discovery and Firecrawl evidence hydration both completed with non-recorded provider run IDs.',
    prospect,
    evidence: {
      signalId: CP19_SIGNAL_ID,
      signalLabel: CP19_SIGNAL_LABEL,
      verticalFitLabel,
      sourceUrl,
      sourceDate,
      sourceTitle: evidence.title ?? candidate.hit.title,
      sourceExcerpt,
    },
    score: {
      value: scoring.opportunityUrgencyScore ?? 0,
      reason: scoreReason,
      whyNow,
    },
    lineage: {
      searchProvider: 'serpapi',
      searchProviderRunId: providerRunIds[0],
      evidenceProvider: 'firecrawl',
      evidenceProviderRunId: providerRunIds[1],
      liveFingerprint: replayFingerprint(evidence.cleanedText),
    },
    nextAction: {
      label: 'Draft outreach',
      detail:
        'Prepare an unsent outreach draft that references the live source URL and final/post-construction clean window.',
    },
    proof: {
      capturedAt,
      evaluatedAt,
      searchQuery: CP19_QUERY,
      market: 'DFW',
      providerCalls: calls,
      estimatedCostUsd: providerCost(calls),
      evidenceGateReasons: evidenceGate.gateReasons,
      classificationGateReasons: classification.gateReasons,
      scoringGateReasons: scoring.gateReasons,
      claimGuardReasons: claimGuard.gateReasons,
      replayableLineage:
        'Live run is replayable from the visible search query, source URL, source date, provider run IDs, and Firecrawl evidence fingerprint. No DB/schema write is performed in CP19.',
    },
  }
}

export async function getCp19LiveProof(): Promise<Cp19ProofResult> {
  const capturedAt = nowIso()
  const missingEnv = missingProviderEnv()

  if (missingEnv.length > 0) {
    return blockedProof({
      blockerCode: 'missing_provider_keys',
      blocker:
        'Live SerpApi and Firecrawl keys are required for CP19. There is no recorded-real fallback.',
      capturedAt,
      evaluatedAt: nowIso(),
      calls: [],
      missingEnv,
    })
  }

  const serpApiKey = firstPresentEnv(
    process.env.SERPAPI_API_KEY,
    process.env.SERPAPI_KEY,
  )
  const firecrawlKey = process.env.FIRECRAWL_API_KEY?.trim()

  if (!serpApiKey || !firecrawlKey) {
    return blockedProof({
      blockerCode: 'missing_provider_keys',
      blocker:
        'Live provider keys were not available after environment validation.',
      capturedAt,
      evaluatedAt: nowIso(),
      calls: [],
      missingEnv,
    })
  }

  const budget = buildBudget(CP19_WORKSPACE_ID)
  const calls: Cp19ProviderCall[] = []
  const searchProvider = new SerpApiSearchProvider(serpApiKey)
  const searchResult = await searchProvider.discover(
    buildSearchTask(capturedAt, budget),
  )

  calls.push({
    provider: 'serpapi',
    status: searchResult.error ? 'error' : 'ok',
    runId: searchResult.providerRunId,
    detail:
      searchResult.error?.message ??
      `SerpApi returned ${searchResult.candidates.length} candidate(s).`,
    estimatedCostUsd: searchResult.costEstimateUsd,
  })

  if (searchResult.error) {
    return blockedProof({
      blockerCode: 'search_provider_failed',
      blocker: searchResult.error.message,
      capturedAt,
      evaluatedAt: nowIso(),
      calls,
    })
  }

  const candidates = sortedCandidates(
    searchResult.candidates.filter((candidate) => hasValue(candidate.hit.url)),
  )

  if (candidates.length === 0) {
    return blockedProof({
      blockerCode: 'no_live_candidates',
      blocker: 'SerpApi returned no live candidates with source URLs.',
      capturedAt,
      evaluatedAt: nowIso(),
      calls,
    })
  }

  const evidenceProvider = new FirecrawlEvidenceProvider(firecrawlKey)
  let lastBlocker = 'No live candidate produced surfaceable dated evidence.'

  for (const candidate of candidates) {
    if (!candidate.hit.url) continue

    const evidenceResult = await evidenceProvider.scrapeUrl({
      url: candidate.hit.url,
      workspaceId: CP19_WORKSPACE_ID,
      budget,
    })

    calls.push({
      provider: 'firecrawl',
      status: evidenceResult.error ? 'error' : 'ok',
      runId: evidenceResult.providerRunId,
      detail:
        evidenceResult.error?.message ??
        `Firecrawl hydrated evidence for ${candidate.hit.url}.`,
      sourceUrl: candidate.hit.url,
      estimatedCostUsd: evidenceResult.error ? 0 : 0.01,
    })

    if (evidenceResult.error || !evidenceResult.doc) {
      lastBlocker =
        evidenceResult.error?.message ??
        'Firecrawl did not return a hydrated evidence document.'
      continue
    }

    const sourceDate = extractSourceDate(evidenceResult.doc.cleanedText)
    if (!sourceDate) {
      lastBlocker =
        'Live evidence did not include a source date required for CP19 Claim Guard proof.'
      continue
    }

    const evidence: EvidenceDocument = {
      ...evidenceResult.doc,
      publishedAt: sourceDateIso(sourceDate),
    }

    try {
      return makeReadyProof({
        capturedAt,
        evaluatedAt: nowIso(),
        calls,
        candidate,
        evidence,
        sourceDate,
      })
    } catch (error) {
      lastBlocker =
        error instanceof Error
          ? error.message
          : 'Live evidence failed a CP19 deterministic gate.'
    }
  }

  return blockedProof({
    blockerCode:
      calls.some((call) => call.provider === 'firecrawl')
        ? 'no_surfaceable_live_opportunity'
        : 'evidence_provider_failed',
    blocker: lastBlocker,
    capturedAt,
    evaluatedAt: nowIso(),
    calls,
  })
}
