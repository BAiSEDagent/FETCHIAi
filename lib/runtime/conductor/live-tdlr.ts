import { createHash } from 'node:crypto'
import type { EvidenceDocument } from '@/lib/providers/evidence-provider'
import type { CandidateSignal } from '@/lib/providers/search-provider'
import { FirecrawlEvidenceProvider } from '@/lib/providers/firecrawl-evidence-provider'
import { evaluateEvidenceGate } from '@/lib/gates/evidence-gate'
import { evaluateClaimGuard, type ClaimGuardDecision } from '@/lib/gates/claim-guard'
import {
  APPROVED_COMMERCIAL_CLEANING_SIGNAL_LABELS,
  APPROVED_COMMERCIAL_CLEANING_VERTICAL_FIT_LABELS,
  COMMERCIAL_CLEANING_VERTICAL_ID,
  classifyCommercialCleaningSignal,
  type CommercialCleaningVerticalFitLabel,
} from '@/lib/classification/commercial-cleaning-classification-contract'
import { evaluateOpportunityScoring } from '@/lib/scoring/opportunity-scoring-contract'
import { evaluateProspectScoring } from '@/lib/scoring/prospect-scoring-contract'
import { validateProspectEvidencePacket } from '@/lib/prospect-mining/contracts'
import type { BudgetEnvelope, SignalType } from '@/lib/providers/contracts'
import {
  createNoopCp21aConductorPersister,
  type Cp21aConductorPersister,
} from './persistence'
import type {
  Cp21aConductorRunReport,
  Cp21aEvidencePlan,
  Cp21aFailedCandidate,
  Cp21aLaneCounts,
  Cp21aLineage,
  Cp21aOpportunityPlan,
  Cp21aProspectPlan,
  Cp21aRunRequest,
  Cp21aScorePlan,
  Cp21aScoreReasonPlan,
  Cp21aStage,
  Cp21aStageCounts,
} from './types'

export const CP21C_WORKSPACE_PREFIX = 'cp21c-live-tdlr-dfw-' as const
export const CP21C_SOURCE_PATH = 'tdlr_tabs_source_adapter' as const
export const CP21C_MARKET = 'DFW' as const
export const CP21C_VERTICAL = 'commercial_cleaning' as const
export const CP21C_SIGNAL_TYPE = 'building_permit' satisfies SignalType
export const CP21C_SIGNAL_LABEL = 'BUILDOUT' as const

const TDLR_SEARCH_PROJECTS_ENDPOINT =
  'https://www.tdlr.texas.gov/TABS/Search/SearchProjects'
const TABS_PROJECT_URL_BASE = 'https://www.tdlr.texas.gov/TABS/Search/Project/'
const TDLR_PROJECT_STATUS_REGISTERED = '3008'
const TDLR_DATA_VERSION_TABS = '900001'
const TDLR_RESULT_LENGTH = '25'
const TDLR_RENOVATION_ALTERATION = 9002
const SOURCE_WINDOW_DAYS = 45
const MAX_SOURCE_ADAPTER_LISTING_CALLS = 9
const MAX_RAW_RECORDS_CONSIDERED = 50
const MAX_FIRECRAWL_HYDRATIONS = 15
const MAX_PERSISTED_LIVE_ITEMS = 10
const MAX_ACCEPTED_OPPORTUNITIES = 5
const MAX_PROSPECT_OR_REVIEW_ITEMS = 5
const MAX_ESTIMATED_PROVIDER_SPEND_USD = 0.25
const FIRECRAWL_SCRAPE_COST_USD = 0.01

const DFW_COUNTIES = [
  { id: '2057', name: 'Dallas' },
  { id: '2220', name: 'Tarrant' },
  { id: '2043', name: 'Collin' },
  { id: '2061', name: 'Denton' },
  { id: '2199', name: 'Rockwall' },
  { id: '2129', name: 'Kaufman' },
  { id: '2070', name: 'Ellis' },
  { id: '2126', name: 'Johnson' },
  { id: '2184', name: 'Parker' },
] as const

const RESIDENTIAL_DISQUALIFIER_PATTERN =
  /\b(single[-\s]family|single family residential|residential subdivision|residential only|condominiums?|condos?|apartment units?|townhomes?|private residence|homeowner|dwelling)\b/i
const SIDEWALK_CURB_PATTERN = /\b(sidewalk|curb ramps?)\b/i
const RESIDENTIAL_CONTEXT_PATTERN =
  /\b(residential|single[-\s]family|subdivision|homeowner|dwelling)\b/i
const COMMERCIAL_FIT_PATTERN =
  /\b(commercial|tenant improvement|tenant finish(?:out)?|finish out|buildout|build-out|renovation|alteration|office|retail|restaurant|warehouse|shell|medical|suite|remodel|hotel|clinic|studio|facility|business|store|salon|gym)\b/i
const WEAK_FIT_PATTERN =
  /\b(public right of way|sidewalk only|curb ramp only|parking lot only|roof only|sign only|fence only|pool only|monument only)\b/i

type DfwCounty = (typeof DFW_COUNTIES)[number]

type TdlrProjectRow = {
  ProjectNumber?: unknown
  ProjectName?: unknown
  ProjectCreatedOn?: unknown
  ProjectStatus?: unknown
  FacilityName?: unknown
  City?: unknown
  County?: unknown
  TypeOfWork?: unknown
  EstimatedCost?: unknown
  EstimatedStartDate?: unknown
  EstimatedEndDate?: unknown
  [key: string]: unknown
}

type TdlrSearchProjectsResponse = {
  recordsTotal?: unknown
  recordsFiltered?: unknown
  data?: unknown
}

type TdlrProjectCandidate = {
  projectNumber: string
  projectName: string
  facilityName: string | null
  cityId: number | null
  county: DfwCounty
  typeOfWork: number | null
  typeOfWorkLabel: string
  estimatedCost: number | null
  registrationDate: string
  estimatedStartDate: string | null
  estimatedEndDate: string | null
  sourceUrl: string
  listingUrl: string
  sourceAdapterRunId: string
  raw: TdlrProjectRow
}

export type Cp21cSourceAdapterCall = {
  adapter: 'tdlr-tabs'
  status: 'ok' | 'error'
  runId: string
  county: string
  url: string
  detail: string
  recordsReturned: number
  candidatesAccepted: number
}

export type Cp21cHydratedCandidate = {
  project: TdlrProjectCandidate
  candidate: CandidateSignal
  evidence: EvidenceDocument
  sourceDate: string
}

export type Cp21cCachedCandidateSet = {
  evaluatedAt: string
  sourceAdapterCalls: Cp21cSourceAdapterCall[]
  rawRecordsReturned: number
  discoveredCandidates: number
  dedupedCandidates: number
  hydratedCandidates: Cp21cHydratedCandidate[]
}

export type Cp21cCandidateFinalDisposition =
  | 'persisted_opportunity'
  | 'persisted_prospect'
  | 'persisted_needs_review'
  | 'demoted_not_persisted'
  | 'failed_not_persisted'
  | 'blocked_not_persisted'

export type Cp21cCandidateDisposition = {
  projectNumber: string
  sourceUrl: string
  sourceDate: string
  registrationDate: string
  county: string
  firecrawlStatus: 'ok'
  finalDisposition: Cp21cCandidateFinalDisposition
  lane: keyof Cp21aLaneCounts | null
  failureStage: Cp21aStage | null
  demotionStage: Cp21aStage | null
  failureReason: string | null
  demotionReason: string | null
  stableFailureFingerprint: string | null
  stableDispositionFingerprint: string
  includedInLiveRecordsPersisted: boolean
  includedInCp20cReadbackCounts: boolean
  proofOnlyFaultInjection: boolean
  providerCostUsd: number
}

export type Cp21cScoreComponentReport = {
  key: 'fit' | 'freshness' | 'contact'
  label: string
  score: number
  maxScore: number
  evidenceId: string
  reason: string
}

export type Cp21cPersistedItemAudit = {
  candidateId: string
  scoreTotal: number
  fitScore: number
  freshnessScore: number
  contactScore: number
  scoreMaxPossible: number
  scoreMathConsistent: boolean
  scoreTrusted: boolean
  scoreReasonSubstance: {
    evidenceId: string
    text: string
    substantive: boolean
  }[]
  scoreComponents: Cp21cScoreComponentReport[]
  buyerIdentityRaw: string
  buyerIdentitySafe: boolean
  buyerIdentityIssue: string | null
  contactRouteCount: number
  contactRouteStatus: 'present' | 'missing' | 'unresolved' | 'contaminated_in_identity'
  leadActionabilityReady: boolean
  nextCheckpointNeeded: 'entity_resolution_contact_routing' | null
  defensibleSourceBackedOpportunity: boolean
  defensibleActionableLead: boolean
}

export type Cp21cLiveMetrics = {
  sourceAdapterListingCalls: number
  rawRecordsReturned: number
  discoveredCandidates: number
  dedupedCandidates: number
  hydratedCandidates: number
  liveRecordsPersisted: number
  opportunityGradeSignalAvailable: boolean
  noOpportunityGradeSignalReason: string | null
  persistedOpportunities: number
  persistedProspects: number
  persistedNeedsReview: number
  failedCandidates: number
  demotedCandidates: number
  blockedCandidates: number
  hydratedCandidateDispositionCount: number
  dispositionAccountingComplete: boolean
  noSilentHydratedCandidateDrops: boolean
  providerCalls: number
  sourceAdapterCalls: number
  firecrawlCalls: number
  serpApiCalls: 0
  estimatedProviderSpendUsd: number
  budgetExceeded: boolean
  budgetAbortTriggered: boolean
  perCandidateErrorsIsolated: boolean
  liveRecords: boolean
}

export type Cp21cLiveConductorResult = {
  report: Cp21aConductorRunReport
  metrics: Cp21cLiveMetrics
  cachedCandidateSet: Cp21cCachedCandidateSet
  candidateDispositions: Cp21cCandidateDisposition[]
  persistedItemAudits: Cp21cPersistedItemAudit[]
}

