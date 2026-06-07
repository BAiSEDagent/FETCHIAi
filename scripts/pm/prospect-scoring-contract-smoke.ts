/**
 * CP11 - Prospect scoring contract smoke proof.
 *
 * Shell-only deterministic proof. Uses existing prospect-mining fixtures and
 * proves prospects can receive Prospect Fit / Outreach Readiness scores while
 * Opportunity Urgency remains blocked.
 */

import {
  commercialCleaningDirectoryProspect,
  commercialCleaningMapsListingProspect,
} from '@/lib/prospect-mining/fixtures'
import {
  evaluateProspectScoring,
  type ProspectScoreInput,
  type ProspectScoringResult,
} from '@/lib/scoring/prospect-scoring-contract'

interface ProspectScoringContractSmokeProof {
  ok: boolean
  mode: 'prospect_scoring_contract_smoke'
  cases: {
    directoryProspectScoresFitAndReadiness: boolean
    mapsProspectScoresFitAndReadiness: boolean
    urgencyScoreBlockedForProspect: boolean
    opportunityFieldBlocked: boolean
    missingReasonsBlocked: boolean
  }
  createdOpportunities: 0
  createdUrgencyScores: 0
  createdOutreach: 0
  providerCalls: 0
  dbWrites: 0
  routesChanged: 0
  classifierRuns: 0
  crmSyncs: 0
  firecrawlWorkflowRuns: 0
}

function toScoreInput(
  packet: typeof commercialCleaningDirectoryProspect,
  overrides: Partial<ProspectScoreInput> = {},
): ProspectScoreInput {
  return {
    leadKind: packet.leadKind,
    evidenceSummary: packet.evidenceSummary,
    fitReasons: packet.fitReasons,
    contactRouteHints: packet.contactRouteHints,
    sourceConfidence: 0.82,
    locationConfidence: packet.location ? 0.8 : 0.5,
    accountFitSignals: [
      packet.sourceType,
      packet.businessName ?? 'business_identity_present',
    ],
    crmReady: false,
    ...overrides,
  }
}

function hasReasonsForEveryNonNullScore(result: ProspectScoringResult): boolean {
  return (
    (result.prospectFitScore === null ||
      (result.scoreReasons.prospect_fit ?? []).length > 0) &&
    (result.outreachReadinessScore === null ||
      (result.scoreReasons.outreach_readiness ?? []).length > 0) &&
    result.opportunityUrgencyScore === null
  )
}

function validProspectScoringResult(result: ProspectScoringResult): boolean {
  return (
    result.ok === true &&
    typeof result.prospectFitScore === 'number' &&
    typeof result.outreachReadinessScore === 'number' &&
    result.opportunityUrgencyScore === null &&
    result.allowedScoreKinds.includes('prospect_fit') &&
    result.allowedScoreKinds.includes('outreach_readiness') &&
    result.blockedScoreKinds.includes('opportunity_urgency') &&
    hasReasonsForEveryNonNullScore(result) &&
    result.createdOpportunity === false &&
    result.outreachDrafted === false &&
    result.crmSynced === false
  )
}

const directoryResult = evaluateProspectScoring(
  toScoreInput(commercialCleaningDirectoryProspect),
)
const mapsResult = evaluateProspectScoring(
  toScoreInput(commercialCleaningMapsListingProspect),
)
const urgencyBlockedResult = evaluateProspectScoring(
  toScoreInput(commercialCleaningDirectoryProspect, {
    requestedScoreKinds: ['opportunity_urgency'],
  }),
)
const opportunityFieldBlockedResult = evaluateProspectScoring({
  ...toScoreInput(commercialCleaningMapsListingProspect),
  whyNow: 'Needs this week.',
} as ProspectScoreInput)
const missingReasonsBlockedResult = evaluateProspectScoring(
  toScoreInput(commercialCleaningDirectoryProspect, {
    fitReasons: [],
  }),
)

const cases = {
  directoryProspectScoresFitAndReadiness:
    validProspectScoringResult(directoryResult),
  mapsProspectScoresFitAndReadiness: validProspectScoringResult(mapsResult),
  urgencyScoreBlockedForProspect:
    urgencyBlockedResult.ok === false &&
    urgencyBlockedResult.reasonCode === 'forbidden_opportunity_urgency' &&
    urgencyBlockedResult.blockedScoreKinds.includes('opportunity_urgency') &&
    urgencyBlockedResult.opportunityUrgencyScore === null &&
    urgencyBlockedResult.createdOpportunity === false,
  opportunityFieldBlocked:
    opportunityFieldBlockedResult.ok === false &&
    opportunityFieldBlockedResult.reasonCode === 'forbidden_opportunity_field' &&
    opportunityFieldBlockedResult.opportunityUrgencyScore === null &&
    opportunityFieldBlockedResult.createdOpportunity === false,
  missingReasonsBlocked:
    missingReasonsBlockedResult.ok === false &&
    missingReasonsBlockedResult.reasonCode === 'missing_fit_reasons' &&
    missingReasonsBlockedResult.prospectFitScore === null &&
    missingReasonsBlockedResult.outreachReadinessScore === null,
}

const proof: ProspectScoringContractSmokeProof = {
  ok: Object.values(cases).every(Boolean),
  mode: 'prospect_scoring_contract_smoke',
  cases,
  createdOpportunities: 0,
  createdUrgencyScores: 0,
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
