'use client'

import 'mapbox-gl/dist/mapbox-gl.css'

import { useEffect, useMemo, useRef } from 'react'
import { Minus, Plus } from 'lucide-react'
import type { LeadFeatureCollection, MappableSavedLead } from './map-helpers'
import { buildLeadFeatureCollection } from './map-helpers'

type MapboxModule = typeof import('mapbox-gl')
type MapboxMap = import('mapbox-gl').Map
type MapboxMarker = import('mapbox-gl').Marker
type MapboxGeoJSONSource = import('mapbox-gl').GeoJSONSource
type MapboxMapLayerMouseEvent = import('mapbox-gl').MapLayerMouseEvent
type MapboxLngLatBounds = import('mapbox-gl').LngLatBounds

export type MapInitFailureReason =
  | 'missing_token'
  | 'webgl_unsupported'
  | 'import_failed'
  | 'constructor_failed'
  | 'load_timeout'

type MapDiagnosticReason = MapInitFailureReason | 'mapbox_error_before_load' | 'mapbox_error_after_load'

type Props = {
  leads: MappableSavedLead[]
  selectedLeadId: string | null
  onSelectLead: (leadId: string) => void
  onReady: () => void
  onError: (reason: MapInitFailureReason) => void
  fitKey: string
}

const SOURCE_ID = 'cp25a-saved-leads'
const CLUSTER_LAYER_ID = 'cp25a-saved-leads-clusters'
const CLUSTER_COUNT_LAYER_ID = 'cp25a-saved-leads-cluster-count'
const PIN_LAYER_ID = 'cp25a-saved-leads-pins'
const PIN_LABEL_LAYER_ID = 'cp25a-saved-leads-pin-labels'
const PIN_NAME_LAYER_ID = 'cp25b-saved-lead-names'
const CLOSE_ZOOM_LABEL_MIN_ZOOM = 15
const MAP_LOAD_TIMEOUT_MS = 12_000

function tokenColor(name: string, fallback: string): string {
  if (typeof window === 'undefined') return fallback
  const value = getComputedStyle(document.documentElement).getPropertyValue(name).trim()
  if (!value) return fallback

  const channels = value.split(/\s+/)
  if (channels.length !== 3) return fallback

  const numericChannels = channels.map(Number)
  if (numericChannels.some((channel) => !Number.isFinite(channel) || channel < 0 || channel > 255)) {
    return fallback
  }

  return `rgb(${numericChannels.join(', ')})`
}

function featureCollectionToData(collection: LeadFeatureCollection) {
  return collection as unknown as GeoJSON.FeatureCollection<GeoJSON.Point>
}

function safeDiagnosticMessage(detail: unknown): string | undefined {
  const raw =
    detail instanceof Error
      ? `${detail.name}: ${detail.message}`
      : typeof detail === 'string'
        ? detail
        : typeof detail === 'object' && detail && 'message' in detail
          ? String((detail as { message?: unknown }).message ?? '')
          : undefined

  if (!raw) return undefined

  return raw
    .replace(/access_token=[^&\s]+/gi, 'access_token=[redacted]')
    .replace(/pk\.[A-Za-z0-9._-]+/g, '[mapbox-token]')
}

function warnMapDiagnostic(reason: MapDiagnosticReason, detail?: unknown) {
  if (process.env.NODE_ENV !== 'development') return

  const message = safeDiagnosticMessage(detail)
  console.warn('[CP25A map init]', message ? { reason, message } : { reason })
}

function zoomMap(map: MapboxMap | null, direction: 'in' | 'out') {
  if (!map || !map.isStyleLoaded()) return

  if (direction === 'in') {
    map.zoomIn({ duration: 260 })
    return
  }

  map.zoomOut({ duration: 260 })
}

