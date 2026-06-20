import type {
  Cp21aBlockedOrReviewItem,
  Cp21aConductorRunReport,
  Cp21aEvidencePlan,
  Cp21aFailedCandidate,
  Cp21aOpportunityPlan,
  Cp21aPersistenceReport,
  Cp21aProspectPlan,
  Cp21aRunRequest,
  Cp21aStage,
} from './types'

const CP21A_TABLES_PLANNED = [
  'scout_runs',
  'signals',
  'prospects',
  'opportunities',
  'evidence_sources',
  'opportunity_evidence_proofs',
  'runtime_lineage_runs',
  'contact_routes',
  'outreach_plays',
  'lead_pass_reasons',
  'todays_run_items',
] as const

export interface Cp21aCandidateStageResultPlan {
  candidateId: string
  stage: Cp21aStage
  status: 'passed' | 'revised' | 'blocked' | 'failed'
  reason: string | null
}

export interface Cp21aLineagePlan {
  candidateId: string
  provider: 'fixture'
  providerRunId: string | null
  runRole: 'fixture_discovery' | 'fixture_evidence'
  status: 'ok' | 'error' | 'skipped'
  sourceUrl: string | null
  estimatedCostCents: 0
}

export interface Cp21aBudgetUsagePlan {
  providerCalls: 0
  dbWrites: 0
  estimatedCostCents: 0
  budgetExhausted: boolean
}

export interface Cp21aConductorPersister {
  readonly mode: 'noop'
  recordRunStarted(request: Cp21aRunRequest): Promise<void>
  recordRunCompleted(report: Cp21aConductorRunReport): Promise<void>
  recordRunFailed(input: {
    request: Cp21aRunRequest
    reason: string
  }): Promise<void>
  recordCandidateStageResult(plan: Cp21aCandidateStageResultPlan): Promise<void>
  recordEvidencePlan(plan: Cp21aEvidencePlan): Promise<void>
  recordOpportunityPlan(plan: Cp21aOpportunityPlan): Promise<void>
  recordProspectPlan(plan: Cp21aProspectPlan): Promise<void>
  recordBlockedOrReviewPlan(plan: Cp21aBlockedOrReviewItem): Promise<void>
  recordLineagePlan(plan: Cp21aLineagePlan): Promise<void>
  recordBudgetUsage(plan: Cp21aBudgetUsagePlan): Promise<void>
  report(): Cp21aPersistenceReport
}

export interface NoopCp21aConductorPersister extends Cp21aConductorPersister {
  readonly plans: {
    runsStarted: Cp21aRunRequest[]
    runsCompleted: Cp21aConductorRunReport[]
    runsFailed: { request: Cp21aRunRequest; reason: string }[]
    candidateStageResults: Cp21aCandidateStageResultPlan[]
    evidencePlans: Cp21aEvidencePlan[]
    opportunityPlans: Cp21aOpportunityPlan[]
    prospectPlans: Cp21aProspectPlan[]
    blockedOrReviewPlans: Cp21aBlockedOrReviewItem[]
    failedCandidatePlans: Cp21aFailedCandidate[]
    lineagePlans: Cp21aLineagePlan[]
    budgetUsagePlans: Cp21aBudgetUsagePlan[]
  }
}

export function createNoopCp21aConductorPersister(): NoopCp21aConductorPersister {
  const plans: NoopCp21aConductorPersister['plans'] = {
    runsStarted: [],
    runsCompleted: [],
    runsFailed: [],
    candidateStageResults: [],
    evidencePlans: [],
    opportunityPlans: [],
    prospectPlans: [],
    blockedOrReviewPlans: [],
    failedCandidatePlans: [],
    lineagePlans: [],
    budgetUsagePlans: [],
  }

  function plansCaptured(): number {
    return (
      plans.runsStarted.length +
      plans.runsCompleted.length +
      plans.runsFailed.length +
      plans.candidateStageResults.length +
      plans.evidencePlans.length +
      plans.opportunityPlans.length +
      plans.prospectPlans.length +
      plans.blockedOrReviewPlans.length +
      plans.lineagePlans.length +
      plans.budgetUsagePlans.length
    )
  }

  return {
    mode: 'noop',
    plans,
    async recordRunStarted(request) {
      plans.runsStarted.push(request)
    },
    async recordRunCompleted(report) {
      plans.runsCompleted.push(report)
    },
    async recordRunFailed(input) {
      plans.runsFailed.push(input)
    },
    async recordCandidateStageResult(plan) {
      plans.candidateStageResults.push(plan)
    },
    async recordEvidencePlan(plan) {
      plans.evidencePlans.push(plan)
    },
    async recordOpportunityPlan(plan) {
      plans.opportunityPlans.push(plan)
    },
    async recordProspectPlan(plan) {
      plans.prospectPlans.push(plan)
    },
    async recordBlockedOrReviewPlan(plan) {
      plans.blockedOrReviewPlans.push(plan)
      if ('status' in plan && plan.status === 'failed') {
        plans.failedCandidatePlans.push(plan)
      }
    },
    async recordLineagePlan(plan) {
      plans.lineagePlans.push(plan)
    },
    async recordBudgetUsage(plan) {
      plans.budgetUsagePlans.push(plan)
    },
    report() {
      return {
        mode: 'noop',
        dbWrites: 0,
        plansCaptured: plansCaptured(),
        tablesPlanned: [...CP21A_TABLES_PLANNED],
      }
    },
  }
}
