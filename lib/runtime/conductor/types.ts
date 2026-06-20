import type { FallbackState, SignalType } from '@/lib/providers/contracts'

export type Cp21aConductorMode = 'cp21a_fixture_conductor'
export type Cp21aRunStatus = 'completed' | 'failed'
export type Cp21aProviderMode = 'fixture' | 'noop' | 'mock'

export type Cp21aStage =
  | 'discover'
  | 'hydrate'
  | 'evidence_gate'
  | 'classify'
  | 'score'
  | 'claim_guard'
  | 'plan_output'
  | 'persist'

export type Cp21aLaneId =
  | 'todays_opportunities'
  | 'prospect_pool'
  | 'needs_review'
  | 'blocked_or_review'

export type Cp21aLeadKind =
  | 'signal_backed_opportunity'
  | 'evidence_backed_prospect'
  | 'exploratory_prospect'

export type Cp21aLeadState =
  | 'active'
  | 'needs_review'
  | 'missing_evidence'
  | 'weak_fit'
  | 'exploratory'

export type Cp21aClaimGuardDisposition = 'passed' | 'revised' | 'blocked'

export interface Cp21aBudgetEnvelope {
  maxProviderCalls: 0
  maxEstimatedCostCents: 0
  maxCandidates: number
}

export interface Cp21aRunRequest {
  workspaceId: string
  vertical: 'commercial_cleaning'
  market: string
  requestedAt: string
  budget: Cp21aBudgetEnvelope
}

export interface Cp21aLineage {
  candidateId: string
  sourceUrl: string | null
  sourceName: string | null
  searchProviderRunId: string | null
  evidenceProviderRunId: string | null
  fingerprint: string
}

export interface Cp21aEvidencePlan {
  id: string
  sourceUrl: string
  sourceTitle: string
  sourceDate: string
  evidenceSummary: string
  sourceExcerpt: string
  sourceFingerprint: string
}

export interface Cp21aSignalPlan {
  signalType: SignalType
  signalLabel: string
  freshnessWindow: string
  whyNow: string
}

export interface Cp21aRecommendedActionPlan {
  label: string
  detail: string
}

export interface Cp21aScoreReasonPlan {
  code: string
  text: string
  evidenceId: string
}

export interface Cp21aScorePlan {
  total: number
  opportunityUrgencyScore: number | null
  prospectFitScore: number | null
  outreachReadinessScore: number | null
  reasons: Cp21aScoreReasonPlan[]
}

export interface Cp21aOpportunityPlan {
  candidateId: string
  leadKind: 'signal_backed_opportunity'
  state: Cp21aLeadState
  laneId: Cp21aLaneId
  businessName: string
  market: string
  vertical: 'commercial_cleaning'
  signal: Cp21aSignalPlan
  whyNow: string
  claimsUrgency: true
  verticalFitLabel: string
  evidence: Cp21aEvidencePlan[]
  score: Cp21aScorePlan
  recommendedAction: Cp21aRecommendedActionPlan
  claimGuardDisposition: Cp21aClaimGuardDisposition
  labelApproved: boolean
  lineage: Cp21aLineage
}

export interface Cp21aProspectPlan {
  candidateId: string
  leadKind: 'evidence_backed_prospect' | 'exploratory_prospect'
  state: Cp21aLeadState
  laneId: Cp21aLaneId
  businessName: string
  market: string
  vertical: 'commercial_cleaning'
  signal: null
  whyNow: null
  claimsUrgency: false
  verticalFitLabel: string | null
  evidence: Cp21aEvidencePlan[]
  score: Cp21aScorePlan
  recommendedAction: Cp21aRecommendedActionPlan
  claimGuardDisposition: Cp21aClaimGuardDisposition
  labelApproved: boolean
  demotedFromSignal: boolean
  demotionReason: string | null
  lineage: Cp21aLineage
}

export interface Cp21aFailedCandidate {
  candidateId: string
  status: 'failed'
  failureStage: Cp21aStage
  failureReason: string
  laneId: Cp21aLaneId
  fallbackState: Extract<FallbackState, 'needs_review' | 'missing_evidence'>
  lineage: Cp21aLineage
}

export type Cp21aBlockedOrReviewItem =
  | Cp21aFailedCandidate
  | Cp21aProspectPlan

export interface Cp21aStageCounts {
  discovery: {
    discovered: number
    deduped: number
  }
  hydrate: {
    attempted: number
    succeeded: number
    failed: number
  }
  evidenceGate: {
    passed: number
    blocked: number
  }
  classification: {
    passed: number
    failed: number
  }
  scoring: {
    passed: number
    failed: number
  }
  claimGuard: {
    passed: number
    revised: number
    blocked: number
  }
  persistence: {
    plans: number
    writes: 0
  }
}

export type Cp21aLaneCounts = Record<Cp21aLaneId, number>

export interface Cp21aPersistenceReport {
  mode: 'noop'
  dbWrites: 0
  plansCaptured: number
  tablesPlanned: string[]
}

export interface Cp21aConductorRunReport {
  ok: boolean
  mode: Cp21aConductorMode
  status: Cp21aRunStatus
  runId: string
  workspaceId: string
  startedAt: string
  completedAt: string
  durationMs: number
  providerMode: {
    discovery: Cp21aProviderMode
    evidence: Cp21aProviderMode
    reasoning: Cp21aProviderMode
    persistence: Cp21aProviderMode
  }
  stageCounts: Cp21aStageCounts
  laneCounts: Cp21aLaneCounts
  opportunities: Cp21aOpportunityPlan[]
  prospects: Cp21aProspectPlan[]
  failedCandidates: Cp21aFailedCandidate[]
  demotedCandidates: Cp21aProspectPlan[]
  blockedOrReviewItems: Cp21aBlockedOrReviewItem[]
  providerCalls: 0
  dbWrites: 0
  estimatedCostCents: 0
  budgetExhausted: boolean
  badCandidateDidNotAbortRun: boolean
  labelsApproved: boolean
  prospectUrgencyLeaks: number
  scoreReasonsCiteEvidence: boolean
  persistence: Cp21aPersistenceReport
}
