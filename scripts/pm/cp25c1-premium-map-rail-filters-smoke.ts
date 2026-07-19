/**
 * CP25C.1 - Premium desktop map rail and rail-attached filters smoke.
 *
 * Static and DB-free. Guards the approved UI file fence, desktop-only rail
 * polish, rail-local filtering, and all CP25 mobile/map interaction behavior.
 */

import assert from 'node:assert/strict'
import { execSync } from 'node:child_process'
import { existsSync, readFileSync } from 'node:fs'

function source(path: string): string {
  return readFileSync(path, 'utf8')
}

function shell(command: string): string {
  return execSync(command, { encoding: 'utf8' }).trim()
}

function pathsFor(command: string): string[] {
  const output = shell(command)
  return output ? output.split('\n') : []
}

function changedFiles(): string[] {
  return Array.from(new Set([
    ...pathsFor('git diff --name-only origin/main..HEAD'),
    ...pathsFor('git diff --name-only'),
    ...pathsFor('git diff --name-only --cached'),
    ...pathsFor('git ls-files --others --exclude-standard'),
  ])).sort()
}

function addedDiff(): string {
  return shell('git diff --unified=0 --no-ext-diff origin/main -- components/app/map')
    .split('\n')
    .filter((line) => line.startsWith('+') && !line.startsWith('+++'))
    .join('\n')
}

function blockAround(text: string, marker: string, before = 500, after = 3200): string {
  const index = text.indexOf(marker)
  assert(index >= 0, `Missing marker: ${marker}`)
  return text.slice(Math.max(0, index - before), index + after)
}

function routeFiles(ref?: string): string[] {
  const command = ref ? `git ls-tree -r --name-only ${ref}` : 'git ls-files app'
  return shell(command)
    .split('\n')
    .filter((path) => path.startsWith('app/') && (path.endsWith('/page.tsx') || path.endsWith('/route.ts')))
    .sort()
}

