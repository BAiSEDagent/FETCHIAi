/**
 * CP15 - Commercial Roofing classification smoke proof.
 *
 * Shell-only deterministic proof. Validates approved playbook/taxonomy labels
 * and blocks freestyle UI-visible labels and unsupported claims without running
 * a model, provider, DB write, route, UI, scoring, outreach, CRM, or export flow.
 */

import {
  classifyCommercialRoofingCandidate,
  type CommercialRoofingClassificationInput,
  type CommercialRoofingClassificationResult,
} from '@/lib/classification/commercial-roofing-classification-contract'

interface CommercialRoofingClassificationSmokeProof {
  ok: boolean
  mode: 'commercial_roofing_classification_smoke'
  cases: {
    validReroofPermitOpportunityLabelsPass: boolean
    validPropertyPortfolioProspectLabelsPass: boolean
    stormExposureWatchlistPassesAsExposure: boolean
    freestyledSignalLabelBlocks: boolean
    freestyledVerticalFitLabelBlocks: boolean
    unapprovedFallbackNoContactRouteBlocks: boolean
    missingEvidenceBlocks: boolean
    urgentSurfaceWithoutUrgentActionEvidenceBlocks: boolean
    contractorAsBuyerCandidateBlocks: boolean
    unsupportedRoofDamagedWeatherClaimBlocks: boolean
    unsupportedProcurementBypassClaimBlocks: boolean
    unsourcedDecisionMakerClaimBlocks: boolean
  }
  createdOpportunities: 0
  createdScores: 0
  outreachDrafts: 0
  providerCalls: 0
  dbWrites: 0
  routesChanged: 0
}

const validReroofPermitOpportunityInput: CommercialRoofingClassificationInput = {
  verticalId: 'commercial_roofing',
  rawSignalId: 'fixture-commercial-roofing-reroof-permit-001',
  proposedSignalLabels: ['REROOF PERMIT'],
  proposedVerticalFitLabels: ['Roof Replacement', 'Commercial Roof'],
  proposedSurface: 'urgent_action',
  evidenceSummary:
    'Official commercial reroof permit names replacement scope at an industrial warehouse address.',
  evidenceSourceUrls: ['https://permits.example.gov/reroof-001'],
  classificationReason:
    'Active reroof permit provides source-linked roof scope tied to a commercial asset.',
  urgentActionEvidence: ['Permit is active and has not reached final closeout.'],
  buyerAccountType: 'industrial warehouse owner',
  routeConfidence: 'medium',
}

const validPropertyPortfolioProspectInput: CommercialRoofingClassificationInput = {
  verticalId: 'commercial_roofing',
  rawSignalId: 'fixture-commercial-roofing-property-portfolio-001',
  proposedSignalLabels: ['MANAGER CHANGE'],
  proposedVerticalFitLabels: ['Property Portfolio', 'Commercial Roof'],
  proposedSurface: 'pipeline',
  evidenceSummary:
    'Property manager portfolio page lists retail centers in the service area and a PM office route.',
  evidenceSourceUrls: ['https://pm.example.com/portfolio'],
  classificationReason:
    'Portfolio evidence proves roofing buyer-account fit but does not prove urgency.',
  buyerAccountType: 'property manager',
  routeConfidence: 'high',
}

const stormExposureWatchlistInput: CommercialRoofingClassificationInput = {
  verticalId: 'commercial_roofing',
  rawSignalId: 'fixture-commercial-roofing-storm-exposure-001',
  proposedSignalLabels: ['STORM EXPOSURE'],
  proposedVerticalFitLabels: ['Storm Inspection', 'Commercial Roof'],
  proposedSurface: 'watchlist',
  evidenceSummary:
    'Official storm report shows hail exposure near a verified commercial property in the service area.',
  evidenceSourceUrls: ['https://weather.example.gov/storm-report-001'],
  classificationReason:
    'Storm exposure supports watchlist context when phrased as exposure, not damage certainty.',
  buyerAccountType: 'building owner',
  routeConfidence: 'medium',
}

function inertPass(result: CommercialRoofingClassificationResult): boolean {
  return (
    result.ok === true &&
    result.createdOpportunity === false &&
    result.createdScore === false &&
    result.outreachDrafted === false &&
    result.providerCalls === 0 &&
    result.dbWrites === 0 &&
    result.routesChanged === 0
  )
}

const validReroofPermitOpportunityResult = classifyCommercialRoofingCandidate(
  validReroofPermitOpportunityInput,
)
const validPropertyPortfolioProspectResult = classifyCommercialRoofingCandidate(
  validPropertyPortfolioProspectInput,
)
const stormExposureWatchlistResult = classifyCommercialRoofingCandidate(
  stormExposureWatchlistInput,
)
const freestyledSignalLabelResult = classifyCommercialRoofingCandidate({
  ...validPropertyPortfolioProspectInput,
  proposedSignalLabels: ['HOT ROOF LEAD'],
})
const freestyledVerticalFitLabelResult = classifyCommercialRoofingCandidate({
  ...validPropertyPortfolioProspectInput,
  proposedVerticalFitLabels: ['Perfect Roof Buyer'],
})
const unapprovedFallbackNoContactRouteResult =
  classifyCommercialRoofingCandidate({
    ...validPropertyPortfolioProspectInput,
    proposedFallbackState: 'No Contact Route',
  })
