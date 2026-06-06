/**
 * CP9 - Prospect mining fixture smoke proof.
 *
 * Shell-only deterministic fixture proof. Validates commercial-cleaning
 * Prospect Pool fixtures without provider calls, DB writes, routes, scoring,
 * classification, outreach generation, CRM sync, export, or workflow runtime.
 */

import {
  commercialCleaningCompanyWebsiteProspect,
  commercialCleaningDirectoryProspect,
  commercialCleaningMapsListingProspect,
  commercialCleaningOpportunityFieldsBlockedProspect,
  commercialCleaningPropertyPortfolioProspect,
  commercialCleaningProspectFixturePack,
  commercialCleaningUrgencyLanguageBlockedProspect,
} from '@/lib/prospect-mining/fixtures'
import { validateProspectEvidencePacket } from '@/lib/prospect-mining/contracts'

interface ProspectMiningFixtureSmokeProof {
  ok: boolean
  mode: 'prospect_mining_fixture_smoke'
  cases: {
    directoryProspectPasses: boolean
    mapsListingProspectPasses: boolean
    companyWebsiteProspectPasses: boolean
    propertyPortfolioProspectPasses: boolean
    urgencyLanguageBlocked: boolean
    opportunityFieldsBlocked: boolean
  }
  validProspectCount: number
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

function passesProspectPoolContract(
  packet: (typeof commercialCleaningProspectFixturePack.validProspects)[number],
): boolean {
  const result = validateProspectEvidencePacket(packet)

  return (
    result.ok === true &&
    result.readyForProspectPool === true &&
    result.createdOpportunity === false &&
    result.opportunityStatus === null &&
    result.opportunityUrgencyScore === null &&
    result.coralUrgentSurface === false &&
    result.outreachDrafted === false &&
    result.crmSynced === false
  )
}

const directoryResult = validateProspectEvidencePacket(
  commercialCleaningDirectoryProspect,
)
const mapsListingResult = validateProspectEvidencePacket(
  commercialCleaningMapsListingProspect,
)
const companyWebsiteResult = validateProspectEvidencePacket(
  commercialCleaningCompanyWebsiteProspect,
)
const propertyPortfolioResult = validateProspectEvidencePacket(
  commercialCleaningPropertyPortfolioProspect,
)
const urgencyLanguageResult = validateProspectEvidencePacket(
  commercialCleaningUrgencyLanguageBlockedProspect,
)
const opportunityFieldsResult = validateProspectEvidencePacket(
  commercialCleaningOpportunityFieldsBlockedProspect,
)

const cases = {
  directoryProspectPasses:
    directoryResult.ok === true &&
    passesProspectPoolContract(commercialCleaningDirectoryProspect),
  mapsListingProspectPasses:
    mapsListingResult.ok === true &&
    passesProspectPoolContract(commercialCleaningMapsListingProspect),
  companyWebsiteProspectPasses:
    companyWebsiteResult.ok === true &&
    passesProspectPoolContract(commercialCleaningCompanyWebsiteProspect),
  propertyPortfolioProspectPasses:
    propertyPortfolioResult.ok === true &&
    passesProspectPoolContract(commercialCleaningPropertyPortfolioProspect),
  urgencyLanguageBlocked:
    urgencyLanguageResult.ok === false &&
    urgencyLanguageResult.reasonCode === 'blocked_urgency_language',
  opportunityFieldsBlocked:
    opportunityFieldsResult.ok === false &&
    opportunityFieldsResult.reasonCode === 'blocked_opportunity_field',
}

const proof: ProspectMiningFixtureSmokeProof = {
  ok:
    Object.values(cases).every(Boolean) &&
    commercialCleaningProspectFixturePack.validProspects.length === 4,
  mode: 'prospect_mining_fixture_smoke',
  cases,
  validProspectCount: commercialCleaningProspectFixturePack.validProspects.length,
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
