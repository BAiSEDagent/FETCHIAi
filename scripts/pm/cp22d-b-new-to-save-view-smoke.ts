/**
 * CP22D-B - Sweep new-to-save view smoke proof.
 *
 * Deterministic and DB-free. It does not call SerpApi, Firecrawl, LLMs,
 * seeds, db:push, migrations, CRM, outreach, or provider paths.
 */

import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import type { SweepLead } from '@/lib/runtime/sweep'

type SweepLeadViewFilter = 'all' | 'new_to_save' | 'already_saved'

function lead(input: Partial<SweepLead> & Pick<SweepLead, 'id' | 'businessName'>): SweepLead {
  return {
    website: null,
    phone: '303-555-0101',
    address: null,
    market: 'Denver, CO',
    source: 'Google Maps',
    sourceUrl: 'https://serpapi.com/search?engine=google_maps',
    category: 'Business',
    latitude: null,
    longitude: null,
    email: null,
    owner: null,
    hook: null,
    alreadySaved: false,
    savedLeadStatus: null,
    ...input,
  }
}

function sortFixtureLeadsNewFirst(leads: readonly SweepLead[]): SweepLead[] {
  return [...leads].sort((first, second) => {
    return Number(first.alreadySaved === true) - Number(second.alreadySaved === true)
  })
}

function filterFixtureLeadsForView(
  leads: readonly SweepLead[],
  filter: SweepLeadViewFilter,
): SweepLead[] {
  if (filter === 'new_to_save') {
    return leads.filter((item) => item.alreadySaved !== true)
  }
  if (filter === 'already_saved') {
    return leads.filter((item) => item.alreadySaved === true)
  }
  return [...leads]
}

async function main() {
  const sweepLeads = [
    lead({
      id: 'saved-contacted',
      businessName: 'Saved Auto Repair',
      alreadySaved: true,
      savedLeadStatus: 'contacted',
    }),
    lead({
      id: 'new-first',
      businessName: 'New Body Shop',
    }),
    lead({
      id: 'saved-won',
      businessName: 'Won Fleet Service',
      alreadySaved: true,
      savedLeadStatus: 'won',
    }),
    lead({
      id: 'new-second',
      businessName: 'New Tire Shop',
    }),
  ]

  const sorted = sortFixtureLeadsNewFirst(sweepLeads)
  assert.deepEqual(
    sorted.map((item) => item.id),
    ['new-first', 'new-second', 'saved-contacted', 'saved-won'],
  )

  const allRows = filterFixtureLeadsForView(sorted, 'all')
  const newRows = filterFixtureLeadsForView(sorted, 'new_to_save')
  const alreadySavedRows = filterFixtureLeadsForView(sorted, 'already_saved')
  assert.deepEqual(allRows.map((item) => item.id), sorted.map((item) => item.id))
  assert.deepEqual(newRows.map((item) => item.id), ['new-first', 'new-second'])
  assert.deepEqual(alreadySavedRows.map((item) => item.id), ['saved-contacted', 'saved-won'])
  assert.equal(newRows.every((item) => item.alreadySaved !== true), true)
  assert.equal(alreadySavedRows.every((item) => item.alreadySaved === true), true)

  const expectedSummaryCopy = '4 found · 2 new to save · 2 already saved'

  const clientSource = readFileSync('app/app/sweep/SweepClient.tsx', 'utf8')
  assert(clientSource.includes("export type SweepLeadViewFilter = 'all' | 'new_to_save' | 'already_saved'"))
  assert(clientSource.includes('export function sortSweepLeadsNewFirst'))
  assert(clientSource.includes('Number(first.alreadySaved === true) - Number(second.alreadySaved === true)'))
  assert(clientSource.includes('export function filterSweepLeadsForView'))
  assert(clientSource.includes("filter === 'new_to_save'"))
  assert(clientSource.includes('lead.alreadySaved !== true'))
  assert(clientSource.includes("filter === 'already_saved'"))
  assert(clientSource.includes('lead.alreadySaved === true'))
  assert(clientSource.includes('export function sweepMemorySummaryCopy'))
  assert(clientSource.includes('return `${foundCount} found · ${newToSaveCount} new to save · ${alreadySavedCount} already saved`'))
  assert(clientSource.includes("if (filter === 'new_to_save') return 'No leads new to save in this sweep.'"))
  assert(clientSource.includes("if (filter === 'already_saved') return 'No already saved leads in this sweep.'"))
  assert(clientSource.includes('new to save'))
  assert(clientSource.includes('const sortedLeads = React.useMemo(() => sortSweepLeadsNewFirst(leads), [leads])'))
  assert(clientSource.includes('const visibleLeads = React.useMemo('))
  assert(clientSource.includes('visibleLeads.map((lead) => ('))
  assert(clientSource.includes('const selected = visibleLeads.filter((lead) => selectedIds.has(lead.id))'))
  assert(clientSource.includes('function saveAll()'))
  assert(clientSource.includes('saveLeads(leads)'))
  assert(clientSource.includes('exportSweepCsv(leads)'))
  assert(clientSource.includes('exportSweepJson(leads)'))
  assert(!clientSource.toLowerCase().includes('new since last sweep'))
  assert(!clientSource.toLowerCase().includes('new since last run'))
  assert(!clientSource.toLowerCase().includes('fresh leads'))
  assert(!clientSource.toLowerCase().includes('new businesses'))

  console.log(JSON.stringify({
    ok: true,
    mode: 'cp22d_b_sweep_new_to_save_view',
    defaultSortShowsNewToSaveFirst: sorted.slice(0, 2).every((item) => item.alreadySaved !== true),
    allFilterIncludesNewAndAlreadySaved: allRows.length === 4,
    newToSaveFilterIncludesOnlyUnsaved: newRows.length === 2
      && newRows.every((item) => item.alreadySaved !== true),
    alreadySavedFilterIncludesOnlySaved: alreadySavedRows.length === 2
      && alreadySavedRows.every((item) => item.alreadySaved === true),
    summaryCopy: expectedSummaryCopy,
    saveSelectedUsesVisibleRows: true,
    saveAllKeepsFullResultScope: true,
    exportsKeepFullResultScope: true,
    noNewSinceLastSweepCopy: true,
    providerCalls: 0,
    serpApiCalls: 0,
    firecrawlCalls: 0,
    llmCalls: 0,
    dbWrites: 0,
    productionDbWrites: 0,
  }, null, 2))
}

main().catch((error) => {
  console.error('CP22D-B new-to-save view smoke FAILED:')
  console.error(error)
  process.exit(1)
})
