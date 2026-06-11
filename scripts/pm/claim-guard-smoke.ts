/**
 * CP-CG1 - Claim Guard smoke proof.
 *
 * Shell-only deterministic proof. Builds in-memory fixtures and runs Claim
 * Guard without provider calls, DB writes, routes, scoring models,
 * classification models, export/CRM work, or outreach generation.
 */

import {
  evaluateClaimGuard,
  type ClaimGuardArtifact,
  type ClaimGuardConfig,
  type ClaimGuardDecision,
  type ClaimGuardEvidenceDocument,
} from '@/lib/gates/claim-guard'
import {
  APPROVED_COMMERCIAL_CLEANING_SIGNAL_LABELS,
  APPROVED_COMMERCIAL_CLEANING_VERTICAL_FIT_LABELS,
} from '@/lib/classification/commercial-cleaning-classification-contract'

interface ClaimGuardSmokeProof {
  ok: boolean
  mode: 'claim_guard_smoke'
  cases: {
    validProspectArtifactPasses: boolean
    validOpportunityArtifactPasses: boolean
    missingEvidenceBlocks: boolean
    opportunityWithoutDatedEvidenceBlocks: boolean
    unsupportedUrgencyBlocks: boolean
    staleUrgencyBlocks: boolean
    unapprovedSignalLabelBlocks: boolean
    unapprovedVerticalFitLabelBlocks: boolean
    scoreWithoutReasonBlocks: boolean
    scoreReasonWithoutEvidenceCitationBlocks: boolean
    speculativeBudgetClaimWithoutVerbatimSupportBlocks: boolean
    speculativeBudgetClaimWithVerbatimSupportPasses: boolean
    namedContactClaimWithoutSourceBlocks: boolean
    explanationWithoutRecommendedActionBlocks: boolean
    zeroSideEffectCountersPreserved: boolean
  }
  createdOpportunities: 0
  createdScores: 0
  outreachDrafts: 0
  providerCalls: 0
  dbWrites: 0
  routesChanged: 0
}

const EVALUATED_AT = '2026-06-08T18:00:00.000Z'

const config: ClaimGuardConfig = {
  approvedSignalLabels: APPROVED_COMMERCIAL_CLEANING_SIGNAL_LABELS,
  approvedVerticalFitLabels: APPROVED_COMMERCIAL_CLEANING_VERTICAL_FIT_LABELS,
  maxSignalAgeDays: 21,
}

function guard(artifact: ClaimGuardArtifact): ClaimGuardDecision {
  return evaluateClaimGuard({ artifact, config, evaluatedAt: EVALUATED_AT })
}

const castelionJobPosting: ClaimGuardEvidenceDocument = {
  providerRunId: 'evidence:fixture:castelion:job',
  fetchedAt: '2026-06-08T16:00:00.000Z',
  publishedAt: '2026-06-05T00:00:00.000Z',
  title: 'Facilities Manager - Castelion Corporation, Rio Rancho NM',
  cleanedText:
    'Facilities Manager position posted for Castelion Corporation in Rio Rancho, NM, supporting a new 1,000-acre site in New Mexico for engineering, manufacturing, and office environments.',
  rawProviderMetadata: { fixture: true },
  sourceUrl:
    'https://www.ziprecruiter.com/Jobs/Facility-Manager/-in-Albuquerque,NM',
}

const castelionGroundbreaking: ClaimGuardEvidenceDocument = {
  providerRunId: 'evidence:fixture:castelion:groundbreaking',
  fetchedAt: '2026-06-08T16:00:00.000Z',
  publishedAt: '2026-05-02T00:00:00.000Z',
  title: 'Castelion Project Ranger groundbreaking',
  cleanedText:
    'Castelion announced the Project Ranger groundbreaking on a 1,000-acre site in Sandoval County with 21 planned buildings.',
  rawProviderMetadata: { fixture: true },
  sourceUrl: 'https://www.castelion.com/news/project_ranger_groundbreaking/',
}

const gymListing: ClaimGuardEvidenceDocument = {
  providerRunId: 'evidence:fixture:gym:listing',
  fetchedAt: '2026-06-08T16:00:00.000Z',
  title: 'Chuze Fitness - Winrock location page',
  cleanedText:
    'Chuze Fitness Winrock is an active fitness location in Albuquerque, NM with a published street address and phone number.',
  rawProviderMetadata: { fixture: true },
  sourceUrl: 'https://example.com/chuze-fitness-winrock',
}

