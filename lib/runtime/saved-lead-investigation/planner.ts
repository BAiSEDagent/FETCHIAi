/**
 * CP26C.2A — deterministic, ceiling-aware investigation planner.
 *
 * This produces a complete plan before any paid execution. It never performs
 * transport and contains no city- or vertical-specific branching.
 */

import type { IdentityResolution } from './contracts'
import {
  resolveStructuredSourceAvailability,
  type StructuredSourceConfig,
  type StructuredSourceClass,
  type StructuredSourcePlanItem,
  type StructuredSourceTerritory,
} from '@/lib/providers/structured-source-provider'
import type { SavedLeadInvestigationPlaybook } from '@/lib/playbooks/saved-lead-investigation-registry'
import { SAVED_LEAD_INVESTIGATION_CEILINGS } from './budget'

export interface SavedLeadInvestigationPlan {
  structuredSources: SavedLeadStructuredSourcePlanItem[]
  structuredCalls: number
  inspectSavedDomain: boolean
  domainPageClasses: readonly string[]
  serpApi: {
    disambiguationCalls: number
    signalDiscoveryCalls: number
    signalDiscoveryCondition: 'always' | 'identity_resolved'
    signalDiscoveryFamilyIds: readonly string[]
    totalCalls: number
    candidatesPerCall: number
    totalCandidates: number
  }
  hydrationPages: number
  interpretationCalls: number
  totalProviderEquivalents: number
  categoryIdsPlanned: readonly string[]
}

export interface MissingStructuredSourcePlanItem {
  registrySourceKey: `unconfigured:${StructuredSourceClass}`
  labelKey: `unconfigured:${StructuredSourceClass}`
  format: null
  sourceClass: StructuredSourceClass
  tier: 1
  authority: null
  territories: string[]
  supportedVerticals: string[]
  supportedSignalFamilies: string[]
  limitations: string[]
  availability: 'unavailable'
  checkState: 'not_checked'
  fallbackReasonCode: 'structured_source_unavailable'
}

export type SavedLeadStructuredSourcePlanItem =
  | StructuredSourcePlanItem
  | MissingStructuredSourcePlanItem

/**
 * A "resolved" label alone is not sufficient to authorize signal discovery.
 * The runtime gate requires the same exact-anchor, conflict-free contract used
 * by evidence qualification.
 */
export function isStrictlyResolvedIdentity(
  identity: IdentityResolution,
): boolean {
  return (
    identity.state === 'resolved' &&
    identity.confidence >= 0.88 &&
    identity.conflicts.length === 0 &&
    identity.matchedOn.some(
      (key) => key === 'domain' || key === 'phone' || key === 'address',
    )
  )
}

export function canExecuteSignalDiscovery(
  plan: SavedLeadInvestigationPlan,
  currentIdentity: IdentityResolution,
): boolean {
  if (plan.serpApi.signalDiscoveryCalls === 0) return false
  // The plan's condition determines whether a discovery call was allocated;
  // the final pre-transport check always requires a strict current identity.
  return isStrictlyResolvedIdentity(currentIdentity)
}

interface BuildPlanInput {
  identity: IdentityResolution
  playbook: SavedLeadInvestigationPlaybook
  savedDomain: string | null
  territory: StructuredSourceTerritory
  structuredSources: readonly StructuredSourceConfig[]
}

function territoryKey(territory: StructuredSourceTerritory): string {
  return [
    territory.country,
    territory.state,
    territory.city,
    territory.jurisdictionLabel,
  ]
    .filter(Boolean)
    .join(':')
    .toLocaleLowerCase('en-US')
}

function toPlanItem(
  config: StructuredSourceConfig,
  territory: StructuredSourceTerritory,
): StructuredSourcePlanItem {
  const availability = resolveStructuredSourceAvailability(config, territory)
  return {
    registrySourceKey: config.registrySourceKey,
    labelKey: config.labelKey,
    format: config.format,
    sourceClass: config.sourceClass,
    tier: config.tier,
    authority: config.authority,
    territories: [territoryKey(config.territory)],
    supportedVerticals: [...config.supportedVerticals],
    supportedSignalFamilies: [...config.supportedSignalFamilies],
    limitations: [...config.limitations],
    availability,
    checkState: availability === 'available' ? 'planned' : 'not_checked',
    ...(availability === 'available'
      ? {}
      : { fallbackReasonCode: 'structured_source_unavailable' }),
  }
}

function missingSourceClassPlanItem(
  sourceClass: StructuredSourceClass,
  playbook: SavedLeadInvestigationPlaybook,
  territory: StructuredSourceTerritory,
): MissingStructuredSourcePlanItem {
  const registrySourceKey = `unconfigured:${sourceClass}` as const
  return {
    registrySourceKey,
    labelKey: registrySourceKey,
    format: null,
    sourceClass,
    tier: 1,
    authority: null,
    territories: [territoryKey(territory)],
    supportedVerticals: [playbook.id],
    supportedSignalFamilies: [],
    limitations: [],
    availability: 'unavailable',
    checkState: 'not_checked',
    fallbackReasonCode: 'structured_source_unavailable',
  }
}

