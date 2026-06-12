/**
 * CP16 - Contact Route / Outreach Play smoke proof.
 *
 * Shell-only deterministic proof. It does not call providers, read env, write
 * DB records, alter routes/UI, send email, create CRM/export records, or create
 * runtime search/agent behavior.
 */

import {
  evaluateContactRouteOutreach,
  type ContactRouteOutreachDecision,
  type ContactRouteOutreachInput,
} from '@/lib/outreach/contact-route-outreach-contract'
import type { EvidenceDocument } from '@/lib/providers/evidence-provider'

interface SmokeCase {
  name: string
  passed: boolean
}

interface ContactRouteOutreachSmokeProof {
  ok: boolean
  mode: 'contact_route_outreach_smoke'
  passed: number
  failed: number
  cases: Record<string, boolean>
  sentEmails: 0
  dbWrites: 0
  providerCalls: 0
  llmCalls: 0
  crmRecordsCreated: 0
  exportsCreated: 0
  routesChanged: 0
}

const generalBusinessContactEvidence: EvidenceDocument = {
  providerRunId: 'evidence:cp16:general-contact',
  fetchedAt: '2026-06-12T12:00:00.000Z',
  title: 'North Loop Wellness Suites contact page',
  cleanedText:
    'North Loop Wellness Suites publishes a general business contact route at https://northloop.example/contact for service inquiries.',
  rawProviderMetadata: { fixture: true },
  sourceUrl: 'https://northloop.example/contact',
}

const opportunityRouteEvidence: EvidenceDocument = {
  providerRunId: 'evidence:cp16:opportunity-route',
  fetchedAt: '2026-06-12T12:00:00.000Z',
  title: 'Castelion facilities contact page',
  cleanedText:
    'Castelion lists Pat Lee, Facilities Director, at facilities@castelion.example for facilities vendor coordination.',
  rawProviderMetadata: { fixture: true },
  sourceUrl: 'https://castelion.example/facilities-contact',
}

const opportunitySignalEvidence: EvidenceDocument = {
  providerRunId: 'evidence:cp16:opportunity-signal',
  fetchedAt: '2026-06-12T12:00:00.000Z',
  publishedAt: '2026-06-10T00:00:00.000Z',
  title: 'Castelion facility mobilization notice',
  cleanedText:
    'Castelion published a facility mobilization notice. The notice says urgent vendor response requested by June 14 for site readiness.',
  rawProviderMetadata: { fixture: true },
  sourceUrl: 'https://castelion.example/news/facility-mobilization',
}

const procurementEvidence: EvidenceDocument = {
  providerRunId: 'evidence:cp16:procurement',
  fetchedAt: '2026-06-12T12:00:00.000Z',
  title: 'City procurement portal janitorial RFP',
  cleanedText:
    'The city procurement portal at https://procurement.example.gov/bids/42 is the required submission path for janitorial services.',
  rawProviderMetadata: { fixture: true },
  sourceUrl: 'https://procurement.example.gov/bids/42',
}

const unsupportedClaimEvidence: EvidenceDocument = {
  providerRunId: 'evidence:cp16:unsupported-claim',
  fetchedAt: '2026-06-12T12:00:00.000Z',
  publishedAt: '2026-06-11T00:00:00.000Z',
  title: 'Retail buildout notice',
  cleanedText:
    'A retail buildout notice was published for the property. It lists the project location and contractor.',
  rawProviderMetadata: { fixture: true },
  sourceUrl: 'https://records.example.gov/buildout/retail-42',
}

const baseProspectInput: ContactRouteOutreachInput = {
  workspaceId: 'workspace:cp16',
  leadKind: 'evidence_backed_prospect',
  evidence: [generalBusinessContactEvidence],
  routeCandidates: [
    {
      routeType: 'general_business_contact',
      label: 'Published service inquiry contact page',
      evidenceIndexes: [0],
      confidence: 'plausible',
      url: 'https://northloop.example/contact',
      organization: 'North Loop Wellness Suites',
    },
  ],
  outreachClaims: [
    {
      kind: 'opener',
      text: 'Use the published service inquiry contact page for a low-risk facilities introduction.',
      evidenceIndexes: [0],
      riskLevel: 'low',
    },
  ],
  recommendedAction: 'draft evidence-limited outreach',
}

