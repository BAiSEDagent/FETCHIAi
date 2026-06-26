const CONSUMER_BUYER_PATTERNS = [
  /\bhome\s*owners?\b/i,
  /\bhomeowners?\b/i,
  /\bresidents?\b/i,
  /\bfamil(?:y|ies)\b/i,
  /\bconsumers?\b/i,
  /\bindividuals?\b/i,
  /\bhouseholds?\b/i,
]

const SUGGESTED_LANES_BY_SERVICE: Array<{
  patterns: RegExp[]
  lanes: string[]
}> = [
  {
    patterns: [/\bepoxy\b/i, /\bfloor(?:ing)?\b/i],
    lanes: [
      'auto repair shops',
      'gyms',
      'warehouses',
      'self-storage facilities',
      'apartment complexes',
      'commercial property managers',
      'restaurants',
      'HOAs',
    ],
  },
  {
    patterns: [/\bcommercial cleaning\b/i, /\bjanitorial\b/i],
    lanes: [
      'restaurants',
      'medical offices',
      'gyms',
      'daycares',
      'office buildings',
      'property managers',
    ],
  },
  {
    patterns: [/\broof(?:ing)?\b/i],
    lanes: [
      'commercial property managers',
      'apartment complexes',
      'retail centers',
      'HOAs',
      'warehouses',
    ],
  },
  {
    patterns: [/\bdumpster\b/i, /\broll[-\s]?off\b/i],
    lanes: [
      'tenant improvement contractors',
      'general contractors',
      'property managers',
      'roofing contractors',
      'remodeling contractors',
    ],
  },
]

export const SWEEP_CONSUMER_BUYER_GUIDANCE =
  'Sweep works best with businesses and organizations on Google Maps. It cannot directly find individual homeowners, residents, families, or consumers. Try a business buyer lane instead.'

export function compactSweepText(value: string): string {
  return value.replace(/\s+/g, ' ').trim()
}

function cleanLane(value: string): string {
  return compactSweepText(value)
    .replace(/^[-*•\d.)\s]+/, '')
    .replace(/\s+/g, ' ')
    .trim()
}

function laneKey(value: string): string {
  return value
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

export function parseSweepBuyerLanes(icp: string): string[] {
  const cleaned = compactSweepText(icp)
  if (!cleaned) return []

  const seen = new Set<string>()
  const lanes: string[] = []

  for (const part of icp.split(/[,;\n\r]+/)) {
    const lane = cleanLane(part)
    if (!lane) continue

    const key = laneKey(lane)
    if (!key || seen.has(key)) continue

    seen.add(key)
    lanes.push(lane)
  }

  return lanes.length > 0 ? lanes : [cleaned]
}

export function isConsumerFocusedBuyerInput(icp: string): boolean {
  return CONSUMER_BUYER_PATTERNS.some((pattern) => pattern.test(icp))
}

export function applySuggestedSweepBuyerLane(currentIcp: string, suggestedLane: string): string {
  const lane = cleanLane(suggestedLane)
  if (!lane) return currentIcp

  if (isConsumerFocusedBuyerInput(currentIcp)) {
    return lane
  }

  const lanes = parseSweepBuyerLanes(currentIcp)
  const exists = lanes.some((value) => laneKey(value) === laneKey(lane))
  return exists ? currentIcp : [...lanes, lane].join(', ')
}

export function suggestedSweepBuyerLanes(service: string): string[] {
  const cleaned = compactSweepText(service)
  if (!cleaned) return []

  for (const suggestion of SUGGESTED_LANES_BY_SERVICE) {
    if (suggestion.patterns.some((pattern) => pattern.test(cleaned))) {
      return suggestion.lanes
    }
  }

  return []
}

export function canonicalizeMapsQueryMarket(market: string): string {
  return compactSweepText(market)
    .replace(/[,.]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}
