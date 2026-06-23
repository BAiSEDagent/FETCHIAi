import type { SweepMarketPlan } from './types'
import { US_SWEEP_CITIES, type UsSweepCity } from './us-cities'

const STATE_MARKET_LIMIT = 5
const NATIONWIDE_MARKET_LIMIT = 10

const NATIONAL_INPUTS = new Set([
  'nationwide',
  'united states',
  'usa',
  'us',
  'national',
])

function compact(value: string): string {
  return value.replace(/\s+/g, ' ').trim()
}

function keyFor(value: string): string {
  return compact(value)
    .toLowerCase()
    .replace(/\./g, '')
    .replace(/,/g, '')
    .replace(/\s+/g, ' ')
}

function marketLabel(city: UsSweepCity): string {
  return `${city.city}, ${city.stateId}`
}

function byPopulationDesc(a: UsSweepCity, b: UsSweepCity): number {
  if (a.population !== b.population) return b.population - a.population
  return marketLabel(a).localeCompare(marketLabel(b))
}

const citiesByState = US_SWEEP_CITIES.reduce((map, city) => {
  const cities = map.get(city.stateName) ?? []
  cities.push(city)
  map.set(city.stateName, cities)
  return map
}, new Map<string, UsSweepCity[]>())

for (const cities of citiesByState.values()) {
  cities.sort(byPopulationDesc)
}

const stateNameByInput = new Map<string, string>()
for (const city of US_SWEEP_CITIES) {
  stateNameByInput.set(keyFor(city.stateName), city.stateName)
  stateNameByInput.set(keyFor(city.stateId), city.stateName)
}
stateNameByInput.set('district columbia', 'District of Columbia')
stateNameByInput.set('washington dc', 'District of Columbia')

function topMarkets(cities: readonly UsSweepCity[], limit: number): string[] {
  return [...cities]
    .sort(byPopulationDesc)
    .slice(0, limit)
    .map(marketLabel)
}

export function interpretSweepMarket(input: string): SweepMarketPlan {
  const cleaned = compact(input)
  const key = keyFor(cleaned)

  if (NATIONAL_INPUTS.has(key)) {
    return {
      kind: 'nationwide',
      input: cleaned,
      markets: topMarkets(US_SWEEP_CITIES, NATIONWIDE_MARKET_LIMIT),
    }
  }

  const stateName = stateNameByInput.get(key)
  const stateCities = stateName ? citiesByState.get(stateName) : null
  if (stateCities?.length) {
    return {
      kind: 'state',
      input: cleaned,
      markets: topMarkets(stateCities, STATE_MARKET_LIMIT),
    }
  }

  return {
    kind: 'city_metro',
    input: cleaned,
    markets: [cleaned],
  }
}
