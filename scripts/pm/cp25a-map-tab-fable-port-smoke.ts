/**
 * CP25A - Map tab saved-lead Fable port smoke proof.
 *
 * Static and DB-free. Verifies the map tab stays scoped to saved leads,
 * rejects bad coordinates, keeps filters/search local, and preserves the
 * approved CP25A file fence.
 */

import assert from 'node:assert/strict'
import { execSync } from 'node:child_process'
import { readFileSync } from 'node:fs'

import type { SavedLeadPipelineRow } from '../../lib/runtime/sweep/saved-leads'
import {
  DEFAULT_MAP_FILTERS,
  buildLeadFeatureCollection,
  filterSavedLeadsForMap,
  getMappableSavedLeads,
  hasLeadAddress,
  hasLeadPhone,
  hasLeadWebsite,
  leadDirectionsHref,
  leadInitials,
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

function changedFilesBySource(): {
  baseDiff: string[]
  worktreeDiff: string[]
  stagedDiff: string[]
  untracked: string[]
  all: string[]
} {
  const baseDiff = changedFilesFor('git diff --name-only origin/main..HEAD')
  const worktreeDiff = changedFilesFor('git diff --name-only')
  const stagedDiff = changedFilesFor('git diff --name-only --cached')
  const untracked = changedFilesFor('git ls-files --others --exclude-standard')

  return {
    baseDiff: uniqueSorted(baseDiff),
    worktreeDiff: uniqueSorted(worktreeDiff),
    stagedDiff: uniqueSorted(stagedDiff),
    untracked: uniqueSorted(untracked),
    all: uniqueSorted([
      ...baseDiff,
      ...worktreeDiff,
      ...stagedDiff,
      ...untracked,
    ]),
  }
}

function assertNoChangedPath(changed: readonly string[], predicate: (path: string) => boolean, message: string) {
  const matches = changed.filter(predicate)
  assert.equal(matches.length, 0, `${message}: ${matches.join(', ')}`)
}

function blockAround(sourceText: string, marker: string, before = 900, after = 3600): string {
  const index = sourceText.indexOf(marker)
  assert(index >= 0, `Missing marker: ${marker}`)
  return sourceText.slice(Math.max(0, index - before), index + after)
}

function routeFilesFromGit(ref: string): string[] {
  const output = shell(`git ls-tree -r --name-only ${ref}`)
  return output
    .split('\n')
    .filter((path) => path.startsWith('app/') && (path.endsWith('/page.tsx') || path.endsWith('/route.ts')))
    .sort()
}

function routeFilesFromWorktree(): string[] {
  const output = shell('git ls-files app')
  return output
    .split('\n')
    .filter((path) => path.endsWith('/page.tsx') || path.endsWith('/route.ts'))
    .sort()
}

function row(overrides: Partial<SavedLeadPipelineRow>): SavedLeadPipelineRow {
  const id = overrides.id ?? `00000000-0000-4000-8000-${Math.random().toString().slice(2, 14).padEnd(12, '0')}`

  return {
    id,
    dedupeKey: `dedupe-${id}`,
    businessName: 'Rio Bravo Plumbing',
    website: null,
    phone: '',
    address: null,
    market: 'Albuquerque, NM',
    source: 'fixture',
    sourceUrl: null,
    category: 'Plumbing',
    email: null,
    owner: null,
    hook: null,
    latitude: 35.041,
    longitude: -106.679,
    lifecycleStatus: 'saved',
    note: null,
    sourceSweepRef: null,
    savedAtIso: '2026-07-01T00:00:00.000Z',
    updatedAtIso: '2026-07-01T00:00:00.000Z',
    lastSeenAtIso: '2026-07-01T00:00:00.000Z',
    savedAtMs: 1_788_278_400_000,
    updatedAtMs: 1_788_278_400_000,
    ...overrides,
  } as SavedLeadPipelineRow
}

async function main() {
  const canvasSource = source('components/app/map/MapCanvas.tsx')
  const tokenColorBlock = blockAround(canvasSource, 'function tokenColor', 0, 900)

  assert(!tokenColorBlock.includes('`rgb(${value})`'), 'Mapbox colors must not use CSS4 space-separated rgb() output')
  assert(tokenColorBlock.includes("split(/\\s+/)"), 'Mapbox token colors must split space-separated channels')
  assert(tokenColorBlock.includes("join(', ')"), 'Mapbox token colors must join channels with commas')
  assert(tokenColorBlock.includes('if (!value) return fallback'), 'Missing map color tokens must use their fallback')
  assert(tokenColorBlock.includes('channels.length !== 3'), 'Malformed map color tokens must use their fallback')
  assert(tokenColorBlock.includes('!Number.isFinite(channel)'), 'Map color token channels must be finite numbers')
  assert(tokenColorBlock.includes('channel < 0 || channel > 255'), 'Out-of-range map color channels must use their fallback')
  assert(!/rgb\(\s*\d+(?:\.\d+)?\s+\d+(?:\.\d+)?\s+\d+(?:\.\d+)?\s*\)/.test(canvasSource), 'Mapbox paint colors must not contain space-separated rgb() literals')
  const tokenColorFallbacks = Array.from(
    canvasSource.matchAll(/tokenColor\([^,]+,\s*'([^']+)'\)/g),
    (match) => match[1],
  )
  assert(tokenColorFallbacks.length > 0, 'Mapbox token colors must retain explicit fallback values')
  tokenColorFallbacks.forEach((fallback) => {
    assert.match(fallback, /^rgb\(\d+(?:\.\d+)?,\s*\d+(?:\.\d+)?,\s*\d+(?:\.\d+)?\)$/, `Invalid Mapbox fallback color: ${fallback}`)
  })

  const changedBySource = changedFilesBySource()
  const changed = changedBySource.all
  const allowedChangedFileList = [
    'components/app/map/MapCanvas.tsx',
    'scripts/pm/cp25a-map-tab-fable-port-smoke.ts',
  ].sort()
  const requiredTokenColorFixFiles = [
    'components/app/map/MapCanvas.tsx',
    'scripts/pm/cp25a-map-tab-fable-port-smoke.ts',
  ].sort()
  const allowedChangedFiles = new Set(allowedChangedFileList)
  const unexpectedChangedFiles = changed.filter((path) => !allowedChangedFiles.has(path))

  assert.deepEqual(unexpectedChangedFiles, [], 'CP25A changed files must stay inside the approved file fence')
  assert.deepEqual(changed.sort(), requiredTokenColorFixFiles, 'CP25A token color fix changed files must match the approved file fence')
  if (changedBySource.baseDiff.length > 0) {
    assert.deepEqual(
      changedBySource.baseDiff,
      requiredTokenColorFixFiles,
      'CP25A token color fix branch changed files must match the approved file fence',
    )
  }

  assertNoChangedPath(changed, (path) => path === 'package.json' || path === 'package-lock.json', 'Package file changed')
  assertNoChangedPath(changed, (path) => path.startsWith('db/') || path === 'drizzle.config.ts', 'DB/schema file changed')
  assertNoChangedPath(changed, (path) => path.startsWith('lib/providers/') || path.includes('/providers/'), 'Provider file changed')
  assertNoChangedPath(changed, (path) => path.startsWith('lib/runtime/'), 'Runtime file changed')
  assertNoChangedPath(changed, (path) => path.includes('auth') || path.includes('clerk'), 'Auth file changed')
  assertNoChangedPath(changed, (path) => path.includes('billing') || path.includes('stripe'), 'Billing file changed')
  assertNoChangedPath(changed, (path) => path.includes('/admin') || path.includes('/settings'), 'Admin/settings file changed')
  assertNoChangedPath(changed, (path) => path.includes('/chat') || path.includes('Chat'), 'Chat file changed')
  assertNoChangedPath(changed, (path) => path.startsWith('app/app/fetch') || path.includes('FetchView'), 'Fetch route file changed')
  assertNoChangedPath(changed, (path) => path.startsWith('app/app/leads/') || path.includes('MyLeadsView'), 'Leads route/view file changed')
  assertNoChangedPath(changed, (path) => path.startsWith('components/app/Mobile') || path.includes('Sidebar'), 'App shell file changed')
  assertNoChangedPath(changed, (path) => path.includes('signal') || path.includes('score') || path.includes('opportunit'), 'Signal/score/opportunity file changed')
  assertNoChangedPath(changed, (path) => /^scripts\/pm\/cp2[0-4]/i.test(path), 'Old checkpoint smoke changed')

  const baseRoutes = routeFilesFromGit('origin/main')
  const currentRoutes = routeFilesFromWorktree()
  assert.deepEqual(currentRoutes, baseRoutes, 'Route file list changed')

  const page = source('app/app/map/page.tsx')
  const shellSource = source('components/app/map/MapShell.tsx')
  const topBarSource = source('components/app/map/MapTopBar.tsx')
  const helpersSource = source('components/app/map/map-helpers.ts')
  const selectedSheet = source('components/app/map/SelectedLeadSheet.tsx')
  const filterSheet = source('components/app/map/MapFilterSheet.tsx')

  assert(page.includes('requireWorkspaceContext'), 'Map page must require workspace context')
  assert(page.includes('listSavedLeadsForWorkspace(ctx.workspaceId)'), 'Map page must read workspace-scoped saved leads')
  assert(page.includes('SavedLeadMapShell'), 'Map page must hand off to the client map shell')
  assert(!page.includes('NEXT_PUBLIC_MAPBOX_TOKEN'), 'Map page must not server-gate the map on the Mapbox token')
  assert(!page.includes('mapEnabled'), 'Map shell should let the client canvas own map init availability')

  assert(canvasSource.includes("'use client'"), 'Map canvas must be a client component')
  assert(canvasSource.includes("import 'mapbox-gl/dist/mapbox-gl.css'"), 'Mapbox CSS must be imported inside the map feature')
  assert(canvasSource.includes("import('mapbox-gl')"), 'Mapbox must be loaded behind a client-only dynamic import')
  assert(!/from ['"]mapbox-gl['"]/.test(canvasSource), 'Mapbox must not be statically imported')
  assert(canvasSource.includes('mapboxgl.supported()'), 'Mapbox WebGL support must be checked before constructing the map')
  assert(canvasSource.includes('missing_token'), 'Map init must distinguish a missing token')
  assert(canvasSource.includes('webgl_unsupported'), 'Map init must distinguish unsupported WebGL')
  assert(canvasSource.includes('import_failed'), 'Map init must distinguish Mapbox import failures')
  assert(canvasSource.includes('constructor_failed'), 'Map init must distinguish constructor failures')
  assert(canvasSource.includes('load_timeout'), 'Map init must distinguish load timeouts')
  assert(canvasSource.includes('mapbox_error_before_load'), 'Mapbox errors before load should be diagnostic-safe')
  assert(canvasSource.includes("console.warn('[CP25A map init]'"), 'Development diagnostics must be present')
  assert(canvasSource.includes('access_token=[redacted]'), 'Diagnostics must redact access token query params')
  assert(canvasSource.includes('[mapbox-token]'), 'Diagnostics must redact public token-shaped values')
  assert(!canvasSource.includes('catch {'), 'Map init must not silently swallow errors')
  assert(!canvasSource.includes("map.on('error', onError)"), 'Generic Mapbox errors must not directly collapse the map')
  assert(!page.includes('mapbox-gl'), 'Server page must not import Mapbox')
  assert(!/navigator\.geolocation|watchPosition|getCurrentPosition/.test(`${shellSource}\n${canvasSource}`), 'CP25A must not request browser geolocation')
  assert(!/updateSavedLead|createSavedLead|deleteSavedLead|insert|upsert|runSweep|startSweep/.test(`${shellSource}\n${selectedSheet}\n${helpersSource}`), 'Map tab must remain read-only')
  assert(!/coral/i.test(`${shellSource}\n${canvasSource}\n${helpersSource}\n${selectedSheet}\n${filterSheet}`), 'CP25A must not introduce coral styling')

  const readyBlock = blockAround(shellSource, 'data-cp25a-ready-map-shell', 0, 5200)
  assert(!readyBlock.includes('Run a sweep'), 'Ready map must not render Run a sweep copy')
  assert(!readyBlock.includes('Fetch leads'), 'Ready map must not render a persistent Fetch leads CTA')
  assert(!readyBlock.includes('/app/sweep'), 'Ready map must not link to Fetch as a persistent CTA')
  assert(topBarSource.includes('data-cp25a-ready-map-label'), 'Ready map chrome must include a compact Map label')
  assert(topBarSource.includes('>Map<') || topBarSource.includes('>\n          Map\n        </div>'), 'Ready map label text missing')

  const unavailableBlock = blockAround(shellSource, 'data-cp25a-map-unavailable-state', 0, 1400)
  assert(unavailableBlock.includes('Map is unavailable in this environment.'), 'Unavailable map title must use customer-safe copy')
  assert(unavailableBlock.includes('Your saved leads are still available in Leads.'), 'Unavailable map body must point customers back to Leads')
  assert(!/provider|api key|mapbox|token|NEXT_PUBLIC|process\.env/i.test(unavailableBlock), 'Unavailable map copy must not expose provider or environment internals')
  assert(unavailableBlock.includes('data-cp25a-map-failure-reason'), 'Unavailable map state must retain a non-secret diagnostic reason')

  assert(shellSource.includes('data-cp25a-map-loading-state'), 'Loading state missing')
  assert(shellSource.includes('data-cp25a-map-no-saved-state'), 'No saved leads state missing')
  assert(shellSource.includes('data-cp25a-map-no-geo-state'), 'No geo leads state missing')
  assert(shellSource.includes('data-cp25a-map-unavailable-state'), 'Unavailable map state missing')
  assert(shellSource.includes('data-cp25a-map-no-results-state'), 'No results state missing')
  assert(selectedSheet.includes('data-cp25a-selected-lead-sheet'), 'Selected lead sheet missing')
  assert(filterSheet.includes('data-cp25a-filter-sheet'), 'Filter sheet missing')

  const valid = row({ id: 'valid', latitude: 35, longitude: -106 })
  const nullLat = row({ id: 'null-lat', latitude: null, longitude: -106 })
  const nullLng = row({ id: 'null-lng', latitude: 35, longitude: null })
  const badLat = row({ id: 'bad-lat', latitude: 91, longitude: -106 })
  const badLng = row({ id: 'bad-lng', latitude: 35, longitude: -181 })
  const infinity = row({ id: 'infinity', latitude: Number.POSITIVE_INFINITY, longitude: -106 })
  const stringLat = row({ id: 'string-lat', latitude: '35' as unknown as number, longitude: -106 })
  assert.deepEqual(
    getMappableSavedLeads([valid, nullLat, nullLng, badLat, badLng, infinity, stringLat]).map((lead) => lead.id),
    ['valid'],
    'Only finite in-range numeric coordinates should map',
  )

  const leads = getMappableSavedLeads([
    row({
      id: 'saved-with-all',
      businessName: 'Rio Bravo Plumbing',
      lifecycleStatus: 'saved',
      address: '3440 Isleta Blvd SW, Albuquerque, NM 87105',
      phone: ' 505-555-0101 ',
      website: 'example.com',
      category: 'Plumbing',
    }),
    row({
      id: 'contacted-phone-only',
      businessName: 'East Mesa HVAC',
      lifecycleStatus: 'contacted',
      address: '',
      phone: '505-555-0102',
      website: null,
      category: 'HVAC',
    }),
    row({
      id: 'won-website-only',
      businessName: 'North Valley Roofing',
      lifecycleStatus: 'won',
      address: null,
      phone: '',
      website: 'https://roof.example',
      category: 'Roofing',
    }),
    row({
      id: 'dismissed-address-only',
      businessName: 'Closed South Valley Cleaner',
      lifecycleStatus: 'dismissed',
      address: 'Old Coors Rd SW',
      phone: '',
      website: null,
      category: 'Cleaning',
    }),
  ])

  assert.deepEqual(
    filterSavedLeadsForMap(leads, { ...DEFAULT_MAP_FILTERS, lifecycleStatuses: ['saved', 'won'] }, '').map((lead) => lead.id),
    ['saved-with-all', 'won-website-only'],
    'Lifecycle filtering should be local and multi-select',
  )
  assert.deepEqual(
    filterSavedLeadsForMap(leads, { ...DEFAULT_MAP_FILTERS, requiresAddress: true }, '').map((lead) => lead.id),
    ['saved-with-all', 'dismissed-address-only'],
    'Address filter should use saved lead address presence',
  )
  assert.deepEqual(
    filterSavedLeadsForMap(leads, { ...DEFAULT_MAP_FILTERS, requiresPhone: true }, '').map((lead) => lead.id),
    ['saved-with-all', 'contacted-phone-only'],
    'Phone filter should use saved lead phone presence',
  )
  assert.deepEqual(
    filterSavedLeadsForMap(leads, { ...DEFAULT_MAP_FILTERS, requiresWebsite: true }, '').map((lead) => lead.id),
    ['saved-with-all', 'won-website-only'],
    'Website filter should use safe website presence',
  )
  assert.deepEqual(
    filterSavedLeadsForMap(leads, { ...DEFAULT_MAP_FILTERS, requiresWebsite: true }, 'roof').map((lead) => lead.id),
    ['won-website-only'],
    'Search should intersect with filters',
  )
  assert.deepEqual(
    filterSavedLeadsForMap(leads, DEFAULT_MAP_FILTERS, 'isleta').map((lead) => lead.id),
    ['saved-with-all'],
    'Search should include saved lead addresses',
  )

  assert.equal(hasLeadAddress(leads[0]), true, 'Address gating should accept trimmed address')
  assert.equal(hasLeadPhone(leads[0]), true, 'Phone gating should accept trimmed phone')
  assert.equal(hasLeadWebsite(leads[0]), true, 'Website gating should accept bare domains')
  assert.equal(leadWebsiteHref(leads[0]), 'https://example.com/', 'Bare domains should be normalized to https')
  assert.equal(leadWebsiteHref(row({ website: 'javascript:alert(1)' })), null, 'Unsafe website protocols must be blocked')
  assert.equal(leadWebsiteHref(row({ website: 'mailto:test@example.com' })), null, 'Non-web website protocols must be blocked')
  assert(leadDirectionsHref(leads[0])?.includes('3440%20Isleta%20Blvd'), 'Directions should prefer address when present')
  assert(leadDirectionsHref(row({ address: null, latitude: 35.123, longitude: -106.456 }))?.includes('35.123%2C-106.456'), 'Directions should fall back to coordinates')
  assert.equal(leadInitials(row({ businessName: 'Circle K' })), 'CK', 'Initials should derive from business name')
  assert.equal(leadInitials(row({ businessName: '7 Brew Drive Thru' })), '7B', 'Initials should support numeric names')

  const features = buildLeadFeatureCollection(leads, 'won-website-only')
  assert.equal(features.type, 'FeatureCollection', 'Map data must be GeoJSON')
  assert.equal(features.features.length, 4, 'Feature collection should include filtered mappable leads')
  assert.equal(features.features[2]?.properties?.selected, true, 'Selected marker metadata missing')
  assert.equal(features.features[0]?.properties?.lifecycleStatus, 'saved', 'Lifecycle metadata missing')
  assert(!JSON.stringify(features).match(/signal|score|opportunit|rating/i), 'Map metadata must not include signal/score/opportunity fields')

  console.log(JSON.stringify({
    ok: true,
    mode: 'cp25a_map_tab_fable_port',
    changedFilesAllowedOnly: true,
    protectedFilesChanged: false,
    routeCountUnchanged: currentRoutes.length,
    mapboxClientOnly: true,
    geolocationAbsent: true,
    readOnlySurface: true,
    noPersistentFetchCtaInReadyMap: true,
    invalidCoordinatesRejected: true,
    filtersLocalOnly: true,
    searchIntersectsFilters: true,
    actionFieldGating: true,
    featureMetadataClean: true,
  }, null, 2))
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
