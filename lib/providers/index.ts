/**
 * CP4 — Provider contracts barrel (inert, compile-only).
 *
 * Re-exports the provider contract seams and their no-op skeletons. These are
 * type/contract surfaces only — they are NOT wired into the app runtime in this
 * checkpoint. Live SerpApi/Firecrawl behavior arrives in a later checkpoint.
 */

export type {
  ProviderName,
  ProviderRunId,
  QueryEngine,
  SignalType,
  FallbackState,
  RunTrigger,
  AgentError,
  BudgetEnvelope,
  LocationInput,
  ProviderResultMeta,
  ProviderResult,
} from './contracts'

export type {
  SearchTask,
  SearchHit,
  CandidateSignal,
  SearchDiscoverResult,
  SearchProvider,
} from './search-provider'

export type {
  EvidenceDocumentBase,
  EvidenceDocument,
  ScrapeUrlInput,
  MapDomainInput,
  BatchScrapeInput,
  ExtractInput,
  InteractInput,
  EvidenceDocResult,
  EvidenceUrlsResult,
  EvidenceDocsResult,
  EvidenceDataResult,
  EvidenceProvider,
} from './evidence-provider'

export { noopSearchProvider } from './noop-search-provider'
export { noopEvidenceProvider } from './noop-evidence-provider'
export { ArcGisFeatureProvider } from './structured/arcgis-feature-provider'

export {
  STRUCTURED_SOURCE_ADAPTER_CONCEPTS,
  STRUCTURED_SOURCE_CLASSES,
  STRUCTURED_PERMIT_EVIDENCE_FIELDS,
  STRUCTURED_PERMIT_EVIDENCE_SCHEMA_ID,
  STRUCTURED_SOURCE_PUBLIC_METADATA_FIELDS,
  createStructuredEvidenceFingerprint,
  createStructuredEvidenceArtifactKey,
  createStructuredPermitEvidenceRecord,
  createStructuredPermitEvidenceSnapshot,
  mapStructuredRecord,
  resolveStructuredSourceAvailability,
  selectStructuredPermitPublicMetadata,
} from './structured-source-provider'

export type {
  ApprovedStructuredEvidenceSnapshot,
  ArcGisStructuredSourceConfig,
  NoaaEventProvider,
  SamGovProvider,
  SourceAvailability,
  SourceCheckState,
  SourceTier,
  StructuredFieldMap,
  StructuredEvidenceScalar,
  StructuredPermitRecord,
  StructuredPermitEvidenceField,
  StructuredSourceClass,
  StructuredSourceConfig,
  StructuredSourceDefinition,
  StructuredSourceEvidenceRecord,
  StructuredSourceFailure,
  StructuredSourceFormat,
  StructuredSourcePlanItem,
  StructuredSourceProvider,
  StructuredSourcePublicMetadata,
  StructuredSourcePublicMetadataField,
  StructuredSourceRequest,
  StructuredSourceResult,
  StructuredSourceTerritory,
  StructuredSourceUsage,
  SocrataDatasetProvider,
  TdlrTabsProvider,
} from './structured-source-provider'
