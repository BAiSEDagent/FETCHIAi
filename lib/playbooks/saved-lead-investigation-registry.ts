/**
 * CP26C.2A — saved-lead investigation registry.
 *
 * Territory details live in source configuration. Vertical relevance lives in
 * playbooks. Neither concern is embedded in a transport adapter.
 */

import type {
  ArcGisStructuredSourceConfig,
  StructuredPermitRecord,
  StructuredSourceClass,
} from '@/lib/providers/structured-source-provider'

export type SavedLeadTriggerEvidenceRequirement =
  | 'resolved_exact_identity'
  | 'canonical_lineage'
  | 'dated_evidence'
  | 'exact_excerpt_or_structured_fields'
  | 'claim_guard'

export type SavedLeadTriggerQualificationRule =
  | 'record_family_approved'
  | 'record_keyword_match'
  | 'within_freshness_window'

export type SavedLeadTriggerDisqualificationRule =
  | 'identity_unresolved_or_ambiguous'
  | 'identity_conflict'
  | 'record_family_not_approved'
  | 'record_keyword_not_matched'
  | 'evidence_undated_or_stale'
  | 'canonical_lineage_missing'
  | 'claim_guard_failed'

/**
 * A renderer-neutral, deterministic trigger policy for one signal family.
 *
 * Source adapters normalize records; this policy decides whether the normalized
 * evidence is relevant to a vertical and for how long it may remain a trigger.
 */
export interface SavedLeadTriggerPolicy {
  signalFamilyId: string
  approvedSignalLabelIds: readonly string[]
  relevantRecordFamilies: readonly string[]
  recordKeywords: readonly string[]
  freshnessWindowHours: number
  evidenceRequirements: readonly SavedLeadTriggerEvidenceRequirement[]
  qualificationRules: readonly SavedLeadTriggerQualificationRule[]
  disqualificationRules: readonly SavedLeadTriggerDisqualificationRule[]
}

export interface SavedLeadInvestigationPlaybook {
  id:
    | 'commercial_roofing'
    | 'commercial_cleaning'
    | 'commercial_hvac_fixture'
  version: '1.0'
  active: boolean
  serviceProfileAliases: readonly string[]
  approvedSignalFamilies: readonly string[]
  approvedSignalLabels: readonly string[]
  structuredSourceClasses: readonly StructuredSourceClass[]
  domainPageClasses: readonly string[]
  indexedWebQueryTemplates: readonly string[]
  triggerPolicies: readonly SavedLeadTriggerPolicy[]
  categoryIds: readonly string[]
  signalFoundCooldownHours: number
  noSignalCooldownHours: number
  profileTtlDays: number
}

const REQUIRED_TRIGGER_EVIDENCE = [
  'resolved_exact_identity',
  'canonical_lineage',
  'dated_evidence',
  'exact_excerpt_or_structured_fields',
  'claim_guard',
] as const satisfies readonly SavedLeadTriggerEvidenceRequirement[]

const REQUIRED_TRIGGER_QUALIFICATION = [
  'record_family_approved',
  'record_keyword_match',
  'within_freshness_window',
] as const satisfies readonly SavedLeadTriggerQualificationRule[]

const REQUIRED_TRIGGER_DISQUALIFICATION = [
  'identity_unresolved_or_ambiguous',
  'identity_conflict',
  'record_family_not_approved',
  'record_keyword_not_matched',
  'evidence_undated_or_stale',
  'canonical_lineage_missing',
  'claim_guard_failed',
] as const satisfies readonly SavedLeadTriggerDisqualificationRule[]

function triggerPolicy(
  input: Pick<
    SavedLeadTriggerPolicy,
    | 'signalFamilyId'
    | 'approvedSignalLabelIds'
    | 'relevantRecordFamilies'
    | 'recordKeywords'
    | 'freshnessWindowHours'
  >,
): SavedLeadTriggerPolicy {
  return {
    ...input,
    evidenceRequirements: REQUIRED_TRIGGER_EVIDENCE,
    qualificationRules: REQUIRED_TRIGGER_QUALIFICATION,
    disqualificationRules: REQUIRED_TRIGGER_DISQUALIFICATION,
  }
}

const permitFieldMap: ArcGisStructuredSourceConfig<StructuredPermitRecord>['fieldMap'] = {
  permitNumber: 'PERMIT_NUMBER',
  issuedAt: 'ISSUED_DATE',
  enteredAt: 'ENTERED_DATE',
  calculatedAddress: 'CALCULATED_ADDRESS',
  freeFormAddress: 'ADDRESS',
  recordCategory: 'RECORD_CATEGORY',
  typeOfWork: 'TYPE_OF_WORK',
  structureType: 'STRUCTURE_TYPE',
  workDescription: 'WORK_DESCRIPTION',
  valuation: 'VALUATION',
  squareFootage: 'SQUARE_FOOTAGE',
  numberOfUnits: 'NUMBER_OF_UNITS',
  owner: 'OWNER_NAME',
  applicant: 'APPLICANT_NAME',
  contractor: 'CONTRACTOR_NAME',
  stableExternalId: 'OBJECTID',
}

