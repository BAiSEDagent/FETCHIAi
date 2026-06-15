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
import type { EvidenceDocument } from '@/lib/providers/evidence-provider'
import type { CandidateSignal, SearchTask } from '@/lib/providers/search-provider'
import type { BudgetEnvelope } from '@/lib/providers/contracts'

export const CP18_PROOF_ROUTE = '/internal/cp18'
export const CP18_SIGNAL_ID = 'building_permit'
export const CP18_SIGNAL_LABEL = 'BUILDOUT' satisfies CommercialCleaningSignalLabel
export const CP18_VERTICAL_FIT_LABEL =
  'Post-Construction Clean' satisfies CommercialCleaningVerticalFitLabel

type Cp18ProviderMode = 'live' | 'recorded-real'

export type Cp18ProofOpportunity = {
  providerMode: Cp18ProviderMode
  providerModeReason: string
  prospect: {
    businessName: string
    location: string
    address: string
  }
  evidence: {
    signalId: typeof CP18_SIGNAL_ID
    signalLabel: typeof CP18_SIGNAL_LABEL
    verticalFitLabel: typeof CP18_VERTICAL_FIT_LABEL
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
    replayFingerprint: string
  }
  nextAction: {
    label: 'Draft outreach'
    detail: string
  }
  proof: {
    capturedAt: string
    evaluatedAt: string
    searchQuery: string
    market: 'DFW'
    sourceCaptureMethod: string
    estimatedCostUsd: number
    evidenceGateReasons: string[]
    classificationGateReasons: string[]
    scoringGateReasons: string[]
    claimGuardReasons: string[]
    replayableStoragePath: string
  }
}

const CP18_WORKSPACE_ID = 'cp18-admin-proof'
const CP18_CAPTURED_AT = '2026-06-15T06:15:00.000Z'
const CP18_EVALUATED_AT = '2026-06-15T12:00:00.000Z'
const CP18_SOURCE_DATE = '2026-05-11'
const CP18_SOURCE_URL =
  'https://www.tdlr.texas.gov/TABS/Search/Project/TABS2026019866'
const CP18_CANONICAL_URL =
  'https://www.tdlr.texas.gov/TABS/Projects/TABS2026019866'
const CP18_QUERY =
  'site:tdlr.texas.gov/TABS TABS2026019866 Hudson House Highland Village'

const RECORDED_TDLR_TEXT = [
  'Texas Department of Licensing and Regulation Architectural Barriers Project Details Page.',
  'Project #: TABS2026019866. Registration Date: 5/11/2026.',
  'Project Name: Hudson House. Facility Name: The Shops at Highland Village.',
  'Location Address: 3640 Justin RD - Suite 185, Highland Village, TX 75077. Location County: Denton.',
  'Start Date: 7/1/2026. Completion Date: 11/1/2026. Estimated Cost: $945,850.',
  'Type of Work: Renovation/Alteration. Scope of Work: Remodel of an existing tenant space for a new restaurant - 5,965 sqft.',
  'Square Footage: 5,965 ft2. Current Status: Project Registered.',
].join('\n')

function hasValue(value: string | undefined): value is string {
  return typeof value === 'string' && value.trim().length > 0
}

function replayFingerprint(text: string): string {
  return createHash('sha256').update(text).digest('hex').slice(0, 16)
}

function sourceDateIso(date: string): string {
  return `${date}T00:00:00.000Z`
}

function recordedSearchRunId(): string {
  return `recorded-serpapi:TABS2026019866:${CP18_CAPTURED_AT.slice(0, 10)}`
}

function recordedEvidenceRunId(): string {
  return `recorded-firecrawl:TABS2026019866:${CP18_CAPTURED_AT.slice(0, 10)}`
}

function buildBudget(workspaceId: string): BudgetEnvelope {
  return {
    workspaceId,
    maxProviderCalls: 2,
    maxSpendEstimateUsd: 0.03,
    triggeredBy: 'admin_replay',
  }
}

