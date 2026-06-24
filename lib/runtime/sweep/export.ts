import type { SweepLead } from './types'

const EXPORT_FIELDS = [
  'business',
  'website',
  'phone',
  'address',
  'market',
  'source',
  'latitude',
  'longitude',
  'email',
  'owner',
  'hook',
] as const

const SAVED_LEAD_EXPORT_FIELDS = [
  ...EXPORT_FIELDS,
  'status',
  'note',
] as const

export type SavedLeadPipelineExportRow = {
  businessName: string
  website: string | null
  phone: string
  address: string | null
  market: string | null
  source: string
  latitude: number | null
  longitude: number | null
  email: string | null
  owner: string | null
  hook: string | null
  lifecycleStatus: string
  note: string | null
}

function csvCell(value: string | number | null): string {
  const text = value === null ? '' : String(value)
  if (!/[",\n\r]/.test(text)) return text
  return `"${text.replace(/"/g, '""')}"`
}

export function exportSweepCsv(leads: readonly SweepLead[]): string {
  const rows = leads.map((lead) => [
    lead.businessName,
    lead.website,
    lead.phone,
    lead.address,
    lead.market,
    lead.source,
    lead.latitude,
    lead.longitude,
    lead.email,
    lead.owner,
    lead.hook,
  ].map(csvCell).join(','))

  return [EXPORT_FIELDS.join(','), ...rows].join('\n')
}

export function exportSweepJson(leads: readonly SweepLead[]): string {
  return JSON.stringify(
    leads.map((lead) => ({
      business: lead.businessName,
      website: lead.website,
      phone: lead.phone,
      address: lead.address,
      market: lead.market,
      source: lead.source,
      latitude: lead.latitude,
      longitude: lead.longitude,
      email: lead.email,
      owner: lead.owner,
      hook: lead.hook,
    })),
    null,
    2,
  )
}

export function exportSavedLeadsCsv(leads: readonly SavedLeadPipelineExportRow[]): string {
  const rows = leads.map((lead) => [
    lead.businessName,
    lead.website,
    lead.phone,
    lead.address,
    lead.market,
    lead.source,
    lead.latitude,
    lead.longitude,
    lead.email,
    lead.owner,
    lead.hook,
    lead.lifecycleStatus,
    lead.note,
  ].map(csvCell).join(','))

  return [SAVED_LEAD_EXPORT_FIELDS.join(','), ...rows].join('\n')
}

export function exportSavedLeadsJson(leads: readonly SavedLeadPipelineExportRow[]): string {
  return JSON.stringify(
    leads.map((lead) => ({
      business: lead.businessName,
      website: lead.website,
      phone: lead.phone,
      address: lead.address,
      market: lead.market,
      source: lead.source,
      latitude: lead.latitude,
      longitude: lead.longitude,
      email: lead.email,
      owner: lead.owner,
      hook: lead.hook,
      status: lead.lifecycleStatus,
      note: lead.note,
    })),
    null,
    2,
  )
}
