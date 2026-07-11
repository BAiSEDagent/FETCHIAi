import type { SavedLeadPipelineRow } from '@/lib/runtime/sweep/saved-leads'

export type MapLifecycleStatus = SavedLeadPipelineRow['lifecycleStatus']

export type MappableSavedLead = SavedLeadPipelineRow & {
  latitude: number
  longitude: number
}

export type MapFilters = {
  lifecycleStatuses: MapLifecycleStatus[]
  requiresAddress: boolean
  requiresPhone: boolean
  requiresWebsite: boolean
}

export type LeadFeatureProperties = {
  id: string
  name: string
  initials: string
  lifecycleStatus: MapLifecycleStatus
  lifecycleLabel: string
  selected: boolean
}

export type LeadFeature = {
  type: 'Feature'
  id: string
  properties: LeadFeatureProperties
  geometry: {
    type: 'Point'
    coordinates: [number, number]
  }
}

export type LeadFeatureCollection = {
  type: 'FeatureCollection'
  features: LeadFeature[]
}

export const MAP_LIFECYCLE_STATUSES: MapLifecycleStatus[] = [
  'saved',
  'contacted',
  'won',
  'lost',
  'dismissed',
]

export const DEFAULT_MAP_FILTERS: MapFilters = {
  lifecycleStatuses: [...MAP_LIFECYCLE_STATUSES],
  requiresAddress: false,
  requiresPhone: false,
  requiresWebsite: false,
}

export const LIFECYCLE_LABELS: Record<MapLifecycleStatus, string> = {
  saved: 'Saved',
  contacted: 'Contacted',
  won: 'Won',
  lost: 'Lost',
  dismissed: 'Dismissed',
}

export const LIFECYCLE_PIN_CLASSES: Record<MapLifecycleStatus, string> = {
  saved: 'bg-warn text-bg',
  contacted: 'bg-blue text-bg',
  won: 'bg-ok text-bg',
  lost: 'bg-bad/70 text-bg',
  dismissed: 'bg-bad/55 text-bg',
}

export function isFiniteLatitude(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= -90 && value <= 90
}

export function isFiniteLongitude(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= -180 && value <= 180
}

export function isMappableSavedLead(lead: SavedLeadPipelineRow): lead is MappableSavedLead {
  return isFiniteLatitude(lead.latitude) && isFiniteLongitude(lead.longitude)
}

export function getMappableSavedLeads(leads: readonly SavedLeadPipelineRow[]): MappableSavedLead[] {
  return leads.filter(isMappableSavedLead)
}

export function hasText(value: string | null | undefined): boolean {
  return Boolean(value?.trim())
}

export function hasLeadAddress(lead: SavedLeadPipelineRow): boolean {
  return hasText(lead.address)
}

export function hasLeadPhone(lead: SavedLeadPipelineRow): boolean {
  return hasText(lead.phone)
}

export function leadWebsiteHref(lead: SavedLeadPipelineRow): string | null {
  const rawWebsite = lead.website?.trim()
  if (!rawWebsite) return null

  const normalized = /^[a-z][a-z0-9+.-]*:/i.test(rawWebsite)
    ? rawWebsite
    : `https://${rawWebsite}`

  try {
    const url = new URL(normalized)
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return null
    return url.toString()
  } catch {
    return null
  }
}

export function hasLeadWebsite(lead: SavedLeadPipelineRow): boolean {
  return leadWebsiteHref(lead) !== null
}

export function leadDirectionsHref(lead: SavedLeadPipelineRow): string | null {
  const address = lead.address?.trim()
  const query = address || (isMappableSavedLead(lead) ? `${lead.latitude},${lead.longitude}` : null)
  if (!query) return null
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`
}

export function leadInitials(lead: Pick<SavedLeadPipelineRow, 'businessName'>): string {
  const tokens = lead.businessName
    .trim()
    .match(/[a-z0-9]+/gi)

  if (!tokens?.length) return '?'
  if (tokens.length === 1) return tokens[0].slice(0, 2).toUpperCase()
  return `${tokens[0][0]}${tokens[1][0]}`.toUpperCase()
}

export function formatLeadDate(value: string | null): string {
  if (!value) return 'Not updated'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'Not updated'

  return new Intl.DateTimeFormat('en', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(date)
}

export function filterSavedLeadsForMap(
  leads: readonly MappableSavedLead[],
  filters: MapFilters,
  searchQuery: string,
): MappableSavedLead[] {
  const query = searchQuery.trim().toLowerCase()
  const lifecycleSet = new Set(filters.lifecycleStatuses)

  return leads.filter((lead) => {
    if (!lifecycleSet.has(lead.lifecycleStatus)) return false
    if (filters.requiresAddress && !hasLeadAddress(lead)) return false
    if (filters.requiresPhone && !hasLeadPhone(lead)) return false
    if (filters.requiresWebsite && !hasLeadWebsite(lead)) return false
    if (!query) return true

    return [
      lead.businessName,
      lead.address,
      lead.market,
      lead.category,
      lead.phone,
      lead.website,
    ].some((value) => value?.toLowerCase().includes(query))
  })
}

export function buildLeadFeatureCollection(
  leads: readonly MappableSavedLead[],
  selectedLeadId: string | null,
): LeadFeatureCollection {
  return {
    type: 'FeatureCollection',
    features: leads.map((lead) => ({
      type: 'Feature',
      id: lead.id,
      properties: {
        id: lead.id,
        name: lead.businessName,
        initials: leadInitials(lead),
        lifecycleStatus: lead.lifecycleStatus,
        lifecycleLabel: LIFECYCLE_LABELS[lead.lifecycleStatus],
        selected: lead.id === selectedLeadId,
      },
      geometry: {
        type: 'Point',
        coordinates: [lead.longitude, lead.latitude],
      },
    })),
  }
}