export const ALBUQUERQUE_BUILDING_PERMITS: ArcGisStructuredSourceConfig<StructuredPermitRecord> = {
  registrySourceKey: 'albuquerque_city_building_permits',
  labelKey: 'albuquerque_building_permits',
  format: 'arcgis_feature_service',
  tier: 1,
  availability: 'live',
  territory: {
    country: 'US',
    state: 'NM',
    city: 'Albuquerque',
    jurisdictionLabel: 'City of Albuquerque',
  },
  sourceClass: 'building_and_trade_permits',
  authority: 'City of Albuquerque Planning Department',
  serviceUrl:
    'https://coageo.cabq.gov/cabqgeo/rest/services/agis/City_Building_Permits/FeatureServer/0',
  layerId: 0,
  supportedVerticals: ['commercial_roofing', 'commercial_cleaning'],
  supportedSignalFamilies: ['building_permit'],
  identityFields: {
    address: ['CALCULATED_ADDRESS', 'ADDRESS'],
    name: ['OWNER_NAME', 'APPLICANT_NAME', 'CONTRACTOR_NAME'],
    locality: ['CALCULATED_ADDRESS'],
  },
  externalIdFields: ['OBJECTID', 'PERMIT_NUMBER'],
  dateFields: ['ISSUED_DATE', 'ENTERED_DATE'],
  outFields: [...new Set(Object.values(permitFieldMap).flat())],
  fieldMap: permitFieldMap,
  limitations: [
    'Coverage is limited to permits within Albuquerque municipal jurisdiction.',
    'The source does not cover Bernalillo County outside Albuquerque, Rio Rancho, Santa Fe, Dallas, Austin, or statewide New Mexico.',
    'Absence from the municipal dataset does not prove that no permit exists.',
  ],
}

export const FIXTURE_SECOND_ARCGIS_SOURCE: ArcGisStructuredSourceConfig<StructuredPermitRecord> = {
  registrySourceKey: 'fixture_city_trade_permits',
  labelKey: 'fixture_city_trade_permits',
  format: 'arcgis_feature_service',
  tier: 1,
  availability: 'fixture_only',
  territory: {
    country: 'US',
    state: 'CO',
    city: 'Fixture City',
    jurisdictionLabel: 'Fixture City',
  },
  sourceClass: 'building_and_trade_permits',
  authority: 'Fixture City Building Department',
  serviceUrl:
    'https://fixtures.invalid/arcgis/rest/services/Trade_Permits/FeatureServer',
  layerId: 7,
  supportedVerticals: ['commercial_hvac_fixture'],
  supportedSignalFamilies: ['building_permit'],
  identityFields: {
    address: ['site_address'],
    name: ['owner_name'],
    locality: ['site_address'],
  },
  externalIdFields: ['fixture_object_id', 'case_no'],
  dateFields: ['issued_on', 'entered_on'],
  outFields: [
    'case_no',
    'issued_on',
    'entered_on',
    'site_address',
    'record_category',
    'work_kind',
    'structure_type',
    'project_text',
    'declared_value',
    'floor_area',
    'unit_count',
    'owner_name',
    'applicant_name',
    'contractor_name',
    'fixture_object_id',
  ],
  fieldMap: {
    permitNumber: 'case_no',
    issuedAt: 'issued_on',
    enteredAt: 'entered_on',
    calculatedAddress: 'site_address',
    freeFormAddress: 'site_address',
    recordCategory: 'record_category',
    typeOfWork: 'work_kind',
    structureType: 'structure_type',
    workDescription: 'project_text',
    valuation: 'declared_value',
    squareFootage: 'floor_area',
    numberOfUnits: 'unit_count',
    owner: 'owner_name',
    applicant: 'applicant_name',
    contractor: 'contractor_name',
    stableExternalId: 'fixture_object_id',
  },
  limitations: [
    'Fixture-only source for deterministic contract testing.',
    'This definition does not represent production coverage.',
  ],
}

