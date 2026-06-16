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

export const CP20A_PROOF_ROUTE = '/internal/cp20a'
export const CP20A_SIGNAL_ID = 'building_permit'
export const CP20A_SIGNAL_LABEL = 'BUILDOUT' satisfies CommercialCleaningSignalLabel

type Cp20aProofStatus = 'ready' | 'blocked'
type Cp20aProviderMode = 'LIVE'
type Cp20aProviderName = 'serpapi' | 'firecrawl'
type Cp20aCallStatus = 'ok' | 'error' | 'skipped'

export type Cp20aProviderCall = {
  provider: Cp20aProviderName
  status: Cp20aCallStatus
  runId: string | null
  detail: string
  sourceUrl?: string
  estimatedCostUsd: number
}

export type Cp20aSourceAdapterCall = {
  adapter: 'tdlr-tabs'
  status: Cp20aCallStatus
  runId: string
  county: string
  url: string
  detail: string
  recordsReturned: number
  candidatesAccepted: number
}

type Cp20aBaseProof = {
  status: Cp20aProofStatus
  providerMode: Cp20aProviderMode
  providerModeReason: string
  proof: {
    capturedAt: string
    evaluatedAt: string
    searchQuery: string
    officialListingEndpoint: string
    market: 'DFW'
    providerCalls: Cp20aProviderCall[]
    sourceAdapterCalls: Cp20aSourceAdapterCall[]
    estimatedProviderSpendUsd: number
  }
}

export type Cp20aLiveOpportunity = Cp20aBaseProof & {
  status: 'ready'
  prospect: {
    businessName: string
    location: string
    address: string | null
  }
  evidence: {
    signalId: typeof CP20A_SIGNAL_ID
    signalLabel: typeof CP20A_SIGNAL_LABEL
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
    sourceAdapter: 'tdlr-tabs'
    sourceAdapterRunIds: string[]
    evidenceProvider: 'firecrawl'
    evidenceProviderRunId: string
    liveFingerprint: string
  }
  nextAction: {
    label: 'Draft outreach'
    detail: string
  }
  proof: Cp20aBaseProof['proof'] & {
    sourceAdapterReasons: string[]
    productScopeGuardReasons: string[]
    evidenceGateReasons: string[]
    classificationGateReasons: string[]
    scoringGateReasons: string[]
    claimGuardReasons: string[]
    replayableLineage: string
  }
}

export type Cp20aBlockedProof = Cp20aBaseProof & {
  status: 'blocked'
  blockerCode:
    | 'missing_provider_keys'
    | 'search_provider_failed'
    | 'source_validation_failed'
    | 'source_adapter_failed'
    | 'no_source_adapter_candidates'
    | 'evidence_provider_failed'
    | 'no_surfaceable_live_opportunity'
  blocker: string
  missingEnv: string[]
  liveLineage: {
    searchProviderRunId: string | null
    sourceAdapterRunIds: string[]
    evidenceProviderRunId: string | null
  }
}

export type Cp20aProofResult = Cp20aLiveOpportunity | Cp20aBlockedProof

type DfwCounty = {
  id: string
  name: string
}

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

const CP20A_WORKSPACE_ID = 'cp20a-admin-tdlr-source-adapter-proof'
const CP20A_QUERY =
  'site:tdlr.texas.gov/tabs/search "Project Search" "Registration Date" "SearchProjects"'
const CP20A_OFFICIAL_SEARCH_URL = 'https://www.tdlr.texas.gov/tabs/search'
const CP20A_TDLR_SEARCH_PROJECTS_ENDPOINT =
  'https://www.tdlr.texas.gov/TABS/Search/SearchProjects'
const CP20A_TABS_PROJECT_URL_BASE = 'https://www.tdlr.texas.gov/TABS/Search/Project/'
const CP20A_MAX_SERPAPI_CALLS = 1
const CP20A_MAX_FIRECRAWL_ATTEMPTS = 4
const CP20A_MAX_TDLR_LISTING_CALLS = 9
const CP20A_MAX_PROVIDER_CALLS =
  CP20A_MAX_SERPAPI_CALLS + CP20A_MAX_FIRECRAWL_ATTEMPTS
