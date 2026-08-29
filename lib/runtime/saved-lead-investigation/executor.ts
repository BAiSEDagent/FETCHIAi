import type { EvidenceProvider } from '@/lib/providers/evidence-provider'
import type { SearchProvider } from '@/lib/providers/search-provider'
import {
  ALBUQUERQUE_BUILDING_PERMITS,
  FIXTURE_SECOND_ARCGIS_SOURCE,
  filterPermitRecordsForPlaybook,
  resolveSavedLeadInvestigationPlaybook,
  type SavedLeadInvestigationPlaybook,
} from '@/lib/playbooks/saved-lead-investigation-registry'
import {
  createCompletedSignalCheck,
  evaluateTriggerCandidate,
  validateProfileFinding,
  type InvestigationEvidenceSourceContext,
} from '@/lib/gates/saved-lead-investigation-gate'
import {
  createStructuredPermitEvidenceSnapshot,
  type ArcGisStructuredSourceConfig,
  type StructuredPermitRecord,
} from '@/lib/providers/structured-source-provider'
import {
  type CompletedSignalCheck,
  type IdentityResolution,
  type InvestigationUsageSnapshot,
  type SavedLeadIdentity,
  type SavedLeadProfileFinding,
  type TriggerResult,
} from './contracts'
import { createInvestigationUsage } from './budget'
import { resolveIdentity, resolvePermitIdentity } from './identity-resolution'
import {
  buildSavedLeadInvestigationPlan,
} from './planner'
import { getRecheckDecision } from './run-state'
import {
  collectSavedLeadInvestigationSources,
  type SavedLeadInvestigationSourceProviderRegistry,
  type SourceCollectorRepository,
  type SemanticSourceObservation,
} from './source-collector'
import { buildCompletedSignalCheck } from './result-builder'

export type { SavedLeadInvestigationSourceProviderRegistry }

export interface OwnedSavedLeadForInvestigation {
  workspaceId: string
  id: string
  identity: SavedLeadIdentity
  serviceProfileAlias?: string | null
}

export interface SavedLeadInvestigationRepository
  extends SourceCollectorRepository {
  loadOwnedSavedLead(input: {
    workspaceId: string
    savedLeadId: string
  }): Promise<OwnedSavedLeadForInvestigation | null>
  loadLatestRunState(input: {
    workspaceId: string
    savedLeadId: string
  }): Promise<{
    activeRunId: string | null
    latestCompletedRunId: string | null
    recheckEligibleAt: string | null
  }>
  createOrGetRun(input: {
    workspaceId: string
    savedLeadId: string
    clientRequestId: string
    playbook: SavedLeadInvestigationPlaybook
    runId: string
  }): Promise<{ runId: string; idempotent: boolean }>
  admitRun(input: {
    workspaceId: string
    savedLeadId: string
    runId: string
    clientRequestId: string
  }): Promise<{
    state: 'admitted' | 'idempotent_replay' | 'already_running' | 'daily_limit_reached'
    runId: string
    savedLeadId: string
    usedCount: number
    usageCounted: boolean
    externalCalls: 0
    resetAt?: string
    limit?: number
  }>
  markPhase(runId: string, phase: string): Promise<void>
  persistInitialIdentity(runId: string, identity: IdentityResolution): Promise<void>
  persistSourcePlan(runId: string, plan: unknown): Promise<void>
  persistProfileFindings(runId: string, findings: SavedLeadProfileFinding[]): Promise<void>
  persistTriggerFinding(runId: string, trigger: TriggerResult): Promise<void>
  persistCompletedResult(result: CompletedSignalCheck): Promise<void>
  persistRetryableFailure(input: {
    runId: string
    failureCode: string
    latestSuccessfulRunId: string | null
  }): Promise<void>
  readUsageSnapshot?(input: {
    workspaceId: string
    runId: string
  }): Promise<InvestigationUsageSnapshot>
  readLatestSuccessfulResult(input: {
    workspaceId: string
    savedLeadId: string
  }): Promise<CompletedSignalCheck | null>
  reconcileAbandonedRuns(input: {
    workspaceId: string
    savedLeadId: string
    now: string
  }): Promise<void>
}

export interface ExecuteSavedLeadInvestigationInput {
  workspaceId: string
  savedLeadId: string
  clientRequestId: string
  serviceProfileAlias?: string
  repository: SavedLeadInvestigationRepository
  providers: SavedLeadInvestigationSourceProviderRegistry
  serpApiProvider?: SearchProvider
  firecrawlProvider?: EvidenceProvider
  structuredSourceConfigs?: readonly ArcGisStructuredSourceConfig<StructuredPermitRecord>[]
  clock: () => string
  idFactory: () => string
}

