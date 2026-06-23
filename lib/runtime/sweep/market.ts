import type { SweepMarketPlan } from './types'

const STATE_MARKETS: Record<string, string[]> = {
  texas: ['Houston', 'Dallas-Fort Worth', 'Austin', 'San Antonio'],
  tx: ['Houston', 'Dallas-Fort Worth', 'Austin', 'San Antonio'],
  california: ['Los Angeles', 'San Diego', 'San Francisco Bay Area', 'Sacramento'],
  ca: ['Los Angeles', 'San Diego', 'San Francisco Bay Area', 'Sacramento'],
  florida: ['Miami', 'Orlando', 'Tampa', 'Jacksonville'],
  fl: ['Miami', 'Orlando', 'Tampa', 'Jacksonville'],
  'new mexico': ['Albuquerque', 'Santa Fe', 'Las Cruces'],
  nm: ['Albuquerque', 'Santa Fe', 'Las Cruces'],
}

const NATIONAL_MARKETS = [
  'New York City',
  'Los Angeles',
  'Chicago',
  'Houston',
  'Phoenix',
  'Dallas-Fort Worth',
  'Atlanta',
  'Miami',
  'Denver',
  'Seattle',
]

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
  return compact(value).toLowerCase().replace(/\.$/, '')
}

export function interpretSweepMarket(input: string): SweepMarketPlan {
  const cleaned = compact(input)
  const key = keyFor(cleaned)

  if (NATIONAL_INPUTS.has(key)) {
    return {
      kind: 'nationwide',
      input: cleaned,
      markets: [...NATIONAL_MARKETS],
    }
  }

  const stateMarkets = STATE_MARKETS[key]
  if (stateMarkets) {
    return {
      kind: 'state',
      input: cleaned,
      markets: [...stateMarkets],
    }
  }

  return {
    kind: 'city_metro',
    input: cleaned,
    markets: [cleaned],
  }
}