export function MapCanvas({
  leads,
  selectedLeadId,
  onSelectLead,
  onReady,
  onError,
  fitKey,
}: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const mapRef = useRef<MapboxMap | null>(null)
  const markerCtorRef = useRef<MapboxModule['Marker'] | null>(null)
  const selectedMarkerRef = useRef<MapboxMarker | null>(null)
  const boundsCtorRef = useRef<MapboxModule['LngLatBounds'] | null>(null)
  const lastFitKeyRef = useRef<string>('')
  const onSelectLeadRef = useRef(onSelectLead)
  const featureCollection = useMemo(
    () => buildLeadFeatureCollection(leads, selectedLeadId),
    [leads, selectedLeadId],
  )

  useEffect(() => {
    onSelectLeadRef.current = onSelectLead
  }, [onSelectLead])

  useEffect(() => {
    let cancelled = false
    let map: MapboxMap | null = null
    let mapLoaded = false
    let loadTimeout: number | null = null
    let cleanupMapInteractions: (() => void) | null = null

    const clearLoadTimeout = () => {
      if (loadTimeout !== null) {
        window.clearTimeout(loadTimeout)
        loadTimeout = null
      }
    }

    const failMap = (reason: MapInitFailureReason, detail?: unknown) => {
      if (cancelled) return
      clearLoadTimeout()
      warnMapDiagnostic(reason, detail)
      onError(reason)
    }

    async function initMap() {
      const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN?.trim()
      if (!token) {
        failMap('missing_token')
        return
      }

      if (!containerRef.current) {
        failMap('constructor_failed', 'container_missing')
        return
      }

      let mapboxgl: MapboxModule['default']
      try {
        mapboxgl = (await import('mapbox-gl')).default
      } catch (error) {
        failMap('import_failed', error)
        return
      }

      if (cancelled) return

      if (typeof mapboxgl.supported === 'function' && !mapboxgl.supported()) {
        failMap('webgl_unsupported')
        return
      }

      try {
        mapboxgl.accessToken = token
        boundsCtorRef.current = mapboxgl.LngLatBounds
        markerCtorRef.current = mapboxgl.Marker
        map = new mapboxgl.Map({
          container: containerRef.current,
          style: 'mapbox://styles/mapbox/dark-v11',
          center: [-98.5795, 39.8283],
          zoom: 3.2,
          attributionControl: true,
        })
        mapRef.current = map
      } catch (error) {
        failMap('constructor_failed', error)
        return
      }

      loadTimeout = window.setTimeout(() => {
        if (!mapLoaded) {
          failMap('load_timeout')
        }
      }, MAP_LOAD_TIMEOUT_MS)

      map.on('error', (event: { error?: unknown }) => {
        warnMapDiagnostic(
          mapLoaded ? 'mapbox_error_after_load' : 'mapbox_error_before_load',
          event.error ?? event,
        )
      })

      map.on('load', () => {
        if (!map) return
        try {
          mapLoaded = true
          clearLoadTimeout()
          addLayers(map)
          cleanupMapInteractions?.()
          cleanupMapInteractions = registerMapInteractions(map, (leadId) => {
            onSelectLeadRef.current(leadId)
          })
          setSourceData(map, featureCollection)
          selectedMarkerRef.current = syncSelectedMarker(
            map,
            markerCtorRef.current,
            selectedMarkerRef.current,
            featureCollection,
          )
          fitFeatures(map, boundsCtorRef.current, featureCollection, true)
          lastFitKeyRef.current = fitKey
          onReady()
        } catch (error) {
          failMap('constructor_failed', error)
        }
      })
    }

    initMap()

    return () => {
      cancelled = true
      clearLoadTimeout()
      cleanupMapInteractions?.()
      selectedMarkerRef.current?.remove()
      selectedMarkerRef.current = null
      markerCtorRef.current = null
      if (map) {
        map.remove()
      }
      mapRef.current = null
    }
  }, [])

  useEffect(() => {
    const map = mapRef.current
    if (!map?.isStyleLoaded()) return
    setSourceData(map, featureCollection)
    selectedMarkerRef.current = syncSelectedMarker(
      map,
      markerCtorRef.current,
      selectedMarkerRef.current,
      featureCollection,
    )
  }, [featureCollection])

  useEffect(() => {
    const map = mapRef.current
    if (!map?.isStyleLoaded()) return
    if (lastFitKeyRef.current === fitKey) return
    fitFeatures(map, boundsCtorRef.current, featureCollection, false)
    lastFitKeyRef.current = fitKey
  }, [featureCollection, fitKey])

  return (
    <>
      <div
        ref={containerRef}
        data-cp25a-mapbox-canvas
        className="absolute inset-0 h-full min-h-[560px] bg-raised"
        style={{ minHeight: 'max(560px, calc(100dvh - 9rem))' }}
        aria-label="Saved lead map"
      />
      <div
        data-cp25b2-map-zoom-controls
        className="pointer-events-auto absolute bottom-[max(5.5rem,env(safe-area-inset-bottom))] right-4 z-10 overflow-hidden divide-y divide-text/16 rounded-[22px] border border-text/12 bg-raised/95 shadow-xl shadow-black/35 backdrop-blur-sm lg:bottom-8 lg:right-6"
      >
        <button
          type="button"
          onClick={() => zoomMap(mapRef.current, 'in')}
          className="grid h-14 w-14 place-items-center text-text transition hover:bg-text/10 active:bg-text/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-text/65"
          aria-label="Zoom in"
        >
          <Plus className="h-6 w-6 stroke-[2.5]" aria-hidden="true" />
        </button>
        <button
          type="button"
          onClick={() => zoomMap(mapRef.current, 'out')}
          className="grid h-14 w-14 place-items-center text-text transition hover:bg-text/10 active:bg-text/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-text/65"
          aria-label="Zoom out"
        >
          <Minus className="h-6 w-6 stroke-[2.5]" aria-hidden="true" />
        </button>
      </div>
    </>
  )
}

