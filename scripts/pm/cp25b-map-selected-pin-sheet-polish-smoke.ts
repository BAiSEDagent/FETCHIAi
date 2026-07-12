/**
 * CP25B - Selected map pin and lead-sheet polish smoke proof.
 *
 * Static and DB-free. Guards the CP25B file fence, selected marker grammar,
 * close-zoom saved-lead labels, read-only sheet actions, and safe URL helpers.
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

function changedFilesFor(command: string): string[] {
  const output = shell(command)
  return output ? output.split('\n') : []
}

function uniqueSorted(paths: readonly string[]): string[] {
  return Array.from(new Set(paths)).sort()
}

function changedFiles(): string[] {
  return uniqueSorted([
    ...changedFilesFor('git diff --name-only origin/main..HEAD'),
    ...changedFilesFor('git diff --name-only'),
    ...changedFilesFor('git diff --name-only --cached'),
    ...changedFilesFor('git ls-files --others --exclude-standard'),
  ])
}

function assertNoChangedPath(
  changed: readonly string[],
  predicate: (path: string) => boolean,
  message: string,
) {
  const matches = changed.filter(predicate)
  assert.equal(matches.length, 0, `${message}: ${matches.join(', ')}`)
}

function blockAround(sourceText: string, marker: string, before = 400, after = 2600): string {
  const index = sourceText.indexOf(marker)
  assert(index >= 0, `Missing marker: ${marker}`)
  return sourceText.slice(Math.max(0, index - before), index + after)
}

function routeFilesFromGit(ref: string): string[] {
  return shell(`git ls-tree -r --name-only ${ref}`)
    .split('\n')
    .filter((path) => path.startsWith('app/') && (path.endsWith('/page.tsx') || path.endsWith('/route.ts')))
    .sort()
}

function routeFilesFromWorktree(): string[] {
  return shell('git ls-files app')
    .split('\n')
    .filter((path) => path.endsWith('/page.tsx') || path.endsWith('/route.ts'))
    .sort()
}

function row(overrides: Partial<SavedLeadPipelineRow> = {}): SavedLeadPipelineRow {
  return {
    id: '00000000-0000-4000-8000-000000000025',
    dedupeKey: 'cp25b-smoke-lead',
    businessName: 'My Market',
    website: 'mymarket.example',
    phone: '505-555-0125',
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
  const canvasSource = source('components/app/map/MapCanvas.tsx')
  const shellSource = source('components/app/map/MapShell.tsx')
  const helpersSource = source('components/app/map/map-helpers.ts')
  const sheetSource = source('components/app/map/SelectedLeadSheet.tsx')

  const closeZoomLabelLayer = blockAround(canvasSource, 'id: PIN_NAME_LAYER_ID')
  const selectedPinLayer = blockAround(canvasSource, 'id: SELECTED_PIN_OUTER_LAYER_ID')
  const selectedNameLayer = blockAround(canvasSource, 'id: SELECTED_PIN_NAME_LAYER_ID')
  const interactions = blockAround(canvasSource, 'function registerMapInteractions', 0, 4200)

  assert(canvasSource.includes("const PIN_NAME_LAYER_ID = 'cp25b-saved-lead-names'"), 'Close-zoom saved-lead name layer id missing')
  assert(canvasSource.includes('const CLOSE_ZOOM_LABEL_MIN_ZOOM = 14'), 'Saved-lead labels must use an explicit close-zoom threshold')
  assert(closeZoomLabelLayer.includes('minzoom: CLOSE_ZOOM_LABEL_MIN_ZOOM'), 'Business-name labels must be zoom gated')
  assert(closeZoomLabelLayer.includes("'text-field': ['get', 'name']"), 'Business-name labels must come from saved-lead names')
  assert(closeZoomLabelLayer.includes("'text-halo-color': bg"), 'Business-name labels need a dark readability halo')
  assert(closeZoomLabelLayer.includes("'text-halo-width'"), 'Business-name label halo width missing')
  assert(closeZoomLabelLayer.includes("['get', 'selected'], false"), 'Default close-zoom labels must defer to selected-label styling')

  assert(canvasSource.includes("const SELECTED_PIN_POINTER_LAYER_ID = 'cp25b-selected-pin-pointer'"), 'Selected pin pointer layer missing')
  assert(canvasSource.includes("const SELECTED_PIN_OUTER_LAYER_ID = 'cp25b-selected-pin-outer'"), 'Selected pin outer layer missing')
  assert(canvasSource.includes("const SELECTED_PIN_CENTER_LAYER_ID = 'cp25b-selected-pin-center'"), 'Selected pin center layer missing')
  assert(canvasSource.includes("const SELECTED_PIN_ANCHOR_LAYER_ID = 'cp25b-selected-pin-anchor'"), 'Selected pin anchor layer missing')
  assert(selectedPinLayer.includes("['get', 'selected'], true"), 'Selected marker layers must filter to the selected saved lead')
  assert(selectedPinLayer.includes("'circle-color': bg"), 'Selected marker needs a dark outer silhouette')
  assert(blockAround(canvasSource, 'id: SELECTED_PIN_CENTER_LAYER_ID').includes("'circle-color': warn"), 'Selected marker center must use Fetchi gold')
  assert(selectedNameLayer.includes("'text-field': ['get', 'name']"), 'Selected marker must show the business name')
  assert(selectedNameLayer.includes("'text-allow-overlap': true"), 'Selected business name must remain visible')
  assert(selectedNameLayer.includes("'text-halo-color': bg"), 'Selected business name needs a dark halo')
  assert(!/addImage\(|loadImage\(|https?:\/\/[^'"\s]+\.(?:png|jpe?g|svg)/i.test(canvasSource), 'CP25B markers must not load external logo assets')

  assert(interactions.includes('getClusterExpansionZoom'), 'Existing cluster expansion must remain intact')
  assert(interactions.includes("map.on('click', PIN_LAYER_ID"), 'Existing pin selection handler must remain intact')
  assert(interactions.includes('onSelectLead(id)'), 'Pin selection must still hand off the saved lead id')
  assert(shellSource.includes('selectedLeadId={selectedLeadId}'), 'Selected-marker updates must still flow through the map shell')
  assert(shellSource.includes('onSelectLead={setSelectedLeadId}'), 'Map shell pin selection wiring missing')

  assert.equal(formatMapMarketLabel('albuquerque, nm'), 'Albuquerque, NM', 'Lowercase city/state market should format safely')
  assert.equal(formatMapMarketLabel('Albuquerque, NM'), 'Albuquerque, NM', 'Already formatted market should remain stable')
  assert.equal(formatMapMarketLabel('São Paulo / Zone 7'), 'São Paulo / Zone 7', 'Unknown market grammar must be preserved')
  assert.equal(formatMapMarketLabel(null), null, 'Missing market should remain absent')
  assert(helpersSource.includes('formatMapMarketLabel'), 'Safe market formatter missing from map helpers')

  assert(sheetSource.includes('data-cp25b-selected-lead-sheet'), 'CP25B selected lead sheet marker missing')
  assert(sheetSource.includes('Read-only saved lead details.'), 'Selected lead sheet must state its read-only purpose')
  assert(sheetSource.includes('formatMapMarketLabel(lead.market)'), 'Sheet must use the safe market formatter')
  assert(sheetSource.includes('LIFECYCLE_LABELS[lead.lifecycleStatus]'), 'Sheet must show lifecycle evidence')
  assert(sheetSource.includes('formatLeadDate(lead.updatedAtIso)'), 'Sheet must show updated evidence')
  assert(sheetSource.includes('lead.source'), 'Sheet must show persisted source evidence')
  assert(sheetSource.includes("label={phoneHref ? 'Call' : 'No phone'}"), 'Sheet phone action must be evidence gated')
  assert(sheetSource.includes("label={websiteHref ? 'Website' : 'No website'}"), 'Sheet website action must be evidence gated')
  assert(sheetSource.includes("label={directionsHref ? 'Directions' : 'No directions'}"), 'Sheet directions action must be evidence gated')
  assert(sheetSource.includes(`/app/leads/${'${lead.id}'}`), 'Sheet must retain the saved-lead profile link')
  assert(sheetSource.includes('grid-cols-2'), 'Selected lead actions must use a compact mobile grid')
  assert(sheetSource.includes('rounded-t-[32px]'), 'Selected lead sheet needs a large rounded top edge')
  assert(!/updateSavedLead|createSavedLead|deleteSavedLead|insert|upsert|runSweep|startSweep|Mark as Contacted|Mark as Won|Dismiss/.test(sheetSource), 'Selected lead sheet must remain mutation-free')

  const fixture = row()
  assert.equal(leadWebsiteHref(fixture), 'https://mymarket.example/', 'Bare website domains must remain safely normalized')
  assert.equal(leadWebsiteHref(row({ website: 'javascript:alert(1)' })), null, 'Unsafe website protocols must remain blocked')
  assert(leadDirectionsHref(fixture)?.includes('3440%20Isleta%20Blvd'), 'Directions must prefer the persisted address')
  assert(leadDirectionsHref(row({ address: null }))?.includes('35.041%2C-106.679'), 'Directions must fall back to persisted coordinates')

  const features = buildLeadFeatureCollection([fixture as SavedLeadPipelineRow & { latitude: number; longitude: number }], fixture.id)
  assert.equal(features.features[0]?.properties.name, 'My Market', 'Feature metadata must include the saved business name')
  assert.equal(features.features[0]?.properties.selected, true, 'Feature metadata must preserve selected state')
  assert(!JSON.stringify(features).match(/signal|score|opportunit|rating/i), 'Map metadata must stay free of score/signal/opportunity fields')

  const productSource = `${canvasSource}\n${shellSource}\n${helpersSource}\n${sheetSource}`
  assert(!/navigator\.geolocation|watchPosition|getCurrentPosition/.test(productSource), 'CP25B must not request geolocation')
  assert(!/coral/i.test(productSource), 'CP25B must not introduce coral styling')
  assert(!/rating|hours|distance|photo gallery/i.test(productSource), 'CP25B must not invent consumer-map evidence')

  const changed = changedFiles()
  const allowed = new Set([
    'components/app/map/MapCanvas.tsx',
    'components/app/map/MapShell.tsx',
    'components/app/map/SelectedLeadSheet.tsx',
    'components/app/map/map-helpers.ts',
    'scripts/pm/cp25b-map-selected-pin-sheet-polish-smoke.ts',
  ])
  const required = [
    'components/app/map/MapCanvas.tsx',
    'components/app/map/SelectedLeadSheet.tsx',
    'components/app/map/map-helpers.ts',
    'scripts/pm/cp25b-map-selected-pin-sheet-polish-smoke.ts',
  ].sort()
  assert.deepEqual(changed.filter((path) => !allowed.has(path)), [], 'CP25B changed files must stay inside the approved file fence')
  assert.deepEqual(changed, required, 'CP25B changed files must match the narrow implementation set')

  assertNoChangedPath(changed, (path) => path === 'package.json' || path === 'package-lock.json', 'Package file changed')
  assertNoChangedPath(changed, (path) => path.startsWith('db/') || path === 'drizzle.config.ts', 'DB/schema file changed')
  assertNoChangedPath(changed, (path) => path.startsWith('lib/providers/') || path.startsWith('lib/runtime/'), 'Provider/runtime file changed')
  assertNoChangedPath(changed, (path) => /auth|clerk|billing|stripe|admin|settings/i.test(path), 'Auth/billing/admin/settings file changed')
  assertNoChangedPath(changed, (path) => /chat|FetchView|MyLeadsView|MobileHeader|MobileBottomNav|Sidebar/i.test(path), 'Protected product surface changed')
  assertNoChangedPath(changed, (path) => path.startsWith('app/'), 'Route or app-shell file changed')
  assertNoChangedPath(changed, (path) => path === 'scripts/pm/cp25a-map-tab-fable-port-smoke.ts', 'CP25A smoke changed')
  assertNoChangedPath(changed, (path) => path === 'replit.md' || path === 'FETCHI_CLAUDE_CODE_BRIEF.md', 'Control document changed')

  const baseRoutes = routeFilesFromGit('origin/main')
  const currentRoutes = routeFilesFromWorktree()
  assert.deepEqual(currentRoutes, baseRoutes, 'Route file list changed')

  console.log(JSON.stringify({
    ok: true,
    mode: 'cp25b_map_selected_pin_sheet_polish',
    changedFilesAllowedOnly: true,
    routeCount: currentRoutes.length,
    closeZoomBusinessLabels: true,
    selectedPinDistinct: true,
    clusterExpansionPreserved: true,
    pinSelectionPreserved: true,
    safeMarketFormatting: true,
    readOnlyLeadSheet: true,
    safeActions: true,
    geolocationAbsent: true,
    consumerEvidenceNotInvented: true,
  }, null, 2))
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
