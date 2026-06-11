/**
 * CP14 - Prospect Pool export contract smoke proof.
 *
 * Shell-only deterministic proof. Validates Prospect Pool export readiness
 * without CSV generation, CRM sync, provider calls, DB writes, routes, UI,
 * outreach, billing, or opportunity creation.
 */

import {
  evaluateProspectPoolExport,
  type ProspectPoolExportCandidate,
  type ProspectPoolExportDecision,
} from '@/lib/prospect-export/prospect-pool-export-contract'

interface ProspectPoolExportContractSmokeProof {
  ok: boolean
  mode: 'prospect_pool_export_contract_smoke'
  cases: {
    validEvidenceBackedProspectExports: boolean
    exploratoryGenericContactRouteNeedsReview: boolean
    signalBackedOpportunityNotExportable: boolean
    missingEvidenceNotExportable: boolean
    unsupportedUrgencyNotExportable: boolean
    unsupportedDecisionMakerNotExportable: boolean
    missingNotOpportunityYetReasonNotExportable: boolean
    discardedFallbackNotExportable: boolean
  }
  createdOpportunities: 0
  generatedCsvFiles: 0
  sheetsSyncs: 0
  crmSyncs: 0
  providerCalls: 0
  dbWrites: 0
  routesChanged: 0
  outreachDrafts: 0
}

const validEvidenceBackedProspect: ProspectPoolExportCandidate = {
  leadKind: 'evidence_backed_prospect',
  prospectLabel: 'Medical Office',
  accountName: 'North Loop Wellness Suites',
  evidenceSummary:
    'North Loop Wellness Suites appears in a public office tenant directory with a listed suite location and commercial tenant category.',
  fitReasons: [
    'Office tenant profile matches commercial cleaning account criteria.',
    'Public directory evidence includes business identity and location context.',
  ],
  confidence: 0.86,
  contactRouteContext: {
    routeType: 'company_website',
    summary:
      'Company website and public tenant directory can support later contact-route research.',
    strength: 'strong',
    sourceUrls: [
      'https://directory.example.com/austin-office-tenants/north-loop-wellness-suites',
    ],
  },
  blockedClaims: [
    'No urgency claim without a fresh dated signal.',
    'No CRM opportunity stage for Prospect Pool rows.',
    'No unsourced decision-maker identity.',
  ],
  lineage: {
    sourceUrls: [
      'https://directory.example.com/austin-office-tenants/north-loop-wellness-suites',
    ],
    providerRunIds: ['fixture-cp14-directory-001'],
    sourceNames: ['Austin Office Tenant Directory'],
  },
  notOpportunityYetReason:
    'This account has fit evidence, but no fresh dated signal or why-now reason has been sourced.',
}

const exploratoryGenericContactRoute: ProspectPoolExportCandidate = {
  ...validEvidenceBackedProspect,
  leadKind: 'exploratory_prospect',
  prospectLabel: 'Property Manager',
  accountName: 'Cedar Park Retail Center',
  contactRouteContext: {
    routeType: 'generic_research_needed',
    summary: 'Research the property manager website for a public contact route.',
    strength: 'generic',
    sourceUrls: ['https://portfolio.example.net/properties/cedar-park-retail-center'],
  },
  lineage: {
    sourceUrls: ['https://portfolio.example.net/properties/cedar-park-retail-center'],
    providerRunIds: ['fixture-cp14-portfolio-001'],
    sourceNames: ['Example Property Manager Portfolio'],
  },
}

function inertExportDecision(result: ProspectPoolExportDecision): boolean {
  return (
    result.createdOpportunity === false &&
    result.opportunityUrgencyScore === null &&
    result.urgentActionSurface === null &&
    result.csvGenerated === false &&
    result.sheetsSynced === false &&
    result.crmSynced === false &&
    result.providerCalls === 0 &&
    result.dbWrites === 0 &&
    result.routesChanged === 0 &&
    result.outreachDrafted === false
  )
}