function evaluate(
  input: ContactRouteOutreachInput,
): ContactRouteOutreachDecision {
  return evaluateContactRouteOutreach(input)
}

function zeroSideEffects(result: ContactRouteOutreachDecision): boolean {
  return (
    result.sentEmail === false &&
    result.wroteDb === false &&
    result.providerCalls === 0 &&
    result.llmCalls === 0 &&
    result.createdCrmRecord === false &&
    result.createdExport === false &&
    result.routesChanged === 0
  )
}

function hasBlockedReason(
  result: ContactRouteOutreachDecision,
  reasonCode: string,
): boolean {
  return result.blockedClaims.some((claim) => claim.reasonCode === reasonCode)
}

const validOpportunityResult = evaluate({
  workspaceId: 'workspace:cp16',
  leadKind: 'signal_backed_opportunity',
  evidence: [opportunityRouteEvidence, opportunitySignalEvidence],
  routeCandidates: [
    {
      routeType: 'direct_email',
      label: 'Facilities vendor coordination email',
      evidenceIndexes: [0],
      confidence: 'verified',
      name: 'Pat Lee',
      title: 'Facilities Director',
      email: 'facilities@castelion.example',
    },
  ],
  outreachClaims: [
    {
      kind: 'urgency',
      text: 'urgent vendor response requested by June 14',
      evidenceIndexes: [1],
      riskLevel: 'high',
      sourcePhrase: 'urgent vendor response requested by June 14',
    },
  ],
  signal: {
    label: 'facility_mobilization',
    evidenceIndexes: [1],
    fresh: true,
  },
  recommendedAction: 'draft source-backed personalized outreach',
})

const validProspectResult = evaluate(baseProspectInput)

const prospectUrgencyClaimResult = evaluate({
  ...baseProspectInput,
  outreachClaims: [
    {
      kind: 'urgency',
      text: 'urgent vendor response requested by June 14',
      evidenceIndexes: [0],
      riskLevel: 'high',
    },
  ],
  recommendedAction: 'draft evidence-limited outreach without risky claims',
})

const exploratoryResult = evaluate({
  ...baseProspectInput,
  leadKind: 'exploratory_prospect',
  recommendedAction: 'enrich evidence and contact route',
})

const missingEvidenceResult = evaluate({
  ...baseProspectInput,
  evidence: [],
  recommendedAction: 'hydrate evidence',
})

const procurementResult = evaluate({
  workspaceId: 'workspace:cp16',
  leadKind: 'signal_backed_opportunity',
  evidence: [procurementEvidence],
  routeCandidates: [
    {
      routeType: 'procurement_portal',
      label: 'Required procurement portal',
      evidenceIndexes: [0],
      confidence: 'verified',
      url: 'https://procurement.example.gov/bids/42',
    },
  ],
  outreachClaims: [
    {
      kind: 'opener',
      text: 'Use the required procurement portal for this public bid.',
      evidenceIndexes: [0],
      riskLevel: 'low',
    },
  ],
  procurementRequired: true,
  signal: {
    label: 'public_bid',
    evidenceIndexes: [0],
    fresh: true,
  },
  recommendedAction: 'use procurement portal',
})

const namedContactWithoutSourceResult = evaluate({
  ...baseProspectInput,
  routeCandidates: [
    {
      ...baseProspectInput.routeCandidates[0],
      routeType: 'front_desk',
      name: 'Jordan Rivera',
      title: undefined,
      url: undefined,
    },
  ],
  recommendedAction: 'draft evidence-limited outreach without named contact',
})

const emailWithoutSourceResult = evaluate({
  ...baseProspectInput,
  routeCandidates: [
    {
      ...baseProspectInput.routeCandidates[0],
      routeType: 'direct_email',
      email: 'ops@northloop.example',
      url: undefined,
    },
  ],
  recommendedAction: 'draft evidence-limited outreach without email personalization',
})

