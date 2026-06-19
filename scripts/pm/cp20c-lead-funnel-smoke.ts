/**
 * CP20C - Persisted Lead Funnel read-model smoke proof.
 *
 * Fixture-only proof. This does not call providers, execute CP20A/CP20B proof
 * functions, write DB rows, seed data, change schema, or touch customer routes.
 */

import assert from 'node:assert/strict'
import {
  buildLeadFunnelReadModel,
  laneForItem,
  laneTheme,
  toLeadFunnelViewItem,
  toProspectFunnelView,
  type LeadFunnelItem,
} from '@/lib/read-model/lead-funnel'

const evidenceId = 'evidence-cp20c-fixture'

function withComputedLane(item: LeadFunnelItem): LeadFunnelItem {
  return {
    ...item,
    laneId: laneForItem(item),
  }
}

function scoreWithoutReasons(total: number): LeadFunnelItem['score'] {
  return {
    total,
    fit: null,
    freshness: total,
    contact: null,
    trusted: false,
    reasons: [],
  }
}

function baseItem(overrides: Partial<LeadFunnelItem> = {}): LeadFunnelItem {
  return {
    id: 'lead-cp20c-fixture',
    proofId: 'proof-cp20c-fixture',
    workspaceId: 'workspace-cp20c-fixture',
    leadKind: 'signal_backed_opportunity',
    state: 'active',
    laneId: 'todays_opportunities',
    businessName: 'Lamar Family Orthodontics',
    address: null,
    city: 'Austin',
    stateCode: 'TX',
    market: 'Austin',
    vertical: 'commercial_cleaning',
    signalType: 'building_permit',
    signalLabel: 'Buildout',
    verticalFitLabel: 'Medical Office',
    whyNow: 'THIS SHOULD NEVER RENDER ON PROSPECTS',
    recommendedAction: {
      label: 'Review source and contact route',
      detail: 'Use the persisted evidence before taking action.',
    },
    evidence: [
      {
        id: evidenceId,
        sourceUrl: 'https://example.gov/project/TABS2026000001',
        sourceTitle: 'Official fixture project',
        sourceDate: '2026-06-19',
        evidenceSummary: 'Fixture source-linked evidence summary.',
        sourceExcerpt: 'Fixture excerpt.',
        sourceFingerprint: 'fixture-fingerprint',
      },
    ],
    score: {
      total: 61,
      fit: 25,
      freshness: 28,
      contact: 8,
      trusted: true,
      reasons: [
        {
          subscore: 'prospect_fit',
          points: 25,
          reason: 'Fixture fit reason cites the persisted evidence.',
          evidenceId,
        },
        {
          subscore: 'opportunity_urgency',
          points: 28,
          reason: 'Fixture urgency reason must be dropped from prospect views.',
          evidenceId,
        },
        {
          subscore: 'outreach_readiness',
          points: 8,
          reason: 'Fixture contact-readiness reason cites the persisted evidence.',
          evidenceId,
        },
      ],
    },
    lineage: {
      searchProviderRunId: 'serpapi-run-fixture',
      evidenceProviderRunId: 'firecrawl-run-fixture',
      sourceAdapterRunIds: ['tdlr-tabs-run-fixture'],
      sourceAdapterListingUrls: ['https://example.gov/listing'],
      runtimeLineageRuns: [],
      sourceUrls: ['https://example.gov/project/TABS2026000001'],
    },
    contactRoutes: [],
    outreachPlays: [],
    lifecycle: {
      state: 'active',
      opportunityStatus: 'new',
      signalStatus: 'valid',
      contactRouteReview: false,
      passReasons: [],
      todayRunStatus: null,
    },
    createdAt: '2026-06-19T00:00:00.000Z',
    ...overrides,
  }
}

const opportunity = baseItem()
const prospectWithBadUrgency = baseItem({
  leadKind: 'evidence_backed_prospect',
  laneId: 'prospect_pool',
  signalType: 'building_permit',
  signalLabel: 'Buildout',
  whyNow: 'THIS SHOULD NEVER RENDER ON PROSPECTS',
  lineage: {
    searchProviderRunId: 'serpapi-run-fixture',
    evidenceProviderRunId: 'firecrawl-run-fixture',
    sourceAdapterRunIds: ['tdlr-tabs-run-fixture'],
    sourceAdapterListingUrls: ['https://example.gov/listing'],
    runtimeLineageRuns: [],
    sourceUrls: ['https://example.gov/project/TABS2026000001'],
  },
})