function createSelectedMarkerElement(initials: string, businessName: string): HTMLDivElement {
  const root = document.createElement('div')
  root.setAttribute('data-cp25b1-selected-marker', '')
  root.setAttribute('aria-hidden', 'true')
  root.className = 'pointer-events-none relative h-[78px] w-[66px] select-none'

  const tail = document.createElement('span')
  tail.className =
    'absolute left-1/2 top-[39px] h-7 w-7 -translate-x-1/2 rotate-45 rounded-[6px] border-b-2 border-r-2 border-border bg-bg shadow-lg shadow-black/45'

  const outer = document.createElement('span')
  outer.className =
    'absolute inset-x-0 top-0 grid h-[66px] w-[66px] place-items-center rounded-full border-2 border-border bg-bg shadow-xl shadow-black/55'

  const center = document.createElement('span')
  center.className =
    'grid h-[54px] w-[54px] place-items-center rounded-full border border-text/30 bg-warn text-[15px] font-black text-bg shadow-inner'
  center.textContent = initials
  outer.append(center)

  const anchor = document.createElement('span')
  anchor.setAttribute('data-cp25b1-selected-marker-anchor', '')
  anchor.className =
    'absolute bottom-0 left-1/2 grid h-[15px] w-[15px] -translate-x-1/2 place-items-center rounded-full bg-bg shadow-md shadow-black/60'

  const anchorCenter = document.createElement('span')
  anchorCenter.className = 'h-[7px] w-[7px] rounded-full bg-warn'
  anchor.append(anchorCenter)

  const name = document.createElement('span')
  name.setAttribute('data-cp25b1-selected-marker-name', '')
  name.className =
    'absolute left-1/2 top-[84px] w-max -translate-x-1/2 overflow-hidden text-center text-[14px] font-bold leading-[1.15] text-text'
  name.style.maxWidth = '180px'
  name.style.display = '-webkit-box'
  name.style.webkitBoxOrient = 'vertical'
  name.style.webkitLineClamp = '2'
  name.style.textShadow = '0 1px 2px rgb(0 0 0 / 0.95), 0 0 5px rgb(0 0 0 / 0.9)'
  name.textContent = businessName

  root.append(tail, outer, anchor, name)
  return root
}

