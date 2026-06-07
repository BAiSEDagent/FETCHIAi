/**
 * CP12 - Signal-backed opportunity scoring smoke proof.
 *
 * Shell-only deterministic proof. Validates that Opportunity Urgency is
 * available only for signal-backed opportunities and remains blocked for
 * evidence-backed prospects.
 */

import {
  evaluateOpportunityScoring,
  type OpportunityScoringInput,
  type OpportunityScoringResult,
} from '@/lib/scoring/opportunity-scoring-contract'

interface OpportunityScoringContractSmokeProof {
  ok: boolean
  mode: 'opportunity_scoring_contract_smoke'
  cases: {
    signalBackedOpportunityGetsUrgencyScore: boolean
    missingWhyNowBlocked: boolean
    missingEvidenceBlocked: boolean
    prospectUrgencyBlocked: boolean
    missingScoreReasonBlocked: boolean
  }
  createdOpportunities: 0
  createdOutreach: 0
  providerCalls: 0
  dbWrites: 0
  routesChanged: 0
  classifierRuns: 0
  crmSyncs: 0
  firecrawlWorkflowRuns: 0
}

const validSignalBackedOpportunity: OpportunityScoringInput = {
  leadKind: 'signal_backed_opportunity',
  signalType: 'building_permit',
  signalLabel: 'Tenant improvement permit',
  evidenceSourceUrls: [
    'https://permits.example.gov/records/ti-2026-1042',
    'https://records.example.gov/projects/ti-2026-1042',
  ],
  providerRunIds: ['serpapi-run-cp12-001', 'firecrawl-run-cp12-001'],
  evidenceSummary:
    'A public permit record describes a tenant improvement project with a recently published filing and named project location.',
  whyNowReasons: [
    'The permit filing is a fresh public buying signal.',
    'The filing creates a bounded action window before buildout completion.',
  ],
  freshnessWindow: 'published within 14 days',
  actionWindow: 'contact before subcontractor selection',
  signalObservedAt: '2026-06-07T00:00:00.000Z',
  publishedAt: '2026-06-06T00:00:00.000Z',
}

function validUrgencyResult(result: OpportunityScoringResult): boolean {
  return (
    result.ok === true &&
    typeof result.opportunityUrgencyScore === 'number' &&
    result.scoreReasons.length > 0 &&
    result.scoreReasons.every((component) => component.reason.trim().length > 0) &&
    result.readyForOpportunityRanking === true &&
    result.allowedScoreKinds.includes('opportunity_urgency') &&
    result.blockedScoreKinds.length === 0 &&
    result.createdOpportunity === false &&
    result.outreachDrafted === false &&
    result.crmSynced === false
  )
}

const validResult = evaluateOpportunityScoring(validSignalBackedOpportunity)
const missingWhyNowResult = evaluateOpportunityScoring({
  ...validSignalBackedOpportunity,
  whyNowReasons: [],
})
const missingEvidenceResult = evaluateOpportunityScoring({
  ...validSignalBackedOpportunity,
  evidenceSourceUrls: [],
})
const prospectUrgencyResult = evaluateOpportunityScoring({
  ...validSignalBackedOpportunity,
  leadKind: 'evidence_backed_prospect',
})
const missingScoreReasonResult = evaluateOpportunityScoring({
  ...validSignalBackedOpportunity,
  scoreComponents: [
    {
      key: 'why_now_reason_coverage',
      weight: 1,
      value: 1,
      reason: '',
    },
  ],
})

const cases = {
  signalBackedOpportunityGetsUrgencyScore: validUrgencyResult(validResult),
  missingWhyNowBlocked:
    missingWhyNowResult.ok === false &&
    missingWhyNowResult.reasonCode === 'missing_why_now' &&
    missingWhyNowResult.opportunityUrgencyScore === null &&
    missingWhyNowResult.readyForOpportunityRanking === false,
  missingEvidenceBlocked:
    missingEvidenceResult.ok === false &&
    missingEvidenceResult.reasonCode === 'missing_evidence_source' &&
    missingEvidenceResult.opportunityUrgencyScore === null &&
    missingEvidenceResult.readyForOpportunityRanking === false,
  prospectUrgencyBlocked:
    prospectUrgencyResult.ok === false &&
    prospectUrgencyResult.reasonCode === 'prospect_urgency_blocked' &&
    prospectUrgencyResult.blockedScoreKinds.includes('opportunity_urgency') &&
    prospectUrgencyResult.opportunityUrgencyScore === null,
  missingScoreReasonBlocked:
    missingScoreReasonResult.ok === false &&
    missingScoreReasonResult.reasonCode === 'missing_score_reason' &&
    missingScoreReasonResult.opportunityUrgencyScore === null,
}

const proof: OpportunityScoringContractSmokeProof = {
  ok: Object.values(cases).every(Boolean),
  mode: 'opportunity_scoring_contract_smoke',
  cases,
  createdOpportunities: 0,
  createdOutreach: 0,
  providerCalls: 0,
  dbWrites: 0,
  routesChanged: 0,
  classifierRuns: 0,
  crmSyncs: 0,
  firecrawlWorkflowRuns: 0,
}

console.log(JSON.stringify(proof, null, 2))

if (!proof.ok) {
  process.exit(1)
}
