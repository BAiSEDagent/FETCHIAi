import { createHash } from 'crypto'
import {
  CP20A_SIGNAL_ID,
  CP20A_SIGNAL_LABEL,
  getCp20aTdlrTabsProof,
  type Cp20aLiveOpportunity,
  type Cp20aProviderCall,
  type Cp20aSourceAdapterCall,
} from '@/lib/runtime/cp20a-tdlr-tabs-source-adapter'
import { COMMERCIAL_CLEANING_VERTICAL_ID } from '@/lib/classification/commercial-cleaning-classification-contract'

export const CP20B_PROOF_ROUTE = '/internal/cp20b'

type DbModule = typeof import('@/db')
type DbTransaction = Parameters<Parameters<DbModule['db']['transaction']>[0]>[0]

const CP20B_WORKSPACE_ID = 'cp20b-admin-persisted-proof'
const CP20B_SOURCE_TYPE = 'tdlr_tabs_project'
const CP20B_SOURCE_AUTHORITY = 'tdlr'
const CP20B_MARKET = 'DFW'
const CP20B_PROVIDER_MODE = 'LIVE'
const CP20B_BUSINESS_NAME_MAX_LENGTH = 120
const CP20B_BUSINESS_NAME_MAX_WORDS = 12
const CP20B_SOURCE_FIELD_LABELS = [
  'Project Number',
  'Project #',
  'Project Name',
  'Facility Name',
  'Registration Date',
  'Type of Work',
  'Scope of Work',
  'Location Address',
  'Project Address',
  'Site Address',
  'Business Name',
  'Tenant Name',
  'Permit For',
  'Applicant',
  'Property Name',
] as const
const CP20B_FORBIDDEN_SOURCE_LABEL_PATTERN =
  /\b(Project\s*(Number|#|Name)|Facility Name|Business Name|Tenant Name|Property Name|Registration Date|Type of Work|Scope of Work|Location Address|Project Address|Site Address)\b/i
const CP20B_RAW_SOURCE_CHUNK_PATTERN =
  /\b(TDLR|TABS20\d+|Registration Date|Project\s*(Number|#|Name)|Facility Name|Business Name|Tenant Name|Property Name|Type of Work|Scope of Work|Location Address|Project Address|Site Address)\b/i

type Cp20bStatus = 'ready' | 'blocked'

export type Cp20bPersistedLineageRun = {
  provider: string
  providerRunId: string
  runRole: string
  status: string
  sourceUrl: string | null
  query: string | null
  engine: string | null
  estimatedCostCents: number
}

export type Cp20bPersistedOpportunity = {
  status: 'ready'
  providerMode: typeof CP20B_PROVIDER_MODE
  persisted: true
  createdFromLiveRun: boolean
  workspaceId: string
  prospect: {
    businessName: string
    location: string
    address: string | null
  }
  source: {
    sourceType: typeof CP20B_SOURCE_TYPE
    sourceAuthority: typeof CP20B_SOURCE_AUTHORITY
    externalId: string
    sourceUrl: string
    sourceTitle: string | null
    sourceDate: string
    evidenceFingerprint: string
  }
  evidence: {
    signalId: typeof CP20A_SIGNAL_ID
    signalLabel: typeof CP20A_SIGNAL_LABEL
    verticalFitLabel: string
    sourceExcerpt: string
    evidenceSummary: string
  }
  score: {
    value: number
    whyNow: string
    reason: string
  }
  lineage: {
    searchProviderRunId: string
    sourceAdapterRunIds: string[]
    sourceAdapterListingUrls: string[]
    evidenceProviderRunId: string
    runtimeLineageRuns: Cp20bPersistedLineageRun[]
  }
  nextAction: {
    label: string
    detail: string
  }
  proof: {
    proofHash: string
    opportunityId: string
    evidenceSourceId: string
    gateReasons: Record<string, unknown>
    providerLineage: Record<string, unknown>
    proofMetadata: Record<string, unknown>
  }
}

export type Cp20bBlockedProof = {
  status: 'blocked'
  providerMode: typeof CP20B_PROVIDER_MODE
  blockerCode:
    | 'missing_provider_keys'
    | 'search_provider_failed'
    | 'source_validation_failed'
    | 'source_adapter_failed'
    | 'no_source_adapter_candidates'
    | 'evidence_provider_failed'
    | 'no_surfaceable_live_opportunity'
    | 'prospect_sanitizer_failed'
    | 'persistence_failed'
  blocker: string
  missingEnv: string[]
  persisted: false
  dbWrites: 0
  liveLineage: {
    searchProviderRunId: string | null
    sourceAdapterRunIds: string[]
    evidenceProviderRunId: string | null
  }
  sanitizerDiagnostics?: Cp20bSanitizerDiagnostics
}

export type Cp20bSanitizerCandidateDiagnostic = {
  sourceLabel: string
  candidateType: 'direct' | 'labeled-field' | 'finish-out-derived' | 'leading-before-source-label'
  preview: string
  length: number
  hasSourceLabels: boolean
  overLength: boolean
  accepted: boolean
  rejectionReason: string | null
}

export type Cp20bSanitizerDiagnostics = {
  directRejectionReason: string | null
  candidateCount: number
  fallbackAccepted: boolean
  noAcceptedFallback: boolean
  candidates: Cp20bSanitizerCandidateDiagnostic[]
}

type SanitizedProspect = {
  businessName: string
  address: string | null
  city: string | null
  state: string | null
  location: string
}

type PersistInput = {
  liveProof: Cp20aLiveOpportunity
  sanitizedProspect: SanitizedProspect
  externalId: string
  proofHash: string
  adminUserId: string
}

type CandidateForSanitizer = {
  sourceLabel: string
  candidateType: Cp20bSanitizerCandidateDiagnostic['candidateType']
  value: string
  rejectEmbeddedSourceExcerpt: boolean
}

function isoDate(value: Date | string): string {
  const date = value instanceof Date ? value : new Date(value)
  return date.toISOString().slice(0, 10)
}

function sourceDate(value: string): Date {
  return new Date(`${value}T00:00:00.000Z`)
}

function hashText(value: string): string {
  return createHash('sha256').update(value).digest('hex')
}

function proofHashFor({
  workspaceId,
  externalId,
  signalLabel,
  verticalFitLabel,
  sourceFingerprint,
}: {
  workspaceId: string
  externalId: string
  signalLabel: string
  verticalFitLabel: string
  sourceFingerprint: string
}): string {
  return hashText(
    [
      workspaceId,
      CP20B_SOURCE_TYPE,
      externalId,
      signalLabel,
      verticalFitLabel,
      sourceFingerprint,
    ].join('|'),
  )
}

function externalIdFromSourceUrl(sourceUrl: string): string | null {
  try {
    const url = new URL(sourceUrl)
    const match = url.pathname.match(/\/TABS\/Search\/Project\/(TABS20\d+)$/i)
    return match?.[1]?.toUpperCase() ?? null
  } catch {
    return null
  }
}

function normalizedText(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function cleanBusinessNameCandidate(value: string | null | undefined): string | null {
  if (!value) return null

  const cleaned = value
    .replace(/\s+/g, ' ')
    .replace(/^[\s:|.,;-]+|[\s:|.,;-]+$/g, '')
    .trim()

  return cleaned.length > 0 ? cleaned : null
}

function trimAtNextSourceFieldLabel(value: string): string {
  let end = value.length

  for (const label of CP20B_SOURCE_FIELD_LABELS) {
    const pattern = new RegExp(`\\b${escapeRegExp(label)}\\b\\s*:?`, 'i')
    const match = pattern.exec(value)
    if (match && match.index > 0) {
      end = Math.min(end, match.index)
    }
  }

  return value.slice(0, end)
}

function leadingSegmentBeforeFirstSourceLabel(value: string): string | null {
  const trimmed = trimAtNextSourceFieldLabel(value)
  if (trimmed.length >= value.length) return null
  return cleanBusinessNameCandidate(trimmed)
}

function extractLabeledBusinessNameValue(
  text: string,
  labels: readonly string[],
): string | null {
  for (const label of labels) {
    const escaped = escapeRegExp(label)
    const tableMatch = text.match(
      new RegExp(`\\|\\s*${escaped}\\s*\\|\\s*([^|\\n\\r]+)\\|`, 'i'),
    )
    const lineMatch = text.match(
      new RegExp(`(?:^|[\\n\\r|])\\s*${escaped}\\s*:?\\s*([^\\n\\r|]+)`, 'i'),
    )
    const inlineMatch = text.match(
      new RegExp(`\\b${escaped}\\b\\s*:?\\s*([\\s\\S]{1,240})`, 'i'),
    )
    const rawValue =
      tableMatch?.[1] ??
      lineMatch?.[1] ??
      (inlineMatch?.[1] ? trimAtNextSourceFieldLabel(inlineMatch[1]) : null)
    const cleaned = cleanBusinessNameCandidate(
      rawValue ? trimAtNextSourceFieldLabel(rawValue) : null,
    )

    if (cleaned) return cleaned
  }

  return null
}

function tenantNameFromFinishOut(value: string): string | null {
  const match = value.match(
    /\b([A-Za-z][A-Za-z0-9 '&./-]{2,80}?)\s+(?:finish[-\s]?out|build[-\s]?out|tenant improvement|TI)\b/i,
  )
  if (!match?.[1]) return null

  const lastSegment = match[1].split(/\s[-/]\s|[/]/).pop()
  return cleanBusinessNameCandidate(lastSegment)
}

function diagnosticForCandidate({
  sourceLabel,
  candidateType,
  value,
  rejectionReason,
}: {
  sourceLabel: string
  candidateType: Cp20bSanitizerCandidateDiagnostic['candidateType']
  value: string
  rejectionReason: string | null
}): Cp20bSanitizerCandidateDiagnostic {
  return {
    sourceLabel,
    candidateType,
    preview: value.length > 80 ? `${value.slice(0, 77)}...` : value,
    length: value.length,
    hasSourceLabels:
      CP20B_FORBIDDEN_SOURCE_LABEL_PATTERN.test(value) ||
      CP20B_RAW_SOURCE_CHUNK_PATTERN.test(value),
    overLength: value.length > CP20B_BUSINESS_NAME_MAX_LENGTH,
    accepted: rejectionReason === null,
    rejectionReason,
  }
}

function cp20bBusinessNameRejectionReason({
  businessName,
  sourceExcerpt,
  rejectEmbeddedSourceExcerpt,
}: {
  businessName: string
  sourceExcerpt: string
  rejectEmbeddedSourceExcerpt: boolean
}): string | null {
  const normalizedName = normalizedText(businessName)
  const normalizedExcerpt = normalizedText(sourceExcerpt)

  if (!businessName) {
    return 'Prospect sanitizer rejected an empty business name.'
  }

  if (/[\r\n]/.test(businessName)) {
    return 'Prospect sanitizer rejected a multiline business name.'
  }

  if (businessName.length > CP20B_BUSINESS_NAME_MAX_LENGTH) {
    return 'Prospect sanitizer rejected a business name longer than 120 characters.'
  }

  if (CP20B_FORBIDDEN_SOURCE_LABEL_PATTERN.test(businessName)) {
    return 'Prospect sanitizer rejected a business name containing source-field labels.'
  }

  if (CP20B_RAW_SOURCE_CHUNK_PATTERN.test(businessName)) {
    return 'Prospect sanitizer rejected a business name that looked like raw TDLR detail text.'
  }

  if (businessName.split(/\s+/).length > CP20B_BUSINESS_NAME_MAX_WORDS) {
    return 'Prospect sanitizer rejected a business name that looked like an overlong source excerpt.'
  }

  if (
    rejectEmbeddedSourceExcerpt &&
    normalizedName.length > 20 &&
    normalizedExcerpt.length > normalizedName.length + 40 &&
    normalizedExcerpt.includes(normalizedName)
  ) {
    return 'Prospect sanitizer rejected a business name that was embedded in a raw source excerpt.'
  }

  return null
}

function extractCleanBusinessName(liveProof: Cp20aLiveOpportunity): {
  businessName: string | null
  diagnostics: Cp20bSanitizerDiagnostics
} {
  const sourceText = [
    liveProof.prospect.businessName,
    liveProof.evidence.sourceTitle ?? '',
    liveProof.evidence.sourceExcerpt,
    liveProof.score.whyNow,
    liveProof.nextAction.detail,
  ].join('\n')
  const directCandidate = liveProof.prospect.businessName.trim()
  const sourceExcerpt = liveProof.evidence.sourceExcerpt.trim()
  const directRejectionReason = cp20bBusinessNameRejectionReason({
    businessName: directCandidate,
    sourceExcerpt,
    rejectEmbeddedSourceExcerpt: true,
  })
  const diagnostics: Cp20bSanitizerCandidateDiagnostic[] = [
    diagnosticForCandidate({
      sourceLabel: 'liveProof.prospect.businessName',
      candidateType: 'direct',
      value: directCandidate,
      rejectionReason: directRejectionReason,
    }),
  ]

  if (!directRejectionReason) {
    return {
      businessName: directCandidate,
      diagnostics: {
        directRejectionReason,
        candidateCount: diagnostics.length,
        fallbackAccepted: false,
        noAcceptedFallback: false,
        candidates: diagnostics,
      },
    }
  }

  const labeledCandidates: CandidateForSanitizer[] = []
  const leadingSegment = leadingSegmentBeforeFirstSourceLabel(directCandidate)
  if (leadingSegment) {
    labeledCandidates.push({
      sourceLabel: 'liveProof.prospect.businessName',
      candidateType: 'leading-before-source-label',
      value: leadingSegment,
      rejectEmbeddedSourceExcerpt: false,
    })
  }

  for (const labelGroup of [
    ['Tenant Name', 'Business Name'],
    ['Facility Name', 'Property Name'],
    ['Project Name', 'Permit For', 'Applicant'],
  ] as const) {
    const value = extractLabeledBusinessNameValue(sourceText, labelGroup)
    if (value) {
      labeledCandidates.push({
        sourceLabel: labelGroup.join(' / '),
        candidateType: 'labeled-field',
        value,
        rejectEmbeddedSourceExcerpt: false,
      })

      const tenant = tenantNameFromFinishOut(value)
      if (tenant) {
        labeledCandidates.push({
          sourceLabel: `${labelGroup.join(' / ')} finish-out segment`,
          candidateType: 'finish-out-derived',
          value: tenant,
          rejectEmbeddedSourceExcerpt: false,
        })
      }
    }
  }

  for (const candidate of labeledCandidates) {
    const reason = cp20bBusinessNameRejectionReason({
      businessName: candidate.value,
      sourceExcerpt,
      rejectEmbeddedSourceExcerpt: candidate.rejectEmbeddedSourceExcerpt,
    })
    const diagnostic = diagnosticForCandidate({
      sourceLabel: candidate.sourceLabel,
      candidateType: candidate.candidateType,
      value: candidate.value,
      rejectionReason: reason,
    })
    diagnostics.push(diagnostic)

    if (!reason) {
      return {
        businessName: candidate.value,
        diagnostics: {
          directRejectionReason,
          candidateCount: diagnostics.length,
          fallbackAccepted: true,
          noAcceptedFallback: false,
          candidates: diagnostics,
        },
      }
    }
  }

  return {
    businessName: null,
    diagnostics: {
      directRejectionReason,
      candidateCount: diagnostics.length,
      fallbackAccepted: false,
      noAcceptedFallback: true,
      candidates: diagnostics,
    },
  }
}

function parseCityState(location: string, address: string | null): {
  city: string | null
  state: string | null
} {
  const text = [address, location].filter(Boolean).join('\n')
  const cityState = text.match(/\b([A-Za-z][A-Za-z .'-]+),\s*(TX|Texas)\b/i)
  if (cityState) {
    return { city: cityState[1].trim(), state: 'TX' }
  }

  if (/\bTX\b|\bTexas\b/i.test(text)) {
    return { city: null, state: 'TX' }
  }

  return { city: null, state: null }
}

function sanitizerFailure(
  reason: string,
  liveProof?: Cp20aLiveOpportunity,
  diagnostics?: Cp20bSanitizerDiagnostics,
): Cp20bBlockedProof {
  return {
    status: 'blocked',
    providerMode: CP20B_PROVIDER_MODE,
    blockerCode: 'prospect_sanitizer_failed',
    blocker: reason,
    missingEnv: [],
    persisted: false,
    dbWrites: 0,
    liveLineage: {
      searchProviderRunId: liveProof?.lineage.searchProviderRunId ?? null,
      sourceAdapterRunIds: liveProof?.lineage.sourceAdapterRunIds ?? [],
      evidenceProviderRunId: liveProof?.lineage.evidenceProviderRunId ?? null,
    },
    sanitizerDiagnostics: diagnostics,
  }
}

function sanitizeProspect(liveProof: Cp20aLiveOpportunity): SanitizedProspect | Cp20bBlockedProof {
  const { businessName, diagnostics } = extractCleanBusinessName(liveProof)

  if (!businessName) {
    return sanitizerFailure(
      diagnostics.directRejectionReason ?? 'Prospect sanitizer rejected the business name.',
      liveProof,
      diagnostics,
    )
  }

  const address = liveProof.prospect.address?.trim() || null
  const location = liveProof.prospect.location.trim()
  const { city, state } = parseCityState(location, address)

  return {
    businessName,
    address,
    city,
    state,
    location,
  }
}

function isBlockedProof(
  value: SanitizedProspect | Cp20bBlockedProof,
): value is Cp20bBlockedProof {
  return 'blockerCode' in value
}

function evidenceSummary(
  liveProof: Cp20aLiveOpportunity,
  externalId: string,
  sanitizedProspect: SanitizedProspect,
): string {
  return `${sanitizedProspect.businessName} has official TDLR project ${externalId} dated ${liveProof.evidence.sourceDate} with approved ${liveProof.evidence.signalLabel} / ${liveProof.evidence.verticalFitLabel} proof.`
}

function signalHash(workspaceId: string, externalId: string): string {
  return hashText([workspaceId, CP20B_SOURCE_TYPE, externalId, CP20A_SIGNAL_ID].join('|'))
}

function providerCostCents(value: number): number {
  return Math.max(0, Math.round(value * 100))
}

function providerLineage(liveProof: Cp20aLiveOpportunity): Record<string, unknown> {
  return {
    providerMode: liveProof.providerMode,
    providerModeReason: liveProof.providerModeReason,
    searchProvider: liveProof.lineage.searchProvider,
    evidenceProvider: liveProof.lineage.evidenceProvider,
    sourceAdapter: liveProof.lineage.sourceAdapter,
    providerCalls: liveProof.proof.providerCalls,
    sourceAdapterCalls: liveProof.proof.sourceAdapterCalls,
  }
}

function gateReasons(liveProof: Cp20aLiveOpportunity): Record<string, unknown> {
  return {
    sourceAdapter: liveProof.proof.sourceAdapterReasons,
    productScopeGuard: liveProof.proof.productScopeGuardReasons,
    evidenceGate: liveProof.proof.evidenceGateReasons,
    classificationGate: liveProof.proof.classificationGateReasons,
    scoringGate: liveProof.proof.scoringGateReasons,
    claimGuard: liveProof.proof.claimGuardReasons,
  }
}

function proofMetadata(liveProof: Cp20aLiveOpportunity): Record<string, unknown> {
  return {
    capturedAt: liveProof.proof.capturedAt,
    evaluatedAt: liveProof.proof.evaluatedAt,
    searchQuery: liveProof.proof.searchQuery,
    officialListingEndpoint: liveProof.proof.officialListingEndpoint,
    market: liveProof.proof.market,
    replayableLineage: liveProof.proof.replayableLineage,
    estimatedProviderSpendUsd: liveProof.proof.estimatedProviderSpendUsd,
    sourceTitle: liveProof.evidence.sourceTitle,
  }
}

function sourceAdapterListingUrls(calls: readonly Cp20aSourceAdapterCall[]): string[] {
  return Array.from(new Set(calls.map((call) => call.url).filter(Boolean)))
}

function sourceAdapterRunIds(calls: readonly Cp20aSourceAdapterCall[]): string[] {
  return Array.from(new Set(calls.map((call) => call.runId).filter(Boolean)))
}

function blockedFromCp20a(result: Exclude<Awaited<ReturnType<typeof getCp20aTdlrTabsProof>>, Cp20aLiveOpportunity>): Cp20bBlockedProof {
  return {
    status: 'blocked',
    providerMode: CP20B_PROVIDER_MODE,
    blockerCode: result.blockerCode,
    blocker: result.blocker,
    missingEnv: result.missingEnv,
    persisted: false,
    dbWrites: 0,
    liveLineage: result.liveLineage,
  }
}

async function loadPersistedProofByHash(proofHash: string): Promise<Cp20bPersistedOpportunity | null> {
  const { db } = await import('@/db')
  const proof = await db.query.opportunityEvidenceProofs.findFirst({
    where: (table, { eq: equal }) => equal(table.proofHash, proofHash),
  })

  if (!proof) return null
  return loadPersistedProofRows(proof.id, false)
}

async function loadLatestPersistedProof(): Promise<Cp20bPersistedOpportunity | null> {
  const { db } = await import('@/db')
  const proof = await db.query.opportunityEvidenceProofs.findFirst({
    where: (table, { eq: equal }) => equal(table.workspaceId, CP20B_WORKSPACE_ID),
    orderBy: (table, { desc }) => [desc(table.createdAt)],
  })

  if (!proof) return null
  return loadPersistedProofRows(proof.id, false)
}

async function loadPersistedProofRows(
  proofId: string,
  createdFromLiveRun: boolean,
): Promise<Cp20bPersistedOpportunity | null> {
  const { db } = await import('@/db')
  const proof = await db.query.opportunityEvidenceProofs.findFirst({
    where: (table, { eq: equal }) => equal(table.id, proofId),
  })
  if (!proof) return null

  const [evidenceSource, opportunity] = await Promise.all([
    db.query.evidenceSources.findFirst({
      where: (table, { eq: equal }) => equal(table.id, proof.evidenceSourceId),
    }),
    db.query.opportunities.findFirst({
      where: (table, { eq: equal }) => equal(table.id, proof.opportunityId),
    }),
  ])

  if (!evidenceSource || !opportunity) return null

  const [prospect, lineageRuns] = await Promise.all([
    opportunity.prospectId
      ? db.query.prospects.findFirst({
          where: (table, { eq: equal }) => equal(table.id, opportunity.prospectId!),
        })
      : Promise.resolve(null),
    db.query.runtimeLineageRuns.findMany({
      where: (table, { eq: equal }) => equal(table.evidenceSourceId, evidenceSource.id),
      orderBy: (table, { desc }) => [desc(table.createdAt)],
    }),
  ])

  if (!prospect) return null

  return {
    status: 'ready',
    providerMode: CP20B_PROVIDER_MODE,
    persisted: true,
    createdFromLiveRun,
    workspaceId: proof.workspaceId,
    prospect: {
      businessName: prospect.businessName,
      location: [prospect.city, prospect.state].filter(Boolean).join(', ') || 'DFW',
      address: prospect.address,
    },
    source: {
      sourceType: CP20B_SOURCE_TYPE,
      sourceAuthority: CP20B_SOURCE_AUTHORITY,
      externalId: evidenceSource.externalId,
      sourceUrl: evidenceSource.sourceUrl,
      sourceTitle: evidenceSource.sourceTitle,
      sourceDate: isoDate(evidenceSource.sourceDate),
      evidenceFingerprint: evidenceSource.evidenceFingerprint,
    },
    evidence: {
      signalId: CP20A_SIGNAL_ID,
      signalLabel: CP20A_SIGNAL_LABEL,
      verticalFitLabel: proof.verticalFitLabel,
      sourceExcerpt: proof.sourceExcerpt,
      evidenceSummary: proof.evidenceSummary,
    },
    score: {
      value: proof.score,
      whyNow: proof.whyNow,
      reason: proof.scoreReason,
    },
    lineage: {
      searchProviderRunId: proof.searchProviderRunId,
      sourceAdapterRunIds: proof.sourceAdapterRunIds,
      sourceAdapterListingUrls: proof.sourceAdapterListingUrls,
      evidenceProviderRunId: proof.evidenceProviderRunId,
      runtimeLineageRuns: lineageRuns.map((run) => ({
        provider: run.provider,
        providerRunId: run.providerRunId,
        runRole: run.runRole,
        status: run.status,
        sourceUrl: run.sourceUrl,
        query: run.query,
        engine: run.engine,
        estimatedCostCents: run.estimatedCostCents,
      })),
    },
    nextAction: {
      label: proof.nextActionLabel,
      detail: proof.nextActionDetail,
    },
    proof: {
      proofHash: proof.proofHash,
      opportunityId: proof.opportunityId,
      evidenceSourceId: proof.evidenceSourceId,
      gateReasons: proof.gateReasons as Record<string, unknown>,
      providerLineage: proof.providerLineage as Record<string, unknown>,
      proofMetadata: proof.proofMetadata as Record<string, unknown>,
    },
  }
}

async function persistLiveProof(input: PersistInput): Promise<Cp20bPersistedOpportunity | Cp20bBlockedProof> {
  const { liveProof, sanitizedProspect, externalId, proofHash, adminUserId } = input
  const {
    db,
    evidenceSources,
    opportunityEvidenceProofs,
    opportunities,
    prospects,
    runtimeLineageRuns,
    signals,
    workspaceSettings,
  } = await import('@/db')

  try {
    const proofId = await db.transaction(async (tx) => {
      await tx.insert(workspaceSettings)
        .values({
          workspaceId: CP20B_WORKSPACE_ID,
          ownerUserId: adminUserId,
          businessName: 'CP20B Internal Proof Workspace',
          isApproved: true,
          onboardingStep: 4,
        })
        .onConflictDoNothing({ target: workspaceSettings.workspaceId })

      const existingProof = await tx.query.opportunityEvidenceProofs.findFirst({
        where: (table, { eq: equal }) => equal(table.proofHash, proofHash),
      })
      if (existingProof) return existingProof.id

      const [evidenceSource] = await tx.insert(evidenceSources)
        .values({
          sourceType: CP20B_SOURCE_TYPE,
          sourceAuthority: CP20B_SOURCE_AUTHORITY,
          externalId,
          sourceUrl: liveProof.evidence.sourceUrl,
          sourceTitle: liveProof.evidence.sourceTitle,
          sourceDate: sourceDate(liveProof.evidence.sourceDate),
          evidenceFingerprint: liveProof.lineage.liveFingerprint,
          sourceMetadata: {
            sourceExcerpt: liveProof.evidence.sourceExcerpt,
            sourceAdapterListingUrls: sourceAdapterListingUrls(liveProof.proof.sourceAdapterCalls),
            sourceAdapterRunIds: sourceAdapterRunIds(liveProof.proof.sourceAdapterCalls),
          },
          lastSeenAt: new Date(),
        })
        .onConflictDoUpdate({
          target: [evidenceSources.sourceType, evidenceSources.externalId],
          set: {
            sourceUrl: liveProof.evidence.sourceUrl,
            sourceTitle: liveProof.evidence.sourceTitle,
            sourceDate: sourceDate(liveProof.evidence.sourceDate),
            evidenceFingerprint: liveProof.lineage.liveFingerprint,
            sourceMetadata: {
              sourceExcerpt: liveProof.evidence.sourceExcerpt,
              sourceAdapterListingUrls: sourceAdapterListingUrls(liveProof.proof.sourceAdapterCalls),
              sourceAdapterRunIds: sourceAdapterRunIds(liveProof.proof.sourceAdapterCalls),
            },
            lastSeenAt: new Date(),
          },
        })
        .returning()
      if (!evidenceSource) {
        throw new Error('CP20B could not create or update the evidence source.')
      }

      const existingProspect = await tx.query.prospects.findFirst({
        where: (table, { and: all, eq: equal }) =>
          sanitizedProspect.address
            ? all(
                equal(table.workspaceId, CP20B_WORKSPACE_ID),
                equal(table.businessName, sanitizedProspect.businessName),
                equal(table.address, sanitizedProspect.address),
              )
            : sanitizedProspect.city
              ? all(
                  equal(table.workspaceId, CP20B_WORKSPACE_ID),
                  equal(table.businessName, sanitizedProspect.businessName),
                  equal(table.city, sanitizedProspect.city),
                )
              : all(
                  equal(table.workspaceId, CP20B_WORKSPACE_ID),
                  equal(table.businessName, sanitizedProspect.businessName),
                ),
      })

      let prospect = existingProspect
      if (!prospect) {
        const [createdProspect] = await tx.insert(prospects)
          .values({
            workspaceId: CP20B_WORKSPACE_ID,
            businessName: sanitizedProspect.businessName,
            address: sanitizedProspect.address,
            city: sanitizedProspect.city,
            state: sanitizedProspect.state,
            businessType: 'commercial_cleaning_prospect',
            enrichmentStatus: 'complete',
          })
          .returning()
        if (!createdProspect) {
          throw new Error('CP20B could not create the sanitized prospect.')
        }
        prospect = createdProspect
      }

      const [signal] = await tx.insert(signals)
        .values({
          workspaceId: CP20B_WORKSPACE_ID,
          signalType: CP20A_SIGNAL_ID,
          signalHash: signalHash(CP20B_WORKSPACE_ID, externalId),
          rawData: {
            sourceType: CP20B_SOURCE_TYPE,
            externalId,
            sourceUrl: liveProof.evidence.sourceUrl,
          },
          parsedData: {
            market: CP20B_MARKET,
            signalLabel: liveProof.evidence.signalLabel,
            verticalFitLabel: liveProof.evidence.verticalFitLabel,
            sourceDate: liveProof.evidence.sourceDate,
            evidenceSourceId: evidenceSource.id,
          },
          whyRelevant: liveProof.score.whyNow,
          detectedAt: sourceDate(liveProof.evidence.sourceDate),
          status: 'valid',
        })
        .onConflictDoUpdate({
          target: signals.signalHash,
          set: {
            parsedData: {
              market: CP20B_MARKET,
              signalLabel: liveProof.evidence.signalLabel,
              verticalFitLabel: liveProof.evidence.verticalFitLabel,
              sourceDate: liveProof.evidence.sourceDate,
              evidenceSourceId: evidenceSource.id,
            },
            whyRelevant: liveProof.score.whyNow,
            status: 'valid',
          },
        })
        .returning()
      if (!signal) {
        throw new Error('CP20B could not create or update the signal.')
      }

      const existingOpportunity = await tx.query.opportunities.findFirst({
        where: (table, { and: all, eq: equal }) =>
          all(
            equal(table.workspaceId, CP20B_WORKSPACE_ID),
            equal(table.signalId, signal.id),
          ),
      })

      let opportunity = existingOpportunity
      if (!opportunity) {
        const [createdOpportunity] = await tx.insert(opportunities)
          .values({
            workspaceId: CP20B_WORKSPACE_ID,
            signalId: signal.id,
            prospectId: prospect.id,
            score: liveProof.score.value,
            whyNow: liveProof.score.whyNow,
            status: 'new',
          })
          .returning()
        if (!createdOpportunity) {
          throw new Error('CP20B could not create the opportunity.')
        }
        opportunity = createdOpportunity
      }

      await persistRuntimeLineageRuns({
        tx,
        liveProof,
        evidenceSourceId: evidenceSource.id,
        runtimeLineageRunsTable: runtimeLineageRuns,
      })

      const [proof] = await tx.insert(opportunityEvidenceProofs)
        .values({
          workspaceId: CP20B_WORKSPACE_ID,
          opportunityId: opportunity.id,
          evidenceSourceId: evidenceSource.id,
          proofHash,
          leadKind: 'signal_backed_opportunity',
          providerMode: CP20B_PROVIDER_MODE,
          market: CP20B_MARKET,
          vertical: COMMERCIAL_CLEANING_VERTICAL_ID,
          signalType: CP20A_SIGNAL_ID,
          signalLabel: liveProof.evidence.signalLabel,
          verticalFitLabel: liveProof.evidence.verticalFitLabel,
          score: liveProof.score.value,
          whyNow: liveProof.score.whyNow,
          scoreReason: liveProof.score.reason,
          nextActionLabel: liveProof.nextAction.label,
          nextActionDetail: liveProof.nextAction.detail,
          evidenceSummary: evidenceSummary(liveProof, externalId, sanitizedProspect),
          sourceExcerpt: liveProof.evidence.sourceExcerpt,
          sourceFingerprint: liveProof.lineage.liveFingerprint,
          searchProviderRunId: liveProof.lineage.searchProviderRunId,
          evidenceProviderRunId: liveProof.lineage.evidenceProviderRunId,
          sourceAdapterRunIds: sourceAdapterRunIds(liveProof.proof.sourceAdapterCalls),
          sourceAdapterListingUrls: sourceAdapterListingUrls(liveProof.proof.sourceAdapterCalls),
          gateReasons: gateReasons(liveProof),
          providerLineage: providerLineage(liveProof),
          proofMetadata: proofMetadata(liveProof),
        })
        .onConflictDoUpdate({
          target: opportunityEvidenceProofs.proofHash,
          set: {
            score: liveProof.score.value,
            whyNow: liveProof.score.whyNow,
            scoreReason: liveProof.score.reason,
            nextActionLabel: liveProof.nextAction.label,
            nextActionDetail: liveProof.nextAction.detail,
            evidenceSummary: evidenceSummary(liveProof, externalId, sanitizedProspect),
            sourceExcerpt: liveProof.evidence.sourceExcerpt,
            sourceFingerprint: liveProof.lineage.liveFingerprint,
            searchProviderRunId: liveProof.lineage.searchProviderRunId,
            evidenceProviderRunId: liveProof.lineage.evidenceProviderRunId,
            sourceAdapterRunIds: sourceAdapterRunIds(liveProof.proof.sourceAdapterCalls),
            sourceAdapterListingUrls: sourceAdapterListingUrls(liveProof.proof.sourceAdapterCalls),
            gateReasons: gateReasons(liveProof),
            providerLineage: providerLineage(liveProof),
            proofMetadata: proofMetadata(liveProof),
            updatedAt: new Date(),
          },
        })
        .returning()
      if (!proof) {
        throw new Error('CP20B could not create or update the opportunity evidence proof.')
      }

      return proof.id
    })

    const persisted = await loadPersistedProofRows(proofId, true)
    if (!persisted) {
      return {
        status: 'blocked',
        providerMode: CP20B_PROVIDER_MODE,
        blockerCode: 'persistence_failed',
        blocker: 'CP20B wrote the proof transaction but could not read the persisted rows back.',
        missingEnv: [],
        persisted: false,
        dbWrites: 0,
        liveLineage: {
          searchProviderRunId: liveProof.lineage.searchProviderRunId,
          sourceAdapterRunIds: liveProof.lineage.sourceAdapterRunIds,
          evidenceProviderRunId: liveProof.lineage.evidenceProviderRunId,
        },
      }
    }

    return persisted
  } catch (error) {
    return {
      status: 'blocked',
      providerMode: CP20B_PROVIDER_MODE,
      blockerCode: 'persistence_failed',
      blocker: error instanceof Error ? error.message : 'CP20B persistence failed.',
      missingEnv: [],
      persisted: false,
      dbWrites: 0,
      liveLineage: {
        searchProviderRunId: liveProof.lineage.searchProviderRunId,
        sourceAdapterRunIds: liveProof.lineage.sourceAdapterRunIds,
        evidenceProviderRunId: liveProof.lineage.evidenceProviderRunId,
      },
    }
  }
}

async function persistRuntimeLineageRuns({
  tx,
  liveProof,
  evidenceSourceId,
  runtimeLineageRunsTable,
}: {
  tx: DbTransaction
  liveProof: Cp20aLiveOpportunity
  evidenceSourceId: string
  runtimeLineageRunsTable: DbModule['runtimeLineageRuns']
}) {
  const providerCalls = liveProof.proof.providerCalls
  const sourceAdapterCalls = liveProof.proof.sourceAdapterCalls

  const lineageRows = [
    ...providerCalls.map((call) => providerLineageRunFromProviderCall(call, liveProof, evidenceSourceId)),
    ...sourceAdapterCalls.map((call) => providerLineageRunFromSourceAdapterCall(call, evidenceSourceId)),
  ]

  for (const row of lineageRows) {
    if (!row) continue
    await tx.insert(runtimeLineageRunsTable)
      .values(row)
      .onConflictDoUpdate({
        target: runtimeLineageRunsTable.providerRunId,
        set: {
          status: row.status,
          evidenceSourceId: row.evidenceSourceId,
          sourceUrl: row.sourceUrl,
          query: row.query,
          engine: row.engine,
          estimatedCostCents: row.estimatedCostCents,
          completedAt: row.completedAt,
          requestMetadata: row.requestMetadata,
          responseMetadata: row.responseMetadata,
        },
      })
  }
}

function providerLineageRunFromProviderCall(
  call: Cp20aProviderCall,
  liveProof: Cp20aLiveOpportunity,
  evidenceSourceId: string,
) {
  if (!call.runId) return null

  const isSerpApi = call.provider === 'serpapi'
  return {
    provider: call.provider,
    providerRunId: call.runId,
    runRole: isSerpApi ? 'source_validation' : 'evidence_hydration',
    status: call.status,
    evidenceSourceId,
    sourceUrl: call.sourceUrl ?? null,
    query: isSerpApi ? liveProof.proof.searchQuery : null,
    engine: isSerpApi ? 'google_light' : null,
    estimatedCostCents: providerCostCents(call.estimatedCostUsd),
    startedAt: new Date(liveProof.proof.capturedAt),
    completedAt: new Date(liveProof.proof.evaluatedAt),
    requestMetadata: {
      sourceUrl: call.sourceUrl ?? null,
      officialListingEndpoint: isSerpApi
        ? liveProof.proof.officialListingEndpoint
        : null,
    },
    responseMetadata: {
      detail: call.detail,
      status: call.status,
    },
  }
}

function providerLineageRunFromSourceAdapterCall(
  call: Cp20aSourceAdapterCall,
  evidenceSourceId: string,
) {
  return {
    provider: call.adapter,
    providerRunId: call.runId,
    runRole: 'source_adapter_listing',
    status: call.status,
    evidenceSourceId,
    sourceUrl: call.url,
    query: call.url,
    engine: null,
    estimatedCostCents: 0,
    startedAt: new Date(),
    completedAt: new Date(),
    requestMetadata: {
      county: call.county,
      url: call.url,
    },
    responseMetadata: {
      detail: call.detail,
      recordsReturned: call.recordsReturned,
      candidatesAccepted: call.candidatesAccepted,
      status: call.status,
    },
  }
}

export async function getCp20bPersistedOpportunityProof(
  adminUserId: string,
): Promise<Cp20bProofResult> {
  const existing = await loadLatestPersistedProof()
  if (existing) return existing

  const liveProof = await getCp20aTdlrTabsProof()
  if (liveProof.status !== 'ready') {
    return blockedFromCp20a(liveProof)
  }

  const externalId = externalIdFromSourceUrl(liveProof.evidence.sourceUrl)
  if (!externalId) {
    return sanitizerFailure('CP20B could not extract a TDLR project id from the official source URL.', liveProof)
  }

  const sanitizedProspect = sanitizeProspect(liveProof)
  if (isBlockedProof(sanitizedProspect)) {
    return sanitizedProspect
  }

  const proofHash = proofHashFor({
    workspaceId: CP20B_WORKSPACE_ID,
    externalId,
    signalLabel: liveProof.evidence.signalLabel,
    verticalFitLabel: liveProof.evidence.verticalFitLabel,
    sourceFingerprint: liveProof.lineage.liveFingerprint,
  })

  const existingByHash = await loadPersistedProofByHash(proofHash)
  if (existingByHash) return existingByHash

  return persistLiveProof({
    liveProof,
    sanitizedProspect,
    externalId,
    proofHash,
    adminUserId,
  })
}
