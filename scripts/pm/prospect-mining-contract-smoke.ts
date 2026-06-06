/**
 * CP8 - Prospect mining contract smoke proof.
 *
 * Shell-only deterministic proof. Builds fixtures in memory and validates the
 * prospect-mining contract without provider calls, DB writes, routes, scoring,
 * classification, outreach generation, CRM sync, or workflow runtime.
 */

import {
  validateProspectEvidencePacket,
  type ProspectEvidencePacket,
} from '@/lib/prospect-mining/contracts'

interface ProspectMiningContractSmokeProof {
  ok: boolean
  mode: 'prospect_mining_contract_smoke'
  cases: {
    validEvidenceBackedProspect: boolean
    missingSource: boolean
    missingAccessNotes: boolean
    urgencyLanguageBlocked: boolean
    opportunityFieldsBlocked: boolean
  }
  createdOpportunities: 0
  createdScores: 0
  createdOutreach: 0
  providerCalls: 0
  dbWrites: 0
  routesChanged: 0
  classifierRuns: 0
  crmSyncs: 0
  firecrawlWorkflowRuns: 0
}

const validProspect: ProspectEvidencePacket = {
  leadKind: 'evidence_backed_prospect',
  sourceType: 'directory',
  sourceUrl: 'https://directory.example.com/accounts/lumen-coworking',
  sourceName: 'Example commercial tenant directory',
  fetchedAt: '2026-06-05T00:00:00.000Z',
  accessNotes: 'Public directory listing was opened directly from the source URL.',
  businessName: 'Lumen Coworking',
  location: {
    address: '1100 Congress Ave',
    city: 'Austin',
    state: 'TX',
  },
  evidenceSummary:
    'Lumen Coworking is listed as a commercial tenant account with a public source record and verified business identity.',
  fitReasons: [
    'Commercial tenant profile matches the target account criteria.',
    'Public listing includes source evidence and location context.',
  ],
  contactRouteHints: ['Company website and public directory listing are available for later enrichment.'],
  rawProviderMetadata: { fixture: true },
}

const missingSource: ProspectEvidencePacket = {
  ...validProspect,
  sourceUrl: undefined,
  sourceName: undefined,
}

const missingAccessNotes: ProspectEvidencePacket = {
  ...validProspect,
  accessNotes: '',
}

const urgencyLanguage: ProspectEvidencePacket = {
  ...validProspect,
  evidenceSummary:
    'Lumen Coworking is a target account and needs this week outreach immediately.',
}

const opportunityFields = {
  ...validProspect,
  opportunityStatus: 'qualified_opportunity',
  whyNow: 'Urgent action window.',
} as ProspectEvidencePacket

const validResult = validateProspectEvidencePacket(validProspect)
const missingSourceResult = validateProspectEvidencePacket(missingSource)
const missingAccessNotesResult = validateProspectEvidencePacket(missingAccessNotes)
const urgencyLanguageResult = validateProspectEvidencePacket(urgencyLanguage)
const opportunityFieldsResult = validateProspectEvidencePacket(opportunityFields)

const cases = {
  validEvidenceBackedProspect:
    validResult.ok === true &&
    validResult.readyForProspectPool === true &&
    validResult.createdOpportunity === false &&
    validResult.opportunityStatus === null &&
    validResult.opportunityUrgencyScore === null &&
    validResult.coralUrgentSurface === false &&
    validResult.outreachDrafted === false &&
    validResult.crmSynced === false,
  missingSource:
    missingSourceResult.ok === false &&
    missingSourceResult.reasonCode === 'missing_source',
  missingAccessNotes:
    missingAccessNotesResult.ok === false &&
    missingAccessNotesResult.reasonCode === 'missing_access_notes',
  urgencyLanguageBlocked:
    urgencyLanguageResult.ok === false &&
    urgencyLanguageResult.reasonCode === 'blocked_urgency_language',
  opportunityFieldsBlocked:
    opportunityFieldsResult.ok === false &&
    opportunityFieldsResult.reasonCode === 'blocked_opportunity_field',
}

const proof: ProspectMiningContractSmokeProof = {
  ok: Object.values(cases).every(Boolean),
  mode: 'prospect_mining_contract_smoke',
  cases,
  createdOpportunities: 0,
  createdScores: 0,
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