const validResult = evaluateProspectPoolExport(validEvidenceBackedProspect)
const exploratoryGenericContactRouteResult = evaluateProspectPoolExport(
  exploratoryGenericContactRoute,
)
const signalBackedOpportunityResult = evaluateProspectPoolExport({
  ...validEvidenceBackedProspect,
  leadKind: 'signal_backed_opportunity',
})
const missingEvidenceResult = evaluateProspectPoolExport({
  ...validEvidenceBackedProspect,
  evidenceSummary: '',
})
const unsupportedUrgencyResult = evaluateProspectPoolExport({
  ...validEvidenceBackedProspect,
  claims: {
    urgency: 'needs this week',
    needsThisWeek: true,
  },
})
const unsupportedDecisionMakerResult = evaluateProspectPoolExport({
  ...validEvidenceBackedProspect,
  claims: {
    decisionMakerIdentity: 'Office Manager',
    decisionMakerSourced: false,
  },
})
const missingNotOpportunityYetReasonResult = evaluateProspectPoolExport({
  ...validEvidenceBackedProspect,
  notOpportunityYetReason: '',
})
const discardedFallbackResult = evaluateProspectPoolExport({
  ...validEvidenceBackedProspect,
  fallbackState: 'discarded',
})

const cases = {
  validEvidenceBackedProspectExports:
    validResult.status === 'export_ready_prospect' &&
    validResult.requiredFieldsPresent === true &&
    validResult.exportFields?.lead_kind === 'evidence_backed_prospect' &&
    validResult.crmReadyMapping?.crm_object_intent === 'buyer_account_worklist' &&
    validResult.crmReadyMapping.opportunity_stage === null &&
    inertExportDecision(validResult),
  exploratoryGenericContactRouteNeedsReview:
    exploratoryGenericContactRouteResult.status === 'needs_review' &&
    exploratoryGenericContactRouteResult.blockReasons.includes(
      'weak_or_generic_contact_route',
    ) &&
    exploratoryGenericContactRouteResult.exportFields?.lead_kind ===
      'exploratory_prospect' &&
    inertExportDecision(exploratoryGenericContactRouteResult),
  signalBackedOpportunityNotExportable:
    signalBackedOpportunityResult.status === 'not_exportable' &&
    signalBackedOpportunityResult.blockReasons.includes(
      'signal_backed_opportunity_not_exportable',
    ) &&
    signalBackedOpportunityResult.exportFields === null &&
    inertExportDecision(signalBackedOpportunityResult),
  missingEvidenceNotExportable:
    missingEvidenceResult.status === 'not_exportable' &&
    missingEvidenceResult.blockReasons.includes('missing_evidence') &&
    missingEvidenceResult.exportFields === null,
  unsupportedUrgencyNotExportable:
    unsupportedUrgencyResult.status === 'not_exportable' &&
    unsupportedUrgencyResult.blockReasons.includes('unsupported_urgency_claim') &&
    unsupportedUrgencyResult.opportunityUrgencyScore === null,
  unsupportedDecisionMakerNotExportable:
    unsupportedDecisionMakerResult.status === 'not_exportable' &&
    unsupportedDecisionMakerResult.blockReasons.includes(
      'unsupported_decision_maker_claim',
    ),
  missingNotOpportunityYetReasonNotExportable:
    missingNotOpportunityYetReasonResult.status === 'not_exportable' &&
    missingNotOpportunityYetReasonResult.blockReasons.includes(
      'missing_not_opportunity_yet_reason',
    ),
  discardedFallbackNotExportable:
    discardedFallbackResult.status === 'not_exportable' &&
    discardedFallbackResult.blockReasons.includes('discarded_fallback'),
}

const proof: ProspectPoolExportContractSmokeProof = {
  ok: Object.values(cases).every(Boolean),
  mode: 'prospect_pool_export_contract_smoke',
  cases,
  createdOpportunities: 0,
  generatedCsvFiles: 0,
  sheetsSyncs: 0,
  crmSyncs: 0,
  providerCalls: 0,
  dbWrites: 0,
  routesChanged: 0,
  outreachDrafts: 0,
}

console.log(JSON.stringify(proof, null, 2))

if (!proof.ok) {
  process.exit(1)
}
