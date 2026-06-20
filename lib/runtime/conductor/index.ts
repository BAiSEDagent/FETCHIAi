import type { EvidenceDocument } from '@/lib/providers/evidence-provider'
import { evaluateEvidenceGate } from '@/lib/gates/evidence-gate'
import {
  APPROVED_COMMERCIAL_CLEANING_SIGNAL_LABELS,
  APPROVED_COMMERCIAL_CLEANING_VERTICAL_FIT_LABELS,
  COMMERCIAL_CLEANING_VERTICAL_ID,
  classifyCommercialCleaningSignal,
} from '@/lib/classification/commercial-cleaning-classification-contract'
import { evaluateOpportunityScoring } from '@/lib/scoring/opportunity-scoring-contract'
import { evaluateProspectScoring } from '@/lib/scoring/prospect-scoring-contract'
import { evaluateClaimGuard, type ClaimGuardDecision } from '@/lib/gates/claim-guard'
import { validateProspectEvidencePacket } from '@/lib/prospect-mining/contracts'
import type { Cp21aFixtureCandidate } from './fixtures'
import { cp21aFixtureCandidates, cp21aLineageFor } from './fixtures'
import {
  createNoopCp21aConductorPersister,
  type Cp21aConductorPersister,
} from './persistence'
import type {
  Cp21aConductorRunReport,
  Cp21aEvidencePlan,
  Cp21aFailedCandidate,
  Cp21aLaneCounts,
  Cp21aOpportunityPlan,
  Cp21aProspectPlan,
  Cp21aRunRequest,
  Cp21aScorePlan,
  Cp21aScoreReasonPlan,
  Cp21aStage,
  Cp21aStageCounts,
} from './types'

export type {
  Cp21aConductorRunReport,
  Cp21aRunRequest,
  Cp21aOpportunityPlan,
  Cp21aProspectPlan,
  Cp21aFailedCandidate,
} from './types'
export { createNoopCp21aConductorPersister } from './persistence'
export { createPostgresCp21aConductorPersister } from './persistence-postgres'

const APPROVED_ACTION_LABELS = [
  'Review source and contact route',
  'Add to Prospect Pool',
  'Review before outreach',
] as const

const ZERO_PROVIDER_CALLS = 0 as const
const ZERO_DB_WRITES = 0 as const
const ZERO_COST_CENTS = 0 as const