type Cp21cProviderUsage = {
  sourceAdapterCalls: number
  firecrawlCalls: number
  estimatedProviderSpendUsd: number
  budgetAbortTriggered: boolean
}

function nowIso(): string {
  return new Date().toISOString()
}

function dateOnly(value: Date): string {
  return value.toISOString().slice(0, 10)
}

function addDays(value: Date, days: number): Date {
  const copy = new Date(value)
  copy.setUTCDate(copy.getUTCDate() + days)
  return copy
}

function parseDateMs(value: string): number {
  const parsed = Date.parse(value)
  return Number.isNaN(parsed) ? 0 : parsed
}

function sourceDateIso(date: string): string {
  return `${date}T00:00:00.000Z`
}

function formatTdlrDate(value: Date): string {
  const month = value.getUTCMonth() + 1
  const day = value.getUTCDate()
  const year = value.getUTCFullYear()
  return `${month.toString().padStart(2, '0')}/${day
    .toString()
    .padStart(2, '0')}/${year}`
}

function sourceWindow(evaluatedAt: string): { start: Date; end: Date } {
  const end = new Date(evaluatedAt)
  const start = addDays(end, -SOURCE_WINDOW_DAYS)
  return { start, end }
}

function sourceAdapterRunId(countyId: string): string {
  return `tdlr-tabs:${Date.now()}:${countyId}:${Math.random()
    .toString(36)
    .slice(2, 8)}`
}

function hashText(value: string): string {
  return createHash('sha256').update(value).digest('hex')
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Candidate stage failed.'
}

function stringValue(value: unknown): string | null {
  return typeof value === 'string' && value.trim().length > 0
    ? value.trim()
    : null
}

function numberValue(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string' && value.trim().length > 0) {
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : null
  }
  return null
}

function sourceDateFromUnknown(value: unknown): string | null {
  const raw = stringValue(value)
  if (!raw) return null
  const parsed = new Date(raw)
  if (Number.isNaN(parsed.getTime())) return null
  return dateOnly(parsed)
}

function typeOfWorkLabel(typeOfWork: number | null): string {
  switch (typeOfWork) {
    case 9001:
      return 'New Construction'
    case 9002:
      return 'Renovation/Alteration'
    case 9003:
      return 'Additions to Existing Building'
    case 9004:
      return 'Historic Preservation'
    case 9005:
      return 'Public Right of Way'
    default:
      return 'Unknown'
  }
}

function buildTdlrListingUrl(county: DfwCounty, evaluatedAt: string): string {
  const { start, end } = sourceWindow(evaluatedAt)
  const params = new URLSearchParams({
    LocationCounty: county.id,
    RegistrationDateBegin: formatTdlrDate(start),
    RegistrationDateEnd: formatTdlrDate(end),
    ProjectStatus: TDLR_PROJECT_STATUS_REGISTERED,
    DataVersionId: TDLR_DATA_VERSION_TABS,
    start: '0',
    length: TDLR_RESULT_LENGTH,
  })

  return `${TDLR_SEARCH_PROJECTS_ENDPOINT}?${params.toString()}`
}

function normalizeTdlrProjectRow(
  raw: unknown,
  county: DfwCounty,
  listingUrl: string,
  runId: string,
): TdlrProjectCandidate | null {
  if (typeof raw !== 'object' || raw === null) return null

  const row = raw as TdlrProjectRow
  const projectNumber = stringValue(row.ProjectNumber)
  const projectName = stringValue(row.ProjectName)
  const registrationDate = sourceDateFromUnknown(row.ProjectCreatedOn)
  if (!projectNumber || !projectName || !registrationDate) return null
  if (!/^TABS20\d+$/i.test(projectNumber)) return null

  const countyId = numberValue(row.County)
  if (countyId?.toString() !== county.id) return null

  const typeOfWork = numberValue(row.TypeOfWork)
  const normalizedProjectNumber = projectNumber.toUpperCase()

  return {
    projectNumber: normalizedProjectNumber,
    projectName,
    facilityName: stringValue(row.FacilityName),
    cityId: numberValue(row.City),
    county,
    typeOfWork,
    typeOfWorkLabel: typeOfWorkLabel(typeOfWork),
    estimatedCost: numberValue(row.EstimatedCost),
    registrationDate,
    estimatedStartDate: sourceDateFromUnknown(row.EstimatedStartDate),
    estimatedEndDate: sourceDateFromUnknown(row.EstimatedEndDate),
    sourceUrl: `${TABS_PROJECT_URL_BASE}${normalizedProjectNumber}`,
    listingUrl,
    sourceAdapterRunId: runId,
    raw: row,
  }
}

function normalizedProjectText(project: TdlrProjectCandidate): string {
  return [
    project.projectNumber,
    project.projectName,
    project.facilityName ?? '',
    project.county.name,
    project.typeOfWorkLabel,
    project.registrationDate,
    project.estimatedStartDate ?? '',
    project.estimatedEndDate ?? '',
  ].join('\n')
}

function isWithinSourceWindow(sourceDate: string, evaluatedAt: string): boolean {
  const sourceMs = parseDateMs(sourceDateIso(sourceDate))
  const evaluatedMs = parseDateMs(evaluatedAt)
  if (sourceMs === 0 || evaluatedMs === 0) return false

  const ageDays = (evaluatedMs - sourceMs) / 86_400_000
  return ageDays >= 0 && ageDays <= SOURCE_WINDOW_DAYS
}

function freshnessLabel(sourceDate: string, evaluatedAt: string): string {
  const evaluatedAtMs = parseDateMs(evaluatedAt)
  const sourceAtMs = parseDateMs(sourceDateIso(sourceDate))
  const days = Math.max(0, Math.floor((evaluatedAtMs - sourceAtMs) / 86_400_000))

  if (days === 0) return 'Just now'
  if (days === 1) return 'Yesterday'
  if (days < 14) return `${days}d ago`
  return `${Math.max(1, Math.floor(days / 7))}w ago`
}

function tdlrCandidateRank(project: TdlrProjectCandidate, evaluatedAt: string): number {
  const text = normalizedProjectText(project)
  let rank = 0

  if (isWithinSourceWindow(project.registrationDate, evaluatedAt)) rank += 40
  if (project.typeOfWork === TDLR_RENOVATION_ALTERATION) rank += 35
  if (COMMERCIAL_FIT_PATTERN.test(text)) rank += 20
  if (project.estimatedEndDate) rank += 10
  if (project.estimatedCost !== null && project.estimatedCost >= 100_000) rank += 5
  if (RESIDENTIAL_DISQUALIFIER_PATTERN.test(text)) rank -= 100
  if (WEAK_FIT_PATTERN.test(text)) rank -= 50

  return rank
}

function sortedTdlrCandidates(
  candidates: TdlrProjectCandidate[],
  evaluatedAt: string,
): TdlrProjectCandidate[] {
  return [...candidates].sort((a, b) => {
    const rankDifference = tdlrCandidateRank(b, evaluatedAt) - tdlrCandidateRank(a, evaluatedAt)
    if (rankDifference !== 0) return rankDifference
    return parseDateMs(sourceDateIso(b.registrationDate)) - parseDateMs(sourceDateIso(a.registrationDate))
  })
}

async function fetchTdlrCountyCandidates(
  county: DfwCounty,
  evaluatedAt: string,
): Promise<{
  call: Cp21cSourceAdapterCall
  candidates: TdlrProjectCandidate[]
}> {
  const runId = sourceAdapterRunId(county.id)
  const url = buildTdlrListingUrl(county, evaluatedAt)

  let response: Response
  try {
    response = await fetch(url, {
      method: 'GET',
      headers: { accept: 'application/json' },
    })
  } catch {
    return {
      call: {
        adapter: 'tdlr-tabs',
        status: 'error',
        runId,
        county: county.name,
        url,
        detail: 'TDLR SearchProjects GET request could not be completed.',
        recordsReturned: 0,
        candidatesAccepted: 0,
      },
      candidates: [],
    }
  }

  if (!response.ok) {
    return {
      call: {
        adapter: 'tdlr-tabs',
        status: 'error',
        runId,
        county: county.name,
        url,
        detail: `TDLR SearchProjects GET request failed with status ${response.status}.`,
        recordsReturned: 0,
        candidatesAccepted: 0,
      },
      candidates: [],
    }
  }

  let payload: TdlrSearchProjectsResponse
  try {
    payload = (await response.json()) as TdlrSearchProjectsResponse
  } catch {
    return {
      call: {
        adapter: 'tdlr-tabs',
        status: 'error',
        runId,
        county: county.name,
        url,
        detail: 'TDLR SearchProjects response could not be parsed as JSON.',
        recordsReturned: 0,
        candidatesAccepted: 0,
      },
      candidates: [],
    }
  }

  const rows = Array.isArray(payload.data) ? payload.data : []
  const candidates = rows
    .map((row) => normalizeTdlrProjectRow(row, county, url, runId))
    .filter((candidate): candidate is TdlrProjectCandidate => candidate !== null)

  return {
    call: {
      adapter: 'tdlr-tabs',
      status: 'ok',
      runId,
      county: county.name,
      url,
      detail: `TDLR SearchProjects returned ${rows.length} row(s) for ${county.name} County in the 45-day registration window.`,
      recordsReturned: rows.length,
      candidatesAccepted: candidates.length,
    },
    candidates,
  }
}

async function runTdlrSourceAdapter(evaluatedAt: string): Promise<{
  calls: Cp21cSourceAdapterCall[]
  candidates: TdlrProjectCandidate[]
}> {
  const calls: Cp21cSourceAdapterCall[] = []
  const candidates: TdlrProjectCandidate[] = []

  for (const county of DFW_COUNTIES.slice(0, MAX_SOURCE_ADAPTER_LISTING_CALLS)) {
    const result = await fetchTdlrCountyCandidates(county, evaluatedAt)
    calls.push(result.call)
    candidates.push(...result.candidates)
  }

  return { calls, candidates: sortedTdlrCandidates(candidates, evaluatedAt) }
}

