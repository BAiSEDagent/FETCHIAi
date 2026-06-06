import type { ProspectEvidencePacket } from './contracts'

const fetchedAt = '2026-06-06T00:00:00.000Z'

export const commercialCleaningDirectoryProspect: ProspectEvidencePacket = {
  leadKind: 'evidence_backed_prospect',
  sourceType: 'directory',
  sourceUrl: 'https://directory.example.com/austin-office-tenants/north-loop-wellness-suites',
  sourceName: 'Austin Office Tenant Directory',
  fetchedAt,
  accessNotes:
    'Public tenant directory page was opened directly from the listed source URL.',
  businessName: 'North Loop Wellness Suites',
  location: {
    address: '4100 North Loop Blvd',
    city: 'Austin',
    state: 'TX',
  },
  evidenceSummary:
    'North Loop Wellness Suites appears in a public office tenant directory with a listed suite location and commercial tenant category.',
  fitReasons: [
    'Office tenant profile matches commercial cleaning account criteria.',
    'Public directory evidence includes business identity and location context.',
    'Multi-tenant office setting can support later buyer-context enrichment.',
  ],
  contactRouteHints: [
    'Directory record and business website can support later contact-route research.',
  ],
  rawProviderMetadata: { fixture: 'commercial_cleaning_directory' },
}

export const commercialCleaningMapsListingProspect: ProspectEvidencePacket = {
  leadKind: 'evidence_backed_prospect',
  sourceType: 'maps_listing',
  sourceUrl: 'https://maps.example.org/listings/lumen-grove-coworking-austin',
  sourceName: 'Example Maps Listing',
  fetchedAt,
  accessNotes:
    'Public maps listing was opened from the fixture URL and reviewed as a source record.',
  businessName: 'Lumen Grove Coworking',
  location: {
    address: '1180 East 5th St',
    city: 'Austin',
    state: 'TX',
  },
  evidenceSummary:
    'Lumen Grove Coworking has a public maps listing with a business category, address, and customer-facing workplace footprint.',
  fitReasons: [
    'Coworking location aligns with recurring janitorial and shared-space cleaning account criteria.',
    'Maps listing provides public source evidence and location context.',
    'Business category supports later enrichment for facilities and operations contacts.',
  ],
  contactRouteHints: [
    'Maps profile and website link can support later contact-route research.',
  ],
  rawProviderMetadata: { fixture: 'commercial_cleaning_maps_listing' },
}

export const commercialCleaningCompanyWebsiteProspect: ProspectEvidencePacket = {
  leadKind: 'evidence_backed_prospect',
  sourceType: 'company_website',
  sourceUrl: 'https://company.example.com/locations/summit-yard-fitness-austin',
  sourceName: 'Summit Yard Fitness locations page',
  fetchedAt,
  accessNotes:
    'Public company locations page was opened directly from the fixture source URL.',
  businessName: 'Summit Yard Fitness',
  location: {
    address: '7301 Southwest Pkwy',
    city: 'Austin',
    state: 'TX',
  },
  evidenceSummary:
    'Summit Yard Fitness lists an Austin facility on its public locations page with customer-facing premises and local address details.',
  fitReasons: [
    'Fitness facility profile matches recurring cleaning account criteria.',
    'Company website evidence supports business identity, location, and facility context.',
    'Public website can support later enrichment of operations and member-services contact routes.',
  ],
  contactRouteHints: [
    'Company contact page and location page can support later route research.',
  ],
  rawProviderMetadata: { fixture: 'commercial_cleaning_company_website' },
}

export const commercialCleaningPropertyPortfolioProspect: ProspectEvidencePacket = {
  leadKind: 'exploratory_prospect',
  sourceType: 'property_portfolio',
  sourceUrl: 'https://portfolio.example.net/properties/cedar-park-retail-center',
  sourceName: 'Example Property Manager Portfolio',
  fetchedAt,
  accessNotes:
    'Public property portfolio page was opened directly and reviewed as a fixture source.',
  businessName: 'Cedar Park Retail Center',
  location: {
    address: '910 Discovery Blvd',
    city: 'Cedar Park',
    state: 'TX',
  },
  evidenceSummary:
    'Cedar Park Retail Center appears on a public property manager portfolio page with retail property identity and location details.',
  fitReasons: [
    'Retail center profile can match common-area and tenant-turn cleaning account criteria.',
    'Property portfolio evidence supports account identity and site context.',
    'Portfolio source can support later enrichment for property management contacts.',
  ],
  contactRouteHints: [
    'Property manager portfolio and leasing contact page can support later contact-route research.',
  ],
  rawProviderMetadata: { fixture: 'commercial_cleaning_property_portfolio' },
}

export const commercialCleaningUrgencyLanguageBlockedProspect: ProspectEvidencePacket = {
  ...commercialCleaningDirectoryProspect,
  evidenceSummary:
    'North Loop Wellness Suites is a target account and needs this week outreach immediately.',
}

export const commercialCleaningOpportunityFieldsBlockedProspect = {
  ...commercialCleaningMapsListingProspect,
  opportunityStatus: 'qualified_opportunity',
  whyNow: 'Urgent action window.',
} as ProspectEvidencePacket

export const commercialCleaningProspectFixturePack = {
  validProspects: [
    commercialCleaningDirectoryProspect,
    commercialCleaningMapsListingProspect,
    commercialCleaningCompanyWebsiteProspect,
    commercialCleaningPropertyPortfolioProspect,
  ],
  blockedProspects: {
    urgencyLanguage: commercialCleaningUrgencyLanguageBlockedProspect,
    opportunityFields: commercialCleaningOpportunityFieldsBlockedProspect,
  },
} as const