function emptyStageCounts(): Cp21aStageCounts {
  return {
    discovery: {
      discovered: 0,
      deduped: 0,
    },
    hydrate: {
      attempted: 0,
      succeeded: 0,
      failed: 0,
    },
    evidenceGate: {
      passed: 0,
      blocked: 0,
    },
    classification: {
      passed: 0,
      failed: 0,
    },
    scoring: {
      passed: 0,
      failed: 0,
    },
    claimGuard: {
      passed: 0,
      revised: 0,
      blocked: 0,
    },
    persistence: {
      plans: 0,
      writes: 0,
    },
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

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Candidate stage failed.'
}

function recordStageFailure(
  stageCounts: Cp21aStageCounts,
  stage: Cp21aStage,
) {
  if (stage === 'hydrate') stageCounts.hydrate.failed += 1
  if (stage === 'evidence_gate') stageCounts.evidenceGate.blocked += 1
  if (stage === 'classify') stageCounts.classification.failed += 1
  if (stage === 'score') stageCounts.scoring.failed += 1
  if (stage === 'claim_guard') stageCounts.claimGuard.blocked += 1
}

function evidencePlanFor(
  fixture: Cp21aFixtureCandidate,
  evidence: EvidenceDocument,
): Cp21aEvidencePlan {
  return {
    id: `evidence-${fixture.id}`,
    sourceUrl: evidence.sourceUrl ?? fixture.candidate.hit.url ?? '',
    sourceTitle: evidence.title ?? fixture.candidate.hit.title,
    sourceDate: evidence.publishedAt
      ? evidence.publishedAt.slice(0, 10)
      : 'undated',
    evidenceSummary: fixture.evidenceSummary,
    sourceExcerpt: fixture.sourceExcerpt,
    sourceFingerprint: cp21aLineageFor(fixture).fingerprint,
  }
}

function scoreReasonsCiteEvidence(reasons: readonly Cp21aScoreReasonPlan[]): boolean {
  return reasons.length > 0 && reasons.every((reason) => {
    return reason.evidenceId.trim().length > 0 && reason.text.trim().length > 0
  })
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
  const actionApproved = APPROVED_ACTION_LABELS.includes(
    actionLabel as (typeof APPROVED_ACTION_LABELS)[number],
  )

  return signalApproved && fitApproved && actionApproved
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

function claimGuardReasons(decision: ClaimGuardDecision): string[] {
  return decision.ok
    ? decision.gateReasons
    : decision.violations.map((violation) => violation.message)
}

function opportunityScoreFor({
  fixture,
  evidencePlan,
  providerRunIds,
}: {
  fixture: Cp21aFixtureCandidate
  evidencePlan: Cp21aEvidencePlan
  providerRunIds: string[]
}): Cp21aScorePlan {
  const result = evaluateOpportunityScoring({
    leadKind: 'signal_backed_opportunity',
    signalType: fixture.candidate.signalType,
    signalLabel: fixture.signalLabel,
    evidenceSourceUrls: [evidencePlan.sourceUrl],
    providerRunIds,
    evidenceSummary: fixture.evidenceSummary,
    whyNowReasons: fixture.whyNowReasons,
    freshnessWindow: fixture.freshnessLabel ?? 'freshness verified by source date',
    actionWindow: fixture.intent === 'opportunity' ? 'review now' : undefined,
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
  fixture: Cp21aFixtureCandidate,
  evidencePlan: Cp21aEvidencePlan,
): Cp21aScorePlan {
  const result = evaluateProspectScoring({
    leadKind: fixture.intent === 'bad_candidate'
      ? 'exploratory_prospect'
      : 'evidence_backed_prospect',
    evidenceSummary: fixture.evidenceSummary,
    fitReasons: fixture.fitReasons,
    contactRouteHints: fixture.contactRouteHints,
    accountFitSignals: fixture.accountFitSignals,
    sourceConfidence: 0.85,
    locationConfidence: 0.8,
  })

  if (!result.ok) {
    throw new Error(result.gateReasons.join(' '))
  }

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

function claimGuardEvidence(evidence: EvidenceDocument): EvidenceDocument[] {
  return [evidence]
}

function claimGuardScoreReasons(score: Cp21aScorePlan) {
  return score.reasons.map((reason) => ({
    code: reason.code,
    text: reason.text,
    evidenceIndexes: [0],
  }))
}

function evaluateOpportunityClaimGuard({
  request,
  fixture,
  evidence,
  score,
  whyNow,
}: {
  request: Cp21aRunRequest
  fixture: Cp21aFixtureCandidate
  evidence: EvidenceDocument
  score: Cp21aScorePlan
  whyNow: string
}): ClaimGuardDecision {
  return evaluateClaimGuard({
    evaluatedAt: request.requestedAt,
    config: {
      approvedSignalLabels: APPROVED_COMMERCIAL_CLEANING_SIGNAL_LABELS,
      approvedVerticalFitLabels: APPROVED_COMMERCIAL_CLEANING_VERTICAL_FIT_LABELS,
      maxSignalAgeDays: 30,
    },
    artifact: {
      workspaceId: request.workspaceId,
      leadKind: 'signal_backed_opportunity',
      signalLabel: fixture.signalLabel,
      verticalFitLabel: fixture.verticalFitLabel,
      claimsUrgency: true,
      claims: [
        {
          kind: 'evidence_summary',
          text: fixture.evidenceSummary,
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
      recommendedAction: fixture.recommendedAction.label,
      evidence: claimGuardEvidence(evidence),
    },
  })
}

function evaluateProspectClaimGuard({
  request,
  fixture,
  evidence,
  score,
}: {
  request: Cp21aRunRequest
  fixture: Cp21aFixtureCandidate
  evidence: EvidenceDocument
  score: Cp21aScorePlan
}): ClaimGuardDecision {
  return evaluateClaimGuard({
    evaluatedAt: request.requestedAt,
    config: {
      approvedSignalLabels: APPROVED_COMMERCIAL_CLEANING_SIGNAL_LABELS,
      approvedVerticalFitLabels: APPROVED_COMMERCIAL_CLEANING_VERTICAL_FIT_LABELS,
      maxSignalAgeDays: 30,
    },
    artifact: {
      workspaceId: request.workspaceId,
      leadKind: fixture.intent === 'prospect'
        ? 'evidence_backed_prospect'
        : 'exploratory_prospect',
      verticalFitLabel: fixture.verticalFitLabel,
      claimsUrgency: false,
      claims: [
        {
          kind: 'evidence_summary',
          text: fixture.evidenceSummary,
          evidenceIndexes: [0],
        },
      ],
      score: score.total,
      scoreReasons: claimGuardScoreReasons(score),
      recommendedAction: fixture.recommendedAction.label,
      evidence: claimGuardEvidence(evidence),
    },
  })
}

function failedCandidateFor({
  fixture,
  failureStage,
  failureReason,
}: {
  fixture: Cp21aFixtureCandidate
  failureStage: Cp21aStage
  failureReason: string
}): Cp21aFailedCandidate {
  return {
    candidateId: fixture.id,
    status: 'failed',
    failureStage,
    failureReason,
    laneId: 'needs_review',
    fallbackState: 'needs_review',
    lineage: cp21aLineageFor(fixture),
  }
}

async function persistLineagePlans(
  fixture: Cp21aFixtureCandidate,
  persister: Cp21aConductorPersister,
) {
  await persister.recordLineagePlan({
    candidateId: fixture.id,
    provider: 'fixture',
    providerRunId: fixture.candidate.providerRunId,
    runRole: 'fixture_discovery',
    status: 'ok',
    sourceUrl: fixture.candidate.hit.url ?? null,
    estimatedCostCents: 0,
  })
  await persister.recordLineagePlan({
    candidateId: fixture.id,
    provider: 'fixture',
    providerRunId: fixture.evidence?.providerRunId ?? null,
    runRole: 'fixture_evidence',
    status: fixture.evidence ? 'ok' : 'skipped',
    sourceUrl: fixture.candidate.hit.url ?? null,
    estimatedCostCents: 0,
  })
}

async function hydrateFixture(
  fixture: Cp21aFixtureCandidate,
): Promise<EvidenceDocument> {
  if (fixture.throwAtStage === 'hydrate') {
    throw new Error('Fixture hydration failed intentionally for candidate isolation proof.')
  }
  if (!fixture.evidence) {
    throw new Error('Fixture candidate has no evidence document.')
  }
  return fixture.evidence
}

async function processCandidate({
  request,
  fixture,
  stageCounts,
  laneCounts,
  persister,
}: {
  request: Cp21aRunRequest
  fixture: Cp21aFixtureCandidate
  stageCounts: Cp21aStageCounts
  laneCounts: Cp21aLaneCounts
  persister: Cp21aConductorPersister
}): Promise<Cp21aOpportunityPlan | Cp21aProspectPlan> {
  let currentStage: Cp21aStage = 'hydrate'

  try {
    currentStage = 'hydrate'
    stageCounts.hydrate.attempted += 1
    const evidence = await hydrateFixture(fixture)
    stageCounts.hydrate.succeeded += 1
    await persister.recordCandidateStageResult({
      candidateId: fixture.id,
      stage: currentStage,
      status: 'passed',
      reason: null,
    })

    currentStage = 'evidence_gate'
    const gate = evaluateEvidenceGate({
      candidate: fixture.candidate,
      evidence: [evidence],
    })
    if (!gate.ok) {
      throw new Error(gate.gateReasons.join(' '))
    }
    stageCounts.evidenceGate.passed += 1
    await persister.recordCandidateStageResult({
      candidateId: fixture.id,
      stage: currentStage,
      status: 'passed',
      reason: null,
    })

    const evidencePlan = evidencePlanFor(fixture, evidence)
    await persister.recordEvidencePlan(evidencePlan)
    await persistLineagePlans(fixture, persister)

    currentStage = 'classify'
    const classification = classifyCommercialCleaningSignal({
      verticalId: COMMERCIAL_CLEANING_VERTICAL_ID,
      rawSignalId: fixture.id,
      proposedSignalLabel: fixture.signalLabel,
      proposedVerticalFitLabel: fixture.verticalFitLabel,
      proposedFreshnessLabel: fixture.freshnessLabel ?? undefined,
      proposedSurface: fixture.intent === 'opportunity' ? 'default' : 'fallback',
      proposedFallbackState: fixture.intent === 'stale_signal' ? 'needs_review' : undefined,
      evidenceSummary: fixture.evidenceSummary,
      evidenceSourceUrls: gate.evidenceSourceUrls,
      whyNowReasons: fixture.whyNowReasons,
    })
    if (!classification.ok) {
      throw new Error(classification.gateReasons.join(' '))
    }
    stageCounts.classification.passed += 1
    await persister.recordCandidateStageResult({
      candidateId: fixture.id,
      stage: currentStage,
      status: 'passed',
      reason: null,
    })

    currentStage = 'score'
    if (fixture.intent === 'prospect') {
      const validation = validateProspectEvidencePacket({
        leadKind: 'evidence_backed_prospect',
        sourceType: 'company_website',
        sourceUrl: evidencePlan.sourceUrl,
        fetchedAt: evidence.fetchedAt,
        accessNotes: 'CP21A fixture evidence document; no provider call made.',
        businessName: fixture.businessName,
        location: {
          city: request.market,
          state: 'TX',
        },
        evidenceSummary: fixture.evidenceSummary,
        fitReasons: fixture.fitReasons,
        contactRouteHints: fixture.contactRouteHints,
        rawProviderMetadata: {
          fixture: true,
        },
      })
      if (!validation.ok) {
        throw new Error(validation.reasons.join(' '))
      }
      const prospectScore = prospectScoreFor(fixture, evidencePlan)
      stageCounts.scoring.passed += 1

      currentStage = 'claim_guard'
      const guard = evaluateProspectClaimGuard({
        request,
        fixture,
        evidence,
        score: prospectScore,
      })
      const disposition = claimGuardDisposition(guard)
      if (disposition === 'passed') stageCounts.claimGuard.passed += 1
      else if (disposition === 'revised') stageCounts.claimGuard.revised += 1
      else stageCounts.claimGuard.blocked += 1

      const plan: Cp21aProspectPlan = {
        candidateId: fixture.id,
        leadKind: 'evidence_backed_prospect',
        state: disposition === 'blocked' ? 'needs_review' : 'active',
        laneId: disposition === 'blocked' ? 'needs_review' : 'prospect_pool',
        businessName: fixture.businessName,
        market: request.market,
        vertical: 'commercial_cleaning',
        signal: null,
        whyNow: null,
        claimsUrgency: false,
        verticalFitLabel: fixture.verticalFitLabel,
        evidence: [evidencePlan],
        score: prospectScore,
        recommendedAction: fixture.recommendedAction,
        claimGuardDisposition: disposition,
        labelApproved: approvedLabel(null, fixture.verticalFitLabel, fixture.recommendedAction.label),
        demotedFromSignal: false,
        demotionReason: null,
        lineage: cp21aLineageFor(fixture),
      }
      laneCounts[plan.laneId] += 1
      await persister.recordProspectPlan(plan)
      return plan
    }

    const whyNow = fixture.whyNowReasons[0] ?? fixture.evidenceSummary
    const opportunityScore = opportunityScoreFor({
      fixture,
      evidencePlan,
      providerRunIds: gate.providerRunIds,
    })
    stageCounts.scoring.passed += 1

    currentStage = 'claim_guard'
    const guard = evaluateOpportunityClaimGuard({
      request,
      fixture,
      evidence,
      score: opportunityScore,
      whyNow,
    })
    const disposition = claimGuardDisposition(guard)
    if (disposition === 'passed') stageCounts.claimGuard.passed += 1
    else if (disposition === 'revised') stageCounts.claimGuard.revised += 1
    else stageCounts.claimGuard.blocked += 1

    if (disposition === 'passed') {
      const plan: Cp21aOpportunityPlan = {
        candidateId: fixture.id,
        leadKind: 'signal_backed_opportunity',
        state: 'active',
        laneId: 'todays_opportunities',
        businessName: fixture.businessName,
        market: request.market,
        vertical: 'commercial_cleaning',
        signal: {
          signalType: fixture.candidate.signalType,
          signalLabel: fixture.signalLabel,
          freshnessWindow: fixture.freshnessLabel ?? 'fresh',
          whyNow,
        },
        whyNow,
        claimsUrgency: true,
        verticalFitLabel: fixture.verticalFitLabel,
        evidence: [evidencePlan],
        score: opportunityScore,
        recommendedAction: fixture.recommendedAction,
        claimGuardDisposition: disposition,
        labelApproved: approvedLabel(
          fixture.signalLabel,
          fixture.verticalFitLabel,
          fixture.recommendedAction.label,
        ),
        lineage: cp21aLineageFor(fixture),
      }
      laneCounts[plan.laneId] += 1
      await persister.recordOpportunityPlan(plan)
      return plan
    }

    const demotedScore = prospectScoreFor(fixture, evidencePlan)
    const demotionReason = claimGuardReasons(guard)[0] ?? 'Candidate was demoted by Claim Guard.'
    const demotedPlan: Cp21aProspectPlan = {
      candidateId: fixture.id,
      leadKind: 'evidence_backed_prospect',
      state: 'needs_review',
      laneId: 'needs_review',
      businessName: fixture.businessName,
      market: request.market,
      vertical: 'commercial_cleaning',
      signal: null,
      whyNow: null,
      claimsUrgency: false,
      verticalFitLabel: fixture.verticalFitLabel,
      evidence: [evidencePlan],
      score: demotedScore,
      recommendedAction: fixture.recommendedAction,
      claimGuardDisposition: disposition,
      labelApproved: approvedLabel(null, fixture.verticalFitLabel, fixture.recommendedAction.label),
      demotedFromSignal: true,
      demotionReason,
      lineage: cp21aLineageFor(fixture),
    }
    laneCounts[demotedPlan.laneId] += 1
    await persister.recordProspectPlan(demotedPlan)
    await persister.recordBlockedOrReviewPlan(demotedPlan)
    return demotedPlan
  } catch (error) {
    recordStageFailure(stageCounts, currentStage)

    const failed = failedCandidateFor({
      fixture,
      failureStage: currentStage,
      failureReason: errorMessage(error),
    })
    laneCounts[failed.laneId] += 1
    await persister.recordCandidateStageResult({
      candidateId: fixture.id,
      stage: currentStage,
      status: 'failed',
      reason: failed.failureReason,
    })
    await persister.recordBlockedOrReviewPlan(failed)
    throw failed
  }
}

export async function runCp21aFixtureConductor(
  request: Cp21aRunRequest,
  options: {
    persister?: Cp21aConductorPersister
  } = {},
): Promise<Cp21aConductorRunReport> {
  const persister = options.persister ?? createNoopCp21aConductorPersister()
  const stageCounts = emptyStageCounts()
  const laneCounts = emptyLaneCounts()
  const runId = `cp21a-${request.workspaceId}`
  const startedAt = request.requestedAt

  await persister.recordRunStarted(request)

  try {
    const discovered = cp21aFixtureCandidates(request)
    const candidates = discovered.slice(0, request.budget.maxCandidates)
    const budgetExhausted = discovered.length > candidates.length
    stageCounts.discovery.discovered = candidates.length
    stageCounts.discovery.deduped = discovered.length - candidates.length

    const opportunities: Cp21aOpportunityPlan[] = []
    const prospects: Cp21aProspectPlan[] = []
    const failedCandidates: Cp21aFailedCandidate[] = []
    const demotedCandidates: Cp21aProspectPlan[] = []

    for (const fixture of candidates) {
      try {
        const result = await processCandidate({
          request,
          fixture,
          stageCounts,
          laneCounts,
          persister,
        })
        if (result.leadKind === 'signal_backed_opportunity') {
          opportunities.push(result)
        } else {
          prospects.push(result)
          if (result.demotedFromSignal) demotedCandidates.push(result)
        }
      } catch (error) {
        if (typeof error === 'object' && error !== null && 'status' in error) {
          failedCandidates.push(error as Cp21aFailedCandidate)
          continue
        }
        throw error
      }
    }

    await persister.recordBudgetUsage({
      providerCalls: ZERO_PROVIDER_CALLS,
      dbWrites: ZERO_DB_WRITES,
      estimatedCostCents: ZERO_COST_CENTS,
      budgetExhausted,
    })

    let persistence = persister.report()
    stageCounts.persistence.plans = persistence.plansCaptured
    stageCounts.persistence.writes = persistence.dbWrites

    const blockedOrReviewItems = [
      ...failedCandidates,
      ...prospects.filter((prospect) => prospect.laneId === 'needs_review'),
    ]
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

    const report: Cp21aConductorRunReport = {
      ok: true,
      mode: 'cp21a_fixture_conductor',
      status: 'completed',
      runId,
      workspaceId: request.workspaceId,
      startedAt,
      completedAt: request.requestedAt,
      durationMs: 0,
      providerMode: {
        discovery: 'fixture',
        evidence: 'fixture',
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
      providerCalls: ZERO_PROVIDER_CALLS,
      dbWrites: persistence.dbWrites,
      estimatedCostCents: ZERO_COST_CENTS,
      budgetExhausted,
      badCandidateDidNotAbortRun:
        failedCandidates.some((candidate) => candidate.candidateId === 'cp21a-bad-candidate') &&
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
    return report
  } catch (error) {
    await persister.recordRunFailed({
      request,
      reason: errorMessage(error),
    })
    throw error
  }
}