function syncSelectedMarker(
  map: MapboxMap,
  MarkerCtor: MapboxModule['Marker'] | null,
  currentMarker: MapboxMarker | null,
  featureCollection: LeadFeatureCollection,
): MapboxMarker | null {
  currentMarker?.remove()

  const selectedFeature = featureCollection.features.find((feature) => feature.properties.selected)
  if (!MarkerCtor || !selectedFeature) return null

  return new MarkerCtor({
    element: createSelectedMarkerElement(
      selectedFeature.properties.initials,
      selectedFeature.properties.name,
    ),
    anchor: 'bottom',
    offset: [0, -2],
  })
    .setLngLat(selectedFeature.geometry.coordinates)
    .addTo(map)
}

function registerMapInteractions(
  map: MapboxMap,
  onSelectLead: (leadId: string) => void,
): () => void {
  if (
    !map.getSource(SOURCE_ID) ||
    !map.getLayer(CLUSTER_LAYER_ID) ||
    !map.getLayer(PIN_LAYER_ID)
  ) {
    return () => undefined
  }

  const handleClusterClick = (event: MapboxMapLayerMouseEvent) => {
    const feature = map.queryRenderedFeatures(event.point, { layers: [CLUSTER_LAYER_ID] })[0]
    const clusterId = feature?.properties?.cluster_id
    if (clusterId === undefined || !feature.geometry || feature.geometry.type !== 'Point') return

    const source = map.getSource(SOURCE_ID) as MapboxGeoJSONSource | undefined
    source?.getClusterExpansionZoom(Number(clusterId), (error, zoom) => {
      if (error || typeof zoom !== 'number' || feature.geometry.type !== 'Point') return
      map.easeTo({
        center: feature.geometry.coordinates as [number, number],
        zoom,
        duration: 450,
      })
    })
  }

  const handlePinClick = (event: MapboxMapLayerMouseEvent) => {
    const id = event.features?.[0]?.properties?.id
    if (typeof id === 'string' && id) {
      onSelectLead(id)
    }
  }

  const setPointer = () => {
    map.getCanvas().style.cursor = 'pointer'
  }
  const resetPointer = () => {
    map.getCanvas().style.cursor = ''
  }

  map.on('click', CLUSTER_LAYER_ID, handleClusterClick)
  map.on('click', PIN_LAYER_ID, handlePinClick)
  map.on('mouseenter', CLUSTER_LAYER_ID, setPointer)
  map.on('mouseenter', PIN_LAYER_ID, setPointer)
  map.on('mouseleave', CLUSTER_LAYER_ID, resetPointer)
  map.on('mouseleave', PIN_LAYER_ID, resetPointer)

  return () => {
    map.off('click', CLUSTER_LAYER_ID, handleClusterClick)
    map.off('click', PIN_LAYER_ID, handlePinClick)
    map.off('mouseenter', CLUSTER_LAYER_ID, setPointer)
    map.off('mouseenter', PIN_LAYER_ID, setPointer)
    map.off('mouseleave', CLUSTER_LAYER_ID, resetPointer)
    map.off('mouseleave', PIN_LAYER_ID, resetPointer)
  }
}

