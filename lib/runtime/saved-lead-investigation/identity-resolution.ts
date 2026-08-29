/**
 * CP26C.2A deterministic saved-lead identity resolution.
 *
 * Confidence values are policy constants, not model probabilities.
 */

import type {
  IdentityMatchKey,
  IdentityResolution,
  SavedLeadIdentity,
  StructuredSourceTerritory,
} from './contracts'

const LEGAL_SUFFIXES = new Set(['llc', 'ltd', 'limited', 'inc', 'incorporated', 'corp', 'corporation', 'company', 'co', 'pllc', 'lp', 'llp'])
const STREET_SUFFIXES: Readonly<Record<string, string>> = {
  avenue: 'ave',
  boulevard: 'blvd',
  circle: 'cir',
  court: 'ct',
  drive: 'dr',
  highway: 'hwy',
  lane: 'ln',
  parkway: 'pkwy',
  place: 'pl',
  road: 'rd',
  street: 'st',
  terrace: 'ter',
  trail: 'trl',
}
const COMMON_TWO_LABEL_PUBLIC_SUFFIXES = new Set(['co.uk', 'org.uk', 'com.au', 'net.au', 'org.au', 'co.nz', 'com.br', 'co.jp'])
const COMMON_CCTLD_SECOND_LEVEL_LABELS = new Set(['ac', 'co', 'com', 'edu', 'gov', 'mil', 'net', 'org'])
const SHARED_PRIVATE_SUFFIXES = new Set(['appspot.com', 'azurewebsites.net', 'bitbucket.io', 'blogspot.com', 'firebaseapp.com', 'fly.dev', 'github.io', 'gitlab.io', 'glitch.me', 'herokuapp.com', 'myshopify.com', 'netlify.app', 'notion.site', 'onrender.com', 'pages.dev', 'readthedocs.io', 'replit.app', 'replit.dev', 'surge.sh', 'vercel.app', 'webflow.io', 'weebly.com', 'wixsite.com', 'wordpress.com', 'workers.dev'])
const UNIT_MARKERS = new Set(['apt', 'apartment', 'ste', 'suite', 'unit'])
const EXACT_ANCHORS = ['domain', 'phone'] as const

function cleanTokens(value: string): string[] {
  return value.toLocaleLowerCase('en-US').replaceAll('&', ' and ')
    .replace(/[^a-z0-9]+/g, ' ').trim().split(/\s+/).filter(Boolean)
}

function sequenceIndex(tokens: readonly string[], sequence: readonly string[]): number {
  if (sequence.length === 0 || sequence.length > tokens.length) return -1
  for (let index = 0; index <= tokens.length - sequence.length; index += 1) {
    if (sequence.every((token, part) => tokens[index + part] === token)) return index
  }
  return -1
}