async function main() {
  const sidebarPath = 'components/app/Sidebar.tsx'
  const railPath = 'components/app/map/MapLeadRail.tsx'
  const popoverPath = 'components/app/map/MapRailFilterPopover.tsx'
  assert(existsSync(sidebarPath), 'Global app sidebar must exist')
  assert(existsSync(railPath), 'Desktop map lead rail component must exist')
  assert(existsSync(popoverPath), 'Desktop rail-attached filter popover must exist')

  const sidebar = source(sidebarPath)
  const rail = source(railPath)
  const popover = source(popoverPath)
  const mapShell = source('components/app/map/MapShell.tsx')
  const filterSheet = source('components/app/map/MapFilterSheet.tsx')
  const canvas = source('components/app/map/MapCanvas.tsx')
  const topBar = source('components/app/map/MapTopBar.tsx')
  const selectedSheet = source('components/app/map/SelectedLeadSheet.tsx')
  const helpers = source('components/app/map/map-helpers.ts')

  const sidebarActiveState = blockAround(sidebar, 'const renderLink', 0, 3000)
  assert(sidebarActiveState.includes('href={item.href}'), 'Sidebar route links must remain data-driven')
  assert(sidebarActiveState.includes('pathname === item.href'), 'Sidebar active-route behavior must remain')
  assert(
    !/absolute[^"'\n]*left-0[^"'\n]*bg-ok|bg-ok[^"'\n]*left-0/.test(sidebarActiveState),
    'Sidebar active state must not render a vertical green accent bar',
  )
  assert(
    sidebarActiveState.includes('bg-raised') || sidebarActiveState.includes('bg-text/[0.'),
    'Sidebar active state must retain a clear tonal background',
  )
  assert(sidebarActiveState.includes('text-ok'), 'Sidebar active icon emphasis must remain')
  assert(sidebarActiveState.includes('duration-200'), 'Sidebar active-state transitions must stay restrained')
  assert(sidebarActiveState.includes('motion-reduce:transition-none'), 'Sidebar navigation must respect reduced motion')

  assert(rail.includes('data-cp25c-map-lead-rail'), 'Desktop lead rail marker is missing')
  assert(rail.includes('data-cp25c1-premium-map-lead-rail'), 'Premium rail marker is missing')
  assert(/hidden[^"']*lg:flex/.test(rail), 'Desktop lead rail must remain hidden below lg')
  assert(/w-\[(380|390|400|410|420)px\]/.test(rail), 'Desktop lead rail must stay in the approved width range')
  const railShell = blockAround(rail, 'data-cp25c1-premium-map-lead-rail', 120, 700)
  assert(sidebar.includes('bg-surface'), 'Global sidebar must retain the approved surface token')
  assert(railShell.includes('bg-bg'), 'Desktop rail must use a subtly differentiated token surface')
  assert(!railShell.includes('bg-surface'), 'Sidebar and rail must not use an identical shell surface')
  assert(railShell.includes('border-l'), 'Desktop rail needs a restrained sidebar-facing seam')
  assert(railShell.includes('border-r'), 'Desktop rail must retain its map-facing seam')
  assert(railShell.includes('border-text/8'), 'Rail seams must stay subtle and token-based')
  assert(rail.includes('My Leads'), 'Desktop lead rail must retain its title')
  assert(rail.includes('visibleCount'), 'Desktop lead rail must retain the real visible count')
  assert(rail.includes('totalCount'), 'Desktop lead rail must retain the real total count')
  assert(rail.includes('Search leads'), 'Desktop lead rail must retain saved-lead search')

  const lifecycleRail = blockAround(rail, 'data-cp25c1-lifecycle-filter-rail', 800, 2600)
  assert(lifecycleRail.includes('All'), 'Lifecycle rail must expose an All option')
  assert(lifecycleRail.includes('RAIL_LIFECYCLE_STATUSES'), 'Lifecycle rail must use the approved desktop lifecycle values')
  assert(lifecycleRail.includes('onLifecycleFilterChange'), 'Lifecycle rail must update the existing filter state')
  assert(/overflow-x-auto/.test(lifecycleRail), 'Lifecycle rail must remain reachable when horizontal space is tight')
  assert(lifecycleRail.includes('bg-surface/35'), 'Lifecycle options must share one restrained control track')

  const lifecycleChip = blockAround(rail, 'function LifecycleChip', 0, 2200)
  assert(lifecycleChip.includes('data-cp25c1-lifecycle-option'), 'Lifecycle options must share one control grammar')
  assert(/min-h-10|min-h-11|min-h-\[4[0-4]px\]/.test(lifecycleChip), 'Lifecycle options need consistent 40-44px targets')
  assert(lifecycleChip.includes('bg-raised'), 'Active lifecycle option must use a quiet tonal surface')
  assert(lifecycleChip.includes('bg-transparent'), 'Inactive lifecycle options must remain visually restrained')
  assert(lifecycleChip.includes('data-cp25c1-lifecycle-filter-dot'), 'Lifecycle color must stay in compact status dots')
  assert(lifecycleChip.includes('markerClassName'), 'Lifecycle options must retain their compact status-dot color')
  assert(!/absolute|left-0|border-l|bg-ok\/\[|bg-bad\/\[|bg-blue\/\[/.test(lifecycleChip), 'Lifecycle selection must not use bars or saturated full-button fills')
  assert(!/Nearest|Newest|Sort by|sorting/i.test(lifecycleRail), 'Lifecycle rail must not introduce sorting controls')

  const lifecycleValues = blockAround(popover, 'RAIL_LIFECYCLE_STATUSES', 0, 700)
  for (const status of ["'saved'", "'contacted'", "'won'", "'lost'"]) {
    assert(lifecycleValues.includes(status), `Lifecycle rail must retain ${status}`)
  }
  assert(!/dismissed/i.test(lifecycleValues), 'Lifecycle rail must not introduce Dismissed')

  const trigger = blockAround(rail, 'data-cp25c1-rail-filter-trigger', 700, 1800)
  assert(trigger.includes('aria-expanded={filtersOpen}'), 'Desktop filter trigger must expose expanded state')
  assert(trigger.includes('aria-controls={filterPopoverId}'), 'Desktop filter trigger must control the popover')
  assert(trigger.includes('MapRailFilterPopover'), 'Desktop trigger must own the rail-attached popover')

  assert(popover.includes('data-cp25c1-rail-filter-popover'), 'Rail filter popover marker is missing')
  assert(popover.includes("role=\"dialog\""), 'Rail filter popover needs dialog semantics')
  assert(popover.includes('absolute'), 'Desktop filter must be positioned relative to the rail')
  assert(!/\bfixed\b/.test(popover), 'Desktop filter must not use detached fixed positioning')
  assert(!/\bright-6\b|\binset-x-0\b/.test(popover), 'Desktop filter must not target the far-right map edge')
  assert(popover.includes("event.key === 'Escape'"), 'Escape must close the desktop filter')
  assert(popover.includes("addEventListener('pointerdown'"), 'Outside click must close the desktop filter')
  assert(popover.includes('triggerRef.current?.focus()'), 'Closing with Escape must restore trigger focus')
  assert(popover.includes('draftFilters'), 'Desktop filter must draft from the existing MapFilters state')
  assert(popover.includes('onApply(draftFilters)'), 'Desktop filter must apply the existing MapFilters state')
  assert(popover.includes('requiresAddress'), 'Desktop filter must retain Has address')
  assert(popover.includes('requiresPhone'), 'Desktop filter must retain Has phone')
  assert(popover.includes('requiresWebsite'), 'Desktop filter must retain Has website')
  assert(/duration-200/.test(popover), 'Desktop filter motion must stay restrained')
  assert(popover.includes('motion-reduce:transition-none'), 'Desktop filter motion must respect reduced motion')

  const row = blockAround(rail, 'data-cp25c-map-lead-row', 1000, 5600)
  assert(row.includes('data-cp25c1-quiet-map-result-row'), 'Resting rows must use the quiet map-result treatment')
  assert(row.includes('onSelectLead(lead.id)'), 'Rail row click must still select the lead id')
  assert(row.includes('aria-pressed={selected}'), 'Selected row must retain accessible pressed state')
  assert(row.includes('data-cp25c1-neutral-lead-marker'), 'Resting initials marker must be neutral')
  assert(/h-8 w-8|h-\[3[01]px\] w-\[3[01]px\]/.test(row), 'Resting initials marker must be approximately 30-32px')
  assert(row.includes('data-cp25c1-lifecycle-dot'), 'Lifecycle color must move to a compact dot')
  assert(/h-2 w-2|h-\[7px\] w-\[7px\]|h-\[8px\] w-\[8px\]|h-\[9px\] w-\[9px\]/.test(row), 'Lifecycle dot must remain compact')
  assert(row.includes('data-cp25c1-soft-selected-row'), 'Selected row must use the soft selected treatment')
  assert(row.includes("selected ? 'bg-ok/[0.075]'"), 'Selected row must retain its soft tinted surface')
  assert(
    !/absolute[^"'\n]*left-0[^"'\n]*bg-ok|bg-ok[^"'\n]*left-0/.test(row),
    'Selected row must not render a vertical green accent bar',
  )
  assert(!row.includes('formatLeadDate'), 'Resting rows must not repeat full calendar dates')
  assert(!/shadow-\[[^\]]*(69,192,138|ok)|ring-ok|border-ok/.test(row), 'Selected row must not use a hard outline or glow')
  assert(/duration-200/.test(row), 'Row motion must stay restrained')
  assert(row.includes('motion-reduce:transition-none'), 'Row motion must respect reduced motion')
  assert(rail.includes('scrollIntoView'), 'Marker selection must still reveal the matching row')

  const selectedDetails = blockAround(rail, 'data-cp25c1-selected-details', 500, 3000)
  assert(selectedDetails.includes('data-cp25c1-selected-action-strip'), 'Selected details must use one compact action strip')
  assert(rail.includes('hasLeadPhone') && selectedDetails.includes('phoneHref &&'), 'Call must remain evidence-gated')
  assert(rail.includes('leadWebsiteHref') && selectedDetails.includes('websiteHref &&'), 'Website must remain evidence-gated')
  assert(rail.includes('leadDirectionsHref') && selectedDetails.includes('directionsHref &&'), 'Directions must keep the safe URL helper')
  assert(selectedDetails.includes('/app/leads/${lead.id}'), 'Profile action must remain available')
  const railAction = blockAround(rail, 'function RailAction', 0, 1800)
  assert(/min-h-11|min-h-\[44px\]|min-h-\[48px\]/.test(railAction), 'Selected actions must retain touch-safe targets')

  assert(mapShell.includes("import { MapRailFilterPopover") === false, 'Popover should stay owned by the rail, not the shell')
  assert(mapShell.includes('desktopFiltersOpen'), 'MapShell must own desktop filter presentation state')
  assert(mapShell.includes('mobileFiltersOpen'), 'MapShell must keep separate mobile filter presentation state')
  assert(mapShell.includes('filters={filters}'), 'Existing filter state must flow to desktop and mobile controls')
  assert(mapShell.includes('leads={filteredLeads}'), 'Filtered leads must continue flowing to the rail')
  const mapCanvasProps = blockAround(mapShell, '<MapCanvas', 0, 900)
  assert(mapCanvasProps.includes('leads={filteredLeads}'), 'Filtered leads must continue flowing to the map')
  assert(mapShell.includes('selectedLeadId={selectedLeadId}'), 'Selected id must still flow to map and rail')
  assert(mapShell.includes('onSelectLead={setSelectedLeadId}'), 'Map and rail must still share lead selection')
  assert(mapShell.includes('data-cp25c-map-canvas-region'), 'Desktop map must retain a flexible canvas region')
  assert(mapShell.includes('!desktopRailActive'), 'Mobile selected sheet must remain desktop-gated')

  assert(filterSheet.includes('data-cp25a-filter-sheet'), 'Existing mobile MapFilterSheet must remain')
  assert(topBar.includes('Search map'), 'Existing mobile MapTopBar must remain')
  assert(selectedSheet.includes('data-cp25b1-selected-lead-sheet'), 'Existing mobile selected lead sheet must remain')
  assert(canvas.includes('ResizeObserver'), 'Map resizing must remain guarded by ResizeObserver')
  assert(canvas.includes('getClusterExpansionZoom'), 'Cluster expansion must remain')
  assert(canvas.includes("map.on('click', PIN_LAYER_ID"), 'Map pin click registration must remain')
  assert(canvas.includes('onSelectLead(id)'), 'Map pin click must still select the lead id')
  assert(canvas.includes('data-cp25b1-selected-marker'), 'Selected map marker must remain')
  assert(canvas.includes('data-cp25b2-map-zoom-controls'), 'Zoom controls must remain')

  const productSource = `${rail}\n${popover}\n${mapShell}\n${filterSheet}\n${canvas}\n${topBar}\n${selectedSheet}\n${helpers}`
  assert(!/updateSavedLead|createSavedLead|deleteSavedLead|runSweep|startSweep|Mark as Contacted|Mark as Won|Add note/.test(productSource), 'Mutation behavior must remain absent')
  assert(!/navigator\.geolocation|watchPosition|getCurrentPosition/.test(productSource), 'Geolocation must remain absent')
  assert(!/current location|my location|locate me/i.test(productSource), 'Current-location UI must remain absent')
  assert(!/route line/i.test(productSource), 'Route-line UI must remain absent')
  const customerFacingSource = productSource.replace(/block:\s*['"]nearest['"]/g, '')
  assert(!/open now|mileage|rating|hours|distance|reviews|photos|popularity|urgency|signal|opportunity|score/i.test(customerFacingSource), 'Invented customer evidence found')
  assert(!/coral/i.test(productSource), 'Coral styling must remain absent')

  const additions = addedDiff()
  assert(!/^\+.*\bdismissed\b/im.test(additions), 'CP25C.1 must not introduce Dismissed lifecycle UI')
  assert(!/^\+.*\bnearest\b/im.test(additions), 'CP25C.1 must not introduce Nearest sorting')

  const changed = changedFiles()
  const required = [
    'components/app/Sidebar.tsx',
    'components/app/map/MapLeadRail.tsx',
    'components/app/map/MapRailFilterPopover.tsx',
    'components/app/map/MapShell.tsx',
    'scripts/pm/cp25c1-premium-map-rail-filters-smoke.ts',
  ].sort()
  assert.deepEqual(changed, required, 'CP25C.1 changed files must match the approved implementation set')

  const sharedShellChanges = changed.filter((path) =>
    path.startsWith('components/app/') && !path.startsWith('components/app/map/'),
  )
  assert.deepEqual(
    sharedShellChanges,
    ['components/app/Sidebar.tsx'],
    'Sidebar must be the only newly approved shared-shell file',
  )

  const forbidden = changed.filter((path) =>
    path === 'package.json' ||
    path === 'package-lock.json' ||
    path.startsWith('db/') ||
    path === 'drizzle.config.ts' ||
    path.startsWith('lib/providers/') ||
    path.startsWith('lib/runtime/') ||
    path.startsWith('app/') ||
    /auth|clerk|billing|stripe|admin|settings|chat|FetchView|MyLeadsView|MobileHeader|MobileBottomNav|CP19|PRIVE/i.test(path),
  )
  assert.deepEqual(forbidden, [], 'Protected path changed')
  assert(!changed.some((path) => /scripts\/pm\/cp25(a|b|b1|b2|c)-/i.test(path)), 'Prior CP25 smoke changed')

  const baseRoutes = routeFiles('origin/main')
  const currentRoutes = routeFiles()
  assert.deepEqual(currentRoutes, baseRoutes, 'Route file list changed')

  console.log(JSON.stringify({
    ok: true,
    mode: 'cp25c1_premium_map_rail_filters',
    changedFilesAllowedOnly: true,
    routeCount: currentRoutes.length,
    premiumRailPresent: true,
    desktopRailMobileGated: true,
    lifecycleRailPresent: true,
    lifecycleControlUnified: true,
    lifecycleTargetsConsistent: true,
    lifecycleColorDotsOnly: true,
    lifecycleSortingAbsent: true,
    restingRowsQuiet: true,
    neutralMarkersPresent: true,
    repeatedDatesRemoved: true,
    selectedRowSoft: true,
    sidebarRailSeparationPresent: true,
    verticalGreenAccentBarsAbsent: true,
    desktopFilterRailAttached: true,
    desktopFilterAccessible: true,
    desktopAndMobileFiltersSeparated: true,
    selectionSynchronized: true,
    mapResizeGuarded: true,
    clusterExpansionPreserved: true,
    zoomControlsPreserved: true,
    mobileSheetPreserved: true,
    mutationsAbsent: true,
    geolocationAbsent: true,
    inventedEvidenceAbsent: true,
  }, null, 2))
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
