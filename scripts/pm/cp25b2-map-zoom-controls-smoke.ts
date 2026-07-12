/**
 * CP25B.2 - Map zoom controls polish smoke.
 *
 * Static and DB-free. Guards the narrow control-only file fence while keeping
 * the existing map interactions and read-only lead sheet intact.
 */

import assert from 'node:assert/strict'
import { execSync } from 'node:child_process'
import { readFileSync } from 'node:fs'

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

function blockAround(text: string, marker: string, before = 300, after = 2600): string {
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
  const canvas = source('components/app/map/MapCanvas.tsx')
  const shellSource = source('components/app/map/MapShell.tsx')
  const selectedSheet = source('components/app/map/SelectedLeadSheet.tsx')

  const zoomControls = blockAround(canvas, 'data-cp25b2-map-zoom-controls', 800, 3000)
  const zoomBehavior = blockAround(canvas, 'function zoomMap', 0, 1600)
  const interactions = blockAround(canvas, 'function registerMapInteractions', 0, 4200)

  assert(zoomControls.includes('aria-label="Zoom in"'), 'Zoom-in control needs an accessible label')
  assert(zoomControls.includes('aria-label="Zoom out"'), 'Zoom-out control needs an accessible label')
  assert(zoomControls.includes('rounded-['), 'Zoom controls need a compact rounded pill surface')
  assert(zoomControls.includes('divide-y'), 'Zoom controls need a visible vertical divider')
  assert(zoomControls.includes('<Plus'), 'Zoom-in control needs the plus icon')
  assert(zoomControls.includes('<Minus'), 'Zoom-out control needs the minus icon')
  assert(zoomControls.includes('focus-visible:ring-2'), 'Zoom controls need keyboard-visible focus states')
  assert(zoomBehavior.includes('map.zoomIn'), 'Zoom-in control must call Mapbox zoom-in behavior')
  assert(zoomBehavior.includes('map.zoomOut'), 'Zoom-out control must call Mapbox zoom-out behavior')
  assert(zoomBehavior.includes('map.isStyleLoaded()'), 'Zoom controls must safely no-op before the map is ready')

  assert(interactions.includes('getClusterExpansionZoom'), 'Cluster tap expansion must remain intact')
  assert(interactions.includes("map.on('click', PIN_LAYER_ID"), 'Pin click registration must remain intact')
  assert(interactions.includes('onSelectLead(id)'), 'Pin click must continue selecting the lead id')
  assert(shellSource.includes('selectedLeadId={selectedLeadId}'), 'Selected state wiring must remain intact')
  assert(shellSource.includes('onSelectLead={setSelectedLeadId}'), 'Pin selection wiring must remain intact')
  assert(selectedSheet.includes('data-cp25b1-selected-lead-sheet'), 'Selected sheet must remain read-only')
  assert(!/Mark as Contacted|Mark as Won|Dismiss|Add note/.test(selectedSheet), 'Mutation actions must not appear')

  const productSource = `${canvas}\n${shellSource}\n${selectedSheet}`
  assert(!/navigator\.geolocation|watchPosition|getCurrentPosition/.test(productSource), 'Geolocation must remain absent')
  assert(!/current location|my location|locate me/i.test(productSource), 'Current-location UI must remain absent')
  assert(!/coral/i.test(productSource), 'Coral styling must remain absent')
  assert(!/rating|hours|distance|reviews|photos|popularity|contacts|urgency|signal|opportunity|score/i.test(productSource), 'Invented consumer evidence found')

  const changed = changedFiles()
  const required = [
    'components/app/map/MapCanvas.tsx',
    'scripts/pm/cp25b2-map-zoom-controls-smoke.ts',
  ].sort()
  assert.deepEqual(changed, required, 'CP25B.2 changed files must match the narrow approved set')

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
  assert(!changed.includes('scripts/pm/cp25a-map-tab-fable-port-smoke.ts'), 'CP25A smoke changed')
  assert(!changed.includes('scripts/pm/cp25b-map-selected-pin-sheet-polish-smoke.ts'), 'Merged CP25B smoke changed')
  assert(!changed.includes('scripts/pm/cp25b1-map-selected-polish-smoke.ts'), 'Merged CP25B.1 smoke changed')

  const baseRoutes = routeFiles('origin/main')
  const currentRoutes = routeFiles()
  assert.deepEqual(currentRoutes, baseRoutes, 'Route file list changed')

  console.log(JSON.stringify({
    ok: true,
    mode: 'cp25b2_map_zoom_controls',
    changedFilesAllowedOnly: true,
    routeCount: currentRoutes.length,
    zoomControlsAccessible: true,
    zoomControlsSafeBeforeReady: true,
    clusterExpansionPreserved: true,
    pinSelectionPreserved: true,
    selectedSheetReadOnly: true,
    geolocationAbsent: true,
    inventedEvidenceAbsent: true,
  }, null, 2))
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