export type SavedLeadInvestigationExecutionResult =
  | { state: 'completed'; result: CompletedSignalCheck }
  | { state: 'failed'; failureCode: string; latestSuccessfulResult: CompletedSignalCheck | null }
  | { state: 'already_running' | 'cooldown' | 'daily_limit_reached' | 'ownership_rejected' | 'inactive_playbook' | 'idempotent_replay'; runId?: string; externalCalls: 0; result?: CompletedSignalCheck }

function territory(identity: SavedLeadIdentity) {
  return {
    country: identity.countryCode ?? 'US',
    state: identity.state ?? '',
    city: identity.city ?? undefined,
    jurisdictionLabel: identity.city ?? 'saved lead market',
  }
}

function sourceContext(
  observation: SemanticSourceObservation,
  record: { investigationSourceId: string; evidenceSourceId: string; addressAnchored: boolean },
): InvestigationEvidenceSourceContext {
  return {
    investigationSourceId: record.investigationSourceId,
    evidenceSourceId: record.evidenceSourceId,
    tier: observation.tier,
    kind: observation.kind,
    structuredSourceClass: observation.sourceClass as never,
    addressAnchored: record.addressAnchored,
  }
}

function triggerLabel(playbook: SavedLeadInvestigationPlaybook): string {
  return playbook.approvedSignalLabels[0] ?? 'building_permit_activity'
}

function evaluateStructuredTrigger(input: {
  savedLead: OwnedSavedLeadForInvestigation
  playbook: SavedLeadInvestigationPlaybook
  observations: readonly SemanticSourceObservation[]
  checkedAt: string
  idFactory: () => string
}): {
  trigger: TriggerResult
  identity: IdentityResolution
  profileFindings: SavedLeadProfileFinding[]
} {
  let finalIdentity = resolveIdentity({
    persisted: input.savedLead.identity,
    candidate: input.savedLead.identity,
    evaluatedAt: input.checkedAt,
  })
  const profileFindings: SavedLeadProfileFinding[] = []
  let trigger: TriggerResult = { state: 'no_signal', reasonCode: 'none_found' }

  for (const observation of input.observations) {
    if (observation.kind !== 'structured' || observation.sourceClass !== 'building_and_trade_permits') continue
    const qualifying = filterPermitRecordsForPlaybook(
      observation.structuredRecords.map((record) => record.evidence.record),
      input.playbook,
    )
    for (const linked of observation.structuredRecords) {
      const permitIdentity = resolvePermitIdentity({
        persisted: input.savedLead.identity,
        permit: linked.evidence.record,
        territory: territory(input.savedLead.identity),
        evaluatedAt: input.checkedAt,
      })
      if (permitIdentity.identity.state !== 'unresolved') {
        finalIdentity = permitIdentity.identity
      }
      const context = sourceContext(observation, linked)
      const snapshot = createStructuredPermitEvidenceSnapshot(linked.evidence.record)
      if (linked.evidence.record.issuedAt && permitIdentity.addressAnchored) {
        const finding: SavedLeadProfileFinding = {
          id: input.idFactory(),
          factKey: 'latest_permit_date',
          value: linked.evidence.record.issuedAt,
          investigationSourceId: linked.investigationSourceId,
          evidenceSourceId: linked.evidenceSourceId,
          structuredEvidenceSnapshot: snapshot,
          observedAt: input.checkedAt,
          eventDate: new Date(linked.evidence.record.issuedAt).toISOString(),
          identityMatch: {
            matchedOn: permitIdentity.identity.matchedOn,
            reasonCodes: permitIdentity.identity.reasonCodes,
          },
        }
        if (validateProfileFinding(finding, context, { existingFindings: profileFindings }).ok) {
          profileFindings.push(finding)
        }
      }
      if (
        trigger.state === 'no_signal' &&
        qualifying.includes(linked.evidence.record)
      ) {
        trigger = evaluateTriggerCandidate({
          findingId: input.idFactory(),
          identity: permitIdentity.identity,
          source: context,
          activePlaybookId: input.playbook.id,
          approvedSignalFamilyId: 'building_permit',
          approvedSignalLabelId: triggerLabel(input.playbook),
          recordFamilyId: 'building_permit',
          investigationSourceId: linked.investigationSourceId,
          evidenceSourceId: linked.evidenceSourceId,
          structuredEvidenceSnapshot: snapshot,
          eventDate: linked.evidence.eventDate ?? linked.evidence.record.issuedAt ?? '',
          evaluatedAt: input.checkedAt,
          claimGuardPassed: true,
        })
      }
    }
  }

  if (trigger.state === 'no_signal' && finalIdentity.state !== 'resolved') {
    trigger = {
      state: 'no_signal',
      reasonCode: finalIdentity.state === 'ambiguous'
        ? 'identity_ambiguous'
        : 'identity_unresolved',
    }
  }
  return { trigger, identity: finalIdentity, profileFindings }
}