function buildCandidate(providerRunId: string): CandidateSignal {
  return {
    providerRunId,
    workspaceId: CP18_WORKSPACE_ID,
    vertical: COMMERCIAL_CLEANING_VERTICAL_ID,
    signalType: CP18_SIGNAL_ID,
    engine: 'google_light',
    query: CP18_QUERY,
    discoveredAt: CP18_CAPTURED_AT,
    hit: {
      title: 'TDLR TABS - Project Details: Hudson House',
      url: CP18_SOURCE_URL,
      sourceName: 'Texas Department of Licensing and Regulation',
      snippet:
        'Hudson House project TABS2026019866 registered for renovation/alteration at The Shops at Highland Village.',
      rank: 1,
      rawEngineMetadata: {
        providerMode: 'recorded-real',
        canonicalUrl: CP18_CANONICAL_URL,
      },
    },
  }
}

function buildEvidence(providerRunId: string, cleanedText = RECORDED_TDLR_TEXT): EvidenceDocument {
  return {
    providerRunId,
    sourceUrl: CP18_SOURCE_URL,
    sourceName: 'Texas Department of Licensing and Regulation',
    fetchedAt: CP18_CAPTURED_AT,
    publishedAt: sourceDateIso(CP18_SOURCE_DATE),
    title: 'TDLR TABS Project Details - Hudson House',
    cleanedText,
    structured: {
      projectNumber: 'TABS2026019866',
      registrationDate: '5/11/2026',
      projectName: 'Hudson House',
      facilityName: 'The Shops at Highland Village',
      address: '3640 Justin RD - Suite 185',
      city: 'Highland Village',
      state: 'TX',
      postalCode: '75077',
      county: 'Denton',
      startDate: '7/1/2026',
      completionDate: '11/1/2026',
      estimatedCost: '$945,850',
      typeOfWork: 'Renovation/Alteration',
      scopeOfWork:
        'Remodel of an existing tenant space for a new restaurant - 5,965 sqft',
      squareFootage: 5965,
      status: 'Project Registered',
    },
    rawProviderMetadata: {
      providerMode: 'recorded-real',
      captureMethod: `curl -L '${CP18_SOURCE_URL}'`,
      canonicalUrl: CP18_CANONICAL_URL,
      capturedAt: CP18_CAPTURED_AT,
    },
  }
}