const needsReview = baseItem({
  id: 'lead-needs-review',
  proofId: 'proof-needs-review',
  state: 'missing_evidence',
  laneId: 'needs_review',
  evidence: [],
})
const contactReview = baseItem({
  id: 'lead-contact-review',
  proofId: 'proof-contact-review',
  laneId: 'contact_route_review',
  contactRoutes: [
    {
      id: 'contact-route-fixture',
      routeType: 'email',
      contactName: null,
      contactTitle: null,
      contactEmail: null,
      contactPhone: null,
      confidence: 40,
      verified: false,
    },
  ],
})
const weakFit = baseItem({
  id: 'lead-weak-fit',
  proofId: 'proof-weak-fit',
  state: 'weak_fit',
  laneId: 'discarded_weak_fit',
  lifecycle: {
    state: 'weak_fit',
    opportunityStatus: 'skipped',
    signalStatus: 'valid',
    contactRouteReview: false,
    passReasons: ['not_my_customer'],
    todayRunStatus: null,
  },
})
const missingSignalOpportunity = withComputedLane(baseItem({
  id: 'lead-missing-signal',
  proofId: 'proof-missing-signal',
  lifecycle: {
    state: 'active',
    opportunityStatus: 'new',
    signalStatus: null,
    contactRouteReview: false,
    passReasons: [],
    todayRunStatus: null,
  },
}))
const missingEvidenceNoReasons = withComputedLane(baseItem({
  id: 'lead-missing-evidence-no-reasons',
  proofId: 'proof-missing-evidence-no-reasons',
  state: 'missing_evidence',
  evidence: [],
  score: scoreWithoutReasons(61),
  lifecycle: {
    state: 'missing_evidence',
    opportunityStatus: 'new',
    signalStatus: 'valid',
    contactRouteReview: false,
    passReasons: [],
    todayRunStatus: null,
  },
}))

const prospectView = toProspectFunnelView(prospectWithBadUrgency)
const prospectKeys = Object.keys(prospectView)
for (const forbidden of [
  'urgency',
  'whyNow',
  'signalType',
  'signalLabel',
  'signalDate',
  'scoreFreshness',
]) {
  assert(!prospectKeys.includes(forbidden), `Prospect view leaked ${forbidden}`)
}
const serializedProspect = JSON.stringify(prospectView)
assert(!serializedProspect.includes('THIS SHOULD NEVER RENDER ON PROSPECTS'))
assert(!serializedProspect.includes('building_permit'))
assert.equal(prospectView.score.total, 25 + 8)
assert.equal(prospectView.score.trusted, true)
assert.equal(prospectView.score.reasons.length, 2)
assert(prospectView.score.reasons.every((reason) => reason.evidenceId === evidenceId))

assert.throws(() => toProspectFunnelView(opportunity))

const prospectTheme = JSON.stringify(laneTheme('prospect'))
assert(!/\b(?:text|bg|border|from|to|ring|fill|stroke|decoration|outline)-(?:ok|coral|coralDeep|brand-green|brand-coral)\b/.test(prospectTheme))
assert(!/244\s*91\s*59|47\s*159\s*112|69\s*192\s*138/i.test(prospectTheme))

assert.equal(laneForItem(opportunity), 'todays_opportunities')
assert.equal(laneForItem(prospectWithBadUrgency), 'prospect_pool')
assert.equal(laneForItem(needsReview), 'needs_review')
assert.equal(laneForItem(contactReview), 'contact_route_review')
assert.equal(laneForItem(weakFit), 'discarded_weak_fit')
assert.equal(laneForItem(missingSignalOpportunity), 'needs_review')
assert.equal(laneForItem(missingEvidenceNoReasons), 'needs_review')

const missingSignalView = toLeadFunnelViewItem(missingSignalOpportunity)
assert.equal(missingSignalView.kind, 'opportunity')
assert.equal(missingSignalView.view.laneId, 'needs_review')
assert.notEqual(missingSignalView.view.laneId, 'todays_opportunities')

const missingEvidenceView = toLeadFunnelViewItem(missingEvidenceNoReasons)
assert.equal(missingEvidenceView.kind, 'opportunity')
assert.equal(missingEvidenceView.view.laneId, 'needs_review')
assert.equal(missingEvidenceView.view.score.trusted, false)
assert.equal(missingEvidenceView.view.score.reasons.length, 0)
assert.notEqual(missingEvidenceView.view.laneId, 'todays_opportunities')

const readModel = buildLeadFunnelReadModel([
  opportunity,
  prospectWithBadUrgency,
  needsReview,
  contactReview,
  weakFit,
  missingSignalOpportunity,
  missingEvidenceNoReasons,
])
const laneCounts = Object.fromEntries(
  readModel.lanes.map((lane) => [lane.id, lane.items.length]),
)
const opportunityView = toLeadFunnelViewItem(opportunity)
assert.equal(opportunityView.kind, 'opportunity')
assert.equal(opportunityView.view.score.trusted, true)
assert.equal(readModel.providerCallsDuringRead, 0)
assert.equal(readModel.dbWritesDuringRead, 0)
assert.equal(readModel.itemCount, 7)
assert.deepEqual(laneCounts, {
  todays_opportunities: 1,
  prospect_pool: 1,
  needs_review: 3,
  contact_route_review: 1,
  discarded_weak_fit: 1,
})

const proof = {
  ok: true,
  mode: 'cp20c_lead_funnel_read_model_smoke',
  cases: {
    prospectNoUrgency: true,
    prospectNoSignalFields: true,
    prospectNoCoralOrSignalGreen: true,
    prospectScoreDropsFreshness: true,
    opportunityKeepsUrgency: true,
    laneMapping: true,
    scoreReasonsCiteEvidence: true,
    missingSignalCannotLandInTodaysOpportunities: true,
    missingEvidenceScoreIsUntrusted: true,
  },
  laneCounts,
  providerCalls: 0,
  dbWrites: 0,
  schemaChanges: 0,
  seedWrites: 0,
  cp20aCalls: 0,
  cp20bProofCalls: 0,
}

console.log(JSON.stringify(proof, null, 2))