function retryableFailure(
  observations: readonly SemanticSourceObservation[],
): string | null {
  return observations.find((source) => source.retryableFailure)?.failureCode ?? null
}

export async function executeSavedLeadInvestigation(
  input: ExecuteSavedLeadInvestigationInput,
): Promise<SavedLeadInvestigationExecutionResult> {
  const now = input.clock()
  await input.repository.reconcileAbandonedRuns({
    workspaceId: input.workspaceId,
    savedLeadId: input.savedLeadId,
    now,
  })
  const savedLead = await input.repository.loadOwnedSavedLead({
    workspaceId: input.workspaceId,
    savedLeadId: input.savedLeadId,
  })
  if (!savedLead) return { state: 'ownership_rejected', externalCalls: 0 }
  const playbook = resolveSavedLeadInvestigationPlaybook(
    input.serviceProfileAlias ?? savedLead.serviceProfileAlias ?? '',
  )
  if (!playbook?.active) return { state: 'inactive_playbook', externalCalls: 0 }
  const runState = await input.repository.loadLatestRunState({
    workspaceId: input.workspaceId,
    savedLeadId: input.savedLeadId,
  })
  const recheck = getRecheckDecision({ now, ...runState })
  if (recheck.state !== 'eligible') {
    return { state: recheck.state, runId: recheck.runId, externalCalls: 0 }
  }
  const created = await input.repository.createOrGetRun({
    workspaceId: input.workspaceId,
    savedLeadId: input.savedLeadId,
    clientRequestId: input.clientRequestId,
    playbook,
    runId: input.idFactory(),
  })
  const admission = await input.repository.admitRun({
    workspaceId: input.workspaceId,
    savedLeadId: input.savedLeadId,
    runId: created.runId,
    clientRequestId: input.clientRequestId,
  })
  if (admission.state !== 'admitted') {
    return { state: admission.state, runId: admission.runId, externalCalls: 0 }
  }

  await input.repository.markPhase(created.runId, 'resolving_identity')
  const initialIdentity = resolveIdentity({
    persisted: savedLead.identity,
    candidate: savedLead.identity,
    evaluatedAt: now,
  })
  await input.repository.persistInitialIdentity(created.runId, initialIdentity)
  const plan = buildSavedLeadInvestigationPlan({
    identity: initialIdentity,
    playbook,
    savedDomain: savedLead.identity.domain ?? null,
    territory: territory(savedLead.identity),
    structuredSources: input.structuredSourceConfigs ?? [
      ALBUQUERQUE_BUILDING_PERMITS,
      FIXTURE_SECOND_ARCGIS_SOURCE,
    ],
  })
  await input.repository.persistSourcePlan(created.runId, plan)
  await input.repository.markPhase(created.runId, 'checking_structured_sources')
  const observations = await collectSavedLeadInvestigationSources({
    workspaceId: input.workspaceId,
    runId: created.runId,
    savedLeadIdentity: savedLead.identity,
    playbook,
    plan,
    repository: input.repository,
    providers: input.providers,
    serpApiProvider: input.serpApiProvider,
    firecrawlProvider: input.firecrawlProvider,
    clock: input.clock,
  })
  const failureCode = retryableFailure(observations)
  if (failureCode) {
    await input.repository.persistRetryableFailure({
      runId: created.runId,
      failureCode,
      latestSuccessfulRunId: runState.latestCompletedRunId,
    })
    return {
      state: 'failed',
      failureCode,
      latestSuccessfulResult: await input.repository.readLatestSuccessfulResult({
        workspaceId: input.workspaceId,
        savedLeadId: input.savedLeadId,
      }),
    }
  }

  await input.repository.markPhase(created.runId, 'validating_evidence')
  const gate = evaluateStructuredTrigger({
    savedLead,
    playbook,
    observations,
    checkedAt: now,
    idFactory: input.idFactory,
  })
  const result = buildCompletedSignalCheck({
    savedLeadId: input.savedLeadId,
    runId: created.runId,
    checkedAt: now,
    identity: gate.identity,
    trigger: gate.trigger,
    profileFindings: gate.profileFindings,
    sourceObservations: observations,
    usage: input.repository.readUsageSnapshot
      ? await input.repository.readUsageSnapshot({
          workspaceId: input.workspaceId,
          runId: created.runId,
        })
      : createInvestigationUsage(),
    playbook,
  })
  await input.repository.persistProfileFindings(created.runId, gate.profileFindings)
  await input.repository.persistTriggerFinding(created.runId, gate.trigger)
  await input.repository.persistCompletedResult(result)
  await input.repository.markPhase(created.runId, 'completed')
  return { state: 'completed', result }
}