export function normalizeDomain(value: string | null | undefined): string {
  const trimmed = value?.trim().toLocaleLowerCase('en-US') ?? ''
  if (!trimmed) return ''
  try {
    const url = new URL(/^[a-z][a-z0-9+.-]*:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`)
    return registrableHostname(url.hostname.replace(/^www\./, '').replace(/\.$/, ''))
  } catch {
    return registrableHostname(trimmed.replace(/^[a-z][a-z0-9+.-]*:\/\//i, '')
      .split(/[/?#]/, 1)[0]?.replace(/^www\./, '').replace(/\.$/, '') ?? '')
  }
}

function registrableHostname(hostname: string): string {
  const labels = hostname.split('.').filter(Boolean)
  if (labels.length <= 2) return labels.join('.')
  const lastTwo = labels.slice(-2).join('.')
  const topLevel = labels.at(-1) ?? ''
  const secondLevel = labels.at(-2) ?? ''
  const cctldSuffix =
    topLevel.length === 2 && COMMON_CCTLD_SECOND_LEVEL_LABELS.has(secondLevel)
  return SHARED_PRIVATE_SUFFIXES.has(lastTwo) ||
    COMMON_TWO_LABEL_PUBLIC_SUFFIXES.has(lastTwo) ||
    cctldSuffix
    ? labels.slice(-3).join('.')
    : lastTwo
}

export function normalizePhone(
  value: string | null | undefined,
  countryCode?: string | null,
): string {
  const raw = value?.trim() ?? ''
  if (!raw) return ''
  const hasInternationalPrefix = raw.startsWith('+')
  const digits = raw.replace(/\D/g, '')
  if (hasInternationalPrefix && digits.length >= 8 && digits.length <= 15) return `+${digits}`
  if (countryCode?.toUpperCase() === 'US') {
    if (digits.length === 10) return `+1${digits}`
    if (digits.length === 11 && digits.startsWith('1')) return `+${digits}`
  }
  return digits
}

export function normalizeAddress(value: string | null | undefined): string {
  const compact = (value ?? '').replace(/\s+#\s*(?=[a-z0-9])/gi, ' unit ')
    .replace(/\b([nsew])\s*\.\s*([nsew])\s*\.?/gi, '$1$2')
  return cleanTokens(compact)
    .map((token) => STREET_SUFFIXES[token] ?? token)
    .map((token) => ({ northwest: 'nw', northeast: 'ne', southwest: 'sw', southeast: 'se' })[token] ?? token)
    .join(' ')
}

export interface NormalizedAddressParts {
  normalizedAddress: string
  addressWithoutUnit: string
  unit: string
}

interface LocationContext {
  city?: string | null
  state?: string | null
  postalCode?: string | null
}

export function normalizeAddressParts(
  value: string | null | undefined,
  location: LocationContext = {},
): NormalizedAddressParts {
  const normalizedAddress = normalizeAddress(value)
  const tokens = normalizedAddress.split(' ').filter(Boolean)
  const unitIndex = tokens.findIndex((token) => UNIT_MARKERS.has(token))
  if (unitIndex < 0) return { normalizedAddress, addressWithoutUnit: normalizedAddress, unit: '' }

  const afterUnit = tokens.slice(unitIndex + 1)
  const localityStarts = [location.city, location.state, location.postalCode]
    .map((part) => sequenceIndex(afterUnit, cleanTokens(part ?? '')))
    .filter((index) => index >= 0)
  const localityStart =
    localityStarts.length > 0 ? Math.min(...localityStarts) : afterUnit.length
  return {
    normalizedAddress,
    addressWithoutUnit: [...tokens.slice(0, unitIndex), ...afterUnit.slice(localityStart)].join(' '),
    unit: afterUnit.slice(0, localityStart).join(' '),
  }
}

export function normalizeName(value: string | null | undefined): string {
  const tokens = cleanTokens(value ?? '')
  while (tokens.length > 0 && LEGAL_SUFFIXES.has(tokens[tokens.length - 1] ?? '')) tokens.pop()
  return tokens.join(' ')
}

export function normalizeLocality(
  city: string | null | undefined,
  state: string | null | undefined,
): string {
  return cleanTokens([city, state].filter(Boolean).join(' ')).join(' ')
}

function exactMatch(left: string, right: string): boolean {
  return Boolean(left && right && left === right)
}

interface ResolveIdentityInput {
  persisted: SavedLeadIdentity
  candidate: SavedLeadIdentity
  evaluatedAt: string
}

interface IdentityComparison {
  matchedOn: IdentityMatchKey[]
  matchedAnchors: Array<'domain' | 'phone' | 'address'>
  conflicts: string[]
  nameMatches: boolean
  localityMatches: boolean
  addressUnitIncomplete: boolean
  addressUnitConflict: boolean
}

function compareIdentities(
  persisted: SavedLeadIdentity,
  candidate: SavedLeadIdentity,
): IdentityComparison {
  const persistedAddress = normalizeAddressParts(persisted.address, persisted)
  const candidateAddress = normalizeAddressParts(candidate.address, candidate)
  const persistedAnchors = {
    domain: normalizeDomain(persisted.domain),
    phone: normalizePhone(persisted.phone, persisted.countryCode),
    address: persistedAddress.addressWithoutUnit,
  }
  const candidateAnchors = {
    domain: normalizeDomain(candidate.domain),
    phone: normalizePhone(candidate.phone, candidate.countryCode ?? persisted.countryCode),
    address: candidateAddress.addressWithoutUnit,
  }
  const matchedAnchors: Array<'domain' | 'phone' | 'address'> =
    EXACT_ANCHORS.filter((key) => exactMatch(persistedAnchors[key], candidateAnchors[key]))
  const addressBaseMatches = exactMatch(persistedAnchors.address, candidateAnchors.address)
  const bothUnitsPresent = Boolean(persistedAddress.unit && candidateAddress.unit)
  if (addressBaseMatches && persistedAddress.unit === candidateAddress.unit && (bothUnitsPresent || (!persistedAddress.unit && !candidateAddress.unit))) {
    matchedAnchors.push('address')
  }
  const conflicts = EXACT_ANCHORS
    .filter((key) => Boolean(persistedAnchors[key] && candidateAnchors[key] && persistedAnchors[key] !== candidateAnchors[key]))
    .map((key) => `${key}_conflict`)
  if (persistedAnchors.address && candidateAnchors.address && persistedAnchors.address !== candidateAnchors.address) conflicts.push('address_conflict')
  const addressUnitConflict = addressBaseMatches && bothUnitsPresent && persistedAddress.unit !== candidateAddress.unit
  if (addressUnitConflict) conflicts.push('address_unit_conflict')
  const nameMatches = exactMatch(normalizeName(persisted.name), normalizeName(candidate.name))
  const localityMatches = exactMatch(
    normalizeLocality(persisted.city, persisted.state),
    normalizeLocality(candidate.city, candidate.state),
  )
  return {
    matchedAnchors,
    matchedOn: [...matchedAnchors, ...(nameMatches ? ['name' as const] : []), ...(localityMatches ? ['locality' as const] : [])],
    conflicts,
    nameMatches,
    localityMatches,
    addressUnitIncomplete: addressBaseMatches && !bothUnitsPresent && persistedAddress.unit !== candidateAddress.unit,
    addressUnitConflict,
  }
}

function resolution(
  comparison: IdentityComparison,
  evaluatedAt: string,
): IdentityResolution {
  const { matchedAnchors, matchedOn, conflicts, nameMatches, localityMatches } = comparison
  const reason = (state: IdentityResolution['state'], confidence: number, reasonCodes: string[]): IdentityResolution => ({
    state,
    confidence,
    matchedOn,
    conflicts: state === 'ambiguous' ? conflicts : [],
    reasonCodes,
    evaluatedAt,
  })
  if (conflicts.length > 0) {
    return reason('ambiguous', Math.min(0.87, matchedAnchors.length >= 2 ? 0.87 : 0.72), [
      comparison.addressUnitConflict ? 'conflicting_address_unit' : 'conflicting_exact_identity_anchor',
      ...conflicts,
    ])
  }
  if (matchedAnchors.length >= 2) return reason('resolved', 0.99, ['two_exact_identity_anchors'])
  if (matchedAnchors.includes('domain') && (nameMatches || localityMatches)) return reason('resolved', 0.95, ['exact_domain_with_corroboration'])
  if (matchedAnchors.includes('phone') && nameMatches && localityMatches) return reason('resolved', 0.92, ['exact_phone_name_locality'])
  if (matchedAnchors.includes('domain')) return reason('resolved', 0.9, ['exact_persisted_domain'])
  if (comparison.addressUnitIncomplete) return reason('ambiguous', nameMatches && localityMatches ? 0.8 : 0.68, ['address_unit_incomplete'])
  if (matchedAnchors.includes('address') && nameMatches && localityMatches) return reason('resolved', 0.88, ['exact_address_name_locality'])
  if (matchedAnchors.length > 0 || (nameMatches && localityMatches)) {
    return reason('ambiguous', nameMatches && localityMatches ? 0.75 : 0.7, [
      nameMatches && localityMatches ? 'name_locality_only' : 'exact_anchor_needs_corroboration',
    ])
  }
  return reason('unresolved', 0.25, ['insufficient_identity_evidence'])
}

export function resolveIdentity({
  persisted,
  candidate,
  evaluatedAt,
}: ResolveIdentityInput): IdentityResolution {
  return resolution(compareIdentities(persisted, candidate), evaluatedAt)
}

interface PermitIdentityInput {
  persisted: SavedLeadIdentity
  permit: {
    calculatedAddress: string | null
    freeFormAddress: string | null
    owner: string | null
    applicant: string | null
    contractor: string | null
  }
  territory: StructuredSourceTerritory
  evaluatedAt: string
}

export interface PermitIdentityResolution {
  identity: IdentityResolution
  addressAnchored: boolean
}

interface NormalizedStreetIdentity {
  streetNumber: string
  streetName: string
}

function normalizedStreetIdentity(
  normalizedAddress: string,
  location: LocationContext,
): NormalizedStreetIdentity {
  let tokens = normalizedAddress.split(' ').filter(Boolean)
  const unitIndex = tokens.findIndex((token) => UNIT_MARKERS.has(token))
  if (unitIndex >= 0) tokens = tokens.slice(0, unitIndex)
  const streetNumber = /^\d+[a-z]?$/.test(tokens[0] ?? '') ? (tokens[0] ?? '') : ''
  if (!streetNumber) return { streetNumber: '', streetName: '' }
  const streetTokens = tokens.slice(1)
  const starts = [location.city, location.state, location.postalCode]
    .map((part) => sequenceIndex(streetTokens, cleanTokens(part ?? '')))
    .filter((index) => index >= 0)
  const locationStart = starts.length > 0 ? Math.min(...starts) : streetTokens.length
  return { streetNumber, streetName: streetTokens.slice(0, locationStart).join(' ') }
}

function emptyPermitIdentity(
  evaluatedAt: string,
  state: IdentityResolution['state'],
  confidence: number,
  reasonCodes: string[],
  matchedOn: IdentityMatchKey[] = [],
  conflicts: string[] = [],
): PermitIdentityResolution {
  return {
    addressAnchored: false,
    identity: { state, confidence, matchedOn, conflicts, reasonCodes, evaluatedAt },
  }
}

function permitAddressCandidates(permit: PermitIdentityInput['permit']) {
  return [
    permit.calculatedAddress?.trim() ? { kind: 'calculated' as const, value: permit.calculatedAddress.trim() } : null,
    permit.freeFormAddress?.trim() ? { kind: 'free_form' as const, value: permit.freeFormAddress.trim() } : null,
  ].filter((candidate): candidate is { kind: 'calculated' | 'free_form'; value: string } => candidate !== null)
}

export function resolvePermitIdentity({
  persisted,
  permit,
  territory,
  evaluatedAt,
}: PermitIdentityInput): PermitIdentityResolution {
  const persistedStreet = normalizedStreetIdentity(normalizeAddress(persisted.address), persisted)
  const candidates = permitAddressCandidates(permit)
  if (!persistedStreet.streetNumber || !persistedStreet.streetName || candidates.length === 0) {
    return emptyPermitIdentity(evaluatedAt, 'unresolved', 0.2, ['permit_address_anchor_required'])
  }
  const evaluated = candidates.map((candidate) => ({
    candidate,
    street: normalizedStreetIdentity(normalizeAddress(candidate.value), {
      city: territory.city,
      state: territory.state,
      postalCode: persisted.postalCode,
    }),
  }))
  const numberConflict = evaluated.some(({ street }) => street.streetNumber && street.streetNumber !== persistedStreet.streetNumber)
  const nameConflict = evaluated.some(({ street }) => street.streetNumber === persistedStreet.streetNumber && street.streetName && street.streetName !== persistedStreet.streetName)
  const matched = evaluated.find(({ street }) => street.streetNumber === persistedStreet.streetNumber && street.streetName === persistedStreet.streetName)?.candidate ?? null
  if (numberConflict || nameConflict) {
    return emptyPermitIdentity(
      evaluatedAt,
      'ambiguous',
      0.6,
      [numberConflict ? 'permit_street_number_conflict' : 'permit_street_name_conflict'],
      matched ? ['address'] : [],
      ['address_conflict'],
    )
  }
  if (!matched) return emptyPermitIdentity(evaluatedAt, 'ambiguous', 0.65, ['permit_address_incomplete_corroboration'])

  const candidateNames = [permit.owner, permit.applicant, permit.contractor]
    .filter((value): value is string => Boolean(value))
  const nameMatches = candidateNames.some((name) => normalizeName(name) === normalizeName(persisted.name))
  const localityMatches =
    normalizeLocality(persisted.city, persisted.state) === normalizeLocality(territory.city, territory.state)
  const identity = resolveIdentity({
    persisted,
    candidate: {
      address: persisted.address,
      name: nameMatches ? persisted.name : candidateNames[0],
      city: territory.city,
      state: territory.state,
      countryCode: territory.country,
    },
    evaluatedAt,
  })
  return {
    addressAnchored: true,
    identity: {
      ...identity,
      reasonCodes: [...new Set([
        ...identity.reasonCodes,
        'permit_address_exact',
        matched.kind === 'calculated' ? 'permit_calculated_address_anchor' : 'permit_free_form_address_anchor',
        ...(identity.state === 'resolved' && nameMatches && localityMatches ? ['permit_name_locality_corroborated'] : []),
      ])],
    },
  }
}