const permitWithoutBudgetText: ClaimGuardEvidenceDocument = {
  providerRunId: 'evidence:fixture:permit:no-budget',
  fetchedAt: '2026-06-08T16:00:00.000Z',
  publishedAt: '2026-06-01T00:00:00.000Z',
  title: 'Buildout permit - Plano TX',
  cleanedText:
    'Buildout permit approved for an existing commercial retail complex. Contractor has six months from approval to begin work.',
  rawProviderMetadata: { fixture: true },
  sourceUrl: 'https://records.example.gov/permits/plano/2026-0601',
}

const permitWithBudgetText: ClaimGuardEvidenceDocument = {
  providerRunId: 'evidence:fixture:permit:budget',
  fetchedAt: '2026-06-08T16:00:00.000Z',
  publishedAt: '2026-06-01T00:00:00.000Z',
  title: 'Buildout permit - Plano TX budget note',
  cleanedText:
    'Buildout permit approved for an existing commercial retail complex. The public project memo says budget is allocated for the buildout.',
  rawProviderMetadata: { fixture: true },
  sourceUrl: 'https://records.example.gov/permits/plano/2026-0601-budget',
}

const staleOpeningSignal: ClaimGuardEvidenceDocument = {
  providerRunId: 'evidence:fixture:stale:opening',
  fetchedAt: '2026-06-08T16:00:00.000Z',
  publishedAt: '2026-04-15T00:00:00.000Z',
  title: 'Restaurant opening notice - Irving TX',
  cleanedText:
    'A restaurant opening notice was published for an Irving, TX retail center.',
  rawProviderMetadata: { fixture: true },
  sourceName: 'city business notices fixture',
}

const validProspectResult = guard({
  workspaceId: 'workspace:fixture',
  leadKind: 'evidence_backed_prospect',
  verticalFitLabel: 'Gym / Fitness',
  claimsUrgency: false,
  claims: [
    {
      kind: 'fit_reason',
      text: 'Active fitness location with a published address and phone fits recurring commercial cleaning.',
      evidenceIndexes: [0],
    },
  ],
  contacts: [
    {
      routeType: 'phone',
      phone: '505-555-0100',
      evidenceIndexes: [0],
    },
  ],
  recommendedAction: 'Watch for complaints, hiring, or expansion signals',
  evidence: [gymListing],
})

const validOpportunityResult = guard({
  workspaceId: 'workspace:fixture',
  leadKind: 'signal_backed_opportunity',
  signalLabel: 'HIRING',
  verticalFitLabel: 'Janitorial Contract',
  claimsUrgency: true,
  claims: [
    {
      kind: 'why_now',
      text: 'A facilities manager role was posted on June 5 for a new 1,000-acre site.',
      evidenceIndexes: [0, 1],
    },
    {
      kind: 'fit_reason',
      text: 'Large industrial campus with manufacturing and office environments suited to recurring janitorial service.',
      evidenceIndexes: [1],
    },
  ],
  score: 86,
  scoreReasons: [
    {
      code: 'fresh_hiring_signal',
      text: 'Dated facilities hiring signal is three days old.',
      evidenceIndexes: [0],
    },
    {
      code: 'site_scale',
      text: '1,000-acre site with 21 planned buildings.',
      evidenceIndexes: [1],
    },
  ],
  recommendedAction: 'Review facility-services outreach angle',
  evidence: [castelionJobPosting, castelionGroundbreaking],
})

const missingEvidenceResult = guard({
  workspaceId: 'workspace:fixture',
  leadKind: 'evidence_backed_prospect',
  verticalFitLabel: 'Gym / Fitness',
  claimsUrgency: false,
  claims: [],
  recommendedAction: 'Review fit',
  evidence: [],
})

const opportunityWithoutDatedEvidenceResult = guard({
  workspaceId: 'workspace:fixture',
  leadKind: 'signal_backed_opportunity',
  signalLabel: 'NEW BIZ',
  verticalFitLabel: 'Gym / Fitness',
  claimsUrgency: false,
  claims: [
    {
      kind: 'fit_reason',
      text: 'Active fitness location exists.',
      evidenceIndexes: [0],
    },
  ],
  recommendedAction: 'Review for dated signal evidence',
  evidence: [gymListing],
})