const invalidRouteEvidenceIndexResult = evaluate({
  ...baseProspectInput,
  routeCandidates: [
    {
      ...baseProspectInput.routeCandidates[0],
      evidenceIndexes: [99],
    },
  ],
})

const unknownRouteResult = evaluate({
  ...baseProspectInput,
  routeCandidates: [
    {
      routeType: 'unknown',
      label: 'Unknown route',
      evidenceIndexes: [0],
      confidence: 'needs_review',
    },
  ],
  recommendedAction: 'hydrate contact evidence',
})

const highRiskUnsupportedClaimResult = evaluate({
  workspaceId: 'workspace:cp16',
  leadKind: 'signal_backed_opportunity',
  evidence: [generalBusinessContactEvidence, unsupportedClaimEvidence],
  routeCandidates: baseProspectInput.routeCandidates,
  outreachClaims: [
    {
      kind: 'budget',
      text: 'budget is allocated for immediate vendor work',
      evidenceIndexes: [1],
      riskLevel: 'high',
    },
  ],
  signal: {
    label: 'retail_buildout',
    evidenceIndexes: [1],
    fresh: true,
  },
  recommendedAction: 'send to review',
})

const missingRecommendedActionResult = evaluate({
  ...baseProspectInput,
  recommendedAction: undefined,
})

