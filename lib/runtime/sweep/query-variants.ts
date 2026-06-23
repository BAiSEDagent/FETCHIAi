import {
  CP22A_DEFAULT_MAX_PAGES_PER_QUERY,
  CP22A_DEFAULT_MAX_SERPAPI_CALLS,
  type SerpApiMapsCallPlan,
  type SweepRequest,
} from './types'
import { interpretSweepMarket } from './market'

function compact(value: string): string {
  return value.replace(/\s+/g, ' ').trim()
}

function clampPositiveInteger(value: number | undefined, fallback: number): number {
  if (!Number.isFinite(value) || !value || value < 1) return fallback
  return Math.floor(value)
}

export function buildSweepQueries(input: {
  service: string
  icp: string
  market: string
}): string[] {
  const service = compact(input.service)
  const icp = compact(input.icp)
  const market = compact(input.market)

  return [
    `${icp} ${market}`,
    `${icp} near ${market}`,
    `${service} for ${icp} ${market}`,
    `${icp} businesses ${market}`,
  ]
}

export function planSerpApiMapsCalls(request: SweepRequest): SerpApiMapsCallPlan[] {
  const maxCalls = Math.min(
    CP22A_DEFAULT_MAX_SERPAPI_CALLS,
    clampPositiveInteger(request.maxCalls, CP22A_DEFAULT_MAX_SERPAPI_CALLS),
  )
  const maxPagesPerQuery = clampPositiveInteger(
    request.maxPagesPerQuery,
    CP22A_DEFAULT_MAX_PAGES_PER_QUERY,
  )
  const marketPlan = interpretSweepMarket(request.market)
  const calls: SerpApiMapsCallPlan[] = []

  for (let page = 0; page < maxPagesPerQuery; page += 1) {
    for (let variantIndex = 0; variantIndex < 4; variantIndex += 1) {
      for (const market of marketPlan.markets) {
        if (calls.length >= maxCalls) return calls
        const variants = buildSweepQueries({
          service: request.service,
          icp: request.icp,
          market,
        })
        calls.push({
          engine: 'google_maps',
          query: variants[variantIndex],
          market,
          start: page * 20,
        })
      }
    }
  }

  return calls
}
