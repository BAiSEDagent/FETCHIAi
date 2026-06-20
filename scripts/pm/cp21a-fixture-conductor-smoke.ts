/**
 * CP21A - Fixture Conductor Foundation smoke proof.
 *
 * Headless fixture-only proof. This does not call providers, read env keys,
 * execute CP20A/CP20B proof functions, write DB rows, seed data, change schema,
 * or touch routes/UI.
 */

import assert from 'node:assert/strict'
import { runCp21aFixtureConductor } from '@/lib/runtime/conductor'

async function main() {
  const report = await runCp21aFixtureConductor({
    workspaceId: 'workspace-cp21a-fixture',
    vertical: 'commercial_cleaning',
    market: 'Austin',
    requestedAt: '2026-06-20T12:00:00.000Z',
    budget: {
      maxProviderCalls: 0,
      maxEstimatedCostCents: 0,
      maxCandidates: 8,
    },
  })

  assert.equal(report.ok, true)
  assert.equal(report.mode, 'cp21a_fixture_conductor')
  assert.equal(report.status, 'completed')
  assert.equal(report.providerCalls, 0)
  assert.equal(report.dbWrites, 0)
  assert.equal(report.estimatedCostCents, 0)
  assert.equal(report.budgetExhausted, false)
  assert.equal(report.persistence.mode, 'noop')
  assert.equal(report.persistence.dbWrites, 0)
  assert(report.persistence.plansCaptured > 0)

  assert(report.opportunities.length >= 1)
  assert(report.prospects.length >= 1)
  assert(report.demotedCandidates.length >= 1)
  assert(report.failedCandidates.length >= 1)
  assert.equal(report.badCandidateDidNotAbortRun, true)

  const failed = report.failedCandidates[0]
  assert(failed)
  assert.equal(failed.candidateId, 'cp21a-bad-candidate')
  assert.equal(failed.status, 'failed')
  assert.equal(failed.failureStage, 'hydrate')
  assert(failed.failureReason.length > 0)
  assert.equal(failed.laneId, 'needs_review')
  assert(failed.lineage.fingerprint.length > 0)

  for (const opportunity of report.opportunities) {
    assert.equal(opportunity.leadKind, 'signal_backed_opportunity')
    assert(opportunity.signal)
    assert(opportunity.evidence.length > 0)
    assert(opportunity.score.reasons.length > 0)
    assert(opportunity.score.reasons.every((reason) => reason.evidenceId.length > 0))
    assert(opportunity.recommendedAction.label.length > 0)
    assert.equal(opportunity.labelApproved, true)
    assert(
      opportunity.claimGuardDisposition === 'passed' ||
        opportunity.claimGuardDisposition === 'revised',
    )
  }

  for (const prospect of report.prospects) {
    assert(prospect.evidence.length > 0)
    assert.equal(prospect.signal, null)
    assert.equal(prospect.whyNow, null)
    assert.equal(prospect.claimsUrgency, false)
    assert.equal(prospect.score.opportunityUrgencyScore, null)
    assert(prospect.score.reasons.length > 0)
    assert(prospect.score.reasons.every((reason) => reason.evidenceId.length > 0))
    assert(prospect.recommendedAction.label.length > 0)
    assert.equal(prospect.labelApproved, true)
  }

  assert.equal(report.labelsApproved, true)
  assert.equal(report.prospectUrgencyLeaks, 0)
  assert.equal(report.scoreReasonsCiteEvidence, true)
  assert(report.stageCounts.discovery.discovered >= 4)
  assert(report.stageCounts.hydrate.failed >= 1)
  assert(report.stageCounts.claimGuard.revised >= 1)
  assert(report.laneCounts.todays_opportunities >= 1)
  assert(report.laneCounts.prospect_pool >= 1)
  assert(report.laneCounts.needs_review >= 1)

  const proof = {
    ok: true,
    mode: report.mode,
    stageCounts: report.stageCounts,
    laneCounts: report.laneCounts,
    failedCandidates: report.failedCandidates.length,
    demotedCandidates: report.demotedCandidates.length,
    opportunities: report.opportunities.length,
    prospects: report.prospects.length,
    blockedOrReviewItems: report.blockedOrReviewItems.length,
    providerCalls: report.providerCalls,
    dbWrites: report.dbWrites,
    estimatedCostCents: report.estimatedCostCents,
    budgetExhausted: report.budgetExhausted,
    badCandidateDidNotAbortRun: report.badCandidateDidNotAbortRun,
    labelsApproved: report.labelsApproved,
    prospectUrgencyLeaks: report.prospectUrgencyLeaks,
    scoreReasonsCiteEvidence: report.scoreReasonsCiteEvidence,
    persistenceMode: report.persistence.mode,
  }

  console.log(JSON.stringify(proof, null, 2))
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