function dedupeTdlrCandidates(
  candidates: TdlrProjectCandidate[],
  evaluatedAt: string,
): TdlrProjectCandidate[] {
  const seen = new Set<string>()
  const deduped: TdlrProjectCandidate[] = []

  for (const candidate of sortedTdlrCandidates(candidates, evaluatedAt)) {
    const fingerprint = hashText([
      candidate.projectNumber,
      candidate.sourceUrl,
      normalizedProjectText(candidate),
    ].join('|'))
    const key = `${candidate.projectNumber}|${candidate.sourceUrl}|${fingerprint}`
    if (seen.has(key)) continue
    seen.add(key)
    deduped.push(candidate)
    if (deduped.length >= MAX_RAW_RECORDS_CONSIDERED) break
  }

  return deduped
}

function candidateSignalFromProject(
  project: TdlrProjectCandidate,
  request: Cp21aRunRequest,
): CandidateSignal {
  return {
    providerRunId: project.sourceAdapterRunId,
    workspaceId: request.workspaceId,
    vertical: COMMERCIAL_CLEANING_VERTICAL_ID,
    signalType: CP21C_SIGNAL_TYPE,
    engine: 'google_light',
    query: project.listingUrl,
    hit: {
      title: `${project.projectName} (${project.projectNumber})`,
      url: project.sourceUrl,
      sourceName: `TDLR TABS ${project.projectNumber}`,
      snippet: [
        project.facilityName ? `Facility: ${project.facilityName}.` : null,
        `${project.county.name} County.`,
        `${project.typeOfWorkLabel}.`,
        `Registration Date: ${project.registrationDate}.`,
        project.estimatedEndDate
          ? `Estimated completion: ${project.estimatedEndDate}.`
          : null,
      ].filter(Boolean).join(' '),
      rank: 1,
      rawEngineMetadata: {
        sourceAdapter: 'tdlr-tabs',
        listingUrl: project.listingUrl,
        raw: project.raw,
      },
    },
    discoveredAt: request.requestedAt,
  }
}

