/**
 * CP25C - Desktop map lead rail smoke.
 *
 * Static and DB-free. Guards the desktop-only map workbench while preserving
 * the existing mobile map, read-only lead details, and CP25 interaction stack.
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

function blockAround(text: string, marker: string, before = 400, after = 2600): string {
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
  const railPath = 'components/app/map/MapLeadRail.tsx'
  assert(existsSync(railPath), 'Desktop map lead rail component must exist')

  const rail = source(railPath)
  const mapShell = source('components/app/map/MapShell.tsx')
  const canvas = source('components/app/map/MapCanvas.tsx')
  const topBar = source('components/app/map/MapTopBar.tsx')
  const selectedSheet = source('components/app/map/SelectedLeadSheet.tsx')
  const helpers = source('components/app/map/map-helpers.ts')

  assert(rail.includes('data-cp25c-map-lead-rail'), 'Desktop lead rail marker is missing')
  assert(/hidden[^"']*lg:flex/.test(rail), 'Desktop lead rail must be hidden below lg widths')
  assert(rail.includes('My Leads'), 'Desktop lead rail needs the My Leads title')
  assert(rail.includes('Search leads'), 'Desktop lead rail needs saved-lead search')
  assert(rail.includes('onOpenFilters'), 'Desktop lead rail needs the existing filter trigger')
  assert(rail.includes('visibleCount'), 'Desktop lead rail needs a real visible count')

  const row = blockAround(rail, 'data-cp25c-map-lead-row', 1200, 5200)
  assert(row.includes('onSelectLead(lead.id)'), 'Rail row click must select the saved lead id')
  assert(row.includes('selectedLeadId'), 'Rail rows must receive the selected lead id')
  assert(row.includes('aria-pressed={selected}'), 'Selected rail row needs an accessible selected state')
  assert(row.includes('transition-all'), 'Rail row hover and selected states need smooth transitions')
  assert(/duration-(150|200|250)/.test(row), 'Rail row motion must remain subtle')
  assert(row.includes('motion-reduce:transition-none'), 'Rail row motion must respect reduced motion')
  assert(rail.includes('scrollIntoView'), 'Marker selection should reveal the matching rail row')
  assert(rail.includes('hasLeadPhone'), 'Phone evidence must be checked before showing the action')
  assert(rail.includes('leadWebsiteHref'), 'Website evidence must be checked before showing the action')
  assert(rail.includes('leadDirectionsHref'), 'Directions must use the existing safe helper')

  assert(mapShell.includes("import { MapLeadRail } from './MapLeadRail'"), 'MapShell must own the desktop rail')
  assert(mapShell.includes('selectedLeadId={selectedLeadId}'), 'Selected lead id must flow to map and rail')
  assert(mapShell.includes('onSelectLead={setSelectedLeadId}'), 'Map and rail must share lead selection')
  assert(mapShell.includes('data-cp25c-map-canvas-region'), 'Desktop map must retain a dedicated flexible region')
  assert(mapShell.includes('lg:hidden'), 'Mobile map chrome must remain desktop-gated')
  assert(mapShell.includes('!desktopRailActive'), 'Large mobile lead sheet must stay closed on desktop')

  const selectedMotion = blockAround(canvas, 'data-cp25c-selected-lead-motion', 900, 1800)
  assert(selectedMotion.includes('map.easeTo'), 'Selected lead must ease into view on the map')
  assert(/duration:\s*(450|500|520|560|600|640|700)/.test(selectedMotion), 'Map selection motion must be smooth')
  assert(canvas.includes('ResizeObserver'), 'Mapbox must resize with the desktop rail layout')

  const interactions = blockAround(canvas, 'function registerMapInteractions', 0, 4300)
  assert(interactions.includes('getClusterExpansionZoom'), 'Cluster expansion must remain intact')
  assert(interactions.includes("map.on('click', PIN_LAYER_ID"), 'Pin click registration must remain intact')
  assert(interactions.includes('onSelectLead(id)'), 'Pin click must still select the lead id')
  assert(canvas.includes('data-cp25b1-selected-marker'), 'Selected marker must remain intact')
  assert(canvas.includes('data-cp25b2-map-zoom-controls'), 'Zoom controls must remain intact')
  assert(topBar.includes('Search map'), 'Existing mobile map search must remain intact')
  assert(selectedSheet.includes('data-cp25b1-selected-lead-sheet'), 'Existing mobile selected sheet must remain intact')

  const productSource = `${rail}\n${mapShell}\n${canvas}\n${topBar}\n${selectedSheet}\n${helpers}`
  assert(!/updateSavedLead|createSavedLead|deleteSavedLead|runSweep|startSweep|Mark as Contacted|Mark as Won|Add note/.test(productSource), 'Mutation behavior must remain absent')
  assert(!/navigator\.geolocation|watchPosition|getCurrentPosition/.test(productSource), 'Geolocation must remain absent')
  assert(!/current location|my location|locate me/i.test(productSource), 'Current-location UI must remain absent')
  assert(!/route line/i.test(productSource), 'Route-line UI must remain absent')
  const customerFacingSource = productSource.replace(/block:\s*['"]nearest['"]/g, '')
  assert(!/open now|nearest|rating|hours|distance|reviews|photos|popularity|urgency|signal|opportunity|score/i.test(customerFacingSource), 'Invented consumer evidence found')
  assert(!/coral/i.test(productSource), 'Coral styling must remain absent')

  const changed = changedFiles()
  const required = [
    'components/app/map/MapCanvas.tsx',
    'components/app/map/MapLeadRail.tsx',
    'components/app/map/MapShell.tsx',
    'scripts/pm/cp25c-desktop-map-lead-rail-smoke.ts',
  ].sort()
  assert.deepEqual(changed, required, 'CP25C changed files must match the approved implementation set')

  const forbidden = changed.filter((path) =>
    path === 'package.json' ||
    path === 'package-lock.json' ||
    path.startsWith('db/') ||
    path === 'drizzle.config.ts' ||
    path.startsWith('lib/providers/') ||
    path.startsWith('lib/runtime/') ||
    path.startsWith('app/') ||
    /auth|clerk|billing|stripe|admin|settings|chat|FetchView|MyLeadsView|MobileHeader|MobileBottomNav|Sidebar/i.test(path),
  )
  assert.deepEqual(forbidden, [], 'Protected path changed')
  assert(!changed.some((path) => /scripts\/pm\/cp25(a|b|b1|b2)-/i.test(path)), 'Prior CP25 smoke changed')

  const baseRoutes = routeFiles('origin/main')
  const currentRoutes = routeFiles()
  assert.deepEqual(currentRoutes, baseRoutes, 'Route file list changed')

  console.log(JSON.stringify({
    ok: true,
    mode: 'cp25c_desktop_map_lead_rail',
    changedFilesAllowedOnly: true,
    routeCount: currentRoutes.length,
    desktopRailPresent: true,
    desktopRailMobileGated: true,
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
