/**
 * CP26C.2A saved-lead investigation contract smoke.
 *
 * Fixture-only proof: no provider calls, model calls, database writes, schema
 * application, route changes, or Stage 2B execution runtime.
 */
import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'
import { getTableColumns, getTableName } from 'drizzle-orm'
import { getTableConfig } from 'drizzle-orm/pg-core'
import {
  savedLeadInvestigationDailyUsage,
  savedLeadInvestigationRuns,
  savedLeadInvestigationSources,
  savedLeadInvestigationState,
  savedLeadProfileFindings,
  savedLeadTriggerFindings,
} from '@/db/schema'
import {
  INVESTIGATION_ATTEMPT_STATUSES,
  INVESTIGATION_EVIDENCE_SOURCE_KINDS,
  INVESTIGATION_PHASES,
  INVESTIGATION_USAGE_CATEGORIES,
  SAVED_LEAD_PROFILE_FACT_KEYS,
  SOURCE_AVAILABILITIES,
  SOURCE_CHECK_STATES,
  STRUCTURED_SOURCE_CLASSES,
  type IdentityResolution,
  type InvestigationUsageSnapshot,
  type SavedLeadIdentity,
  type SavedLeadInvestigationRunSnapshot,
  type SavedLeadProfileFinding,
  type StructuredPermitRecord,
} from '@/lib/runtime/saved-lead-investigation/contracts'
import {
  createStructuredPermitEvidenceRecord,
  createStructuredPermitEvidenceSnapshot,
  mapStructuredRecord,
  resolveStructuredSourceAvailability,
} from '@/lib/providers/structured-source-provider'
import {
  ALBUQUERQUE_BUILDING_PERMITS,
  FIXTURE_SECOND_ARCGIS_SOURCE,
  SAVED_LEAD_INVESTIGATION_PLAYBOOKS,
  filterPermitRecordsForPlaybook,
  resolveSavedLeadInvestigationPlaybook,
} from '@/lib/playbooks/saved-lead-investigation-registry'
import {
  normalizeAddress,
  normalizeDomain,
  normalizeLocality,
  normalizeName,
  normalizePhone,
  resolveIdentity,
  resolvePermitIdentity,
} from '@/lib/runtime/saved-lead-investigation/identity-resolution'
import {
  buildSavedLeadInvestigationPlan,
  canExecuteSignalDiscovery,
  isStrictlyResolvedIdentity,
} from '@/lib/runtime/saved-lead-investigation/planner'
import {
  SAVED_LEAD_INVESTIGATION_CEILINGS,
  conservativeTokenUpperBound,
  createInvestigationUsage,
  recordInvestigationUsage,
  retainSerpApiCandidates,
  truncateHydratedPages,
  truncateInterpretationSources,
  validateInterpretationTokenUsage,
} from '@/lib/runtime/saved-lead-investigation/budget'
import {
  SAVED_LEAD_INVESTIGATION_RUN_POLICY,
  deriveResultTiming,
  getRecheckDecision,
  reconcileAbandonedRun,
  resolveWorkspaceDay,
} from '@/lib/runtime/saved-lead-investigation/run-state'
import {
  admitInvestigationExecution,
  creditInvestigationRunUsage,
  executionFailureConsumesUsage,
  reserveInvestigationRunUsage,
  type InvestigationAdmissionStore,
  type InvestigationAtomicAdmission,
  type InvestigationAtomicAdmissionInput,
  type InvestigationAtomicUsageReservationInput,
  type InvestigationRunUsageStore,
  type InvestigationUsageCredit,
  type InvestigationUsageCreditInput,
  type InvestigationUsageReservation,
} from '@/lib/runtime/saved-lead-investigation/persistence'
import {
  createCompletedSignalCheck,
  evaluateTriggerCandidate,
  validateProfileFinding,
  type InvestigationEvidenceSourceContext,
} from '@/lib/gates/saved-lead-investigation-gate'
const ROOT = process.cwd()
const HEAD_SHA = '23ae376fbcbdb2fce8b327e575c2c418585a52d7'
const CHECKED_AT = '2026-07-26T12:00:00.000Z'
const IDS = {
  profile: '11111111-1111-4111-8111-111111111111',
  trigger: '22222222-2222-4222-8222-222222222222',
  source: '33333333-3333-4333-8333-333333333333',
  evidence: '44444444-4444-4444-8444-444444444444',
  secondEvidence: '55555555-5555-4555-8555-555555555555',
  lineage: '66666666-6666-4666-8666-666666666666',
  conflict: '77777777-7777-4777-8777-777777777777',
}
const ALLOWED = [
  'db/schema.ts',
  'lib/gates/saved-lead-investigation-gate.ts',
  'lib/playbooks/saved-lead-investigation-registry.ts',
  'lib/providers/index.ts',
  'lib/providers/structured-source-provider.ts',
  'lib/runtime/saved-lead-investigation/budget.ts',
  'lib/runtime/saved-lead-investigation/contracts.ts',
  'lib/runtime/saved-lead-investigation/identity-resolution.ts',
  'lib/runtime/saved-lead-investigation/index.ts',
  'lib/runtime/saved-lead-investigation/persistence.ts',
  'lib/runtime/saved-lead-investigation/planner.ts',
  'lib/runtime/saved-lead-investigation/run-state.ts',
  'scripts/pm/cp26c2a-saved-lead-investigation-contract-smoke.ts',
] as const
const FROZEN = {
  'components/app/LeadActionSheet.tsx': '446223564a25f25a9803233755b8ff84dd84cbfd',
  'components/fetchi-ui/StatusGlyph.tsx': '961a9e9d2a545fb0de2abaa9bb67a15a6e9bfb68',
  'scripts/pm/cp26c-authenticated-design-migration-smoke.ts': 'be5b749f29430e9e600c47d9d1d92c7c4aeb7e14',
}
function git(args: string[]): string {
  return execFileSync('git', args, { cwd: ROOT, encoding: 'utf8' }).trim()
}
function lines(file: string): number {
  const text = readFileSync(join(ROOT, file), 'utf8')
  return text.length === 0 ? 0 : text.replace(/\n$/, '').split('\n').length
}
function currentDirtyFiles(): string[] {
  const modified = git(['diff', '--name-only', 'HEAD']).split('\n').filter(Boolean)
  const untracked = git(['ls-files', '--others', '--exclude-standard']).split('\n').filter(Boolean)
  return [...new Set([...modified, ...untracked])].sort()
}
function pageRoutes(root: string, current = root): string[] {
  const routes: string[] = []
  for (const entry of readdirSync(current)) {
    const path = join(current, entry)
    const stat = statSync(path)
    if (stat.isDirectory()) routes.push(...pageRoutes(root, path))
    else if (entry === 'page.tsx') routes.push(relative(ROOT, path))
  }
  return routes.sort()
}
function assertThrowsMessage(fn: () => unknown, message: string): void {
  assert.throws(fn, (error) => error instanceof Error && error.message === message)
}
function sourceContext(
  overrides: Partial<InvestigationEvidenceSourceContext> = {},
): InvestigationEvidenceSourceContext {
  return {
    investigationSourceId: IDS.source,
    evidenceSourceId: IDS.evidence,
    tier: 1,
    kind: 'structured',
    structuredSourceClass: 'building_and_trade_permits',
    addressAnchored: true,
    ...overrides,
  }
}
function usage(): InvestigationUsageSnapshot {
  return createInvestigationUsage()
}
const persisted: SavedLeadIdentity = {
  domain: 'https://www.ridgelinebp.com/',
  phone: '(505) 555-0148',
  address: '6200 Coors Blvd NW, Suite 200, Albuquerque, NM 87120',
  name: 'Ridgeline Business Park LLC',
  city: 'Albuquerque',
  state: 'NM',
  postalCode: '87120',
  countryCode: 'US',
}
function identityProof() {
  assert.equal(normalizeDomain('https://business.example.com.mx/locations'), 'example.com.mx')
  assert.equal(normalizeDomain('https://tenant-a.github.io/projects'), 'tenant-a.github.io')
  assert.equal(normalizePhone('(505) 555-0148', 'US'), '+15055550148')
  assert.equal(normalizeAddress('6200 Coors Boulevard N.W. #200'), '6200 coors blvd nw unit 200')
  assert.equal(normalizeName('Ridgeline Business Park LLC'), 'ridgeline business park')
  assert.equal(normalizeLocality('Albuquerque', 'NM'), 'albuquerque nm')
  const cases = [
    { label: 'two anchors', candidate: { domain: persisted.domain, phone: persisted.phone }, state: 'resolved', confidence: 0.99, reason: 'two_exact_identity_anchors' },
    { label: 'domain plus locality', candidate: { domain: persisted.domain, city: 'Albuquerque', state: 'NM' }, state: 'resolved', confidence: 0.95, reason: 'exact_domain_with_corroboration' },
    { label: 'phone name locality', candidate: { phone: persisted.phone, name: persisted.name, city: 'Albuquerque', state: 'NM' }, state: 'resolved', confidence: 0.92, reason: 'exact_phone_name_locality' },
    { label: 'domain only', candidate: { domain: persisted.domain, city: 'Santa Fe', state: 'NM' }, state: 'resolved', confidence: 0.9, reason: 'exact_persisted_domain' },
    { label: 'address name locality', candidate: { address: '6200 Coors Blvd NW Ste 200, Albuquerque, NM 87120', name: persisted.name, city: 'Albuquerque', state: 'NM' }, state: 'resolved', confidence: 0.88, reason: 'exact_address_name_locality' },
    { label: 'phone conflict', candidate: { domain: persisted.domain, phone: '(505) 555-9999' }, state: 'ambiguous', confidence: 0.72, reason: 'conflicting_exact_identity_anchor' },
    { label: 'name locality only', candidate: { name: persisted.name, city: 'Albuquerque', state: 'NM' }, state: 'ambiguous', confidence: 0.75, reason: 'name_locality_only' },
    { label: 'unresolved', candidate: { name: 'Other Tenant', city: 'Dallas', state: 'TX' }, state: 'unresolved', confidence: 0.25, reason: 'insufficient_identity_evidence' },
  ] as const
  const results = Object.fromEntries(cases.map((item) => {
    const result = resolveIdentity({ persisted, candidate: item.candidate, evaluatedAt: CHECKED_AT })
    assert.equal(result.state, item.state, item.label)
    assert.equal(result.confidence, item.confidence, item.label)
    assert(result.reasonCodes.includes(item.reason), item.label)
    return [item.label, result]
  }))
  const permit = resolvePermitIdentity({
    persisted,
    territory: { country: 'US', state: 'NM', city: 'Albuquerque', jurisdictionLabel: 'City of Albuquerque' },
    evaluatedAt: CHECKED_AT,
    permit: { calculatedAddress: '6200 Coors Blvd NW Suite 200', freeFormAddress: null, owner: persisted.name!, applicant: null, contractor: null },
  })
  assert.equal(permit.addressAnchored, true)
  assert.equal(permit.identity.state, 'resolved')
  assert(permit.identity.reasonCodes.includes('permit_address_exact'))
  assert.equal(resolvePermitIdentity({
    persisted,
    territory: { country: 'US', state: 'NM', city: 'Albuquerque', jurisdictionLabel: 'City of Albuquerque' },
    evaluatedAt: CHECKED_AT,
    permit: { calculatedAddress: '6201 Coors Blvd NW', freeFormAddress: null, owner: persisted.name!, applicant: null, contractor: null },
  }).identity.reasonCodes[0], 'permit_street_number_conflict')
  return {
    twoExactAnchors: results['two anchors'] as IdentityResolution,
    domainAndLocality: results['domain plus locality'] as IdentityResolution,
    phoneNameLocality: results['phone name locality'] as IdentityResolution,
    addressNameLocality: results['address name locality'] as IdentityResolution,
    exactAnchorConflict: results['phone conflict'] as IdentityResolution,
    nameLocalityOnly: results['name locality only'] as IdentityResolution,
    permit: permit.identity,
  }
}
function permitRecord(overrides: Partial<StructuredPermitRecord> = {}): StructuredPermitRecord {
  return {
    permitNumber: 'BP-2026-1024',
    issuedAt: '2026-07-24T00:00:00.000Z',
    enteredAt: '2026-07-23T00:00:00.000Z',
    calculatedAddress: '6200 Coors Blvd NW Suite 200',
    freeFormAddress: '6200 Coors Blvd NW',
    recordCategory: 'Building Permit',
    typeOfWork: 'Tenant improvement',
    structureType: 'Commercial',
    workDescription: 'Tenant improvement and final clean for new commercial shell.',
    valuation: 125000,
    squareFootage: 2400,
    numberOfUnits: 1,
    owner: persisted.name!,
    applicant: 'Ridgeline Development',
    contractor: 'BuildCo NM',
    stableExternalId: '1024',
    ...overrides,
  }
}
function structuredSourceProof() {
  assert.deepEqual(STRUCTURED_SOURCE_CLASSES, [
    'building_and_trade_permits',
    'business_licenses_and_registrations',
    'health_fire_safety_inspections',
    'property_assessor_and_sales',
    'procurement_bids_and_capital_plans',
    'warn_closures_and_official_hiring',
    'official_storm_and_hail_events',
  ])
  const mapped = mapStructuredRecord(ALBUQUERQUE_BUILDING_PERMITS, {
    PERMIT_NUMBER: 'BP-2026-1024',
    ISSUED_DATE: Date.parse('2026-07-24T00:00:00.000Z'),
    ENTERED_DATE: '2026-07-23',
    CALCULATED_ADDRESS: '6200 Coors Blvd NW Suite 200',
    ADDRESS: '6200 Coors Blvd NW',
    RECORD_CATEGORY: 'Building Permit',
    TYPE_OF_WORK: 'Tenant improvement',
    STRUCTURE_TYPE: 'Commercial',
    WORK_DESCRIPTION: 'Tenant improvement and final clean.',
    VALUATION: '125,000',
    SQUARE_FOOTAGE: '2400',
    NUMBER_OF_UNITS: 1,
    OWNER_NAME: persisted.name,
    APPLICANT_NAME: 'Ridgeline Development',
    CONTRACTOR_NAME: 'BuildCo NM',
    OBJECTID: 1024,
  })
  assert.equal(mapped.issuedAt, '2026-07-24T00:00:00.000Z')
  assert.equal(mapped.valuation, 125000)
  const snapshot = createStructuredPermitEvidenceSnapshot(mapped)
  const artifact = createStructuredPermitEvidenceRecord({
    record: mapped,
    registrySourceKey: ALBUQUERQUE_BUILDING_PERMITS.registrySourceKey,
    canonicalSourceReference: `${ALBUQUERQUE_BUILDING_PERMITS.serviceUrl}/${ALBUQUERQUE_BUILDING_PERMITS.layerId}`,
    sourceAuthority: ALBUQUERQUE_BUILDING_PERMITS.authority,
    evidenceSourceId: IDS.evidence,
    runtimeLineageRunId: IDS.lineage,
  })
  assert.equal(snapshot.fields.owner, persisted.name)
  assert.equal(artifact.canonicalArtifactKey, 'structured:albuquerque_city_building_permits:1024')
  assert.equal('owner' in artifact.approvedPublicMetadata, false)
  assertThrowsMessage(() => createStructuredPermitEvidenceRecord({ ...artifact, record: mapped, evidenceSourceId: 'not-a-uuid' }), 'Structured evidence requires a canonical evidence_sources UUID')
  assert.equal(resolveStructuredSourceAvailability(ALBUQUERQUE_BUILDING_PERMITS, ALBUQUERQUE_BUILDING_PERMITS.territory), 'available')
  assert.equal(resolveStructuredSourceAvailability(FIXTURE_SECOND_ARCGIS_SOURCE, FIXTURE_SECOND_ARCGIS_SOURCE.territory), 'unsupported')
  assert.equal(resolveStructuredSourceAvailability(ALBUQUERQUE_BUILDING_PERMITS, { country: 'US', state: 'TX', city: 'Dallas', jurisdictionLabel: 'Dallas' }), 'unavailable')
  assert.equal(filterPermitRecordsForPlaybook([mapped, permitRecord({ typeOfWork: 'Owner change', workDescription: 'Owner contact update' })], resolveSavedLeadInvestigationPlaybook('cleaning')!).length, 1)
  return { record: mapped, snapshot, artifact }
}
function planningAndBudgetProof(identity: ReturnType<typeof identityProof>) {
  const cleaning = resolveSavedLeadInvestigationPlaybook('cleaning')!
  const roofing = resolveSavedLeadInvestigationPlaybook('roofing')!
  const hvac = resolveSavedLeadInvestigationPlaybook('commercial_hvac_fixture')!
  assert.equal(SAVED_LEAD_INVESTIGATION_PLAYBOOKS.length, 3)
  assert.equal(cleaning.active, true)
  assert.equal(roofing.active, true)
  assert.equal(hvac.active, false)
  const base = { savedDomain: persisted.domain!, territory: ALBUQUERQUE_BUILDING_PERMITS.territory, structuredSources: [ALBUQUERQUE_BUILDING_PERMITS, FIXTURE_SECOND_ARCGIS_SOURCE] }
  const plans = {
    resolved: buildSavedLeadInvestigationPlan({ ...base, identity: identity.addressNameLocality, playbook: cleaning }),
    ambiguous: buildSavedLeadInvestigationPlan({ ...base, identity: identity.nameLocalityOnly, playbook: cleaning }),
    unresolved: buildSavedLeadInvestigationPlan({ ...base, identity: { ...identity.nameLocalityOnly, state: 'unresolved', matchedOn: [], reasonCodes: ['insufficient_identity_evidence'] }, playbook: cleaning }),
    roofing: buildSavedLeadInvestigationPlan({ ...base, identity: identity.addressNameLocality, playbook: roofing }),
    hvac: buildSavedLeadInvestigationPlan({ ...base, territory: FIXTURE_SECOND_ARCGIS_SOURCE.territory, identity: identity.addressNameLocality, playbook: hvac }),
  }
  assert.equal(plans.resolved.totalProviderEquivalents, 6)
  assert.equal(plans.ambiguous.serpApi.disambiguationCalls, 2)
  assert.equal(plans.unresolved.serpApi.disambiguationCalls, 3)
  assert.equal(plans.hvac.structuredSources[0]?.availability, 'unsupported')
  assert(plans.roofing.structuredSources.some((source) => source.registrySourceKey === 'unconfigured:property_assessor_and_sales'))
  for (const plan of Object.values(plans)) {
    assert(plan.structuredCalls <= SAVED_LEAD_INVESTIGATION_CEILINGS.structuredCalls)
    assert(plan.serpApi.totalCalls <= SAVED_LEAD_INVESTIGATION_CEILINGS.serpApiCalls)
    assert(plan.hydrationPages <= SAVED_LEAD_INVESTIGATION_CEILINGS.hydrationPages)
    assert(plan.totalProviderEquivalents <= SAVED_LEAD_INVESTIGATION_CEILINGS.totalProviderEquivalents)
  }
  assert.equal(isStrictlyResolvedIdentity(identity.addressNameLocality), true)
  assert.equal(canExecuteSignalDiscovery(plans.resolved, identity.addressNameLocality), true)
  assert.equal(canExecuteSignalDiscovery(plans.ambiguous, identity.nameLocalityOnly), false)
  const usageAfter = recordInvestigationUsage(recordInvestigationUsage(usage(), 'structuredCalls', 2), 'serpApiCalls', 4)
  assert.equal(usageAfter.totalProviderEquivalents, 6)
  assertThrowsMessage(() => recordInvestigationUsage(usageAfter, 'structuredCalls', 1), 'Investigation structuredCalls ceiling exceeded')
  const retained = retainSerpApiCandidates([{ callId: 'a', candidates: [1, 2, 3, 4, 5] }, { callId: 'b', candidates: [6, 7, 8, 9] }])
  assert.deepEqual(retained.reasonCodes, ['serpapi_candidates_per_call_limit'])
  assert.equal(truncateHydratedPages([{ id: 'a', normalizedText: 'x'.repeat(13000) }, { id: 'b', normalizedText: 'y'.repeat(19000) }, { id: 'c', normalizedText: 'z' }, { id: 'd', normalizedText: 'skip' }]).truncated, true)
  const interpretation = truncateInterpretationSources([
    { id: 'tier3', tier: 3, exactDomain: false, dated: true, estimatedTokens: 100, text: 'dated' },
    { id: 'tier1', tier: 1, exactDomain: false, dated: false, estimatedTokens: 10, text: 'source' },
    { id: 'long', tier: 2, exactDomain: true, dated: false, estimatedTokens: 50, text: 'x'.repeat(80) },
  ], 40)
  assert.equal(interpretation.retained[0]?.id, 'tier1')
  assert.equal(interpretation.truncated, true)
  assert.equal(conservativeTokenUpperBound('abc'), 3)
  assert.deepEqual(validateInterpretationTokenUsage(12001, 0).reasonCodes, ['interpretation_input_token_limit'])
  return plans
}
function admissionStore(limit = 10): InvestigationAdmissionStore {
  const byClient = new Map<string, InvestigationAtomicAdmission>()
  const activeByLead = new Map<string, string>()
  let used = 0
  return {
    resolveWorkspaceTimezone: async () => 'America/Denver',
    admitAtomically: async (input: InvestigationAtomicAdmissionInput) => {
      const clientKey = `${input.workspaceId}:${input.clientRequestId}`
      const leadKey = `${input.workspaceId}:${input.savedLeadId}`
      const replay = byClient.get(clientKey)
      if (replay) return { ...replay, state: 'idempotent_replay', usageCounted: false as const }
      const activeRun = activeByLead.get(leadKey)
      if (activeRun) return { state: 'already_running', runId: activeRun, savedLeadId: input.savedLeadId, usedCount: used, usageCounted: false, externalCalls: 0 }
      if (used >= limit) return { state: 'daily_limit_reached', runId: input.runId, savedLeadId: input.savedLeadId, usedCount: used, resetAt: input.resetAt, limit: input.limit, usageCounted: false, externalCalls: 0 }
      used += 1
      activeByLead.set(leadKey, input.runId)
      const admitted = { state: 'admitted', runId: input.runId, savedLeadId: input.savedLeadId, usedCount: used, usageCounted: true, externalCalls: 0 } as const
      byClient.set(clientKey, admitted)
      return admitted
    },
  }
}
async function dailyCapProof() {
  const day = resolveWorkspaceDay(CHECKED_AT, 'America/Denver')
  assert.deepEqual(day, { workspaceDayKey: '2026-07-26', timezone: 'America/Denver', resetAt: '2026-07-27T06:00:00.000Z' })
  const store = admissionStore()
  let admitted = 0
  for (let index = 0; index < 10; index += 1) {
    const result = await admitInvestigationExecution(store, { workspaceId: 'workspace', savedLeadId: `lead-${index}`, runId: `run-${index}`, clientRequestId: `client-${index}`, eligibility: 'eligible' }, { now: () => CHECKED_AT })
    if (result.state === 'admitted') admitted += 1
  }
  const rejected = await admitInvestigationExecution(store, { workspaceId: 'workspace', savedLeadId: 'lead-11', runId: 'run-11', clientRequestId: 'client-11', eligibility: 'eligible' }, { now: () => CHECKED_AT })
  const replay = await admitInvestigationExecution(store, { workspaceId: 'workspace', savedLeadId: 'lead-0', runId: 'new-run', clientRequestId: 'client-0', eligibility: 'eligible' }, { now: () => CHECKED_AT })
  assert.equal(admitted, 10)
  assert.equal(rejected.state, 'daily_limit_reached')
  assert.equal(replay.state, 'idempotent_replay')
  assert.equal((await admitInvestigationExecution(store, { workspaceId: '', savedLeadId: 'lead', runId: 'run', clientRequestId: 'client', eligibility: 'eligible' })).state, 'invalid_request')
  assert.equal((await admitInvestigationExecution(store, { workspaceId: 'workspace', savedLeadId: 'lead', runId: 'run', clientRequestId: 'client', eligibility: 'cooldown' })).state, 'invalid_request')
  return { day, admitted, rejected: rejected.state === 'daily_limit_reached' ? 1 : 0 }
}
function usageStore(): InvestigationRunUsageStore {
  const reservations = new Map<string, InvestigationAtomicUsageReservationInput>()
  const credits = new Map<string, Omit<Extract<InvestigationUsageCredit, { state: 'credited' | 'idempotent_replay' }>, 'state'>>()
  let current = usage()
  return {
    reserveUsageAtomically: async (input) => {
      const key = `${input.runId}:${input.operationKey}`
      if (reservations.has(key)) return { state: 'idempotent_replay', runId: input.runId, operationKey: input.operationKey, reservedUnits: input.units, usage: current, externalCalls: 0 }
      try { current = recordInvestigationUsage(current, input.category, input.units) } catch { return { state: 'budget_refused', runId: input.runId, operationKey: input.operationKey, reasonCode: 'category_ceiling', externalCalls: 0 } }
      reservations.set(key, input)
      return { state: 'reserved', runId: input.runId, operationKey: input.operationKey, reservedUnits: input.units, usage: current, externalCalls: 0 }
    },
    creditUsageAtomically: async (input: InvestigationUsageCreditInput) => {
      const key = `${input.runId}:${input.operationKey}`
      const credit = credits.get(key)
      if (credit) return { state: 'idempotent_replay', ...credit }
      const reservation = reservations.get(key)
      if (!reservation) return { state: 'reservation_missing', runId: input.runId, operationKey: input.operationKey, externalCalls: 0 }
      if (input.actualUnits > reservation.units) return { state: 'actual_units_exceed_reservation', runId: input.runId, operationKey: input.operationKey, externalCalls: 0 }
      current = { ...current, providerRequestCounts: { ...current.providerRequestCounts, [input.providerKey]: input.providerRequestCount }, providerReportedCredits: { ...current.providerReportedCredits, [input.providerKey]: input.providerReportedCredits ?? 0 } }
      const result = { state: 'credited', runId: input.runId, operationKey: input.operationKey, usage: current, externalCalls: 0 } as const
      credits.set(key, { runId: result.runId, operationKey: result.operationKey, usage: result.usage, externalCalls: result.externalCalls })
      return result
    },
  }
}
async function perRunUsageReservationProof() {
  const store = usageStore()
  const reserved = await reserveInvestigationRunUsage(store, { workspaceId: 'workspace', runId: 'run', operationKey: 'arcgis:1', category: 'structuredCalls', units: 1 })
  const replay = await reserveInvestigationRunUsage(store, { workspaceId: 'workspace', runId: 'run', operationKey: 'arcgis:1', category: 'structuredCalls', units: 1 })
  const refused = await reserveInvestigationRunUsage(store, { workspaceId: 'workspace', runId: 'run', operationKey: 'big', category: 'structuredCalls', units: 3 })
  const credited = await creditInvestigationRunUsage(store, { workspaceId: 'workspace', runId: 'run', operationKey: 'arcgis:1', providerKey: 'arcgis', actualUnits: 1, providerRequestCount: 1, providerReportedCredits: 2 })
  assert.equal(reserved.state, 'reserved')
  assert.equal(replay.state, 'idempotent_replay')
  assert.equal(refused.state, 'budget_refused')
  assert.equal(credited.state, 'credited')
  assert(credited.state === 'credited')
  assert.equal(executionFailureConsumesUsage('failed_after_execution'), true)
  assert.equal(executionFailureConsumesUsage('failed_before_execution'), false)
  return { reservedBeforeTransport: reserved.state, credited: credited.state, providerRequestCounts: credited.usage.providerRequestCounts }
}
function profileFinding(
  identity: IdentityResolution,
  snapshot = createStructuredPermitEvidenceSnapshot(permitRecord()),
  overrides: Partial<SavedLeadProfileFinding> = {},
): SavedLeadProfileFinding {
  return {
    id: IDS.profile,
    factKey: 'project_or_expansion_context',
    value: 'Tenant improvement',
    investigationSourceId: IDS.source,
    evidenceSourceId: IDS.evidence,
    structuredEvidenceSnapshot: snapshot,
    observedAt: CHECKED_AT,
    identityMatch: { matchedOn: identity.matchedOn, reasonCodes: identity.reasonCodes },
    ...overrides,
  }
}
function evidenceAndDualAxisProof(identity: ReturnType<typeof identityProof>, source: ReturnType<typeof structuredSourceProof>) {
  const triggerBase = {
    findingId: IDS.trigger,
    identity: identity.permit,
    source: sourceContext(),
    activePlaybookId: 'commercial_cleaning',
    approvedSignalFamilyId: 'building_permit',
    approvedSignalLabelId: 'cleaning_buildout_activity',
    recordFamilyId: 'building_permit',
    investigationSourceId: IDS.source,
    evidenceSourceId: IDS.evidence,
    structuredEvidenceSnapshot: source.snapshot,
    eventDate: source.record.issuedAt!,
    evaluatedAt: CHECKED_AT,
    claimGuardPassed: true,
  }
  const unresolvedIdentity: IdentityResolution = {
    ...identity.nameLocalityOnly,
    state: 'unresolved',
    matchedOn: [],
    reasonCodes: ['insufficient_identity_evidence'],
  }
  const validTrigger = evaluateTriggerCandidate(triggerBase)
  assert.equal(validTrigger.state, 'signal_found')
  for (const [label, overrides, reason] of [
    ['ambiguous identity', { identity: identity.nameLocalityOnly }, 'identity_ambiguous'],
    ['unresolved identity', { identity: unresolvedIdentity }, 'identity_unresolved'],
    ['stale event', { eventDate: '2026-01-01T00:00:00.000Z', structuredEvidenceSnapshot: createStructuredPermitEvidenceSnapshot(permitRecord({ issuedAt: '2026-01-01T00:00:00.000Z' })) }, 'insufficient_evidence'],
    ['claim guard', { claimGuardPassed: false }, 'insufficient_evidence'],
    ['inactive playbook', { activePlaybookId: 'commercial_hvac_fixture', approvedSignalLabelId: 'hvac_permit_activity' }, 'insufficient_evidence'],
  ] as const) {
    const result = evaluateTriggerCandidate({ ...triggerBase, ...overrides })
    assert.equal(result.state, 'no_signal', label)
    assert.equal(result.reasonCode, reason, label)
  }
  assert.equal(evaluateTriggerCandidate({ ...triggerBase, structuredEvidenceSnapshot: createStructuredPermitEvidenceSnapshot(permitRecord({ owner: 'Tenant improvement owner', typeOfWork: 'Owner update', workDescription: 'Owner transfer' })) }).state, 'no_signal')
  const sourceDecision = validateProfileFinding(profileFinding(identity.permit, source.snapshot), sourceContext(), { existingFindings: [] })
  const domainDecision = validateProfileFinding(profileFinding(identity.domainAndLocality, undefined, { factKey: 'domain', value: 'ridgelinebp.com', exactExcerpt: 'Visit ridgelinebp.com for locations.', structuredEvidenceSnapshot: undefined, identityMatch: { matchedOn: ['domain'], reasonCodes: identity.domainAndLocality.reasonCodes } }), sourceContext({ kind: 'entity_domain', tier: 2, structuredSourceClass: undefined, addressAnchored: undefined }), { existingFindings: [] })
  assert.equal(sourceDecision.ok, true)
  assert.equal(domainDecision.ok, true)
  const mismatch = validateProfileFinding(profileFinding(identity.permit, source.snapshot, { value: 'Unrelated' }), sourceContext(), { existingFindings: [] })
  assert.equal(mismatch.ok, false)
  if (!mismatch.ok) assert.equal(mismatch.reasonCode, 'evidence_value_mismatch')
  const conflicting = profileFinding(identity.permit, source.snapshot, { id: IDS.conflict, factKey: 'ownership_or_management', value: 'Ridgeline Development', conflict: { groupId: 'owner', reasonCodes: ['conflicting_profile_fact'] } })
  const peer = profileFinding(identity.permit, source.snapshot, { factKey: 'ownership_or_management', value: persisted.name!, conflict: { groupId: 'owner', reasonCodes: ['conflicting_profile_fact'] } })
  assert.equal(validateProfileFinding(conflicting, sourceContext(), { existingFindings: [peer] }).ok, true)
  const noTriggerWithProfile = createCompletedSignalCheck({
    savedLeadId: 'saved-lead',
    runId: 'run-no-trigger-profile',
    checkedAt: CHECKED_AT,
    identity: identity.permit,
    trigger: { state: 'no_signal', reasonCode: 'none_found' },
    profileReport: { findings: [profileFinding(identity.permit, source.snapshot)], sourcesChecked: 1, structuredSourcesChecked: 1, webQueriesRun: 0, hydratedSources: 0, categoryIdsChecked: ['building_permits'], unavailableSourceKeys: [], checkedSourceKeys: [ALBUQUERQUE_BUILDING_PERMITS.registrySourceKey], usage: usage(), expiresAt: '2026-08-25T12:00:00.000Z' },
    recheckEligibleAt: '2026-08-02T12:00:00.000Z',
    resultExpiresAt: '2026-08-25T12:00:00.000Z',
  })
  const zeroProfile = createCompletedSignalCheck({ ...noTriggerWithProfile, runId: 'run-zero-profile', profileReport: { ...noTriggerWithProfile.profileReport, findings: [], unavailableSourceKeys: ['entity_domain'] } })
  const duplicateLineage = new Set([
    source.artifact.canonicalArtifactKey,
    createStructuredPermitEvidenceRecord({ record: source.record, registrySourceKey: ALBUQUERQUE_BUILDING_PERMITS.registrySourceKey, canonicalSourceReference: 'same', sourceAuthority: ALBUQUERQUE_BUILDING_PERMITS.authority, evidenceSourceId: IDS.secondEvidence, runtimeLineageRunId: IDS.lineage }).canonicalArtifactKey,
  ])
  assert.equal(noTriggerWithProfile.trigger.state, 'no_signal')
  assert.equal(noTriggerWithProfile.profileReport.findings.length, 1)
  assert.equal(zeroProfile.profileReport.findings.length, 0)
  assert.equal(duplicateLineage.size, 1)
  return { noTriggerWithProfile, zeroProfile, validTrigger }
}
function runStateProof(source: ReturnType<typeof structuredSourceProof>, trigger: ReturnType<typeof evaluateTriggerCandidate>) {
  assert.equal(SAVED_LEAD_INVESTIGATION_RUN_POLICY.staleRunningAfterMs, 120000)
  const run: SavedLeadInvestigationRunSnapshot = { id: 'run', status: 'running', currentPhase: 'reading_sources', heartbeatAt: '2026-07-26T11:58:00.001Z', updatedAt: '2026-07-26T11:58:00.001Z', failureCode: null, failureRetryable: false, dailyUsageCounted: true, latestSuccessfulRunId: null }
  const notStale = reconcileAbandonedRun(run, CHECKED_AT)
  const stale = reconcileAbandonedRun({ ...run, heartbeatAt: '2026-07-26T11:58:00.000Z' }, CHECKED_AT)
  const cleaning = resolveSavedLeadInvestigationPlaybook('cleaning')!
  const roofing = resolveSavedLeadInvestigationPlaybook('roofing')!
  const noSignal = { state: 'no_signal', reasonCode: 'none_found' } as const
  const cleaningNoSignal = deriveResultTiming({ checkedAt: CHECKED_AT, trigger: noSignal, playbook: cleaning })
  const roofingNoSignal = deriveResultTiming({ checkedAt: CHECKED_AT, trigger: noSignal, playbook: roofing })
  const signalTiming = deriveResultTiming({ checkedAt: CHECKED_AT, trigger, playbook: cleaning })
  assert.equal(notStale.status, 'running')
  assert.equal(stale.status, 'failed')
  assert.equal(cleaningNoSignal.recheckEligibleAt, '2026-08-02T12:00:00.000Z')
  assert.equal(roofingNoSignal.recheckEligibleAt, '2026-07-29T12:00:00.000Z')
  assert.equal(signalTiming.resultExpiresAt, source.record.issuedAt ? '2026-08-23T00:00:00.000Z' : signalTiming.resultExpiresAt)
  assert.deepEqual(getRecheckDecision({ now: CHECKED_AT, recheckEligibleAt: null, latestCompletedRunId: null, activeRunId: null }), { state: 'eligible' })
  assert.equal(getRecheckDecision({ now: CHECKED_AT, recheckEligibleAt: '2026-08-02T12:00:00.000Z', latestCompletedRunId: 'run', activeRunId: null }).state, 'cooldown')
  assert.equal(getRecheckDecision({ now: CHECKED_AT, recheckEligibleAt: null, latestCompletedRunId: null, activeRunId: 'run-active' }).state, 'already_running')
  return { notStale, stale, cleaningNoSignal, roofingNoSignal }
}
function functionLengths(file: string): Array<{ name: string; start: number; length: number }> {
  const source = readFileSync(join(ROOT, file), 'utf8').split('\n')
  const results: Array<{ name: string; start: number; length: number }> = []
  const stack: Array<{ name: string; start: number; depth: number; seen: boolean }> = []
  source.forEach((line, index) => {
    const match = line.match(/^(export\s+)?(async\s+)?function\s+([\w$]+)/)
    if (match) stack.push({ name: match[3]!, start: index + 1, depth: 0, seen: false })
    for (const char of line) {
      if (char === '{') for (const item of stack) { item.depth += 1; item.seen = true }
      if (char === '}') for (const item of stack) item.depth -= 1
    }
    while (stack.length && stack[stack.length - 1]!.seen && stack[stack.length - 1]!.depth <= 0) {
      const item = stack.pop()!
      results.push({ name: item.name, start: item.start, length: index + 2 - item.start })
    }
  })
  return results
}
function patchAdditions(): number {
  const trackedStats = git(['diff', '--numstat', 'HEAD', '--', ...ALLOWED]).split('\n').filter(Boolean)
  const trackedAdditions = trackedStats.reduce((sum, line) => sum + Number(line.split(/\s+/)[0] ?? 0), 0)
  const trackedFiles = new Set(trackedStats.map((line) => line.split(/\s+/).at(-1)!))
  const untrackedAdditions = ALLOWED
    .filter((file) => !trackedFiles.has(file) && git(['ls-files', '--', file]) === '')
    .reduce((sum, file) => sum + lines(file), 0)
  return trackedAdditions + untrackedAdditions
}
function schemaAndScopeProof() {
  assert.equal(git(['rev-parse', 'HEAD']), HEAD_SHA)
  for (const [file, blob] of Object.entries(FROZEN)) {
    assert.equal(git(['rev-parse', `HEAD:${file}`]), blob)
  }
  assert.deepEqual(currentDirtyFiles(), [...ALLOWED].sort())
  assert.equal(git(['diff', '--name-only', 'HEAD', '--', ...Object.keys(FROZEN)]), '')
  const routes = pageRoutes(join(ROOT, 'app'))
  const committedRoutes = git(['ls-tree', '-r', '--name-only', 'HEAD', '--', 'app'])
    .split('\n').filter((file) => file.endsWith('/page.tsx') || file === 'app/page.tsx').sort()
  assert.equal(routes.length, 23)
  assert.deepEqual(routes, committedRoutes)
  const tables = [savedLeadInvestigationDailyUsage, savedLeadInvestigationRuns, savedLeadInvestigationState, savedLeadInvestigationSources, savedLeadTriggerFindings, savedLeadProfileFindings]
  assert.deepEqual(tables.map(getTableName), [
    'saved_lead_investigation_daily_usage',
    'saved_lead_investigation_runs',
    'saved_lead_investigation_state',
    'saved_lead_investigation_sources',
    'saved_lead_trigger_findings',
    'saved_lead_profile_findings',
  ])
  for (const table of tables) assert(Object.keys(getTableColumns(table)).includes('workspaceId'))
  assert(getTableConfig(savedLeadInvestigationRuns).indexes.some((item) => item.config.name === 'saved_lead_inv_run_active_unique'))
  assert(getTableConfig(savedLeadInvestigationDailyUsage).primaryKeys[0]?.columns.map((column) => column.name).join(',') === 'workspace_id,workspace_day_key')
  assert(!Object.keys(getTableColumns(savedLeadInvestigationRuns)).includes('score'))
  assert(!Object.keys(getTableColumns(savedLeadProfileFindings)).includes('outreach'))
  const schemaSource = readFileSync(join(ROOT, 'db/schema.ts'), 'utf8')
  for (const value of [...INVESTIGATION_ATTEMPT_STATUSES, ...INVESTIGATION_PHASES, ...SOURCE_AVAILABILITIES, ...SOURCE_CHECK_STATES, ...SAVED_LEAD_PROFILE_FACT_KEYS]) {
    assert(schemaSource.includes(`'${value}'`), `schema check must include canonical value ${value}`)
  }
  const contractSource = ALLOWED.filter((file) => !['db/schema.ts', 'scripts/pm/cp26c2a-saved-lead-investigation-contract-smoke.ts'].includes(file)).map((file) => readFileSync(join(ROOT, file), 'utf8')).join('\n')
  for (const forbidden of ["from '@/db'", 'db:push', 'fetch(', 'new OpenAI', 'Anthropic(', 'generateText(', 'createOpportunity', 'draftOutreach']) assert(!contractSource.includes(forbidden), forbidden)
  assert(lines('scripts/pm/cp26c2a-saved-lead-investigation-contract-smoke.ts') <= 1200)
  for (const file of ALLOWED.filter((file) => !['db/schema.ts', 'scripts/pm/cp26c2a-saved-lead-investigation-contract-smoke.ts'].includes(file))) assert(lines(file) <= 550, file)
  for (const file of ALLOWED) {
    const max = file.endsWith('smoke.ts') ? 150 : 100
    const long = functionLengths(file).filter((item) => item.length > max)
    assert.deepEqual(long, [], `${file} has oversized functions`)
  }
  const additions = patchAdditions()
  assert(additions <= 4500, `Stage 2A additions ${additions} exceed 4500`)
  return { routeCount: routes.length, stageTwoFiles: [...ALLOWED], additions }
}
async function main() {
  const originalFetch = globalThis.fetch
  let unexpectedFetchCalls = 0
  globalThis.fetch = (async () => {
    unexpectedFetchCalls += 1
    throw new Error('CP26C.2A smoke forbids external calls')
  }) as typeof fetch
  try {
    const identities = identityProof()
    const source = structuredSourceProof()
    const planning = planningAndBudgetProof(identities)
    const dailyCap = await dailyCapProof()
    const runUsage = await perRunUsageReservationProof()
    const dualAxis = evidenceAndDualAxisProof(identities, source)
    const runState = runStateProof(source, dualAxis.validTrigger)
    const scope = schemaAndScopeProof()
    assert.equal(unexpectedFetchCalls, 0)
    console.log(JSON.stringify({
      ok: true,
      mode: 'cp26c2a_saved_lead_investigation_contract',
      identity: {
        domainLocalityConfidence: identities.domainAndLocality.confidence,
        phoneNameLocalityConfidence: identities.phoneNameLocality.confidence,
        addressNameLocalityConfidence: identities.addressNameLocality.confidence,
        conflictState: identities.exactAnchorConflict.state,
      },
      sourceStrategy: {
        sourceClasses: STRUCTURED_SOURCE_CLASSES.length,
        firstLiveConfig: ALBUQUERQUE_BUILDING_PERMITS.registrySourceKey,
        fixtureOnlyConfig: FIXTURE_SECOND_ARCGIS_SOURCE.registrySourceKey,
        evidenceKinds: INVESTIGATION_EVIDENCE_SOURCE_KINDS.length,
        usageCategories: INVESTIGATION_USAGE_CATEGORIES.length,
      },
      planning: {
        resolvedProviderEquivalents: planning.resolved.totalProviderEquivalents,
        ambiguousDisambiguationCalls: planning.ambiguous.serpApi.disambiguationCalls,
        unresolvedDisambiguationCalls: planning.unresolved.serpApi.disambiguationCalls,
      },
      dailyCap,
      runUsage,
      dualAxis: {
        triggerState: dualAxis.noTriggerWithProfile.trigger.state,
        profileFindingsRetained: dualAxis.noTriggerWithProfile.profileReport.findings.length,
        zeroProfileStillComplete: dualAxis.zeroProfile.status === 'completed',
      },
      runState: {
        staleAfterMs: SAVED_LEAD_INVESTIGATION_RUN_POLICY.staleRunningAfterMs,
        boundaryBefore: runState.notStale.status,
        boundaryAt: runState.stale.status,
        cleaningCooldownAt: runState.cleaningNoSignal.recheckEligibleAt,
        roofingCooldownAt: runState.roofingNoSignal.recheckEligibleAt,
      },
      scope,
      providerCalls: 0,
      modelCalls: 0,
      dbWrites: 0,
      externalFetchCalls: unexpectedFetchCalls,
    }, null, 2))
  } finally {
    globalThis.fetch = originalFetch
  }
}
main().catch((error) => {
  console.error(error)
  process.exit(1)
})
