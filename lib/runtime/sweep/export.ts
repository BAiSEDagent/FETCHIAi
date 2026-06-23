import type { SweepLead } from './types'

const EXPORT_FIELDS = [
  'business',
  'website',
  'phone',
  'address',
  'market',
  'source',
  'email',
  'owner',
  'hook',
] as const

function csvCell(value: string | null): string {
  const text = value ?? ''
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
      email: lead.email,
      owner: lead.owner,
      hook: lead.hook,
    })),
    null,
    2,
  )
}