export const SAVED_LEAD_INVESTIGATION_PLAYBOOKS: readonly SavedLeadInvestigationPlaybook[] = [
  {
    id: 'commercial_cleaning',
    version: '1.0',
    active: true,
    serviceProfileAliases: ['commercial_cleaning', 'cleaning'],
    approvedSignalFamilies: ['building_permit', 'business_registration'],
    approvedSignalLabels: [
      'cleaning_buildout_activity',
      'business_registration_activity',
    ],
    structuredSourceClasses: [
      'building_and_trade_permits',
      'business_licenses_and_registrations',
    ],
    domainPageClasses: ['locations', 'projects', 'careers', 'news'],
    indexedWebQueryTemplates: ['new location', 'tenant improvement', 'buildout'],
    triggerPolicies: [
      triggerPolicy({
        signalFamilyId: 'building_permit',
        approvedSignalLabelIds: ['cleaning_buildout_activity'],
        relevantRecordFamilies: ['building_permit'],
        recordKeywords: [
          'tenant improvement',
          'new construction',
          'new commercial',
          'addition',
          'shell building',
          'buildout',
          'final clean',
        ],
        freshnessWindowHours: 30 * 24,
      }),
      triggerPolicy({
        signalFamilyId: 'business_registration',
        approvedSignalLabelIds: ['business_registration_activity'],
        relevantRecordFamilies: ['business_registration'],
        recordKeywords: [
          'business registration',
          'business license',
          'new business',
          'new location',
        ],
        freshnessWindowHours: 30 * 24,
      }),
    ],
    categoryIds: ['building_permits', 'business_registrations', 'entity_domain'],
    signalFoundCooldownHours: 24,
    noSignalCooldownHours: 168,
    profileTtlDays: 30,
  },
  {
    id: 'commercial_roofing',
    version: '1.0',
    active: true,
    serviceProfileAliases: ['commercial_roofing', 'roofing'],
    approvedSignalFamilies: ['building_permit', 'storm_event'],
    approvedSignalLabels: [
      'roofing_permit_activity',
      'official_storm_event',
    ],
    structuredSourceClasses: [
      'building_and_trade_permits',
      'property_assessor_and_sales',
      'official_storm_and_hail_events',
    ],
    domainPageClasses: ['locations', 'projects', 'news'],
    indexedWebQueryTemplates: ['reroof', 'roof repair', 'roof restoration'],
    triggerPolicies: [
      triggerPolicy({
        signalFamilyId: 'building_permit',
        approvedSignalLabelIds: ['roofing_permit_activity'],
        relevantRecordFamilies: ['building_permit'],
        recordKeywords: [
          'reroof',
          're-roof',
          'roof repair',
          'roof restoration',
        ],
        freshnessWindowHours: 30 * 24,
      }),
      triggerPolicy({
        signalFamilyId: 'storm_event',
        approvedSignalLabelIds: ['official_storm_event'],
        relevantRecordFamilies: ['official_storm_event'],
        recordKeywords: ['hail', 'severe storm', 'wind event'],
        freshnessWindowHours: 7 * 24,
      }),
    ],
    categoryIds: ['building_permits', 'property_records', 'official_storm_events', 'entity_domain'],
    signalFoundCooldownHours: 24,
    noSignalCooldownHours: 72,
    profileTtlDays: 30,
  },
  {
    id: 'commercial_hvac_fixture',
    version: '1.0',
    active: false,
    serviceProfileAliases: ['commercial_hvac_fixture'],
    approvedSignalFamilies: ['building_permit'],
    approvedSignalLabels: ['hvac_permit_activity'],
    structuredSourceClasses: ['building_and_trade_permits'],
    domainPageClasses: ['locations', 'projects'],
    indexedWebQueryTemplates: ['mechanical permit', 'HVAC equipment', 'RTU replacement'],
    triggerPolicies: [
      triggerPolicy({
        signalFamilyId: 'building_permit',
        approvedSignalLabelIds: ['hvac_permit_activity'],
        relevantRecordFamilies: ['building_permit'],
        recordKeywords: [
          'mechanical permit',
          'hvac equipment',
          'hvac replacement',
          'rtu replacement',
        ],
        freshnessWindowHours: 30 * 24,
      }),
    ],
    categoryIds: ['building_permits', 'entity_domain'],
    signalFoundCooldownHours: 24,
    noSignalCooldownHours: 72,
    profileTtlDays: 30,
  },
] as const

export function resolveSavedLeadInvestigationPlaybook(
  idOrAlias: string,
): SavedLeadInvestigationPlaybook | null {
  const normalized = idOrAlias.trim().toLocaleLowerCase('en-US')
  return (
    SAVED_LEAD_INVESTIGATION_PLAYBOOKS.find(
      (playbook) =>
        playbook.id === normalized ||
        playbook.serviceProfileAliases.includes(normalized),
    ) ?? null
  )
}

function searchablePermitText(record: StructuredPermitRecord): string {
  return [
    record.recordCategory,
    record.typeOfWork,
    record.structureType,
    record.workDescription,
  ]
    .filter((value): value is string => Boolean(value))
    .join(' ')
    .toLocaleLowerCase('en-US')
}

export function filterPermitRecordsForPlaybook(
  records: readonly StructuredPermitRecord[],
  playbook: SavedLeadInvestigationPlaybook,
): StructuredPermitRecord[] {
  const permitKeywords = playbook.triggerPolicies
    .filter((policy) =>
      policy.relevantRecordFamilies.includes('building_permit'),
    )
    .flatMap((policy) => policy.recordKeywords)

  return records.filter((record) => {
    const searchable = searchablePermitText(record)
    return permitKeywords.some((keyword) =>
      searchable.includes(keyword.toLocaleLowerCase('en-US')),
    )
  })
}