const missingEvidenceResult = classifyCommercialRoofingCandidate({
  ...validPropertyPortfolioProspectInput,
  evidenceSummary: '',
  evidenceSourceUrls: [],
})
const urgentSurfaceWithoutUrgentActionEvidenceResult =
  classifyCommercialRoofingCandidate({
    ...validReroofPermitOpportunityInput,
    urgentActionEvidence: [],
  })
const contractorAsBuyerCandidateResult = classifyCommercialRoofingCandidate({
  ...validReroofPermitOpportunityInput,
  contractorAsBuyerCandidate: true,
})
const unsupportedRoofDamagedWeatherClaimResult =
  classifyCommercialRoofingCandidate({
    ...stormExposureWatchlistInput,
    claimsRoofDamageFromWeather: true,
  })
const unsupportedProcurementBypassClaimResult =
  classifyCommercialRoofingCandidate({
    ...validReroofPermitOpportunityInput,
    proposedSignalLabels: ['PUBLIC BID'],
    proposedVerticalFitLabels: ['Roof Replacement', 'Commercial Roof'],
    unsupportedProcurementBypassClaim: true,
  })
const unsourcedDecisionMakerClaimResult = classifyCommercialRoofingCandidate({
  ...validPropertyPortfolioProspectInput,
  unsourcedDecisionMakerClaim: true,
})

const cases = {
  validReroofPermitOpportunityLabelsPass:
    inertPass(validReroofPermitOpportunityResult) &&
    validReroofPermitOpportunityResult.signalLabels.includes('REROOF PERMIT') &&
    validReroofPermitOpportunityResult.verticalFitLabels.includes(
      'Roof Replacement',
    ) &&
    validReroofPermitOpportunityResult.opportunitySurface === 'urgent_action',
  validPropertyPortfolioProspectLabelsPass:
    inertPass(validPropertyPortfolioProspectResult) &&
    validPropertyPortfolioProspectResult.signalLabels.includes(
      'MANAGER CHANGE',
    ) &&
    validPropertyPortfolioProspectResult.verticalFitLabels.includes(
      'Property Portfolio',
    ) &&
    validPropertyPortfolioProspectResult.opportunitySurface === 'pipeline',
  stormExposureWatchlistPassesAsExposure:
    inertPass(stormExposureWatchlistResult) &&
    stormExposureWatchlistResult.signalLabels.includes('STORM EXPOSURE') &&
    stormExposureWatchlistResult.verticalFitLabels.includes(
      'Storm Inspection',
    ) &&
    stormExposureWatchlistResult.opportunitySurface === 'watchlist',
  freestyledSignalLabelBlocks:
    freestyledSignalLabelResult.ok === false &&
    freestyledSignalLabelResult.reasonCode === 'unapproved_signal_label',
  freestyledVerticalFitLabelBlocks:
    freestyledVerticalFitLabelResult.ok === false &&
    freestyledVerticalFitLabelResult.reasonCode ===
      'unapproved_vertical_fit_label',
  unapprovedFallbackNoContactRouteBlocks:
    unapprovedFallbackNoContactRouteResult.ok === false &&
    unapprovedFallbackNoContactRouteResult.reasonCode ===
      'unapproved_fallback_state',
  missingEvidenceBlocks:
    missingEvidenceResult.ok === false &&
    missingEvidenceResult.reasonCode === 'missing_evidence',
  urgentSurfaceWithoutUrgentActionEvidenceBlocks:
    urgentSurfaceWithoutUrgentActionEvidenceResult.ok === false &&
    urgentSurfaceWithoutUrgentActionEvidenceResult.reasonCode ===
      'urgent_surface_missing_action_evidence',
  contractorAsBuyerCandidateBlocks:
    contractorAsBuyerCandidateResult.ok === false &&
    contractorAsBuyerCandidateResult.reasonCode ===
      'contractor_as_buyer_candidate',
  unsupportedRoofDamagedWeatherClaimBlocks:
    unsupportedRoofDamagedWeatherClaimResult.ok === false &&
    unsupportedRoofDamagedWeatherClaimResult.reasonCode ===
      'weather_damage_certainty_without_corroboration',
  unsupportedProcurementBypassClaimBlocks:
    unsupportedProcurementBypassClaimResult.ok === false &&
    unsupportedProcurementBypassClaimResult.reasonCode ===
      'unsupported_procurement_bypass_claim',
  unsourcedDecisionMakerClaimBlocks:
    unsourcedDecisionMakerClaimResult.ok === false &&
    unsourcedDecisionMakerClaimResult.reasonCode ===
      'unsourced_decision_maker_claim',
}

const proof: CommercialRoofingClassificationSmokeProof = {
  ok: Object.values(cases).every(Boolean),
  mode: 'commercial_roofing_classification_smoke',
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