const cases: SmokeCase[] = [
  {
    name: 'signalBackedOpportunitySupportedUrgencyProducesSourceBackedPersonalizedDraft',
    passed:
      validOpportunityResult.ok === true &&
      validOpportunityResult.outreachCtaAvailable === true &&
      validOpportunityResult.allowedOutreachMode ===
        'source_backed_personalized_draft' &&
      validOpportunityResult.personalizationAllowed === true &&
      validOpportunityResult.routeReadiness === 'verified_route' &&
      validOpportunityResult.blockedClaims.length === 0 &&
      zeroSideEffects(validOpportunityResult),
  },
  {
    name: 'evidenceBackedProspectLowRiskRouteProducesEvidenceLimitedDraft',
    passed:
      validProspectResult.ok === true &&
      validProspectResult.outreachCtaAvailable === true &&
      validProspectResult.allowedOutreachMode === 'evidence_limited_draft' &&
      validProspectResult.personalizationAllowed === false &&
      validProspectResult.routeReadiness === 'plausible_route' &&
      zeroSideEffects(validProspectResult),
  },
  {
    name: 'prospectUrgencyClaimBlockedButOutreachStillSafeMode',
    passed:
      prospectUrgencyClaimResult.ok === true &&
      prospectUrgencyClaimResult.outreachCtaAvailable === true &&
      prospectUrgencyClaimResult.allowedOutreachMode ===
        'evidence_limited_draft' &&
      prospectUrgencyClaimResult.outreachPlayLevel !== 'manual_review_recommended' &&
      hasBlockedReason(
        prospectUrgencyClaimResult,
        'urgency_claim_without_signal',
      ) &&
      prospectUrgencyClaimResult.personalizationAllowed === false,
  },
  {
    name: 'exploratoryProspectReturnsGenericOutreachTemplate',
    passed:
      exploratoryResult.ok === true &&
      exploratoryResult.outreachCtaAvailable === true &&
      exploratoryResult.allowedOutreachMode === 'generic_outreach_template' &&
      exploratoryResult.personalizationAllowed === false &&
      exploratoryResult.recommendedAction === 'enrich evidence and contact route',
  },
  {
    name: 'missingEvidenceReturnsGenericTemplateAndBlocksPersonalization',
    passed:
      missingEvidenceResult.ok === true &&
      missingEvidenceResult.outreachCtaAvailable === true &&
      missingEvidenceResult.allowedOutreachMode === 'generic_outreach_template' &&
      missingEvidenceResult.personalizationAllowed === false &&
      missingEvidenceResult.blockedClaims.length > 0 &&
      missingEvidenceResult.recommendedAction === 'hydrate evidence',
  },
  {
    name: 'procurementRequiredReturnsProcurementOnly',
    passed:
      procurementResult.ok === true &&
      procurementResult.outreachCtaAvailable === true &&
      procurementResult.allowedOutreachMode === 'procurement_only' &&
      procurementResult.outreachAllowed === false &&
      procurementResult.routeReadiness === 'procurement_only',
  },
  {
    name: 'namedContactWithoutSourceBlocksContactClaimAndDowngradesPersonalization',
    passed:
      namedContactWithoutSourceResult.ok === true &&
      namedContactWithoutSourceResult.outreachCtaAvailable === true &&
      namedContactWithoutSourceResult.allowedOutreachMode ===
        'evidence_limited_draft' &&
      hasBlockedReason(
        namedContactWithoutSourceResult,
        'named_contact_without_source',
      ) &&
      namedContactWithoutSourceResult.personalizationAllowed === false,
  },
  {
    name: 'emailWithoutSourceBlocksContactDetailAndDowngradesPersonalization',
    passed:
      emailWithoutSourceResult.ok === true &&
      emailWithoutSourceResult.outreachCtaAvailable === true &&
      emailWithoutSourceResult.allowedOutreachMode === 'evidence_limited_draft' &&
      hasBlockedReason(emailWithoutSourceResult, 'email_without_source') &&
      emailWithoutSourceResult.personalizationAllowed === false,
  },
  {
    name: 'invalidEvidenceIndexBlocksBecauseInputMalformed',
    passed:
      invalidRouteEvidenceIndexResult.ok === false &&
      invalidRouteEvidenceIndexResult.reasonCode === 'invalid_evidence_index' &&
      invalidRouteEvidenceIndexResult.allowedOutreachMode ===
        'manual_review_recommended' &&
      invalidRouteEvidenceIndexResult.outreachCtaAvailable === true,
  },
  {
    name: 'unknownNoUsableRouteAllowsGenericTemplateAndHydrateAction',
    passed:
      unknownRouteResult.ok === true &&
      unknownRouteResult.outreachCtaAvailable === true &&
      unknownRouteResult.allowedOutreachMode === 'generic_outreach_template' &&
      unknownRouteResult.personalizationAllowed === false &&
      unknownRouteResult.recommendedAction === 'hydrate contact evidence',
  },
  {
    name: 'highRiskUnsupportedBudgetClaimBlockedFromDraft',
    passed:
      highRiskUnsupportedClaimResult.ok === true &&
      highRiskUnsupportedClaimResult.outreachCtaAvailable === true &&
      highRiskUnsupportedClaimResult.allowedOutreachMode ===
        'manual_review_recommended' &&
      hasBlockedReason(
        highRiskUnsupportedClaimResult,
        'high_risk_claim_without_verbatim_support',
      ) &&
      highRiskUnsupportedClaimResult.personalizationAllowed === false,
  },
  {
    name: 'missingRecommendedActionSuppliesSafeDefault',
    passed:
      missingRecommendedActionResult.ok === true &&
      missingRecommendedActionResult.allowedOutreachMode ===
        'evidence_limited_draft' &&
      missingRecommendedActionResult.recommendedAction ===
        'draft evidence-limited outreach without risky claims',
  },
  {
    name: 'sideEffectCountersStayZeroOnPassReviewAndDowngrade',
    passed:
      zeroSideEffects(validProspectResult) &&
      zeroSideEffects(validOpportunityResult) &&
      zeroSideEffects(missingEvidenceResult) &&
      zeroSideEffects(highRiskUnsupportedClaimResult) &&
      zeroSideEffects(invalidRouteEvidenceIndexResult),
  },
]

const failedCases = cases.filter((testCase) => !testCase.passed)
const caseMap = Object.fromEntries(
  cases.map((testCase) => [testCase.name, testCase.passed]),
) as Record<string, boolean>

const proof: ContactRouteOutreachSmokeProof = {
  ok: failedCases.length === 0,
  mode: 'contact_route_outreach_smoke',
  passed: cases.length - failedCases.length,
  failed: failedCases.length,
  cases: caseMap,
  sentEmails: 0,
  dbWrites: 0,
  providerCalls: 0,
  llmCalls: 0,
  crmRecordsCreated: 0,
  exportsCreated: 0,
  routesChanged: 0,
}

console.log(JSON.stringify(proof, null, 2))

if (!proof.ok) {
  process.exit(1)
}