function addLayers(map: MapboxMap) {
  if (map.getSource(SOURCE_ID)) return

  map.addSource(SOURCE_ID, {
    type: 'geojson',
    data: {
      type: 'FeatureCollection',
      features: [],
    },
    cluster: true,
    clusterMaxZoom: 14,
    clusterRadius: 58,
  })

  const bg = tokenColor('--bg', 'rgb(16, 18, 17)')
  const text = tokenColor('--text', 'rgb(247, 243, 232)')
  const border = tokenColor('--border', 'rgb(45, 51, 46)')
  const warn = tokenColor('--warn', 'rgb(234, 185, 70)')
  const blue = tokenColor('--blue', 'rgb(111, 159, 216)')
  const ok = tokenColor('--ok', 'rgb(69, 192, 138)')
  const bad = tokenColor('--bad', 'rgb(239, 90, 78)')

  map.addLayer({
    id: CLUSTER_LAYER_ID,
    type: 'circle',
    source: SOURCE_ID,
    filter: ['has', 'point_count'],
    paint: {
      'circle-color': 'rgb(247, 243, 232)',
      'circle-radius': ['step', ['get', 'point_count'], 22, 8, 28, 24, 34],
      'circle-stroke-width': 5,
      'circle-stroke-color': bg,
      'circle-opacity': 0.94,
    },
  })

  map.addLayer({
    id: CLUSTER_COUNT_LAYER_ID,
    type: 'symbol',
    source: SOURCE_ID,
    filter: ['has', 'point_count'],
    layout: {
      'text-field': ['get', 'point_count_abbreviated'],
      'text-font': ['Open Sans Bold', 'Arial Unicode MS Bold'],
      'text-size': 13,
      'text-allow-overlap': true,
    },
    paint: {
      'text-color': 'rgb(16, 18, 17)',
    },
  })

  map.addLayer({
    id: PIN_LAYER_ID,
    type: 'circle',
    source: SOURCE_ID,
    filter: ['all', ['!', ['has', 'point_count']], ['==', ['get', 'selected'], false]],
    paint: {
      'circle-color': [
        'match',
        ['get', 'lifecycleStatus'],
        'saved',
        warn,
        'contacted',
        blue,
        'won',
        ok,
        'lost',
        bad,
        'dismissed',
        bad,
        warn,
      ],
      'circle-opacity': [
        'match',
        ['get', 'lifecycleStatus'],
        'lost',
        0.72,
        'dismissed',
        0.58,
        0.96,
      ],
      'circle-radius': 21,
      'circle-stroke-width': 4,
      'circle-stroke-color': border,
    },
  })

  map.addLayer({
    id: PIN_LABEL_LAYER_ID,
    type: 'symbol',
    source: SOURCE_ID,
    filter: ['all', ['!', ['has', 'point_count']], ['==', ['get', 'selected'], false]],
    layout: {
      'text-field': ['get', 'initials'],
      'text-font': ['Open Sans Bold', 'Arial Unicode MS Bold'],
      'text-size': 12,
      'text-allow-overlap': true,
      'text-ignore-placement': true,
    },
    paint: {
      'text-color': bg,
    },
  })

  map.addLayer({
    id: PIN_NAME_LAYER_ID,
    type: 'symbol',
    source: SOURCE_ID,
    minzoom: CLOSE_ZOOM_LABEL_MIN_ZOOM,
    filter: ['all', ['!', ['has', 'point_count']], ['==', ['get', 'selected'], false]],
    layout: {
      'text-field': ['get', 'name'],
      'text-font': ['Open Sans Semibold', 'Arial Unicode MS Regular'],
      'text-size': 11.5,
      'text-variable-anchor': ['top', 'bottom', 'left', 'right'],
      'text-radial-offset': 1.9,
      'text-justify': 'auto',
      'text-max-width': 10,
      'text-line-height': 1.15,
      'text-padding': 6,
      'text-optional': true,
    },
    paint: {
      'text-color': text,
      'text-halo-color': bg,
      'text-halo-width': 1.5,
      'text-halo-blur': 0.5,
    },
  })
}

function setSourceData(map: MapboxMap, featureCollection: LeadFeatureCollection) {
  const source = map.getSource(SOURCE_ID) as MapboxGeoJSONSource | undefined
  source?.setData(featureCollectionToData(featureCollection))
}

function fitFeatures(
  map: MapboxMap,
  BoundsCtor: MapboxModule['LngLatBounds'] | null,
  featureCollection: LeadFeatureCollection,
  immediate: boolean,
) {
  const features = featureCollection.features
  if (!features.length) return

  if (features.length === 1) {
    map.easeTo({
      center: features[0].geometry.coordinates,
      zoom: 12,
      duration: immediate ? 0 : 520,
      padding: { top: 104, bottom: 144, left: 42, right: 42 },
    })
    return
  }

  if (!BoundsCtor) return
  const bounds = features.reduce<MapboxLngLatBounds>((acc, feature) => {
    acc.extend(feature.geometry.coordinates)
    return acc
  }, new BoundsCtor(features[0].geometry.coordinates, features[0].geometry.coordinates))

  map.fitBounds(bounds, {
    padding: { top: 112, bottom: 156, left: 56, right: 56 },
    maxZoom: 13,
    duration: immediate ? 0 : 640,
  })
}
