/**
 * CP13 - Commercial Cleaning classification smoke proof.
 *
 * Shell-only deterministic proof. Validates approved playbook/taxonomy labels
 * and blocks freestyle UI-visible labels without running a model, provider,
 * DB write, route, UI, scoring, outreach, or CRM flow.
 */

import {
  classifyCommercialCleaningSignal,
  type CommercialCleaningClassificationInput,
  type ClassificationResult,
} from '@/lib/classification/commercial-cleaning-classification-contract'

interface CommercialCleaningClassificationSmokeProof {
  ok: boolean
  mode: 'commercial_cleaning_classification_smoke'
  cases: {
    approvedBuildoutClassificationPasses: boolean
    approvedNewBusinessClassificationPasses: boolean
    freestyleSignalLabelBlocked: boolean
    freestyleVerticalFitLabelBlocked: boolean
    unapprovedFallbackBlocked: boolean
    urgentSurfaceWithoutEvidenceBlocked: boolean
  }
  createdOpportunities: 0
  createdScores: 0
  createdOutreach: 0
  providerCalls: 0
  dbWrites: 0
  routesChanged: 0
  llmCalls: 0
  classifierRuntimeCalls: 0
  crmSyncs: 0
  firecrawlWorkflowRuns: 0
}

const approvedBuildoutInput: CommercialCleaningClassificationInput = {
  verticalId: 'commercial_cleaning',
  rawSignalId: 'fixture-commercial-cleaning-buildout-001',
  proposedSignalLabel: 'BUILDOUT',
  proposedVerticalFitLabel: 'Final Clean',
  proposedFreshnessLabel: '3d ago',
  proposedSurface: 'urgent_action',
  evidenceSummary:
    'Commercial buildout permit includes a dated record and move-in window for a new office space.',
  evidenceSourceUrls: ['https://permits.example.gov/buildout-001'],
  whyNowReasons: ['Move-in window creates a final-clean action window.'],
}

const approvedNewBusinessInput: CommercialCleaningClassificationInput = {
  verticalId: 'commercial_cleaning',
  rawSignalId: 'fixture-commercial-cleaning-new-biz-001',
  proposedSignalLabel: 'NEW BIZ',
  proposedVerticalFitLabel: 'New Office',
  proposedFreshnessLabel: 'Just now',
  proposedSurface: 'default',
  evidenceSummary:
    'New commercial office listing includes public business identity and location evidence.',
  evidenceSourceUrls: ['https://directory.example.com/new-office-001'],
}

function inertPass(result: ClassificationResult): boolean {
  return (
    result.ok === true &&
    result.confidenceAllowed === true &&
    result.createdOpportunity === false &&
    result.createdScore === false &&
    result.outreachDrafted === false &&
    result.providerCalls === 0 &&
    result.dbWrites === 0
  )
}

const approvedBuildoutResult = classifyCommercialCleaningSignal(
  approvedBuildoutInput,
)
const approvedNewBusinessResult = classifyCommercialCleaningSignal(
  approvedNewBusinessInput,
)
const freestyleSignalLabelResult = classifyCommercialCleaningSignal({
  ...approvedNewBusinessInput,
  proposedSignalLabel: 'Sparkly AI Office Lead',
})
const freestyleVerticalFitLabelResult = classifyCommercialCleaningSignal({
  ...approvedNewBusinessInput,
  proposedVerticalFitLabel: 'Perfect Cleaning Buyer',
})
const unapprovedFallbackResult = classifyCommercialCleaningSignal({
  ...approvedNewBusinessInput,
  proposedFallbackState: 'almost_ready',
})
const urgentSurfaceWithoutEvidenceResult = classifyCommercialCleaningSignal({
  ...approvedBuildoutInput,
  evidenceSourceUrls: [],
  whyNowReasons: [],
})

const cases = {
  approvedBuildoutClassificationPasses:
    inertPass(approvedBuildoutResult) &&
    approvedBuildoutResult.signalLabel === 'BUILDOUT' &&
    approvedBuildoutResult.verticalFitLabel === 'Final Clean' &&
    approvedBuildoutResult.opportunitySurface === 'urgent_action',
  approvedNewBusinessClassificationPasses:
    inertPass(approvedNewBusinessResult) &&
    approvedNewBusinessResult.signalLabel === 'NEW BIZ' &&
    approvedNewBusinessResult.verticalFitLabel === 'New Office' &&
    approvedNewBusinessResult.opportunitySurface === 'default',
  freestyleSignalLabelBlocked:
    freestyleSignalLabelResult.ok === false &&
    freestyleSignalLabelResult.reasonCode === 'unapproved_signal_label',
  freestyleVerticalFitLabelBlocked:
    freestyleVerticalFitLabelResult.ok === false &&
    freestyleVerticalFitLabelResult.reasonCode ===
      'unapproved_vertical_fit_label',
  unapprovedFallbackBlocked:
    unapprovedFallbackResult.ok === false &&
    unapprovedFallbackResult.reasonCode === 'unapproved_fallback_state',
  urgentSurfaceWithoutEvidenceBlocked:
    urgentSurfaceWithoutEvidenceResult.ok === false &&
    urgentSurfaceWithoutEvidenceResult.reasonCode ===
      'urgent_surface_missing_action_evidence',
}

const proof: CommercialCleaningClassificationSmokeProof = {
  ok: Object.values(cases).every(Boolean),
  mode: 'commercial_cleaning_classification_smoke',
  cases,
  createdOpportunities: 0,
  createdScores: 0,
  createdOutreach: 0,
  providerCalls: 0,
  dbWrites: 0,
  routesChanged: 0,
  llmCalls: 0,
  classifierRuntimeCalls: 0,
  crmSyncs: 0,
  firecrawlWorkflowRuns: 0,
}

console.log(JSON.stringify(proof, null, 2))

if (!proof.ok) {
  process.exit(1)
}