function extractDateFromParts(month: string, day: string, year: string): string {
  return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`
}

function extractSourceDate(text: string): string | null {
  const labeledDate = text.match(
    /\b(?:Registration|Issue|Issued|Filed|Filing|Application|Permit)\s*Date\s*:?\s*(\d{1,2})\/(\d{1,2})\/(\d{4})/i,
  )
  if (labeledDate) return extractDateFromParts(labeledDate[1], labeledDate[2], labeledDate[3])

  const isoDate = text.match(/\b(20\d{2})-(\d{2})-(\d{2})\b/)
  if (isoDate) return `${isoDate[1]}-${isoDate[2]}-${isoDate[3]}`

  const fallbackDate = text.match(/\b(\d{1,2})\/(\d{1,2})\/(20\d{2})\b/)
  if (fallbackDate) return extractDateFromParts(fallbackDate[1], fallbackDate[2], fallbackDate[3])

  return null
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

function extractBusinessName(
  project: TdlrProjectCandidate,
  evidence: EvidenceDocument,
): string {
  const text = `${project.projectName}\n${project.facilityName ?? ''}\n${evidence.title ?? ''}\n${evidence.cleanedText}`
  const named =
    extractLabeledValue(text, [
      'Tenant Name',
      'Business Name',
      'Project Name',
      'Facility Name',
      'Property Name',
      'Permit For',
      'Applicant',
    ]) ??
    project.facilityName ??
    project.projectName

  return named.replace(/\s+/g, ' ').slice(0, 120).trim()
}

function inferVerticalFitLabel(
  project: TdlrProjectCandidate,
  evidence: EvidenceDocument,
): CommercialCleaningVerticalFitLabel {
  const text = `${normalizedProjectText(project)}\n${evidence.title ?? ''}\n${evidence.cleanedText}`
  if (/\boffice|suite|studio\b/i.test(text)) return 'New Office'
  if (/\b(final clean|final cleaning)\b/i.test(text)) return 'Final Clean'
  return 'Post-Construction Clean'
}

function excerptFromEvidence(text: string): string {
  const lines = text
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean)
  const preferred = lines.find((line) =>
    /\b(Project #|Registration Date|Type of Work|Project Name|Facility Name|Location Address|renovation|alteration|finish out|tenant)\b/i.test(line),
  )
  const excerpt = preferred ?? lines[0] ?? 'Live evidence was hydrated by Firecrawl.'
  return excerpt.length > 260 ? `${excerpt.slice(0, 257).trim()}...` : excerpt
}

function evaluateProductScope({
  project,
  evidence,
  sourceDate,
  evaluatedAt,
}: {
  project: TdlrProjectCandidate
  evidence: EvidenceDocument
  sourceDate: string
  evaluatedAt: string
}): { ok: boolean; reasons: string[] } {
  const text = `${normalizedProjectText(project)}\n${evidence.title ?? ''}\n${evidence.cleanedText}`
  const reasons: string[] = []

  if (!DFW_COUNTIES.some((county) => county.id === project.county.id)) {
    return {
      ok: false,
      reasons: ['Product-scope guard rejected the candidate because the TDLR county is outside DFW.'],
    }
  }
  reasons.push(`DFW market guard passed for ${project.county.name} County.`)

  if (!isWithinSourceWindow(sourceDate, evaluatedAt)) {
    return {
      ok: false,
      reasons: [
        `Freshness guard rejected the candidate because source date ${sourceDate} is outside the 45-day window.`,
      ],
    }
  }
  reasons.push(`Freshness guard passed: source date ${sourceDate} is within 45 days.`)

  if (
    RESIDENTIAL_DISQUALIFIER_PATTERN.test(text) ||
    (SIDEWALK_CURB_PATTERN.test(text) && RESIDENTIAL_CONTEXT_PATTERN.test(text))
  ) {
    return {
      ok: false,
      reasons: [
        'Residential guard rejected the candidate because the evidence contains residential-only scope.',
      ],
    }
  }
  reasons.push('Residential disqualification guard passed.')

  if (WEAK_FIT_PATTERN.test(text)) {
    return {
      ok: false,
      reasons: [
        'Commercial fit guard rejected the candidate because the project text indicates a weak or wrong-scope record.',
      ],
    }
  }

  if (
    project.typeOfWork !== TDLR_RENOVATION_ALTERATION &&
    !COMMERCIAL_FIT_PATTERN.test(text)
  ) {
    return {
      ok: false,
      reasons: [
        'Commercial/buildout/TI guard rejected the candidate because no commercial renovation, alteration, finish-out, office, retail, restaurant, warehouse, medical, suite, or remodel signal was present.',
      ],
    }
  }
  reasons.push('Commercial/buildout/TI fit guard passed.')

  return { ok: true, reasons }
}

function emptyStageCounts(): Cp21aStageCounts {
  return {
    discovery: { discovered: 0, deduped: 0 },
    hydrate: { attempted: 0, succeeded: 0, failed: 0 },
    evidenceGate: { passed: 0, blocked: 0 },
    classification: { passed: 0, failed: 0 },
    scoring: { passed: 0, failed: 0 },
    claimGuard: { passed: 0, revised: 0, blocked: 0 },
    persistence: { plans: 0, writes: 0 },
  }
}

function emptyLaneCounts(): Cp21aLaneCounts {
  return {
    todays_opportunities: 0,
    prospect_pool: 0,
    needs_review: 0,
    blocked_or_review: 0,
  }
}

function recordStageFailure(stageCounts: Cp21aStageCounts, stage: Cp21aStage) {
  if (stage === 'hydrate') stageCounts.hydrate.failed += 1
  if (stage === 'evidence_gate') stageCounts.evidenceGate.blocked += 1
  if (stage === 'classify') stageCounts.classification.failed += 1
  if (stage === 'score') stageCounts.scoring.failed += 1
  if (stage === 'claim_guard') stageCounts.claimGuard.blocked += 1
}

function scoreReasonsCiteEvidence(reasons: readonly Cp21aScoreReasonPlan[]): boolean {
  return reasons.length > 0 && reasons.every((reason) => {
    return reason.evidenceId.trim().length > 0 && scoreReasonIsSubstantive(reason.text)
  })
}

function scoreReasonIsSubstantive(text: string): boolean {
  const normalized = text.trim().toLowerCase()
  if (normalized.length < 24) return false
  return /\b(score|scoring|fit|fresh|contact|route|component|points?|window|commercial|source|evidence|confidence|official)\b/i.test(normalized)
}

function buyerIdentityIssueFor(value: string): string | null {
  const trimmed = value.trim()
  if (!trimmed) return 'buyer_identity_empty'
  const sourceFieldLabels = [
    'project number',
    'project #',
    'facility name',
    'location address',
    'location ad',
    'tenant name',
    'tenant phone',
    'registration date',
    'type of work',
    'estimated cost',
    'project name',
  ]
  const lower = trimmed.toLowerCase()
  const matchedSourceLabels = sourceFieldLabels.filter((label) => lower.includes(label))
  if (matchedSourceLabels.length >= 2) return 'raw_tdlr_field_concatenation'
  if (matchedSourceLabels.length === 1) return 'source_field_contamination'
  if (/tenant\s+phone|phone:\s*\(?\d|email:|contact:/i.test(trimmed)) {
    return 'buyer_identity_contains_contact_or_tenant_data'
  }
  if (/\(?\d{3}\)?[-.\s]\d{3}[-.\s]\d{4}/.test(trimmed)) {
    return 'buyer_identity_contains_phone_number'
  }
  return null
}

function contactRouteStatusFor(buyerIdentityIssue: string | null): Cp21cPersistedItemAudit['contactRouteStatus'] {
  if (buyerIdentityIssue) return 'contaminated_in_identity'
  return 'missing'
}

function scoreComponentsFor(evidenceId: string, sourceDate: string): Cp21cScoreComponentReport[] {
  return [
    {
      key: 'fit',
      label: 'Commercial cleaning fit',
      score: 50,
      maxScore: 50,
      evidenceId,
      reason: 'Fit component awards 50/50 because official TDLR evidence shows a commercial renovation/alteration project suitable for post-construction cleaning review.',
    },
    {
      key: 'freshness',
      label: 'Fresh dated public signal',
      score: 30,
      maxScore: 30,
      evidenceId,
      reason: `Freshness component awards 30/30 because source date ${sourceDate} is inside the CP21C 45-day building permit window.`,
    },
    {
      key: 'contact',
      label: 'Resolved contact route',
      score: 0,
      maxScore: 20,
      evidenceId,
      reason: 'Contact component awards 0/20 because CP21C does not resolve or verify a contact route.',
    },
  ]
}

function prospectScoreComponentsFor(
  evidenceId: string,
  total: number,
): Cp21cScoreComponentReport[] {
  return [
    {
      key: 'fit',
      label: 'Prospect fit',
      score: total,
      maxScore: 100,
      evidenceId,
      reason: 'Prospect fit component reports the deterministic prospect score for source-backed review; it is not an opportunity urgency score.',
    },
    {
      key: 'freshness',
      label: 'Fresh opportunity signal',
      score: 0,
      maxScore: 0,
      evidenceId,
      reason: 'Freshness component is not scored for evidence-backed prospects without a persisted opportunity signal.',
    },
    {
      key: 'contact',
      label: 'Resolved contact route',
      score: 0,
      maxScore: 0,
      evidenceId,
      reason: 'Contact component awards 0 because CP21C does not resolve or verify a contact route.',
    },
  ]
}

function scoreTotalFromComponents(components: readonly Cp21cScoreComponentReport[]): number {
  return components.reduce((sum, component) => sum + component.score, 0)
}

function scoreMaxFromComponents(components: readonly Cp21cScoreComponentReport[]): number {
  return components.reduce((sum, component) => sum + component.maxScore, 0)
}

function persistedItemAuditFor(plan: Cp21aOpportunityPlan | Cp21aProspectPlan): Cp21cPersistedItemAudit {
  const evidenceId = plan.evidence[0]?.id ?? ''
  const sourceDate = plan.evidence[0]?.sourceDate ?? 'unknown'
  const components = plan.leadKind === 'signal_backed_opportunity'
    ? scoreComponentsFor(evidenceId, sourceDate)
    : prospectScoreComponentsFor(evidenceId, plan.score.total)
  const buyerIdentityIssue = buyerIdentityIssueFor(plan.businessName)
  const contactRouteStatus = contactRouteStatusFor(buyerIdentityIssue)
  const scoreMaxPossible = scoreMaxFromComponents(components)
  const scoreTotal = plan.score.total
  const scoreMathConsistent = scoreTotal === scoreTotalFromComponents(components)
  const scoreReasonSubstance = plan.score.reasons.map((reason) => ({
    evidenceId: reason.evidenceId,
    text: reason.text,
    substantive: scoreReasonIsSubstantive(reason.text),
  }))
  const scoreTrusted =
    scoreMathConsistent &&
    scoreReasonSubstance.length > 0 &&
    scoreReasonSubstance.every((reason) => reason.evidenceId.trim().length > 0 && reason.substantive)
  const leadActionabilityReady = buyerIdentityIssue === null && contactRouteStatus === 'present'

  return {
    candidateId: plan.candidateId,
    scoreTotal,
    fitScore: components.find((component) => component.key === 'fit')?.score ?? 0,
    freshnessScore: components.find((component) => component.key === 'freshness')?.score ?? 0,
    contactScore: components.find((component) => component.key === 'contact')?.score ?? 0,
    scoreMaxPossible,
    scoreMathConsistent,
    scoreTrusted,
    scoreReasonSubstance,
    scoreComponents: components,
    buyerIdentityRaw: plan.businessName,
    buyerIdentitySafe: buyerIdentityIssue === null,
    buyerIdentityIssue,
    contactRouteCount: 0,
    contactRouteStatus,
    leadActionabilityReady,
    nextCheckpointNeeded: leadActionabilityReady ? null : 'entity_resolution_contact_routing',
    defensibleSourceBackedOpportunity:
      plan.leadKind === 'signal_backed_opportunity' &&
      scoreTrusted &&
      plan.evidence.some((evidence) => evidence.sourceUrl.includes('/TABS/Search/Project/')),
    defensibleActionableLead: leadActionabilityReady,
  }
}

function dispositionFingerprint({
  projectNumber,
  disposition,
  reason,
}: {
  projectNumber: string
  disposition: Cp21cCandidateFinalDisposition
  reason: string | null
}): string {
  return hashText([
    'cp21c-disposition',
    projectNumber,
    disposition,
    reason ?? 'none',
  ].join('|')).slice(0, 16)
}

function dispositionForHydratedCandidate({
  hydrated,
  finalDisposition,
  lane,
  failureStage,
  demotionStage,
  failureReason,
  demotionReason,
  includedInLiveRecordsPersisted,
}: {
  hydrated: Cp21cHydratedCandidate
  finalDisposition: Cp21cCandidateFinalDisposition
  lane: keyof Cp21aLaneCounts | null
  failureStage: Cp21aStage | null
  demotionStage: Cp21aStage | null
  failureReason: string | null
  demotionReason: string | null
  includedInLiveRecordsPersisted: boolean
}): Cp21cCandidateDisposition {
  const reason = failureReason ?? demotionReason
  const stableDispositionFingerprint = dispositionFingerprint({
    projectNumber: hydrated.project.projectNumber,
    disposition: finalDisposition,
    reason,
  })

  return {
    projectNumber: hydrated.project.projectNumber,
    sourceUrl: hydrated.project.sourceUrl,
    sourceDate: hydrated.sourceDate,
    registrationDate: hydrated.project.registrationDate,
    county: hydrated.project.county.name,
    firecrawlStatus: 'ok',
    finalDisposition,
    lane,
    failureStage,
    demotionStage,
    failureReason,
    demotionReason,
    stableFailureFingerprint:
      finalDisposition === 'failed_not_persisted' || finalDisposition === 'blocked_not_persisted'
        ? stableDispositionFingerprint
        : null,
    stableDispositionFingerprint,
    includedInLiveRecordsPersisted,
    includedInCp20cReadbackCounts: false,
    proofOnlyFaultInjection: false,
    providerCostUsd: FIRECRAWL_SCRAPE_COST_USD,
  }
}

function claimGuardScoreReasons(score: Cp21aScorePlan) {
  return score.reasons.map((reason) => ({
    code: reason.code,
    text: reason.text,
    evidenceIndexes: [0],
  }))
}

function claimGuardDisposition(
  decision: ClaimGuardDecision,
): 'passed' | 'revised' | 'blocked' {
  if (decision.ok) return 'passed'
  if (
    decision.reasonCode === 'stale_signal_for_urgency' ||
    decision.reasonCode === 'opportunity_without_dated_evidence' ||
    decision.reasonCode === 'urgency_claim_on_prospect'
  ) {
    return 'revised'
  }
  return 'blocked'
}

function approvedLabel(
  signalLabel: string | null,
  verticalFitLabel: string | null,
  actionLabel: string,
): boolean {
  const signalApproved =
    signalLabel === null ||
    APPROVED_COMMERCIAL_CLEANING_SIGNAL_LABELS.includes(
      signalLabel as (typeof APPROVED_COMMERCIAL_CLEANING_SIGNAL_LABELS)[number],
    )
  const fitApproved =
    verticalFitLabel === null ||
    APPROVED_COMMERCIAL_CLEANING_VERTICAL_FIT_LABELS.includes(
      verticalFitLabel as (typeof APPROVED_COMMERCIAL_CLEANING_VERTICAL_FIT_LABELS)[number],
    )
  const actionApproved = [
    'Review source and contact route',
    'Add to Prospect Pool',
    'Review before outreach',
  ].includes(actionLabel)

  return signalApproved && fitApproved && actionApproved
}

function lineagesFor({
  project,
  evidence,
  sourceAdapterCalls,
  sourceUrl,
}: {
  project: TdlrProjectCandidate
  evidence: EvidenceDocument
  sourceAdapterCalls: readonly Cp21cSourceAdapterCall[]
  sourceUrl: string
}) {
  const listingCall = sourceAdapterCalls.find((call) => call.runId === project.sourceAdapterRunId)
  return [
    {
      candidateId: `cp21c-${project.projectNumber}`,
      provider: 'tdlr-tabs' as const,
      providerRunId: project.sourceAdapterRunId,
      runRole: 'source_adapter_listing' as const,
      status: 'ok' as const,
      sourceUrl: project.listingUrl,
      query: project.listingUrl,
      engine: null,
      estimatedCostCents: 0,
      requestMetadata: {
        county: project.county.name,
        sourcePath: CP21C_SOURCE_PATH,
      },
      responseMetadata: {
        detail: listingCall?.detail ?? 'TDLR listing call returned this candidate.',
        recordsReturned: listingCall?.recordsReturned ?? null,
        candidatesAccepted: listingCall?.candidatesAccepted ?? null,
      },
    },
    {
      candidateId: `cp21c-${project.projectNumber}`,
      provider: 'firecrawl' as const,
      providerRunId: evidence.providerRunId,
      runRole: 'evidence_hydration' as const,
      status: 'ok' as const,
      sourceUrl,
      query: null,
      engine: null,
      estimatedCostCents: Math.round(FIRECRAWL_SCRAPE_COST_USD * 100),
      requestMetadata: {
        sourceUrl,
        sourcePath: CP21C_SOURCE_PATH,
        method: 'scrapeUrl',
      },
      responseMetadata: {
        hydrated: true,
      },
    },
  ]
}

function lineageFor(project: TdlrProjectCandidate, evidence: EvidenceDocument): Cp21aLineage {
  return {
    candidateId: `cp21c-${project.projectNumber}`,
    sourceUrl: project.sourceUrl,
    sourceName: `TDLR TABS ${project.projectNumber}`,
    searchProviderRunId: project.sourceAdapterRunId,
    evidenceProviderRunId: evidence.providerRunId,
    fingerprint: hashText([
      project.projectNumber,
      project.sourceUrl,
      evidence.cleanedText,
    ].join('|')),
  }
}

function evidencePlanFor({
  project,
  evidence,
  sourceDate,
  evidenceSummary,
  sourceExcerpt,
  sourceAdapterCalls,
  gateReasons,
  providerLineage,
}: {
  project: TdlrProjectCandidate
  evidence: EvidenceDocument
  sourceDate: string
  evidenceSummary: string
  sourceExcerpt: string
  sourceAdapterCalls: readonly Cp21cSourceAdapterCall[]
  gateReasons: Record<string, unknown>
  providerLineage: Record<string, unknown>
}): Cp21aEvidencePlan {
  const sourceAdapterRunIds = Array.from(new Set(sourceAdapterCalls.map((call) => call.runId)))
  const sourceAdapterListingUrls = Array.from(new Set(sourceAdapterCalls.map((call) => call.url)))

  return {
    id: `evidence-cp21c-${project.projectNumber}`,
    sourceUrl: evidence.sourceUrl ?? project.sourceUrl,
    sourceTitle: evidence.title ?? `${project.projectName} (${project.projectNumber})`,
    sourceDate,
    evidenceSummary,
    sourceExcerpt,
    sourceFingerprint: hashText(evidence.cleanedText),
    sourceType: 'tdlr_tabs_project',
    sourceAuthority: 'tdlr',
    sourceExternalId: project.projectNumber,
    sourceAdapterRunIds,
    sourceAdapterListingUrls,
    providerMode: 'LIVE',
    gateReasons,
    providerLineage,
    proofMetadata: {
      sourcePath: CP21C_SOURCE_PATH,
      market: CP21C_MARKET,
      projectNumber: project.projectNumber,
      projectName: project.projectName,
      county: project.county.name,
      registrationDate: project.registrationDate,
      typeOfWork: project.typeOfWorkLabel,
      firecrawlProviderRunId: evidence.providerRunId,
      sourceAdapterRunId: project.sourceAdapterRunId,
      estimatedProviderSpendUsd: FIRECRAWL_SCRAPE_COST_USD,
      recordedReal: false,
      preTargetedProjectNumber: false,
    },
  }
}

function opportunityScoreFor({
  project,
  evidencePlan,
  evidence,
  whyNow,
  sourceDate,
}: {
  project: TdlrProjectCandidate
  evidencePlan: Cp21aEvidencePlan
  evidence: EvidenceDocument
  whyNow: string
  sourceDate: string
}): Cp21aScorePlan {
  const result = evaluateOpportunityScoring({
    leadKind: 'signal_backed_opportunity',
    signalType: CP21C_SIGNAL_TYPE,
    signalLabel: CP21C_SIGNAL_LABEL,
    evidenceSourceUrls: [evidencePlan.sourceUrl],
    providerRunIds: [project.sourceAdapterRunId, evidence.providerRunId],
    evidenceSummary: evidencePlan.evidenceSummary,
    whyNowReasons: [whyNow],
    freshnessWindow: '45 days',
    actionWindow: project.estimatedEndDate
      ? `Estimated completion ${project.estimatedEndDate}`
      : 'Post-construction cleaning review window',
    signalObservedAt: sourceDateIso(sourceDate),
    publishedAt: evidence.publishedAt,
    scoreComponents: [
      {
        key: 'commercial_cleaning_fit',
        weight: 0.5,
        value: 1,
        reason: 'Fit component awards 50/50 because official TDLR evidence shows a commercial renovation/alteration project suitable for post-construction cleaning review.',
      },
      {
        key: 'fresh_dated_signal',
        weight: 0.3,
        value: 1,
        reason: `Freshness component awards 30/30 because source date ${sourceDate} is inside the CP21C 45-day building permit window.`,
      },
      {
        key: 'contact_route_missing',
        weight: 0.2,
        value: 0,
        reason: 'Contact component awards 0/20 because CP21C does not resolve or verify a contact route.',
      },
    ],
  })

  if (!result.ok || result.opportunityUrgencyScore === null) {
    throw new Error(result.gateReasons.join(' '))
  }

  return {
    total: result.opportunityUrgencyScore,
    opportunityUrgencyScore: result.opportunityUrgencyScore,
    prospectFitScore: null,
    outreachReadinessScore: null,
    reasons: result.scoreReasons.map((reason) => ({
      code: reason.key,
      text: reason.reason,
      evidenceId: evidencePlan.id,
    })),
  }
}

function prospectScoreFor(
  evidencePlan: Cp21aEvidencePlan,
  fitReasons: string[],
): Cp21aScorePlan {
  const result = evaluateProspectScoring({
    leadKind: 'evidence_backed_prospect',
    evidenceSummary: evidencePlan.evidenceSummary,
    fitReasons,
    contactRouteHints: ['Review the official TDLR record before selecting a contact route.'],
    accountFitSignals: ['official TDLR commercial project record'],
    sourceConfidence: 0.9,
    locationConfidence: 0.85,
  })

  if (!result.ok) throw new Error(result.gateReasons.join(' '))

  const reasons: Cp21aScoreReasonPlan[] = [
    ...(result.scoreReasons.prospect_fit ?? []).map((reason) => ({
      code: reason.key,
      text: reason.reason,
      evidenceId: evidencePlan.id,
    })),
    ...(result.scoreReasons.outreach_readiness ?? []).map((reason) => ({
      code: reason.key,
      text: reason.reason,
      evidenceId: evidencePlan.id,
    })),
  ]

  return {
    total: Math.round(
      ((result.prospectFitScore ?? 0) + (result.outreachReadinessScore ?? 0)) / 2,
    ),
    opportunityUrgencyScore: null,
    prospectFitScore: result.prospectFitScore,
    outreachReadinessScore: result.outreachReadinessScore,
    reasons,
  }
}

function evaluateOpportunityClaimGuard({
  request,
  signalLabel,
  verticalFitLabel,
  whyNow,
  score,
  evidence,
  evidenceSummary,
}: {
  request: Cp21aRunRequest
  signalLabel: string
  verticalFitLabel: string
  whyNow: string
  score: Cp21aScorePlan
  evidence: EvidenceDocument
  evidenceSummary: string
}): ClaimGuardDecision {
  return evaluateClaimGuard({
    evaluatedAt: request.requestedAt,
    config: {
      approvedSignalLabels: APPROVED_COMMERCIAL_CLEANING_SIGNAL_LABELS,
      approvedVerticalFitLabels: APPROVED_COMMERCIAL_CLEANING_VERTICAL_FIT_LABELS,
      maxSignalAgeDays: SOURCE_WINDOW_DAYS,
    },
    artifact: {
      workspaceId: request.workspaceId,
      leadKind: 'signal_backed_opportunity',
      signalLabel,
      verticalFitLabel,
      claimsUrgency: true,
      claims: [
        {
          kind: 'evidence_summary',
          text: evidenceSummary,
          evidenceIndexes: [0],
        },
        {
          kind: 'why_now',
          text: whyNow,
          evidenceIndexes: [0],
        },
      ],
      score: score.total,
      scoreReasons: claimGuardScoreReasons(score),
      recommendedAction: 'Review source and contact route',
      evidence: [evidence],
    },
  })
}

function evaluateProspectClaimGuard({
  request,
  verticalFitLabel,
  score,
  evidence,
  evidenceSummary,
}: {
  request: Cp21aRunRequest
  verticalFitLabel: string
  score: Cp21aScorePlan
  evidence: EvidenceDocument
  evidenceSummary: string
}): ClaimGuardDecision {
  return evaluateClaimGuard({
    evaluatedAt: request.requestedAt,
    config: {
      approvedSignalLabels: APPROVED_COMMERCIAL_CLEANING_SIGNAL_LABELS,
      approvedVerticalFitLabels: APPROVED_COMMERCIAL_CLEANING_VERTICAL_FIT_LABELS,
      maxSignalAgeDays: SOURCE_WINDOW_DAYS,
    },
    artifact: {
      workspaceId: request.workspaceId,
      leadKind: 'evidence_backed_prospect',
      verticalFitLabel,
      claimsUrgency: false,
      claims: [
        {
          kind: 'evidence_summary',
          text: evidenceSummary,
          evidenceIndexes: [0],
        },
      ],
      score: score.total,
      scoreReasons: claimGuardScoreReasons(score),
      recommendedAction: 'Review before outreach',
      evidence: [evidence],
    },
  })
}

function failedCandidate({
  candidateId,
  stage,
  reason,
  lineage,
}: {
  candidateId: string
  stage: Cp21aStage
  reason: string
  lineage: Cp21aLineage
}): Cp21aFailedCandidate {
  return {
    candidateId,
    status: 'failed',
    failureStage: stage,
    failureReason: reason,
    laneId: 'needs_review',
    fallbackState: 'needs_review',
    lineage,
  }
}

function proofOnlyFaultCandidate(): Cp21aFailedCandidate {
  return failedCandidate({
    candidateId: 'cp21c-proof-only-fault-candidate',
    stage: 'hydrate',
    reason: 'Proof-only injected bad TDLR row did not abort the live run.',
    lineage: {
      candidateId: 'cp21c-proof-only-fault-candidate',
      sourceUrl: null,
      sourceName: 'proof-only fault row',
      searchProviderRunId: null,
      evidenceProviderRunId: null,
      fingerprint: hashText('cp21c-proof-only-fault-candidate'),
    },
  })
}

function providerBudget(): BudgetEnvelope {
  return {
    workspaceId: 'cp21c-live-tdlr-dfw-budget',
    maxProviderCalls: MAX_SOURCE_ADAPTER_LISTING_CALLS + MAX_FIRECRAWL_HYDRATIONS,
    maxSpendEstimateUsd: MAX_ESTIMATED_PROVIDER_SPEND_USD,
    triggeredBy: 'admin_replay',
  }
}

function assertCanHydrateNext(usage: Cp21cProviderUsage) {
  if (usage.firecrawlCalls + 1 > MAX_FIRECRAWL_HYDRATIONS) {
    usage.budgetAbortTriggered = true
    throw new Error('CP21C Firecrawl hydration cap would be exceeded.')
  }

  const nextSpend = Number((usage.estimatedProviderSpendUsd + FIRECRAWL_SCRAPE_COST_USD).toFixed(2))
  if (nextSpend > MAX_ESTIMATED_PROVIDER_SPEND_USD) {
    usage.budgetAbortTriggered = true
    throw new Error('CP21C provider spend cap would be exceeded.')
  }
}

async function hydrateCandidates({
  candidates,
  request,
  firecrawlApiKey,
  sourceAdapterCalls,
  usage,
  stageCounts,
  laneCounts,
  failedCandidates,
}: {
  candidates: readonly TdlrProjectCandidate[]
  request: Cp21aRunRequest
  firecrawlApiKey: string
  sourceAdapterCalls: readonly Cp21cSourceAdapterCall[]
  usage: Cp21cProviderUsage
  stageCounts: Cp21aStageCounts
  laneCounts: Cp21aLaneCounts
  failedCandidates: Cp21aFailedCandidate[]
}): Promise<Cp21cHydratedCandidate[]> {
  const evidenceProvider = new FirecrawlEvidenceProvider(firecrawlApiKey)
  const hydrated: Cp21cHydratedCandidate[] = []

  for (const project of candidates) {
    if (usage.firecrawlCalls >= MAX_FIRECRAWL_HYDRATIONS) break
    if (hydrated.length >= MAX_PERSISTED_LIVE_ITEMS) break

    const candidate = candidateSignalFromProject(project, request)
    stageCounts.hydrate.attempted += 1

    try {
      assertCanHydrateNext(usage)
      const result = await evidenceProvider.scrapeUrl({
        url: project.sourceUrl,
        workspaceId: request.workspaceId,
        budget: providerBudget(),
      })
      usage.firecrawlCalls += 1
      usage.estimatedProviderSpendUsd = Number(
        (usage.estimatedProviderSpendUsd + (result.error ? 0 : FIRECRAWL_SCRAPE_COST_USD)).toFixed(2),
      )

      if (result.error || !result.doc) {
        stageCounts.hydrate.failed += 1
        laneCounts.needs_review += 1
        failedCandidates.push(failedCandidate({
          candidateId: `cp21c-${project.projectNumber}`,
          stage: 'hydrate',
          reason: result.error?.message ?? 'Firecrawl returned no evidence document.',
          lineage: {
            candidateId: `cp21c-${project.projectNumber}`,
            sourceUrl: project.sourceUrl,
            sourceName: `TDLR TABS ${project.projectNumber}`,
            searchProviderRunId: project.sourceAdapterRunId,
            evidenceProviderRunId: result.providerRunId,
            fingerprint: hashText(`${project.projectNumber}|hydrate-failed`),
          },
        }))
        continue
      }

      const sourceDate = extractSourceDate(result.doc.cleanedText) ?? project.registrationDate
      const evidence: EvidenceDocument = {
        ...result.doc,
        sourceUrl: project.sourceUrl,
        sourceName: `TDLR TABS ${project.projectNumber}`,
        publishedAt: sourceDateIso(sourceDate),
      }
      stageCounts.hydrate.succeeded += 1
      hydrated.push({
        project,
        candidate,
        evidence,
        sourceDate,
      })
    } catch (error) {
      stageCounts.hydrate.failed += 1
      laneCounts.needs_review += 1
      failedCandidates.push(failedCandidate({
        candidateId: `cp21c-${project.projectNumber}`,
        stage: 'hydrate',
        reason: errorMessage(error),
        lineage: {
          candidateId: `cp21c-${project.projectNumber}`,
          sourceUrl: project.sourceUrl,
          sourceName: `TDLR TABS ${project.projectNumber}`,
          searchProviderRunId: project.sourceAdapterRunId,
          evidenceProviderRunId: null,
          fingerprint: hashText(`${project.projectNumber}|hydrate-error`),
        },
      }))
    }
  }

  void sourceAdapterCalls
  return hydrated
}

async function persistLineagePlans({
  project,
  evidence,
  sourceAdapterCalls,
  persister,
}: {
  project: TdlrProjectCandidate
  evidence: EvidenceDocument
  sourceAdapterCalls: readonly Cp21cSourceAdapterCall[]
  persister: Cp21aConductorPersister
}) {
  const sourceUrl = evidence.sourceUrl ?? project.sourceUrl
  for (const lineage of lineagesFor({ project, evidence, sourceAdapterCalls, sourceUrl })) {
    await persister.recordLineagePlan(lineage)
  }
}

async function prospectPlanFor({
  request,
  hydrated,
  evidencePlan,
  verticalFitLabel,
  businessName,
  demotionReason,
  demotedFromSignal,
}: {
  request: Cp21aRunRequest
  hydrated: Cp21cHydratedCandidate
  evidencePlan: Cp21aEvidencePlan
  verticalFitLabel: CommercialCleaningVerticalFitLabel
  businessName: string
  demotionReason: string | null
  demotedFromSignal: boolean
}): Promise<Cp21aProspectPlan> {
  const validation = validateProspectEvidencePacket({
    leadKind: 'evidence_backed_prospect',
    sourceType: 'permit',
    sourceUrl: evidencePlan.sourceUrl,
    fetchedAt: hydrated.evidence.fetchedAt,
    accessNotes: 'Live CP21C proof hydrated an official TDLR detail URL with Firecrawl.',
    businessName,
    location: {
      city: CP21C_MARKET,
      state: 'TX',
    },
    evidenceSummary: evidencePlan.evidenceSummary,
    fitReasons: [
      'Official TDLR record supports commercial cleaning fit review.',
      `${hydrated.project.county.name} County is inside the CP21C DFW proof market.`,
    ],
    contactRouteHints: ['Review the official TDLR record before selecting a contact route.'],
    rawProviderMetadata: {
      sourcePath: CP21C_SOURCE_PATH,
      projectNumber: hydrated.project.projectNumber,
    },
  })
  if (!validation.ok) throw new Error(validation.reasons.join(' '))

  const score = prospectScoreFor(evidencePlan, validation.packet.fitReasons)
  const guard = evaluateProspectClaimGuard({
    request,
    verticalFitLabel,
    score,
    evidence: hydrated.evidence,
    evidenceSummary: evidencePlan.evidenceSummary,
  })
  const disposition = claimGuardDisposition(guard)

  return {
    candidateId: `cp21c-${hydrated.project.projectNumber}`,
    leadKind: 'evidence_backed_prospect',
    state: disposition === 'blocked' ? 'needs_review' : 'active',
    laneId: disposition === 'blocked' || demotedFromSignal ? 'needs_review' : 'prospect_pool',
    businessName,
    market: CP21C_MARKET,
    vertical: CP21C_VERTICAL,
    signal: null,
    whyNow: null,
    claimsUrgency: false,
    verticalFitLabel,
    evidence: [evidencePlan],
    score,
    recommendedAction: {
      label: demotedFromSignal ? 'Review before outreach' : 'Add to Prospect Pool',
      detail: 'Review the official TDLR record before choosing any contact route.',
    },
    claimGuardDisposition: disposition,
    labelApproved: approvedLabel(null, verticalFitLabel, demotedFromSignal ? 'Review before outreach' : 'Add to Prospect Pool'),
    demotedFromSignal,
    demotionReason,
    lineage: lineageFor(hydrated.project, hydrated.evidence),
  }
}

async function processHydratedCandidate({
  request,
  hydrated,
  sourceAdapterCalls,
  persister,
  stageCounts,
  laneCounts,
}: {
  request: Cp21aRunRequest
  hydrated: Cp21cHydratedCandidate
  sourceAdapterCalls: readonly Cp21cSourceAdapterCall[]
  persister: Cp21aConductorPersister
  stageCounts: Cp21aStageCounts
  laneCounts: Cp21aLaneCounts
}): Promise<Cp21aOpportunityPlan | Cp21aProspectPlan> {
  let currentStage: Cp21aStage = 'evidence_gate'
  const { project, candidate, evidence, sourceDate } = hydrated
  const sourceExcerpt = excerptFromEvidence(evidence.cleanedText)
  const businessName = extractBusinessName(project, evidence)
  const verticalFitLabel = inferVerticalFitLabel(project, evidence)
  const baseEvidenceSummary =
    `${businessName} has official TDLR project ${project.projectNumber} in ${project.county.name} County with ${project.typeOfWorkLabel.toLowerCase()} evidence.`

  try {
    currentStage = 'evidence_gate'
    const evidenceGate = evaluateEvidenceGate({
      candidate,
      evidence: [evidence],
      requiredSignalType: CP21C_SIGNAL_TYPE,
      minCleanedTextLength: 80,
    })
    if (!evidenceGate.ok) throw new Error(evidenceGate.gateReasons.join(' '))
    stageCounts.evidenceGate.passed += 1

    const productScope = evaluateProductScope({
      project,
      evidence,
      sourceDate,
      evaluatedAt: request.requestedAt,
    })
    const providerLineage = {
      sourcePath: CP21C_SOURCE_PATH,
      sourceAdapter: 'tdlr-tabs',
      evidenceProvider: 'firecrawl',
      sourceAdapterCalls,
      providerCalls: [
        {
          provider: 'firecrawl',
          status: 'ok',
          runId: evidence.providerRunId,
          sourceUrl: project.sourceUrl,
          estimatedCostUsd: FIRECRAWL_SCRAPE_COST_USD,
        },
      ],
    }
    const gateReasons = {
      sourceAdapter: [
        'CP21C source adapter used the official TDLR SearchProjects JSON endpoint with direct GET parameters.',
        `DFW county filter passed for ${project.county.name} County.`,
        `Official detail URL was constructed from TDLR ProjectNumber ${project.projectNumber}.`,
      ],
      productScope: productScope.reasons,
      evidenceGate: evidenceGate.gateReasons,
    }
    const evidencePlan = evidencePlanFor({
      project,
      evidence,
      sourceDate,
      evidenceSummary: baseEvidenceSummary,
      sourceExcerpt,
      sourceAdapterCalls,
      gateReasons,
      providerLineage,
    })
    await persister.recordEvidencePlan(evidencePlan)
    await persistLineagePlans({ project, evidence, sourceAdapterCalls, persister })

    currentStage = 'classify'
    const classification = classifyCommercialCleaningSignal({
      verticalId: COMMERCIAL_CLEANING_VERTICAL_ID,
      rawSignalId: project.projectNumber,
      proposedSignalLabel: CP21C_SIGNAL_LABEL,
      proposedVerticalFitLabel: verticalFitLabel,
      proposedFreshnessLabel: freshnessLabel(sourceDate, request.requestedAt),
      proposedSurface: productScope.ok ? 'default' : 'fallback',
      proposedFallbackState: productScope.ok ? undefined : 'needs_review',
      evidenceSummary: baseEvidenceSummary,
      evidenceSourceUrls: evidenceGate.evidenceSourceUrls,
      whyNowReasons: productScope.ok
        ? [`Official TDLR registration dated ${sourceDate} is inside the 45-day building-permit freshness window.`]
        : [],
    })
    if (!classification.ok) throw new Error(classification.gateReasons.join(' '))
    stageCounts.classification.passed += 1

    if (!productScope.ok) {
      const prospect = await prospectPlanFor({
        request,
        hydrated,
        evidencePlan,
        verticalFitLabel,
        businessName,
        demotionReason: productScope.reasons[0] ?? 'Product-scope guard demoted the candidate.',
        demotedFromSignal: true,
      })
      stageCounts.scoring.passed += 1
      if (prospect.claimGuardDisposition === 'passed') stageCounts.claimGuard.passed += 1
      else if (prospect.claimGuardDisposition === 'revised') stageCounts.claimGuard.revised += 1
      else stageCounts.claimGuard.blocked += 1
      laneCounts[prospect.laneId] += 1
      await persister.recordProspectPlan(prospect)
      await persister.recordBlockedOrReviewPlan(prospect)
      return prospect
    }

    currentStage = 'score'
    const whyNow =
      `Official TDLR registration dated ${sourceDate} is inside the 45-day building-permit freshness window for commercial cleaning review.`
    const opportunityScore = opportunityScoreFor({
      project,
      evidencePlan,
      evidence,
      whyNow,
      sourceDate,
    })
    stageCounts.scoring.passed += 1

    currentStage = 'claim_guard'
    const guard = evaluateOpportunityClaimGuard({
      request,
      signalLabel: CP21C_SIGNAL_LABEL,
      verticalFitLabel,
      whyNow,
      score: opportunityScore,
      evidence,
      evidenceSummary: baseEvidenceSummary,
    })
    const disposition = claimGuardDisposition(guard)
    if (disposition === 'passed') stageCounts.claimGuard.passed += 1
    else if (disposition === 'revised') stageCounts.claimGuard.revised += 1
    else stageCounts.claimGuard.blocked += 1

    if (disposition === 'passed') {
      const buyerIdentityIssue = buyerIdentityIssueFor(businessName)
      if (buyerIdentityIssue !== null) {
        const prospect = await prospectPlanFor({
          request,
          hydrated,
          evidencePlan,
          verticalFitLabel,
          businessName,
          demotionReason: `Buyer identity lane-safety guard demoted the candidate because ${buyerIdentityIssue}.`,
          demotedFromSignal: true,
        })
        laneCounts[prospect.laneId] += 1
        await persister.recordProspectPlan(prospect)
        await persister.recordBlockedOrReviewPlan(prospect)
        return prospect
      }

      const plan: Cp21aOpportunityPlan = {
        candidateId: `cp21c-${project.projectNumber}`,
        leadKind: 'signal_backed_opportunity',
        state: 'active',
        laneId: 'todays_opportunities',
        businessName,
        market: CP21C_MARKET,
        vertical: CP21C_VERTICAL,
        signal: {
          signalType: CP21C_SIGNAL_TYPE,
          signalLabel: CP21C_SIGNAL_LABEL,
          freshnessWindow: '45 days',
          whyNow,
        },
        whyNow,
        claimsUrgency: true,
        verticalFitLabel,
        evidence: [evidencePlan],
        score: opportunityScore,
        recommendedAction: {
          label: 'Review source and contact route',
          detail: 'Review the official TDLR record and choose a sourced contact route before outreach.',
        },
        claimGuardDisposition: disposition,
        labelApproved: approvedLabel(CP21C_SIGNAL_LABEL, verticalFitLabel, 'Review source and contact route'),
        lineage: lineageFor(project, evidence),
      }
      laneCounts[plan.laneId] += 1
      await persister.recordOpportunityPlan(plan)
      return plan
    }

    const prospect = await prospectPlanFor({
      request,
      hydrated,
      evidencePlan,
      verticalFitLabel,
      businessName,
      demotionReason: guard.gateReasons[0] ?? 'Claim Guard demoted the candidate.',
      demotedFromSignal: true,
    })
    laneCounts[prospect.laneId] += 1
    await persister.recordProspectPlan(prospect)
    await persister.recordBlockedOrReviewPlan(prospect)
    return prospect
  } catch (error) {
    recordStageFailure(stageCounts, currentStage)
    throw failedCandidate({
      candidateId: `cp21c-${project.projectNumber}`,
      stage: currentStage,
      reason: errorMessage(error),
      lineage: lineageFor(project, evidence),
    })
  }
}

function estimatedCostCents(spendUsd: number): number {
  return Math.round(spendUsd * 100)
}

function buildMetrics({
  report,
  sourceAdapterCalls,
  rawRecordsReturned,
  discoveredCandidates,
  dedupedCandidates,
  hydratedCandidates,
  candidateDispositions,
  usage,
}: {
  report: Cp21aConductorRunReport
  sourceAdapterCalls: readonly Cp21cSourceAdapterCall[]
  rawRecordsReturned: number
  discoveredCandidates: number
  dedupedCandidates: number
  hydratedCandidates: number
  candidateDispositions: readonly Cp21cCandidateDisposition[]
  usage: Cp21cProviderUsage
}): Cp21cLiveMetrics {
  const persistedNeedsReview = report.prospects.filter((prospect) => prospect.laneId === 'needs_review').length
  const persistedProspects = report.prospects.filter((prospect) => prospect.laneId === 'prospect_pool').length
  const persistedOpportunities = report.opportunities.length
  const opportunityGradeSignalAvailable = persistedOpportunities > 0
  const failedCandidates = candidateDispositions.filter((disposition) =>
    disposition.finalDisposition === 'failed_not_persisted'
  ).length
  const demotedCandidates = candidateDispositions.filter((disposition) =>
    disposition.finalDisposition === 'demoted_not_persisted' ||
    (disposition.finalDisposition === 'persisted_needs_review' && disposition.demotionReason !== null)
  ).length
  const blockedCandidates = candidateDispositions.filter((disposition) =>
    disposition.finalDisposition === 'blocked_not_persisted'
  ).length
  const hydratedCandidateDispositionCount = candidateDispositions.length

  return {
    sourceAdapterListingCalls: sourceAdapterCalls.length,
    rawRecordsReturned,
    discoveredCandidates,
    dedupedCandidates,
    hydratedCandidates,
    liveRecordsPersisted: persistedOpportunities + persistedProspects + persistedNeedsReview,
    opportunityGradeSignalAvailable,
    noOpportunityGradeSignalReason: opportunityGradeSignalAvailable
      ? null
      : 'No hydrated live TDLR record passed all opportunity-grade gates inside the bounded CP21C run.',
    persistedOpportunities,
    persistedProspects,
    persistedNeedsReview,
    failedCandidates,
    demotedCandidates,
    blockedCandidates,
    hydratedCandidateDispositionCount,
    dispositionAccountingComplete: hydratedCandidateDispositionCount === hydratedCandidates,
    noSilentHydratedCandidateDrops: hydratedCandidateDispositionCount === hydratedCandidates,
    providerCalls: usage.sourceAdapterCalls + usage.firecrawlCalls,
    sourceAdapterCalls: usage.sourceAdapterCalls,
    firecrawlCalls: usage.firecrawlCalls,
    serpApiCalls: 0,
    estimatedProviderSpendUsd: usage.estimatedProviderSpendUsd,
    budgetExceeded: usage.estimatedProviderSpendUsd > MAX_ESTIMATED_PROVIDER_SPEND_USD,
    budgetAbortTriggered: usage.budgetAbortTriggered,
    perCandidateErrorsIsolated: report.failedCandidates.length > 0 &&
      (report.opportunities.length + report.prospects.length) > 0,
    liveRecords: hydratedCandidates > 0,
  }
}

export async function runCp21cLiveTdlrConductor(
  request: Cp21aRunRequest,
  options: {
    firecrawlApiKey: string
    persister?: Cp21aConductorPersister
    cachedCandidateSet?: Cp21cCachedCandidateSet
  },
): Promise<Cp21cLiveConductorResult> {
  if (!request.workspaceId.startsWith(CP21C_WORKSPACE_PREFIX)) {
    throw new Error(`CP21C requires workspace IDs prefixed ${CP21C_WORKSPACE_PREFIX}.`)
  }
  if (process.env.CP21C_LIVE_TDLR_DFW_APPROVED !== 'fetchi-cp21-proof') {
    throw new Error('CP21C_LIVE_TDLR_DFW_APPROVED must equal fetchi-cp21-proof.')
  }
  if (!options.firecrawlApiKey.trim()) {
    throw new Error('FIRECRAWL_API_KEY is required for CP21C live evidence hydration.')
  }

  const persister = options.persister ?? createNoopCp21aConductorPersister()
  const stageCounts = emptyStageCounts()
  const laneCounts = emptyLaneCounts()
  const startedAt = request.requestedAt
  const runId = `${CP21C_WORKSPACE_PREFIX}${hashText(`${request.workspaceId}:${request.requestedAt}`).slice(0, 12)}`
  const usage: Cp21cProviderUsage = {
    sourceAdapterCalls: 0,
    firecrawlCalls: 0,
    estimatedProviderSpendUsd: 0,
    budgetAbortTriggered: false,
  }

  await persister.recordRunStarted(request)

  try {
    const cached = options.cachedCandidateSet
    const sourceResult = cached
      ? {
          calls: cached.sourceAdapterCalls,
          candidates: cached.hydratedCandidates.map((candidate) => candidate.project),
        }
      : await runTdlrSourceAdapter(request.requestedAt)
    const sourceAdapterCalls = sourceResult.calls
    usage.sourceAdapterCalls = cached ? 0 : sourceAdapterCalls.length

    if (!cached && sourceAdapterCalls.every((call) => call.status === 'error')) {
      throw new Error('All CP21C TDLR SearchProjects direct GET calls failed.')
    }

    const rawRecordsReturned = cached
      ? cached.rawRecordsReturned
      : sourceAdapterCalls.reduce((sum, call) => sum + call.recordsReturned, 0)
    const discoveredCandidates = cached
      ? cached.discoveredCandidates
      : sourceResult.candidates.length
    const deduped = cached
      ? cached.hydratedCandidates.map((candidate) => candidate.project)
      : dedupeTdlrCandidates(sourceResult.candidates, request.requestedAt)
    const dedupedCandidates = cached ? cached.dedupedCandidates : deduped.length

    if (!cached && deduped.length === 0) {
      throw new Error('TDLR SearchProjects returned no DFW TABS project candidates in the 45-day registration window.')
    }

    stageCounts.discovery.discovered = discoveredCandidates
    stageCounts.discovery.deduped = Math.max(0, discoveredCandidates - dedupedCandidates)

    const failedCandidates: Cp21aFailedCandidate[] = []
    const hydrated = cached
      ? cached.hydratedCandidates
      : await hydrateCandidates({
          candidates: deduped,
          request,
          firecrawlApiKey: options.firecrawlApiKey,
          sourceAdapterCalls,
          usage,
          stageCounts,
          laneCounts,
          failedCandidates,
        })

    if (hydrated.length === 0) {
      throw new Error('No CP21C live TDLR detail pages were hydrated into usable evidence.')
    }

    const opportunities: Cp21aOpportunityPlan[] = []
    const prospects: Cp21aProspectPlan[] = []
    const demotedCandidates: Cp21aProspectPlan[] = []
    const candidateDispositions: Cp21cCandidateDisposition[] = []
    const persistedItemAudits: Cp21cPersistedItemAudit[] = []
    const proofOnlyFault = proofOnlyFaultCandidate()
    failedCandidates.push(proofOnlyFault)
    stageCounts.hydrate.failed += 1
    laneCounts.needs_review += 1

    for (const hydratedCandidate of hydrated) {
      if (opportunities.length + prospects.length >= MAX_PERSISTED_LIVE_ITEMS) {
        const reason = `CP21C persistence cap reached at ${MAX_PERSISTED_LIVE_ITEMS} live records.`
        candidateDispositions.push(dispositionForHydratedCandidate({
          hydrated: hydratedCandidate,
          finalDisposition: 'blocked_not_persisted',
          lane: null,
          failureStage: 'persist',
          demotionStage: null,
          failureReason: reason,
          demotionReason: null,
          includedInLiveRecordsPersisted: false,
        }))
        continue
      }
      if (opportunities.length >= MAX_ACCEPTED_OPPORTUNITIES) {
        const reason = `CP21C opportunity cap reached at ${MAX_ACCEPTED_OPPORTUNITIES} persisted opportunities.`
        candidateDispositions.push(dispositionForHydratedCandidate({
          hydrated: hydratedCandidate,
          finalDisposition: 'blocked_not_persisted',
          lane: null,
          failureStage: 'persist',
          demotionStage: null,
          failureReason: reason,
          demotionReason: null,
          includedInLiveRecordsPersisted: false,
        }))
        continue
      }
      const prospectOrReviewCount = prospects.filter((prospect) =>
        prospect.laneId === 'prospect_pool' || prospect.laneId === 'needs_review'
      ).length
      if (prospectOrReviewCount >= MAX_PROSPECT_OR_REVIEW_ITEMS) {
        const reason = `CP21C prospect/review cap reached at ${MAX_PROSPECT_OR_REVIEW_ITEMS} persisted records.`
        candidateDispositions.push(dispositionForHydratedCandidate({
          hydrated: hydratedCandidate,
          finalDisposition: 'blocked_not_persisted',
          lane: null,
          failureStage: 'persist',
          demotionStage: null,
          failureReason: reason,
          demotionReason: null,
          includedInLiveRecordsPersisted: false,
        }))
        continue
      }

      try {
        const plan = await processHydratedCandidate({
          request,
          hydrated: hydratedCandidate,
          sourceAdapterCalls,
          persister,
          stageCounts,
          laneCounts,
        })
        if (plan.leadKind === 'signal_backed_opportunity') {
          opportunities.push(plan)
        } else {
          prospects.push(plan)
          if (plan.demotedFromSignal) demotedCandidates.push(plan)
        }
        persistedItemAudits.push(persistedItemAuditFor(plan))
        const demotedFromSignal = 'demotedFromSignal' in plan && plan.demotedFromSignal
        const demotionReason = 'demotionReason' in plan ? plan.demotionReason : null
        candidateDispositions.push(dispositionForHydratedCandidate({
          hydrated: hydratedCandidate,
          finalDisposition: plan.leadKind === 'signal_backed_opportunity'
            ? 'persisted_opportunity'
            : plan.laneId === 'needs_review'
              ? 'persisted_needs_review'
              : 'persisted_prospect',
          lane: plan.laneId,
          failureStage: null,
          demotionStage: demotedFromSignal
            ? demotionReason?.includes('Product-scope')
              ? 'classify'
              : 'claim_guard'
            : null,
          failureReason: null,
          demotionReason: demotedFromSignal ? demotionReason : null,
          includedInLiveRecordsPersisted: true,
        }))
      } catch (error) {
        if (typeof error === 'object' && error !== null && 'status' in error) {
          const failed = error as Cp21aFailedCandidate
          failedCandidates.push(failed)
          laneCounts[failed.laneId] += 1
          await persister.recordCandidateStageResult({
            candidateId: failed.candidateId,
            stage: failed.failureStage,
            status: 'failed',
            reason: failed.failureReason,
          })
          await persister.recordBlockedOrReviewPlan(failed)
          candidateDispositions.push(dispositionForHydratedCandidate({
            hydrated: hydratedCandidate,
            finalDisposition: 'failed_not_persisted',
            lane: null,
            failureStage: failed.failureStage,
            demotionStage: null,
            failureReason: failed.failureReason,
            demotionReason: null,
            includedInLiveRecordsPersisted: false,
          }))
          continue
        }
        throw error
      }
    }

    if (opportunities.length + prospects.length === 0) {
      throw new Error('No hydrated CP21C live candidate passed or demoted into a persistable lane-safe plan.')
    }

    await persister.recordBudgetUsage({
      providerCalls: usage.sourceAdapterCalls + usage.firecrawlCalls,
      dbWrites: 0,
      estimatedCostCents: estimatedCostCents(usage.estimatedProviderSpendUsd),
      budgetExhausted: usage.budgetAbortTriggered,
    })

    let persistence = persister.report()
    stageCounts.persistence.plans = persistence.plansCaptured
    stageCounts.persistence.writes = persistence.dbWrites

    const allItems = [...opportunities, ...prospects]
    const labelsApproved = allItems.every((item) => item.labelApproved)
    const prospectUrgencyLeaks = prospects.filter((prospect) => {
      return (
        prospect.signal !== null ||
        prospect.whyNow !== null ||
        prospect.claimsUrgency !== false ||
        prospect.score.opportunityUrgencyScore !== null
      )
    }).length
    const scoreReasonsAreEvidenceCited = allItems.every((item) =>
      scoreReasonsCiteEvidence(item.score.reasons),
    )
    const blockedOrReviewItems = [
      ...failedCandidates,
      ...prospects.filter((prospect) => prospect.laneId === 'needs_review'),
    ]

    const report: Cp21aConductorRunReport = {
      ok: true,
      mode: 'cp21c_live_tdlr_conductor',
      status: 'completed',
      runId,
      workspaceId: request.workspaceId,
      startedAt,
      completedAt: request.requestedAt,
      durationMs: 0,
      providerMode: {
        discovery: 'tdlr_tabs_source_adapter',
        evidence: cached ? 'none' : 'firecrawl',
        reasoning: 'mock',
        persistence: persistence.mode === 'postgres' ? 'postgres' : 'noop',
      },
      stageCounts,
      laneCounts,
      opportunities,
      prospects,
      failedCandidates,
      demotedCandidates,
      blockedOrReviewItems,
      providerCalls: usage.sourceAdapterCalls + usage.firecrawlCalls,
      dbWrites: persistence.dbWrites,
      estimatedCostCents: estimatedCostCents(usage.estimatedProviderSpendUsd),
      budgetExhausted: usage.budgetAbortTriggered,
      badCandidateDidNotAbortRun:
        failedCandidates.some((candidate) => candidate.candidateId === proofOnlyFault.candidateId) &&
        (opportunities.length > 0 || prospects.length > 0),
      labelsApproved,
      prospectUrgencyLeaks,
      scoreReasonsCiteEvidence: scoreReasonsAreEvidenceCited,
      persistence,
    }

    await persister.recordRunCompleted(report)
    persistence = persister.report()
    report.persistence = persistence
    report.stageCounts.persistence.plans = persistence.plansCaptured
    report.stageCounts.persistence.writes = persistence.dbWrites
    report.dbWrites = persistence.dbWrites
    report.providerMode.persistence = persistence.mode === 'postgres' ? 'postgres' : 'noop'

    const metrics = buildMetrics({
      report,
      sourceAdapterCalls,
      rawRecordsReturned,
      discoveredCandidates,
      dedupedCandidates,
      hydratedCandidates: hydrated.length,
      candidateDispositions,
      usage,
    })

    return {
      report,
      metrics,
      cachedCandidateSet: {
        evaluatedAt: request.requestedAt,
        sourceAdapterCalls,
        rawRecordsReturned,
        discoveredCandidates,
        dedupedCandidates,
        hydratedCandidates: hydrated,
      },
      candidateDispositions,
      persistedItemAudits,
    }
  } catch (error) {
    await persister.recordRunFailed({
      request,
      reason: errorMessage(error),
    })
    throw error
  }
}