const CP20A_SOURCE_WINDOW_DAYS = 45
const CP20A_TDLR_PROJECT_STATUS_REGISTERED = '3008'
const CP20A_TDLR_DATA_VERSION_TABS = '900001'
const CP20A_TDLR_RESULT_LENGTH = '25'
const CP20A_TDLR_RENOVATION_ALTERATION = 9002
const CP20A_VERTICAL_FIT_LABEL =
  'Post-Construction Clean' satisfies CommercialCleaningVerticalFitLabel

const CP20A_DFW_COUNTIES: DfwCounty[] = [
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

const CP20A_RESIDENTIAL_DISQUALIFIER_PATTERN =
  /\b(single[-\s]family|single family residential|residential subdivision|residential only|condominiums?|condos?|apartment units?|townhomes?|private residence|homeowner|dwelling)\b/i
const CP20A_SIDEWALK_CURB_PATTERN = /\b(sidewalk|curb ramps?)\b/i
const CP20A_RESIDENTIAL_CONTEXT_PATTERN =
  /\b(residential|single[-\s]family|subdivision|homeowner|dwelling)\b/i
const CP20A_COMMERCIAL_FIT_PATTERN =
  /\b(commercial|tenant improvement|tenant finish(?:out)?|finish out|buildout|build-out|renovation|alteration|office|retail|restaurant|warehouse|shell|medical|suite|remodel|hotel|clinic|studio|facility|business|store|salon|gym)\b/i
const CP20A_WEAK_FIT_PATTERN =
  /\b(public right of way|sidewalk only|curb ramp only|parking lot only|roof only|sign only|fence only|pool only|monument only)\b/i

function hasValue(value: string | undefined | null): value is string {
  return typeof value === 'string' && value.trim().length > 0
}

function nowIso(): string {
  return new Date().toISOString()
}

function sourceDateIso(date: string): string {
  return `${date}T00:00:00.000Z`
}

function parseDateMs(value: string): number {
  const parsed = Date.parse(value)
  return Number.isNaN(parsed) ? 0 : parsed
}

function dateOnly(value: Date): string {
  return value.toISOString().slice(0, 10)
}

function addDays(value: Date, days: number): Date {
  const copy = new Date(value)
  copy.setUTCDate(copy.getUTCDate() + days)
  return copy
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
  const start = addDays(end, -CP20A_SOURCE_WINDOW_DAYS)
  return { start, end }
}

function providerCost(calls: readonly Cp20aProviderCall[]): number {
  return Number(
    calls
      .reduce((sum, call) => sum + call.estimatedCostUsd, 0)
      .toFixed(2),
  )
}

function replayFingerprint(text: string): string {
  return createHash('sha256').update(text).digest('hex').slice(0, 16)
}

function newSourceAdapterRunId(countyId: string): string {
  return `tdlr-tabs:${Date.now()}:${countyId}:${Math.random()
    .toString(36)
    .slice(2, 8)}`
}

function liveRunId(value: string): string {
  if (!hasValue(value) || value.startsWith('recorded-')) {
    throw new Error('CP20A requires non-recorded live run IDs.')
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

function buildBudget(workspaceId: string): BudgetEnvelope {
  return {
    workspaceId,
    maxProviderCalls: CP20A_MAX_PROVIDER_CALLS,
    maxSpendEstimateUsd: 0.06,
    triggeredBy: 'admin_replay',
  }
}

function blockedProof({
  blockerCode,
  blocker,
  capturedAt,
  evaluatedAt,
  providerCalls,
  sourceAdapterCalls,
  missingEnv = [],
}: {
  blockerCode: Cp20aBlockedProof['blockerCode']
  blocker: string
  capturedAt: string
  evaluatedAt: string
  providerCalls: Cp20aProviderCall[]
  sourceAdapterCalls: Cp20aSourceAdapterCall[]
  missingEnv?: string[]
}): Cp20aBlockedProof {
  const searchCall = providerCalls.find((call) => call.provider === 'serpapi')
  const evidenceCall = [...providerCalls]
    .reverse()
    .find((call) => call.provider === 'firecrawl')

  return {
    status: 'blocked',
    providerMode: 'LIVE',
    providerModeReason:
      'CP20A has no recorded-real fallback. It can surface only a live SerpApi source-validation run, live TDLR source-adapter records, and live Firecrawl evidence hydration.',
    blockerCode,
    blocker,
    missingEnv,
    liveLineage: {
      searchProviderRunId: searchCall?.runId ?? null,
      sourceAdapterRunIds: sourceAdapterCalls.map((call) => call.runId),
      evidenceProviderRunId: evidenceCall?.runId ?? null,
    },
    proof: {
      capturedAt,
      evaluatedAt,
      searchQuery: CP20A_QUERY,
      officialListingEndpoint: CP20A_TDLR_SEARCH_PROJECTS_ENDPOINT,
      market: 'DFW',
      providerCalls,
      sourceAdapterCalls,
      estimatedProviderSpendUsd: providerCost(providerCalls),
    },
  }
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

function sourceDateFromUnknown(value: unknown): string | null {
  const raw = stringValue(value)
  if (!raw) return null
  const parsed = new Date(raw)
  if (Number.isNaN(parsed.getTime())) return null
  return dateOnly(parsed)
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

function isWithinSourceWindow(sourceDate: string, evaluatedAt: string): boolean {
  const sourceMs = parseDateMs(sourceDateIso(sourceDate))
  const evaluatedMs = parseDateMs(evaluatedAt)
  if (sourceMs === 0 || evaluatedMs === 0) return false

  const ageDays = (evaluatedMs - sourceMs) / 86_400_000
  return ageDays >= 0 && ageDays <= CP20A_SOURCE_WINDOW_DAYS
}

function makeFreshnessLabel(sourceDate: string, evaluatedAt: string): string {
  const evaluatedAtMs = parseDateMs(evaluatedAt)
  const sourceAtMs = parseDateMs(sourceDateIso(sourceDate))
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

function extractCityState(text: string): string | null {
  const match = text.match(/\b([A-Z][A-Za-z .'-]{2,}),\s*(TX|Texas)\b/)
  if (!match) return null

  const city = cleanValue(match[1])
  if (!city) return null

  return `${city}, TX`
}

function normalizedRowText(candidate: TdlrProjectCandidate): string {
  return [
    candidate.projectNumber,
    candidate.projectName,
    candidate.facilityName ?? '',
    candidate.county.name,
    candidate.typeOfWorkLabel,
    candidate.registrationDate,
    candidate.estimatedStartDate ?? '',
    candidate.estimatedEndDate ?? '',
  ].join('\n')
}

function normalizeTdlrProjectRow(
  raw: unknown,
  county: DfwCounty,
  listingUrl: string,
  sourceAdapterRunId: string,
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

  return {
    projectNumber: projectNumber.toUpperCase(),
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
    sourceUrl: `${CP20A_TABS_PROJECT_URL_BASE}${projectNumber.toUpperCase()}`,
    listingUrl,
    sourceAdapterRunId,
    raw: row,
  }
}

function buildTdlrListingUrl(
  county: DfwCounty,
  evaluatedAt: string,
): string {
  const { start, end } = sourceWindow(evaluatedAt)
  const params = new URLSearchParams({
    LocationCounty: county.id,
    RegistrationDateBegin: formatTdlrDate(start),
    RegistrationDateEnd: formatTdlrDate(end),
    ProjectStatus: CP20A_TDLR_PROJECT_STATUS_REGISTERED,
    DataVersionId: CP20A_TDLR_DATA_VERSION_TABS,
    start: '0',
    length: CP20A_TDLR_RESULT_LENGTH,
  })

  return `${CP20A_TDLR_SEARCH_PROJECTS_ENDPOINT}?${params.toString()}`
}

async function fetchTdlrCountyCandidates(
  county: DfwCounty,
  evaluatedAt: string,
): Promise<{
  call: Cp20aSourceAdapterCall
  candidates: TdlrProjectCandidate[]
}> {
  const runId = newSourceAdapterRunId(county.id)
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
  calls: Cp20aSourceAdapterCall[]
  candidates: TdlrProjectCandidate[]
}> {
  const calls: Cp20aSourceAdapterCall[] = []
  const candidates: TdlrProjectCandidate[] = []

  for (const county of CP20A_DFW_COUNTIES.slice(0, CP20A_MAX_TDLR_LISTING_CALLS)) {
    const result = await fetchTdlrCountyCandidates(county, evaluatedAt)
    calls.push(result.call)
    candidates.push(...result.candidates)
  }

  return { calls, candidates: sortedTdlrCandidates(candidates, evaluatedAt) }
}

function tdlrCandidateRank(candidate: TdlrProjectCandidate, evaluatedAt: string): number {
  const text = normalizedRowText(candidate)
  let rank = 0

  if (isWithinSourceWindow(candidate.registrationDate, evaluatedAt)) rank += 40
  if (candidate.typeOfWork === CP20A_TDLR_RENOVATION_ALTERATION) rank += 35
  if (CP20A_COMMERCIAL_FIT_PATTERN.test(text)) rank += 20
  if (candidate.estimatedEndDate) rank += 10
  if (candidate.estimatedCost !== null && candidate.estimatedCost >= 100_000) rank += 5
  if (CP20A_RESIDENTIAL_DISQUALIFIER_PATTERN.test(text)) rank -= 100
  if (CP20A_WEAK_FIT_PATTERN.test(text)) rank -= 50

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

function candidateSignalFromTdlrProject(
  project: TdlrProjectCandidate,
): CandidateSignal {
  return {
    providerRunId: project.sourceAdapterRunId,
    workspaceId: CP20A_WORKSPACE_ID,
    vertical: COMMERCIAL_CLEANING_VERTICAL_ID,
    signalType: CP20A_SIGNAL_ID,
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
      ]
        .filter(Boolean)
        .join(' '),
      rank: 1,
      rawEngineMetadata: {
        sourceAdapter: 'tdlr-tabs',
        listingUrl: project.listingUrl,
        raw: project.raw,
      },
    },
    discoveredAt: nowIso(),
  }
}

function isOfficialTdlrSourceCandidate(candidate: CandidateSignal): boolean {
  const text = `${candidate.hit.title}\n${candidate.hit.snippet}\n${candidate.hit.url ?? ''}`
  let url: URL | null = null

  if (candidate.hit.url) {
    try {
      url = new URL(candidate.hit.url)
    } catch {
      url = null
    }
  }

  return (
    text.toLowerCase().includes('tdlr') &&
    (url?.hostname.toLowerCase().endsWith('tdlr.texas.gov') ?? false)
  )
}

function isOfficialTdlrProjectUrl(sourceUrl: string, projectNumber: string): boolean {
  let url: URL

  try {
    url = new URL(sourceUrl)
  } catch {
    return false
  }

  return (
    url.hostname.toLowerCase() === 'www.tdlr.texas.gov' &&
    url.pathname.toLowerCase() ===
      `/tabs/search/project/${projectNumber.toLowerCase()}`
  )
}

function buildSearchTask(budget: BudgetEnvelope): SearchTask {
  return {
    workspaceId: CP20A_WORKSPACE_ID,
    vertical: COMMERCIAL_CLEANING_VERTICAL_ID,
    signalType: CP20A_SIGNAL_ID,
    engine: 'google_light',
    query: CP20A_QUERY,
    location: { city: 'Dallas', state: 'Texas, United States' },
    dateWindow: '45 days',
    budget,
  }
}

function sourceAdapterReasons(project: TdlrProjectCandidate): string[] {
  return [
    'CP20A source adapter used the official TDLR SearchProjects JSON endpoint with direct GET parameters.',
    `DFW county filter passed for ${project.county.name} County.`,
    `Registration date ${project.registrationDate} came from official TDLR JSON and is within the 45-day CP20A window.`,
    `Official detail URL was constructed from TDLR ProjectNumber ${project.projectNumber}.`,
    `TDLR work type is ${project.typeOfWorkLabel}.`,
  ]
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
  const text = `${normalizedRowText(project)}\n${evidence.title ?? ''}\n${evidence.cleanedText}`
  const reasons: string[] = []

  if (!CP20A_DFW_COUNTIES.some((county) => county.id === project.county.id)) {
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
    CP20A_RESIDENTIAL_DISQUALIFIER_PATTERN.test(text) ||
    (CP20A_SIDEWALK_CURB_PATTERN.test(text) && CP20A_RESIDENTIAL_CONTEXT_PATTERN.test(text))
  ) {
    return {
      ok: false,
      reasons: [
        'Residential guard rejected the candidate because the evidence contains residential-only scope.',
      ],
    }
  }
  reasons.push('Residential disqualification guard passed.')

  if (CP20A_WEAK_FIT_PATTERN.test(text)) {
    return {
      ok: false,
      reasons: [
        'Commercial fit guard rejected the candidate because the project text indicates a weak or wrong-scope record.',
      ],
    }
  }

  if (
    project.typeOfWork !== CP20A_TDLR_RENOVATION_ALTERATION &&
    !CP20A_COMMERCIAL_FIT_PATTERN.test(text)
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

function extractProspect(
  project: TdlrProjectCandidate,
  evidence: EvidenceDocument,
): Cp20aLiveOpportunity['prospect'] | null {
  const text = `${project.projectName}\n${project.facilityName ?? ''}\n${evidence.title ?? ''}\n${evidence.cleanedText}`
  const projectName = extractLabeledValue(text, [
    'Project Name',
    'Business Name',
    'Tenant Name',
    'Permit For',
    'Applicant',
  ])
  const facilityName = extractLabeledValue(text, ['Facility Name', 'Property Name'])
  const businessName =
    projectName ?? project.projectName ?? facilityName ?? project.facilityName
  const address = extractAddress(text)
  const cityState = extractCityState(address ?? text)
  const location = cityState ?? `${project.county.name} County, TX`

  if (!businessName || !location) return null

  return {
    businessName,
    location,
    address,
  }
}

function inferVerticalFitLabel(
  project: TdlrProjectCandidate,
  evidence: EvidenceDocument,
): CommercialCleaningVerticalFitLabel {
  const text = `${normalizedRowText(project)}\n${evidence.title ?? ''}\n${evidence.cleanedText}`

  if (/\boffice|suite|studio\b/i.test(text)) return 'New Office'
  if (/\b(final clean|final cleaning)\b/i.test(text)) return 'Final Clean'
  return CP20A_VERTICAL_FIT_LABEL
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
  providerCalls,
  sourceAdapterCalls,
  searchProviderRunId,
  project,
  candidate,
  evidence,
  sourceDate,
}: {
  capturedAt: string
  evaluatedAt: string
  providerCalls: Cp20aProviderCall[]
  sourceAdapterCalls: Cp20aSourceAdapterCall[]
  searchProviderRunId: string
  project: TdlrProjectCandidate
  candidate: CandidateSignal
  evidence: EvidenceDocument
  sourceDate: string
}): Cp20aLiveOpportunity {
  const productScope = evaluateProductScope({
    project,
    evidence,
    sourceDate,
    evaluatedAt,
  })
  if (!productScope.ok) {
    throw new Error(productScope.reasons.join(' '))
  }

  const prospect = extractProspect(project, evidence)
  if (!prospect) {
    throw new Error('Live TDLR evidence did not include a usable prospect name and location.')
  }

  if (!hasValue(evidence.sourceUrl)) {
    throw new Error('CP20A requires a live official TDLR detail source URL.')
  }

  const sourceUrl = evidence.sourceUrl
  if (!isOfficialTdlrProjectUrl(sourceUrl, project.projectNumber)) {
    throw new Error(
      'CP20A requires Firecrawl evidence from the official TDLR project detail URL.',
    )
  }

  const evidenceSourceUrls = [sourceUrl]
  const providerRunIds = [
    liveRunId(searchProviderRunId),
    liveRunId(project.sourceAdapterRunId),
    liveRunId(evidence.providerRunId),
  ]
  const verticalFitLabel = inferVerticalFitLabel(project, evidence)
  const sourceExcerpt = excerptFromEvidence(evidence.cleanedText)
  const evidenceSummary =
    `${prospect.businessName} has an official TDLR ${project.typeOfWorkLabel.toLowerCase()} record in ${project.county.name} County with a registration date of ${sourceDate}.`
  const whyNow =
    `Official TDLR registration dated ${sourceDate} is inside the 45-day building-permit freshness window, creating a post-construction/final-clean review window.`
  const scoreReason =
    'Live SerpApi source validation, TDLR source-adapter JSON, Firecrawl detail-page hydration, dated official source evidence, and approved BUILDOUT classification support the score.'

  const evidenceGate = assertContract(
    evaluateEvidenceGate({
      candidate,
      evidence: [evidence],
      requiredSignalType: CP20A_SIGNAL_ID,
      minCleanedTextLength: 80,
    }),
    'CP20A evidence gate',
  )

  const classification = assertContract(
    classifyCommercialCleaningSignal({
      verticalId: COMMERCIAL_CLEANING_VERTICAL_ID,
      rawSignalId: project.projectNumber,
      proposedSignalLabel: CP20A_SIGNAL_LABEL,
      proposedVerticalFitLabel: verticalFitLabel,
      proposedFreshnessLabel: makeFreshnessLabel(sourceDate, evaluatedAt),
      proposedSurface: 'default',
      evidenceSummary,
      evidenceSourceUrls,
      whyNowReasons: [whyNow],
    }),
    'CP20A Commercial Cleaning classification',
  )

  const scoring = assertContract(
    evaluateOpportunityScoring({
      leadKind: 'signal_backed_opportunity',
      signalType: CP20A_SIGNAL_ID,
      signalLabel: CP20A_SIGNAL_LABEL,
      evidenceSourceUrls,
      providerRunIds,
      evidenceSummary,
      whyNowReasons: [whyNow],
      freshnessWindow: '45 days',
      actionWindow: project.estimatedEndDate
        ? `Estimated completion ${project.estimatedEndDate}`
        : 'Post-construction cleaning quote window',
      signalObservedAt: sourceDateIso(sourceDate),
      publishedAt: evidence.publishedAt,
      scoreComponents: [
        {
          key: 'live_serpapi_source_validation',
          weight: 0.15,
          value: 1,
          reason: 'SerpApi validated the official TDLR project search source for this live proof run.',
        },
        {
          key: 'official_tdlr_source_adapter',
          weight: 0.25,
          value: 1,
          reason: 'The CP20A TDLR source adapter returned the project from official SearchProjects JSON.',
        },
        {
          key: 'live_firecrawl_detail_hydration',
          weight: 0.25,
          value: 1,
          reason: 'Firecrawl hydrated the official TDLR detail page before rendering.',
        },
        {
          key: 'commercial_cleaning_fit',
          weight: 0.2,
          value: 1,
          reason: `Approved vertical-fit label "${verticalFitLabel}" maps this BUILDOUT signal to commercial cleaning work.`,
        },
        {
          key: 'fresh_dated_signal',
          weight: 0.15,
          value: 1,
          reason: `Source date ${sourceDate} is within the 45-day building_permit window.`,
        },
      ],
    }),
    'CP20A scoring',
  )

  const claimGuard = assertContract(
    evaluateClaimGuard({
      evaluatedAt,
      config: {
        approvedSignalLabels: APPROVED_COMMERCIAL_CLEANING_SIGNAL_LABELS,
        approvedVerticalFitLabels: APPROVED_COMMERCIAL_CLEANING_VERTICAL_FIT_LABELS,
        maxSignalAgeDays: CP20A_SOURCE_WINDOW_DAYS,
      },
      artifact: {
        workspaceId: CP20A_WORKSPACE_ID,
        leadKind: 'signal_backed_opportunity',
        signalLabel: CP20A_SIGNAL_LABEL,
        verticalFitLabel,
        claimsUrgency: true,
        score: scoring.opportunityUrgencyScore ?? 0,
        scoreReasons: [
          {
            code: 'cp20a_live_source_adapter_score',
            text: scoreReason,
            evidenceIndexes: [0],
          },
        ],
        recommendedAction: 'Draft outreach',
        claims: [
          {
            kind: 'source_date',
            text: `The official TDLR source includes a building-permit registration date of ${sourceDate}.`,
            evidenceIndexes: [0],
          },
          {
            kind: 'commercial_cleaning_fit',
            text: sourceExcerpt,
            evidenceIndexes: [0],
          },
        ],
        evidence: [evidence],
      },
    }),
    'CP20A Claim Guard',
  )

  return {
    status: 'ready',
    providerMode: 'LIVE',
    providerModeReason:
      'SerpApi source validation, TDLR source-adapter listing fetch, and Firecrawl evidence hydration all completed with non-recorded live lineage.',
    prospect,
    evidence: {
      signalId: CP20A_SIGNAL_ID,
      signalLabel: CP20A_SIGNAL_LABEL,
      verticalFitLabel,
      sourceUrl,
      sourceDate,
      sourceTitle: evidence.title ?? `${project.projectName} (${project.projectNumber})`,
      sourceExcerpt,
    },
    score: {
      value: scoring.opportunityUrgencyScore ?? 0,
      reason: scoreReason,
      whyNow,
    },
    lineage: {
      searchProvider: 'serpapi',
      searchProviderRunId,
      sourceAdapter: 'tdlr-tabs',
      sourceAdapterRunIds: Array.from(
        new Set(sourceAdapterCalls.map((call) => call.runId)),
      ),
      evidenceProvider: 'firecrawl',
      evidenceProviderRunId: evidence.providerRunId,
      liveFingerprint: replayFingerprint(evidence.cleanedText),
    },
    nextAction: {
      label: 'Draft outreach',
      detail:
        'Prepare an unsent outreach draft that references the official TDLR detail URL and the post-construction/final-clean timing window.',
    },
    proof: {
      capturedAt,
      evaluatedAt,
      searchQuery: CP20A_QUERY,
      officialListingEndpoint: CP20A_TDLR_SEARCH_PROJECTS_ENDPOINT,
      market: 'DFW',
      providerCalls,
      sourceAdapterCalls,
      estimatedProviderSpendUsd: providerCost(providerCalls),
      sourceAdapterReasons: sourceAdapterReasons(project),
      productScopeGuardReasons: productScope.reasons,
      evidenceGateReasons: evidenceGate.gateReasons,
      classificationGateReasons: classification.gateReasons,
      scoringGateReasons: scoring.gateReasons,
      claimGuardReasons: claimGuard.gateReasons,
      replayableLineage:
        'Live run is replayable from the visible SerpApi source-validation query, TDLR SearchProjects GET URLs, official TDLR detail source URL, source date, source-adapter run IDs, provider run IDs, and Firecrawl evidence fingerprint. No DB/schema write is performed in CP20A.',
    },
  }
}

export async function getCp20aTdlrTabsProof(): Promise<Cp20aProofResult> {
  const capturedAt = nowIso()
  const evaluatedAt = capturedAt
  const missingEnv = missingProviderEnv()

  if (missingEnv.length > 0) {
    return blockedProof({
      blockerCode: 'missing_provider_keys',
      blocker:
        'Live SerpApi and Firecrawl keys are required for CP20A. There is no recorded-real fallback.',
      capturedAt,
      evaluatedAt,
      providerCalls: [],
      sourceAdapterCalls: [],
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
      evaluatedAt,
      providerCalls: [],
      sourceAdapterCalls: [],
      missingEnv,
    })
  }

  const budget = buildBudget(CP20A_WORKSPACE_ID)
  const providerCalls: Cp20aProviderCall[] = []
  const sourceAdapterCalls: Cp20aSourceAdapterCall[] = []
  const searchProvider = new SerpApiSearchProvider(serpApiKey)
  const searchResult = await searchProvider.discover(buildSearchTask(budget))

  providerCalls.push({
    provider: 'serpapi',
    status: searchResult.error ? 'error' : 'ok',
    runId: searchResult.providerRunId,
    detail:
      searchResult.error?.message ??
      `SerpApi returned ${searchResult.candidates.length} source-validation candidate(s) for the official TDLR search source.`,
    sourceUrl: CP20A_OFFICIAL_SEARCH_URL,
    estimatedCostUsd: searchResult.costEstimateUsd,
  })

  if (searchResult.error) {
    return blockedProof({
      blockerCode: 'search_provider_failed',
      blocker: searchResult.error.message,
      capturedAt,
      evaluatedAt,
      providerCalls,
      sourceAdapterCalls,
    })
  }

  const validatedSource = searchResult.candidates.find(isOfficialTdlrSourceCandidate)
  if (!validatedSource) {
    return blockedProof({
      blockerCode: 'source_validation_failed',
      blocker:
        'SerpApi completed but did not return an official TDLR source-validation hit.',
      capturedAt,
      evaluatedAt,
      providerCalls,
      sourceAdapterCalls,
    })
  }

  const sourceAdapterResult = await runTdlrSourceAdapter(evaluatedAt)
  sourceAdapterCalls.push(...sourceAdapterResult.calls)

  if (sourceAdapterCalls.every((call) => call.status === 'error')) {
    return blockedProof({
      blockerCode: 'source_adapter_failed',
      blocker:
        'All CP20A TDLR SearchProjects direct GET calls failed.',
      capturedAt,
      evaluatedAt,
      providerCalls,
      sourceAdapterCalls,
    })
  }

  if (sourceAdapterResult.candidates.length === 0) {
    return blockedProof({
      blockerCode: 'no_source_adapter_candidates',
      blocker:
        'TDLR SearchProjects returned no DFW TABS project candidates in the 45-day registration window.',
      capturedAt,
      evaluatedAt,
      providerCalls,
      sourceAdapterCalls,
    })
  }

  const evidenceProvider = new FirecrawlEvidenceProvider(firecrawlKey)
  let firecrawlAttempts = 0
  let lastBlocker =
    'No live TDLR source-adapter candidate produced a surfaceable Commercial Cleaning opportunity.'

  for (const project of sourceAdapterResult.candidates) {
    if (firecrawlAttempts >= CP20A_MAX_FIRECRAWL_ATTEMPTS) {
      return blockedProof({
        blockerCode: 'no_surfaceable_live_opportunity',
        blocker:
          'Firecrawl attempt cap reached after 1 SerpApi call and 4 official TDLR detail-page hydration attempts without a surfaceable live opportunity.',
        capturedAt,
        evaluatedAt,
        providerCalls,
        sourceAdapterCalls,
      })
    }

    const candidate = candidateSignalFromTdlrProject(project)
    firecrawlAttempts += 1

    const evidenceResult = await evidenceProvider.scrapeUrl({
      url: project.sourceUrl,
      workspaceId: CP20A_WORKSPACE_ID,
      budget,
    })

    providerCalls.push({
      provider: 'firecrawl',
      status: evidenceResult.error ? 'error' : 'ok',
      runId: evidenceResult.providerRunId,
      detail:
        evidenceResult.error?.message ??
        `Firecrawl hydrated official TDLR detail evidence for ${project.projectNumber}.`,
      sourceUrl: project.sourceUrl,
      estimatedCostUsd: evidenceResult.error ? 0 : 0.01,
    })

    if (evidenceResult.error || !evidenceResult.doc) {
      lastBlocker =
        evidenceResult.error?.message ??
        'Firecrawl did not return a hydrated evidence document.'
      continue
    }

    const detailSourceDate = extractSourceDate(evidenceResult.doc.cleanedText)
    const sourceDate = detailSourceDate ?? project.registrationDate
    const evidence: EvidenceDocument = {
      ...evidenceResult.doc,
      publishedAt: sourceDateIso(sourceDate),
      sourceName: `TDLR TABS ${project.projectNumber}`,
    }

    try {
      return makeReadyProof({
        capturedAt,
        evaluatedAt,
        providerCalls,
        sourceAdapterCalls,
        searchProviderRunId: searchResult.providerRunId,
        project,
        candidate,
        evidence,
        sourceDate,
      })
    } catch (error) {
      lastBlocker =
        error instanceof Error
          ? error.message
          : 'Live evidence failed a CP20A deterministic gate.'
    }
  }

  return blockedProof({
    blockerCode:
      providerCalls.some((call) => call.provider === 'firecrawl')
        ? 'no_surfaceable_live_opportunity'
        : 'evidence_provider_failed',
    blocker: lastBlocker,
    capturedAt,
    evaluatedAt,
    providerCalls,
    sourceAdapterCalls,
  })
}