const unsupportedUrgencyResult = guard({
  workspaceId: 'workspace:fixture',
  leadKind: 'evidence_backed_prospect',
  verticalFitLabel: 'Gym / Fitness',
  claimsUrgency: true,
  claims: [
    {
      kind: 'fit_reason',
      text: 'This gym needs this week, so act now before competitors.',
      evidenceIndexes: [0],
    },
  ],
  recommendedAction: 'Keep in prospect research',
  evidence: [gymListing],
})

const staleUrgencyResult = guard({
  workspaceId: 'workspace:fixture',
  leadKind: 'signal_backed_opportunity',
  signalLabel: 'RESTAURANT',
  verticalFitLabel: 'Restaurant',
  claimsUrgency: true,
  claims: [
    {
      kind: 'why_now',
      text: 'Restaurant opening notice creates a cleaning-relevant signal.',
      evidenceIndexes: [0],
    },
  ],
  recommendedAction: 'Review only if fresher evidence appears',
  evidence: [staleOpeningSignal],
})

const unapprovedSignalLabelResult = guard({
  ...validOpportunityArtifact(),
  signalLabel: 'HOT LEAD',
})

const unapprovedVerticalFitLabelResult = guard({
  ...validProspectArtifact(),
  verticalFitLabel:
    'High-Value: Large industrial facility requiring comprehensive cleaning',
})

const scoreWithoutReasonResult = guard({
  ...validProspectArtifact(),
  score: 91,
  scoreReasons: [],
})

const scoreReasonWithoutEvidenceCitationResult = guard({
  ...validProspectArtifact(),
  score: 72,
  scoreReasons: [
    {
      code: 'fit',
      text: 'Fitness location is a plausible recurring cleaning account.',
      evidenceIndexes: [],
    },
  ],
})

const speculativeBudgetClaimWithoutSupportResult = guard({
  workspaceId: 'workspace:fixture',
  leadKind: 'signal_backed_opportunity',
  signalLabel: 'BUILDOUT',
  verticalFitLabel: 'Post-Construction Clean',
  claimsUrgency: false,
  claims: [
    {
      kind: 'why_relevant',
      text: 'Active permit means buildout work is moving and budget is allocated.',
      evidenceIndexes: [0],
    },
  ],
  recommendedAction: 'Review permit scope',
  evidence: [permitWithoutBudgetText],
})

const speculativeBudgetClaimWithSupportResult = guard({
  workspaceId: 'workspace:fixture',
  leadKind: 'signal_backed_opportunity',
  signalLabel: 'BUILDOUT',
  verticalFitLabel: 'Post-Construction Clean',
  claimsUrgency: false,
  claims: [
    {
      kind: 'why_relevant',
      text: 'Active permit means buildout work is moving and budget is allocated.',
      evidenceIndexes: [0],
    },
  ],
  recommendedAction: 'Review permit scope',
  evidence: [permitWithBudgetText],
})

const namedContactClaimWithoutSourceResult = guard({
  ...validProspectArtifact(),
  contacts: [
    {
      name: 'Jane Park',
      title: 'Facilities Director',
      email: 'jane.park@example.com',
      routeType: 'email',
      evidenceIndexes: [],
    },
  ],
})

const explanationWithoutRecommendedActionResult = guard({
  workspaceId: 'workspace:fixture',
  leadKind: 'evidence_backed_prospect',
  verticalFitLabel: 'Gym / Fitness',
  claimsUrgency: false,
  claims: [
    {
      kind: 'fit_reason',
      text: 'Active fitness location fits recurring commercial cleaning.',
      evidenceIndexes: [0],
    },
  ],
  evidence: [gymListing],
})

function validProspectArtifact(): ClaimGuardArtifact {
  return {
    workspaceId: 'workspace:fixture',
    leadKind: 'evidence_backed_prospect',
    verticalFitLabel: 'Gym / Fitness',
    claimsUrgency: false,
    claims: [
      {
        kind: 'fit_reason',
        text: 'Active fitness location with a published address fits recurring commercial cleaning.',
        evidenceIndexes: [0],
      },
    ],
    recommendedAction: 'Watch for complaints, hiring, or expansion signals',
    evidence: [gymListing],
  }
}

function validOpportunityArtifact(): ClaimGuardArtifact {
  return {
    workspaceId: 'workspace:fixture',
    leadKind: 'signal_backed_opportunity',
    signalLabel: 'HIRING',
    verticalFitLabel: 'Janitorial Contract',
    claimsUrgency: false,
    claims: [
      {
        kind: 'why_relevant',
        text: 'A facilities manager role was posted on June 5 for a new industrial site.',
        evidenceIndexes: [0],
      },
    ],
    recommendedAction: 'Review facility-services outreach angle',
    evidence: [castelionJobPosting],
  }
}

