import {
  CP22A_DEFAULT_MAX_PAGES_PER_QUERY,
  CP22A_DEFAULT_MAX_SERPAPI_CALLS,
  type SerpApiMapsCallPlan,
  type SweepRequest,
} from './types'
import { interpretSweepMarket } from './market'
import { canonicalizeMapsQueryMarket, compactSweepText, parseSweepBuyerLanes } from './buyer-lanes'

function clampPositiveInteger(value: number | undefined, fallback: number): number {
  if (!Number.isFinite(value) || !value || value < 1) return fallback
  return Math.floor(value)
}

export function buildSweepQueryVariants(input: {
  buyerLane: string
  market: string
}): string[] {
  const buyerLane = compactSweepText(input.buyerLane)
  const market = canonicalizeMapsQueryMarket(input.market)

  return [
    `${buyerLane} ${market}`,
    `${buyerLane} near ${market}`,
    `${buyerLane} in ${market}`,
    `${buyerLane} businesses ${market}`,
  ]
}

export function buildSweepQueries(input: {
  service: string
  icp: string
  market: string
}): string[] {
  return parseSweepBuyerLanes(input.icp).flatMap((buyerLane) => buildSweepQueryVariants({
    buyerLane,
    market: input.market,
  }))
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
  const buyerLanes = parseSweepBuyerLanes(request.icp)
  const calls: SerpApiMapsCallPlan[] = []

  for (let page = 0; page < maxPagesPerQuery; page += 1) {
    for (let variantIndex = 0; variantIndex < 4; variantIndex += 1) {
      for (const market of marketPlan.markets) {
        for (const buyerLane of buyerLanes) {
          if (calls.length >= maxCalls) return calls
          const variants = buildSweepQueryVariants({ buyerLane, market })
          calls.push({
            engine: 'google_maps',
            query: variants[variantIndex],
            buyerLane,
            market,
            start: page * 20,
          })
        }
      }
    }
  }

  return calls
}
