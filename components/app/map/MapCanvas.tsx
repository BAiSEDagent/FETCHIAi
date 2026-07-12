'use client'

import 'mapbox-gl/dist/mapbox-gl.css'

import { useEffect, useMemo, useRef } from 'react'
import type { LeadFeatureCollection, MappableSavedLead } from './map-helpers'
import { buildLeadFeatureCollection } from './map-helpers'

type MapboxModule = typeof import('mapbox-gl')
type MapboxMap = import('mapbox-gl').Map
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
  const boundsCtorRef = useRef<MapboxModule['LngLatBounds'] | null>(null)
  const lastFitKeyRef = useRef<string>('')
  const featureCollection = useMemo(
    () => buildLeadFeatureCollection(leads, selectedLeadId),
    [leads, selectedLeadId],
  )

  useEffect(() => {
    let cancelled = false
    let map: MapboxMap | null = null
    let mapLoaded = false
    let loadTimeout: number | null = null

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
          setSourceData(map, featureCollection)
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
  }, [featureCollection])

  useEffect(() => {
    const map = mapRef.current
    if (!map?.isStyleLoaded()) return
    if (lastFitKeyRef.current === fitKey) return
    fitFeatures(map, boundsCtorRef.current, featureCollection, false)
    lastFitKeyRef.current = fitKey
  }, [featureCollection, fitKey])

  useEffect(() => {
    const map = mapRef.current
    if (!map) return

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
  }, [onSelectLead])

  return (
    <div
      ref={containerRef}
      data-cp25a-mapbox-canvas
      className="absolute inset-0 bg-raised"
      aria-label="Saved lead map"
    />
  )
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
    filter: ['!', ['has', 'point_count']],
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
      'circle-radius': ['case', ['==', ['get', 'selected'], true], 25, 21],
      'circle-stroke-width': ['case', ['==', ['get', 'selected'], true], 5, 4],
      'circle-stroke-color': ['case', ['==', ['get', 'selected'], true], text, border],
    },
  })

  map.addLayer({
    id: PIN_LABEL_LAYER_ID,
    type: 'symbol',
    source: SOURCE_ID,
    filter: ['!', ['has', 'point_count']],
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