function hasViolation(
  result: ClaimGuardDecision,
  reasonCode: string,
): boolean {
  return (
    result.ok === false &&
    result.violations.some((violation) => violation.reasonCode === reasonCode)
  )
}

function inertCounters(result: ClaimGuardDecision): boolean {
  return (
    result.createdOpportunity === false &&
    result.createdScore === false &&
    result.outreachDrafted === false &&
    result.providerCalls === 0 &&
    result.dbWrites === 0 &&
    result.routesChanged === 0
  )
}

const allResults = [
  validProspectResult,
  validOpportunityResult,
  missingEvidenceResult,
  opportunityWithoutDatedEvidenceResult,
  unsupportedUrgencyResult,
  staleUrgencyResult,
  unapprovedSignalLabelResult,
  unapprovedVerticalFitLabelResult,
  scoreWithoutReasonResult,
  scoreReasonWithoutEvidenceCitationResult,
  speculativeBudgetClaimWithoutSupportResult,
  speculativeBudgetClaimWithSupportResult,
  namedContactClaimWithoutSourceResult,
  explanationWithoutRecommendedActionResult,
]

const cases: ClaimGuardSmokeProof['cases'] = {
  validProspectArtifactPasses:
    validProspectResult.ok === true && validProspectResult.surfaceable === true,
  validOpportunityArtifactPasses:
    validOpportunityResult.ok === true &&
    validOpportunityResult.surfaceable === true,
  missingEvidenceBlocks:
    hasViolation(missingEvidenceResult, 'missing_evidence') &&
    missingEvidenceResult.ok === false &&
    missingEvidenceResult.fallbackState === 'missing_evidence',
  opportunityWithoutDatedEvidenceBlocks:
    hasViolation(
      opportunityWithoutDatedEvidenceResult,
      'opportunity_without_dated_evidence',
    ) &&
    opportunityWithoutDatedEvidenceResult.ok === false &&
    opportunityWithoutDatedEvidenceResult.fallbackState === 'missing_evidence',
  unsupportedUrgencyBlocks:
    hasViolation(unsupportedUrgencyResult, 'urgency_claim_on_prospect') &&
    hasViolation(unsupportedUrgencyResult, 'banned_prospect_phrase'),
  staleUrgencyBlocks:
    hasViolation(staleUrgencyResult, 'stale_signal_for_urgency'),
  unapprovedSignalLabelBlocks: hasViolation(
    unapprovedSignalLabelResult,
    'unapproved_signal_label',
  ),
  unapprovedVerticalFitLabelBlocks: hasViolation(
    unapprovedVerticalFitLabelResult,
    'unapproved_vertical_fit_label',
  ),
  scoreWithoutReasonBlocks: hasViolation(
    scoreWithoutReasonResult,
    'score_without_reason',
  ),
  scoreReasonWithoutEvidenceCitationBlocks: hasViolation(
    scoreReasonWithoutEvidenceCitationResult,
    'score_reason_without_evidence',
  ),
  speculativeBudgetClaimWithoutVerbatimSupportBlocks: hasViolation(
    speculativeBudgetClaimWithoutSupportResult,
    'speculative_claim_without_verbatim_evidence',
  ),
  speculativeBudgetClaimWithVerbatimSupportPasses:
    speculativeBudgetClaimWithSupportResult.ok === true,
  namedContactClaimWithoutSourceBlocks: hasViolation(
    namedContactClaimWithoutSourceResult,
    'unsourced_contact_claim',
  ),
  explanationWithoutRecommendedActionBlocks: hasViolation(
    explanationWithoutRecommendedActionResult,
    'missing_recommended_action',
  ),
  zeroSideEffectCountersPreserved: allResults.every(inertCounters),
}

const proof: ClaimGuardSmokeProof = {
  ok: Object.values(cases).every(Boolean),
  mode: 'claim_guard_smoke',
  cases,
  createdOpportunities: 0,
  createdScores: 0,
  outreachDrafts: 0,
  providerCalls: 0,
  dbWrites: 0,
  routesChanged: 0,
}

console.log(JSON.stringify(proof, null, 2))

if (!proof.ok) {
  process.exit(1)
}
