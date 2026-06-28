/**
 * CP22E-A - Sweep entry points and results surface smoke proof.
 *
 * Deterministic and DB-free. It does not call SerpApi, Firecrawl, LLMs,
 * seeds, db:push, migrations, CRM, outreach, Signal Watch, or provider paths.
 */

import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

function source(path: string): string {
  return readFileSync(path, 'utf8')
}

async function main() {
  const sidebarSource = source('components/app/Sidebar.tsx')
  const bottomNavSource = source('components/app/MobileBottomNav.tsx')
  const myLeadsSource = source('components/app/MyLeadsView.tsx')
  const sweepSource = source('app/app/sweep/SweepClient.tsx')

  const workspaceNavStart = sidebarSource.indexOf('const workspaceNav')
  const workspaceNavEnd = sidebarSource.indexOf('const settingsNav')
  const workspaceNavSource = sidebarSource.slice(workspaceNavStart, workspaceNavEnd)
  assert(workspaceNavSource.includes("{ href: '/app/sweep', label: 'Sweep'"))
  assert(workspaceNavSource.indexOf("href: '/app/sweep'") < workspaceNavSource.indexOf("href: '/app/chat'"))
  assert(workspaceNavSource.includes("href: '/app/leads'"))
  assert(workspaceNavSource.includes("href: '/app/map'"))

  assert(!bottomNavSource.includes("href: '/app/sweep'"))
  assert(bottomNavSource.includes("label: 'Chat'"))
  assert(bottomNavSource.includes("label: 'Today'"))
  assert(bottomNavSource.includes("label: 'Leads'"))
  assert(bottomNavSource.includes("label: 'Map'"))
  assert(bottomNavSource.includes("label: 'Settings'"))

  assert(myLeadsSource.includes("href=\"/app/sweep\""))
  assert(myLeadsSource.includes('Run a sweep'))
  assert(myLeadsSource.includes('Your pipeline is empty — run a sweep to fill it.'))

  assert(sweepSource.includes('Which business buyers should Fetchi search for?'))
  assert(sweepSource.includes('const compactStats = ['))
  assert(sweepSource.includes("label: 'New to save'"))
  assert(sweepSource.includes("label: 'Already saved'"))
  assert(sweepSource.includes('SWEEP_LEAD_VIEW_FILTERS.map((filter) => {'))
  assert(sweepSource.includes('Find emails'))
  assert(sweepSource.includes('Save selected'))
  assert(sweepSource.includes('Save all'))
  assert(sweepSource.includes('Results appear here with filters, save actions, and export controls after the sweep finishes.'))
  assert(sweepSource.includes('Contact routes'))
  assert(sweepSource.includes('const selected = visibleLeads.filter((lead) => selectedIds.has(lead.id))'))
  assert(sweepSource.includes('function saveAll()'))
  assert(sweepSource.includes('saveLeads(leads)'))
  assert(sweepSource.includes('exportSweepCsv(leads)'))
  assert(sweepSource.includes('exportSweepJson(leads)'))
  assert(!sweepSource.includes('Maps-first contact sweep'))
  assert(!sweepSource.includes('Fetchi fans out deterministic Maps searches'))

  const preRunEmptyState = sweepSource.slice(
    sweepSource.indexOf('!hasResults ? ('),
    sweepSource.indexOf(') : !hasVisibleResults ? ('),
  )
  assert(!preRunEmptyState.includes('Find emails'))
  assert(!preRunEmptyState.includes('Save selected'))
  assert(!preRunEmptyState.includes('Save all'))
  assert(!preRunEmptyState.includes('CSV'))
  assert(!preRunEmptyState.includes('JSON'))

  console.log(JSON.stringify({
    ok: true,
    mode: 'cp22e_a_sweep_entry_points_results_surface',
    myLeadsPrimarySweepCta: true,
    myLeadsEmptyStateSweepCta: true,
    workspaceNavSweepFirst: true,
    bottomNavUnchangedNoSweepTab: true,
    sweepPreRunHasNoOrphanedResultActions: true,
    sweepPostRunHasCompactStatsStrip: true,
    sweepResultsToolbarHasActions: true,
    cp22dBFiltersPreserved: true,
    alreadySavedBadgesPreserved: true,
    saveSelectedUsesVisibleRows: true,
    saveAllKeepsFullResultScope: true,
    exportsKeepFullResultScope: true,
    providerCalls: 0,
    serpApiCalls: 0,
    firecrawlCalls: 0,
    llmCalls: 0,
    dbWrites: 0,
    productionDbWrites: 0,
  }, null, 2))
}

main().catch((error) => {
  console.error('CP22E-A Sweep entry points smoke FAILED:')
  console.error(error)
  process.exit(1)
})