function extractSourceDate(text: string): string {
  const match = text.match(/Registration Date:\s*(\d{1,2})\/(\d{1,2})\/(\d{4})/)
  if (!match) return CP18_SOURCE_DATE

  const [, month, day, year] = match
  return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`
}

function makeFreshnessLabel(sourceDate: string): string {
  const evaluatedAt = Date.parse(CP18_EVALUATED_AT)
  const sourceAt = Date.parse(sourceDateIso(sourceDate))
  const days = Math.max(0, Math.floor((evaluatedAt - sourceAt) / 86_400_000))

  if (days === 0) return 'Just now'
  if (days === 1) return 'Yesterday'
  if (days < 14) return `${days}d ago`
  return `${Math.max(1, Math.floor(days / 7))}w ago`
}

async function getLiveCandidate(): Promise<{
  candidate: CandidateSignal
  evidence: EvidenceDocument
  providerModeReason: string
  estimatedCostUsd: number
} | null> {
  const serpApiKey = process.env.SERPAPI_API_KEY ?? process.env.SERPAPI_KEY
  const firecrawlKey = process.env.FIRECRAWL_API_KEY

  if (!hasValue(serpApiKey) || !hasValue(firecrawlKey)) return null

  const budget = buildBudget(CP18_WORKSPACE_ID)
  const task: SearchTask = {
    workspaceId: CP18_WORKSPACE_ID,
    vertical: COMMERCIAL_CLEANING_VERTICAL_ID,
    signalType: CP18_SIGNAL_ID,
    engine: 'google_light',
    query: CP18_QUERY,
    location: { city: 'Dallas-Fort Worth', state: 'TX', county: 'Denton' },
    dateWindow: 'CP18 DFW building_permit slice',
    budget,
  }

  const searchResult = await new SerpApiSearchProvider(serpApiKey).discover(task)
  const candidate =
    searchResult.candidates.find((item) =>
      item.hit.url?.includes('TABS2026019866'),
    ) ?? searchResult.candidates.find((item) => item.hit.url?.includes('tdlr.texas.gov'))

  if (!candidate?.hit.url) return null

  const evidenceResult = await new FirecrawlEvidenceProvider(firecrawlKey).scrapeUrl({
    url: candidate.hit.url,
    workspaceId: CP18_WORKSPACE_ID,
    budget,
  })

  if (!evidenceResult.doc) return null

  const sourceDate = extractSourceDate(evidenceResult.doc.cleanedText)
  return {
    candidate,
    evidence: {
      ...evidenceResult.doc,
      publishedAt: sourceDateIso(sourceDate),
      structured: {
        ...(evidenceResult.doc.structured ?? {}),
        sourceDate,
      },
    },
    providerModeReason: 'Live SerpApi discovery and Firecrawl hydration both returned usable CP18 evidence.',
    estimatedCostUsd: searchResult.costEstimateUsd + 0.01,
  }
}

function assertCp18Contract<T extends { ok: boolean; gateReasons: string[] }>(
  result: T,
  label: string,
): T {
  if (!result.ok) {
    throw new Error(`${label} failed: ${result.gateReasons.join(' ')}`)
  }
  return result
}

export async function getCp18ProofOpportunity(): Promise<Cp18ProofOpportunity> {
  const live = await getLiveCandidate()
  const providerMode: Cp18ProviderMode = live ? 'live' : 'recorded-real'
  const candidate = live?.candidate ?? buildCandidate(recordedSearchRunId())
  const evidence = live?.evidence ?? buildEvidence(recordedEvidenceRunId())
  const sourceDate = extractSourceDate(evidence.cleanedText)
  const evidenceSourceUrls = [evidence.sourceUrl].filter(hasValue)
  const providerRunIds = [candidate.providerRunId, evidence.providerRunId]
  const evidenceSummary =
    'TDLR registered Hudson House project TABS2026019866 for a 5,965 sqft tenant-space remodel at The Shops at Highland Village.'
  const whyNow =
    'The registered restaurant remodel starts July 1 and completes November 1, creating a post-construction/final-clean window before opening.'
  const scoreReason =
    'Registered TDLR buildout, source-linked project record, provider lineage, and a dated construction window support timely cleaning outreach.'

  const evidenceGate = assertCp18Contract(
    evaluateEvidenceGate({
      candidate,
      evidence: [evidence],
      requiredSignalType: CP18_SIGNAL_ID,
      minCleanedTextLength: 80,
    }),
    'CP18 evidence gate',
  )

  const classification = assertCp18Contract(
    classifyCommercialCleaningSignal({
      verticalId: COMMERCIAL_CLEANING_VERTICAL_ID,
      rawSignalId: 'TABS2026019866',
      proposedSignalLabel: CP18_SIGNAL_LABEL,
      proposedVerticalFitLabel: CP18_VERTICAL_FIT_LABEL,
      proposedFreshnessLabel: makeFreshnessLabel(sourceDate),
      proposedSurface: 'default',
      evidenceSummary,
      evidenceSourceUrls,
      whyNowReasons: [whyNow],
    }),
    'CP18 Commercial Cleaning classification',
  )

  const scoring = assertCp18Contract(
    evaluateOpportunityScoring({
      leadKind: 'signal_backed_opportunity',
      signalType: CP18_SIGNAL_ID,
      signalLabel: CP18_SIGNAL_LABEL,
      evidenceSourceUrls,
      providerRunIds,
      evidenceSummary,
      whyNowReasons: [whyNow],
      freshnessWindow: '45 days',
      actionWindow: 'Pre-completion cleaning quote window',
      signalObservedAt: sourceDateIso(sourceDate),
      publishedAt: evidence.publishedAt,
      scoreComponents: [
        {
          key: 'dated_buildout_record',
          weight: 0.35,
          value: 1,
          reason: 'TDLR registration date and project number are present.',
        },
        {
          key: 'commercial_cleaning_fit',
          weight: 0.3,
          value: 1,
          reason: 'Tenant remodel for a 5,965 sqft restaurant maps to post-construction clean.',
        },
        {
          key: 'source_and_lineage',
          weight: 0.2,
          value: 1,
          reason: 'SearchProvider and EvidenceProvider run IDs are present.',
        },
        {
          key: 'action_window',
          weight: 0.15,
          value: 0.85,
          reason: 'Construction start and completion dates define the outreach window.',
        },
      ],
    }),
    'CP18 scoring',
  )

  const claimGuard = assertCp18Contract(
    evaluateClaimGuard({
      evaluatedAt: CP18_EVALUATED_AT,
      config: {
        approvedSignalLabels: APPROVED_COMMERCIAL_CLEANING_SIGNAL_LABELS,
        approvedVerticalFitLabels: APPROVED_COMMERCIAL_CLEANING_VERTICAL_FIT_LABELS,
        maxSignalAgeDays: 45,
      },
      artifact: {
        workspaceId: CP18_WORKSPACE_ID,
        leadKind: 'signal_backed_opportunity',
        signalLabel: CP18_SIGNAL_LABEL,
        verticalFitLabel: CP18_VERTICAL_FIT_LABEL,
        claimsUrgency: true,
        score: scoring.opportunityUrgencyScore ?? 0,
        scoreReasons: [
          {
            code: 'dated_buildout_record',
            text: scoreReason,
            evidenceIndexes: [0],
          },
        ],
        recommendedAction: 'Draft outreach',
        claims: [
          {
            kind: 'project_registration',
            text: 'Project TABS2026019866 was registered on 5/11/2026.',
            evidenceIndexes: [0],
          },
          {
            kind: 'cleaning_fit',
            text: 'Scope of work is a remodel of an existing tenant space for a new restaurant - 5,965 sqft.',
            evidenceIndexes: [0],
          },
        ],
        evidence: [evidence],
      },
    }),
    'CP18 Claim Guard',
  )

  return {
    providerMode,
    providerModeReason:
      live?.providerModeReason ??
      'Live SerpApi/Firecrawl keys were not present; using recorded-real replay captured from the public TDLR project page.',
    prospect: {
      businessName: 'Hudson House',
      location: 'Highland Village, TX',
      address: '3640 Justin RD - Suite 185, Highland Village, TX 75077',
    },
    evidence: {
      signalId: CP18_SIGNAL_ID,
      signalLabel: CP18_SIGNAL_LABEL,
      verticalFitLabel: CP18_VERTICAL_FIT_LABEL,
      sourceUrl: evidence.sourceUrl ?? CP18_SOURCE_URL,
      sourceDate,
      sourceTitle: evidence.title ?? 'TDLR TABS Project Details - Hudson House',
      sourceExcerpt:
        'Remodel of an existing tenant space for a new restaurant - 5,965 sqft. Start Date: 7/1/2026. Completion Date: 11/1/2026.',
    },
    score: {
      value: scoring.opportunityUrgencyScore ?? 0,
      reason: scoreReason,
      whyNow,
    },
    lineage: {
      searchProvider: 'serpapi',
      searchProviderRunId: candidate.providerRunId,
      evidenceProvider: 'firecrawl',
      evidenceProviderRunId: evidence.providerRunId,
      replayFingerprint: replayFingerprint(evidence.cleanedText),
    },
    nextAction: {
      label: 'Draft outreach',
      detail:
        'Prepare a cleaning quote opener that references the TDLR buildout and final/post-construction clean window. Do not send.',
    },
    proof: {
      capturedAt: CP18_CAPTURED_AT,
      evaluatedAt: CP18_EVALUATED_AT,
      searchQuery: CP18_QUERY,
      market: 'DFW',
      sourceCaptureMethod:
        live ? 'Live SerpApi discovery + Firecrawl scrape' : `curl -L '${CP18_SOURCE_URL}'`,
      estimatedCostUsd: live?.estimatedCostUsd ?? 0,
      evidenceGateReasons: evidenceGate.gateReasons,
      classificationGateReasons: classification.gateReasons,
      scoringGateReasons: scoring.gateReasons,
      claimGuardReasons: claimGuard.gateReasons,
      replayableStoragePath:
        'Existing schema can replay this via signals.raw_data/parsed_data for source, labels, and lineage; prospects for business/location; opportunities for score/why_now/status.',
    },
  }
}
