/**
 * CP25B.1 - Final selected map marker and lead-sheet polish smoke.
 *
 * Static and DB-free. Guards the narrow visual file fence while preserving
 * cluster expansion, pin selection, safe actions, and read-only map behavior.
 */

import assert from 'node:assert/strict'
import { execSync } from 'node:child_process'
import { readFileSync } from 'node:fs'

import type { SavedLeadPipelineRow } from '../../lib/runtime/sweep/saved-leads'
import {
  buildLeadFeatureCollection,
  formatMapMarketLabel,
  leadDirectionsHref,
  leadWebsiteHref,
} from '../../components/app/map/map-helpers'

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

function blockAround(text: string, marker: string, before = 300, after = 2800): string {
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

function row(overrides: Partial<SavedLeadPipelineRow> = {}): SavedLeadPipelineRow {
  return {
    id: '00000000-0000-4000-8000-000000000251',
    dedupeKey: 'cp25b1-smoke-lead',
    businessName: 'Mesa Family Market and Community Grocer',
    website: 'mesamarket.example',
    phone: '505-555-0251',
    address: '3440 Isleta Blvd SW, Albuquerque, NM 87105',
    market: 'albuquerque, nm',
    source: 'Google Maps',
    sourceUrl: null,
    category: 'Grocery Store',
    email: null,
    owner: null,
    hook: null,
    latitude: 35.041,
    longitude: -106.679,
    lifecycleStatus: 'saved',
    note: null,
    sourceSweepRef: null,
    savedAtIso: '2026-07-01T00:00:00.000Z',
    updatedAtIso: '2026-07-12T00:00:00.000Z',
    lastSeenAtIso: '2026-07-12T00:00:00.000Z',
    savedAtMs: 1_788_278_400_000,
    updatedAtMs: 1_789_228_800_000,
    ...overrides,
  }
}

async function main() {
  const canvas = source('components/app/map/MapCanvas.tsx')
  const sheet = source('components/app/map/SelectedLeadSheet.tsx')
  const shellSource = source('components/app/map/MapShell.tsx')

  const selectedMarker = blockAround(canvas, 'function createSelectedMarkerElement', 0, 5200)
  const markerSync = blockAround(canvas, 'function syncSelectedMarker', 0, 2800)
  const closeZoomLabels = blockAround(canvas, 'id: PIN_NAME_LAYER_ID', 200, 2200)
  const interactions = blockAround(canvas, 'function registerMapInteractions', 0, 4200)

  assert(canvas.includes("type MapboxMarker = import('mapbox-gl').Marker"), 'Selected DOM marker type missing')
  assert(canvas.includes('selectedMarkerRef'), 'Selected marker lifecycle ref missing')
  assert(canvas.includes('markerCtorRef'), 'Mapbox Marker constructor ref missing')
  assert(selectedMarker.includes('data-cp25b1-selected-marker'), 'Selected marker DOM proof marker missing')
  assert(selectedMarker.includes('rounded-full'), 'Selected marker needs a circular outer silhouette')
  assert(selectedMarker.includes('bg-bg'), 'Selected marker needs a dark outer silhouette')
  assert(selectedMarker.includes('bg-warn'), 'Selected marker needs a Fetchi gold center')
  assert(selectedMarker.includes('rotate-45'), 'Selected marker needs a pointed tail')
  assert(selectedMarker.includes('data-cp25b1-selected-marker-anchor'), 'Selected marker exact-location anchor missing')
  assert(selectedMarker.includes('data-cp25b1-selected-marker-name'), 'Selected marker business-name label missing')
  assert(selectedMarker.includes("maxWidth = '180px'"), 'Selected marker name must constrain long labels')
  assert(selectedMarker.includes("webkitLineClamp = '2'"), 'Selected marker name must clamp gracefully')
  assert(markerSync.includes('new MarkerCtor'), 'Selected marker must use Mapbox marker anchoring')
  assert(markerSync.includes("anchor: 'bottom'"), 'Selected marker must anchor to the exact coordinate')
  assert(markerSync.includes('currentMarker?.remove()'), 'Selected marker cleanup missing')

  const pinLayer = blockAround(canvas, 'id: PIN_LAYER_ID', 0, 1800)
  assert(pinLayer.includes("['get', 'selected'], false"), 'Default lifecycle pins must exclude the selected lead')
  assert(canvas.includes('const CLOSE_ZOOM_LABEL_MIN_ZOOM = 15'), 'Business labels must remain close-zoom only')
  assert(closeZoomLabels.includes('minzoom: CLOSE_ZOOM_LABEL_MIN_ZOOM'), 'Close-zoom label minzoom missing')
  assert(closeZoomLabels.includes("'text-field': ['get', 'name']"), 'Close-zoom labels must use saved business names')
  assert(closeZoomLabels.includes("'text-variable-anchor'"), 'Close-zoom labels need collision-aware anchors')
  assert(closeZoomLabels.includes("'text-max-width': 10"), 'Close-zoom labels must constrain long names')
  assert(closeZoomLabels.includes("'text-size': 11.5"), 'Close-zoom labels should remain visually quiet')
  assert(closeZoomLabels.includes("'text-halo-color': bg"), 'Close-zoom labels need a dark halo')
  assert(closeZoomLabels.includes("'text-halo-width': 1.5"), 'Close-zoom label halo should stay restrained')

  assert(interactions.includes('getClusterExpansionZoom'), 'Cluster tap expansion must remain intact')
  assert(interactions.includes("map.on('click', PIN_LAYER_ID"), 'Pin click registration must remain intact')
  assert(interactions.includes('onSelectLead(id)'), 'Pin click must continue selecting the lead id')
  assert(shellSource.includes('selectedLeadId={selectedLeadId}'), 'Selected state wiring must remain intact')
  assert(shellSource.includes('onSelectLead={setSelectedLeadId}'), 'Pin selection wiring must remain intact')

  assert(sheet.includes('data-cp25b1-selected-lead-sheet'), 'CP25B.1 selected sheet marker missing')
  assert(sheet.includes("bg-black/25"), 'Sheet overlay should preserve map context')
  assert(sheet.includes('h-10 w-10'), 'Close control should be compact')
  assert(sheet.includes('titleSizeClass'), 'Long business names need adaptive title sizing')
  assert(sheet.includes('grid-cols-4'), 'Evidence-backed actions should use a compact four-column row')
  assert(sheet.includes('min-h-[78px]'), 'Action tiles should be compact but touch-safe')
  assert(sheet.includes("label={phoneHref ? 'Call' : 'No phone'}"), 'Phone action must stay evidence gated')
  assert(sheet.includes("label={websiteHref ? 'Website' : 'No website'}"), 'Website action must stay evidence gated')
  assert(sheet.includes("label={directionsHref ? 'Directions' : 'No directions'}"), 'Directions action must stay evidence gated')
  assert(sheet.includes('ariaLabel="Open profile"'), 'Profile action needs an explicit accessible label')
  assert(sheet.includes('LIFECYCLE_LABELS[lead.lifecycleStatus]'), 'Lifecycle evidence missing')
  assert(sheet.includes('formatLeadDate(lead.updatedAtIso)'), 'Updated evidence missing')
  assert(sheet.includes('lead.source.trim()'), 'Source evidence missing')
  assert(sheet.includes('formatMapMarketLabel(lead.market)'), 'Safe market formatting must remain')
  assert(!sheet.includes('lead.note'), 'CP25B.1 sheet must stay within the approved evidence-field list')
  assert(!/FileText|Saved note/.test(sheet), 'Note UI is outside the CP25B.1 evidence-field list')
  assert(!/Mark as Contacted|Mark as Won|Dismiss|Add note/.test(sheet), 'Mutation actions must not appear')
  assert(!/updateSavedLead|createSavedLead|deleteSavedLead|insert|upsert|runSweep|startSweep/.test(sheet), 'Mutation code must not appear')

  const fixture = row()
  assert.equal(formatMapMarketLabel(fixture.market), 'Albuquerque, NM', 'Market formatter regression')
  assert.equal(formatMapMarketLabel('São Paulo / Zone 7'), 'São Paulo / Zone 7', 'Unknown market grammar must remain intact')
  assert.equal(leadWebsiteHref(fixture), 'https://mesamarket.example/', 'Safe website normalization regression')
  assert.equal(leadWebsiteHref(row({ website: 'javascript:alert(1)' })), null, 'Unsafe website protocol regression')
  assert(leadDirectionsHref(fixture)?.includes('3440%20Isleta%20Blvd'), 'Directions must prefer persisted address')
  assert(leadDirectionsHref(row({ address: null }))?.includes('35.041%2C-106.679'), 'Directions must fall back to coordinates')

  const features = buildLeadFeatureCollection(
    [fixture as SavedLeadPipelineRow & { latitude: number; longitude: number }],
    fixture.id,
  )
  assert.equal(features.features[0]?.properties.selected, true, 'Selected GeoJSON state regression')
  assert.equal(features.features[0]?.properties.name, fixture.businessName, 'Saved business name metadata regression')

  const productSource = `${canvas}\n${sheet}\n${shellSource}`
  assert(!/navigator\.geolocation|watchPosition|getCurrentPosition/.test(productSource), 'Geolocation must remain absent')
  assert(!/coral/i.test(productSource), 'Coral styling must remain absent')
  assert(!/rating|hours|distance|reviews|photos|popularity|contacts|urgency|signal|opportunity|score/i.test(productSource), 'Invented consumer evidence found')
  assert(!/addImage\(|loadImage\(|https?:\/\/[^'"\s]+\.(?:png|jpe?g|svg)/i.test(canvas), 'Selected marker must not load external assets')

  const changed = changedFiles()
  const required = [
    'components/app/map/MapCanvas.tsx',
    'components/app/map/SelectedLeadSheet.tsx',
    'scripts/pm/cp25b1-map-selected-polish-smoke.ts',
  ].sort()
  assert.deepEqual(changed, required, 'CP25B.1 changed files must match the narrow approved set')

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
  assert(!changed.includes('replit.md'), 'replit.md changed')
  assert(!changed.includes('FETCHI_CLAUDE_CODE_BRIEF.md'), 'Control brief changed')

  const baseRoutes = routeFiles('origin/main')
  const currentRoutes = routeFiles()
  assert.deepEqual(currentRoutes, baseRoutes, 'Route file list changed')

  console.log(JSON.stringify({
    ok: true,
    mode: 'cp25b1_map_selected_polish',
    changedFilesAllowedOnly: true,
    routeCount: currentRoutes.length,
    selectedDomMarkerAnchored: true,
    selectedNameVisible: true,
    closeZoomLabelsRestrained: true,
    clusterExpansionPreserved: true,
    pinSelectionPreserved: true,
    readOnlyEvidenceOnlySheet: true,
    safeActions: true,
    safeMarketFormatting: true,
    geolocationAbsent: true,
    inventedEvidenceAbsent: true,
  }, null, 2))
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
