import type { SavedLeadInvestigationPlaybook } from '@/lib/playbooks/saved-lead-investigation-registry'
import { createCompletedSignalCheck } from '@/lib/gates/saved-lead-investigation-gate'
import type {
  CompletedSignalCheck,
  IdentityResolution,
  InvestigationUsageSnapshot,
  SavedLeadProfileFinding,
  TriggerResult,
} from './contracts'
import { deriveResultTiming } from './run-state'
import type { SemanticSourceObservation } from './source-collector'

export interface BuildCompletedSignalCheckInput {
  savedLeadId: string
  runId: string
  checkedAt: string
  identity: IdentityResolution
  trigger: TriggerResult
  profileFindings: SavedLeadProfileFinding[]
  sourceObservations: readonly SemanticSourceObservation[]
  usage: InvestigationUsageSnapshot
  playbook: SavedLeadInvestigationPlaybook
}

export function buildCompletedSignalCheck(
  input: BuildCompletedSignalCheckInput,
): CompletedSignalCheck {
  const timing = deriveResultTiming({
    checkedAt: input.checkedAt,
    trigger: input.trigger,
    playbook: input.playbook,
  })
  const checked = input.sourceObservations.filter(
    (source) => source.checkState === 'checked',
  )
  return createCompletedSignalCheck({
    savedLeadId: input.savedLeadId,
    runId: input.runId,
    checkedAt: input.checkedAt,
    identity: input.identity,
    trigger: input.trigger,
    profileReport: {
      findings: input.profileFindings,
      sourcesChecked: checked.length,
      structuredSourcesChecked: checked.filter((source) => source.kind === 'structured').length,
      webQueriesRun: checked.filter((source) => source.kind === 'indexed_web').length,
      hydratedSources: checked.filter((source) => source.kind === 'entity_domain').length,
      categoryIdsChecked: [...input.playbook.categoryIds],
      unavailableSourceKeys: input.sourceObservations
        .filter((source) => source.availability !== 'available')
        .map((source) => source.registrySourceKey),
      checkedSourceKeys: checked.map((source) => source.registrySourceKey),
      usage: input.usage,
      expiresAt: timing.resultExpiresAt,
    },
    ...timing,
  })
}