function applicableStructuredSources({
  playbook,
  territory,
  structuredSources,
}: Pick<BuildPlanInput, 'playbook' | 'territory' | 'structuredSources'>): SavedLeadStructuredSourcePlanItem[] {
  const result: SavedLeadStructuredSourcePlanItem[] = []
  for (const sourceClass of playbook.structuredSourceClasses) {
    const configured = structuredSources.filter(
      (source) =>
        source.sourceClass === sourceClass &&
        source.supportedVerticals.includes(playbook.id) &&
        source.supportedSignalFamilies.some((familyId) =>
          playbook.approvedSignalFamilies.includes(familyId),
        ),
    )
    result.push(
      ...(configured.length === 0
        ? [missingSourceClassPlanItem(sourceClass, playbook, territory)]
        : configured.map((source) => toPlanItem(source, territory))),
    )
  }
  return result
}

function applyStructuredCallCeiling(
  sources: readonly SavedLeadStructuredSourcePlanItem[],
): {
  plannedSources: SavedLeadStructuredSourcePlanItem[]
  structuredCalls: number
} {
  let structuredCalls = 0
  return {
    plannedSources: sources.map((source) => {
      if (source.availability !== 'available') return source
      if (structuredCalls < SAVED_LEAD_INVESTIGATION_CEILINGS.structuredCalls) {
        structuredCalls += 1
        return source
      }
      return {
        ...source,
        checkState: 'skipped_budget' as const,
        fallbackReasonCode: 'structured_source_call_limit',
      }
    }),
    structuredCalls,
  }
}

function uncoveredSignalFamilies(
  sources: readonly SavedLeadStructuredSourcePlanItem[],
  playbook: SavedLeadInvestigationPlaybook,
): string[] {
  const covered = new Set(
    sources
      .filter((source) => source.checkState === 'planned')
      .flatMap((source) => source.supportedSignalFamilies)
      .filter((familyId) => playbook.approvedSignalFamilies.includes(familyId)),
  )
  return playbook.approvedSignalFamilies.filter((familyId) => !covered.has(familyId))
}

function serpPlan(
  identity: IdentityResolution,
  signalFamilyIds: readonly string[],
): SavedLeadInvestigationPlan['serpApi'] {
  const needsSignalDiscovery = signalFamilyIds.length > 0
  const state = isStrictlyResolvedIdentity(identity)
    ? 'resolved'
    : identity.state === 'unresolved'
      ? 'unresolved'
      : 'ambiguous'
  const disambiguationCalls = state === 'ambiguous' ? 2 : state === 'unresolved' ? 3 : 0
  const desiredSignalCalls = state === 'ambiguous'
    ? needsSignalDiscovery ? 2 : 0
    : needsSignalDiscovery ? 1 : 0
  const totalCalls = Math.min(
    disambiguationCalls + desiredSignalCalls,
    SAVED_LEAD_INVESTIGATION_CEILINGS.serpApiCalls,
  )
  const signalDiscoveryCalls = totalCalls - disambiguationCalls
  return {
    disambiguationCalls,
    signalDiscoveryCalls,
    signalDiscoveryCondition: state === 'resolved' ? 'always' : 'identity_resolved',
    signalDiscoveryFamilyIds: signalFamilyIds,
    totalCalls,
    candidatesPerCall: SAVED_LEAD_INVESTIGATION_CEILINGS.serpApiCandidatesPerCall,
    totalCandidates: Math.min(
      totalCalls * SAVED_LEAD_INVESTIGATION_CEILINGS.serpApiCandidatesPerCall,
      SAVED_LEAD_INVESTIGATION_CEILINGS.totalSerpApiCandidates,
    ),
  }
}

export function buildSavedLeadInvestigationPlan({
  identity,
  playbook,
  savedDomain,
  territory,
  structuredSources,
}: BuildPlanInput): SavedLeadInvestigationPlan {
  const structured = applyStructuredCallCeiling(
    applicableStructuredSources({ playbook, territory, structuredSources }),
  )
  const serpApi = serpPlan(
    identity,
    uncoveredSignalFamilies(structured.plannedSources, playbook),
  )
  const hydrationPages = Math.min(
    savedDomain ? 3 : 2,
    SAVED_LEAD_INVESTIGATION_CEILINGS.hydrationPages,
  )
  const interpretationCalls =
    SAVED_LEAD_INVESTIGATION_CEILINGS.interpretationCalls
  const totalProviderEquivalents =
    structured.structuredCalls +
    serpApi.totalCalls +
    hydrationPages +
    interpretationCalls

  return {
    structuredSources: structured.plannedSources,
    structuredCalls: structured.structuredCalls,
    inspectSavedDomain: Boolean(savedDomain),
    domainPageClasses: savedDomain ? playbook.domainPageClasses : [],
    serpApi,
    hydrationPages,
    interpretationCalls,
    totalProviderEquivalents,
    categoryIdsPlanned: playbook.categoryIds,
  }
}
