import { and, desc, eq, inArray } from 'drizzle-orm'
import type {
  ContactRoute,
  EvidenceSource,
  LeadPassReason,
  Opportunity,
  OpportunityEvidenceProof,
  OutreachPlay,
  Prospect,
  RuntimeLineageRun,
  ScoutRun,
  Signal,
  TodaysRunItem,
} from '@/db/schema'

export const CP20C_PROOF_ROUTE = '/internal/cp20c'
export const CP20C_PROVIDER_CALLS_DURING_READ = 0
export const CP20C_DB_WRITES_DURING_READ = 0

export type LeadKind =
  | 'signal_backed_opportunity'
  | 'evidence_backed_prospect'
  | 'exploratory_prospect'

export type LeadState =
  | 'active'
  | 'needs_review'
  | 'missing_evidence'
  | 'weak_fit'
  | 'exploratory'

export type LeadFunnelLaneId =
  | 'todays_opportunities'
  | 'prospect_pool'
  | 'needs_review'
  | 'contact_route_review'
  | 'discarded_weak_fit'

export type LaneTone = 'opportunity' | 'prospect' | 'review' | 'discarded'

export interface LaneTheme {
  score: string
  signalChip: string
  chip: string
  primaryPill: string
  dot: string
  line: string
}

export const LEAD_FUNNEL_LANES: {
  id: LeadFunnelLaneId
  title: string
  emptyState: string
  tone: LaneTone
}[] = [
  {
    id: 'todays_opportunities',
    title: "Today's Opportunities",
    emptyState: 'No persisted signal-backed opportunities are available for this lane.',
    tone: 'opportunity',
  },
  {
    id: 'prospect_pool',
    title: 'Prospect Pool',
    emptyState: 'No persisted evidence-backed prospects are available for this lane.',
    tone: 'prospect',
  },
  {
    id: 'needs_review',
    title: 'Needs Review',
    emptyState: 'No persisted leads currently require evidence or signal review.',
    tone: 'review',
  },
  {
    id: 'contact_route_review',
    title: 'Contact Route Review',
    emptyState: 'No persisted contact-route rows currently require review.',
    tone: 'review',
  },
  {
    id: 'discarded_weak_fit',
    title: 'Discarded / Weak Fit',
    emptyState: 'No persisted weak-fit or discarded lifecycle states are available.',
    tone: 'discarded',
  },
]

const OPPORTUNITY_THEME: LaneTheme = {
  score: 'text-blue',
  signalChip: 'bg-blue/10 text-blue',
  chip: 'bg-text/[0.06] text-text',
  primaryPill: 'bg-text text-bg',
  dot: 'bg-blue',
  line: 'text-blue',
}

const PROSPECT_THEME: LaneTheme = {
  score: 'text-text',
  signalChip: 'bg-text/[0.06] text-text/55',
  chip: 'bg-text/[0.06] text-text',
  primaryPill: 'bg-white text-text',
  dot: 'bg-text',
  line: 'text-text/60',
}

const REVIEW_THEME: LaneTheme = {
  score: 'text-text',
  signalChip: 'bg-warn/15 text-text',
  chip: 'bg-warn/15 text-text',
  primaryPill: 'bg-text text-bg',
  dot: 'bg-warn',
  line: 'text-text/60',
}

const DISCARDED_THEME: LaneTheme = {
  score: 'text-text/55',
  signalChip: 'bg-text/[0.06] text-text/55',
  chip: 'bg-text/[0.06] text-text/55',
  primaryPill: 'bg-text/10 text-text',
  dot: 'bg-text/35',
  line: 'text-text/50',
}

export function laneTheme(tone: LaneTone): LaneTheme {
  if (tone === 'opportunity') return OPPORTUNITY_THEME
  if (tone === 'review') return REVIEW_THEME
  if (tone === 'discarded') return DISCARDED_THEME
  return PROSPECT_THEME
}

export function laneToneForLeadKind(leadKind: LeadKind): LaneTone {
  return leadKind === 'signal_backed_opportunity' ? 'opportunity' : 'prospect'
}

export interface LeadFunnelEvidence {
  id: string
  sourceUrl: string
  sourceTitle: string | null
  sourceDate: string
  evidenceSummary: string
  sourceExcerpt: string
  sourceFingerprint: string
}

export interface LeadFunnelScoreReason {
  subscore: 'opportunity_urgency' | 'prospect_fit' | 'outreach_readiness'
  points: number
  reason: string
  evidenceId: string
}

export interface LeadFunnelScore {
  total: number
  fit: number | null
  freshness: number | null
  contact: number | null
  reasons: LeadFunnelScoreReason[]
}

export interface LeadFunnelLineageRun {
  provider: string
  providerRunId: string
  runRole: string
  status: string
  sourceUrl: string | null
  query: string | null
  engine: string | null
  estimatedCostCents: number
}

export interface LeadFunnelLineage {
  searchProviderRunId: string | null
  evidenceProviderRunId: string | null
  sourceAdapterRunIds: string[]
  sourceAdapterListingUrls: string[]
  runtimeLineageRuns: LeadFunnelLineageRun[]
  sourceUrls: string[]
}

export interface LeadFunnelContactRoute {
  id: string
  routeType: string
  contactName: string | null
  contactTitle: string | null
  contactEmail: string | null
  contactPhone: string | null
  confidence: number
  verified: boolean
}

export interface LeadFunnelOutreachPlay {
  id: string
  subjectLine: string | null
  status: string
  signalReference: string | null
  createdAt: string
}

export interface LeadFunnelLifecycle {
  state: LeadState
  opportunityStatus: string | null
  signalStatus: string | null
  contactRouteReview: boolean
  passReasons: string[]
  todayRunStatus: string | null
}

export interface LeadFunnelRecommendedAction {
  label: string
  detail: string
}

export interface LeadFunnelItem {
  id: string
  proofId: string
  workspaceId: string
  leadKind: LeadKind
  state: LeadState
  laneId: LeadFunnelLaneId
  businessName: string
  address: string | null
  city: string | null
  stateCode: string | null
  market: string
  vertical: string
  signalType: string | null
  signalLabel: string | null
  verticalFitLabel: string | null
  whyNow: string | null
  recommendedAction: LeadFunnelRecommendedAction
  evidence: LeadFunnelEvidence[]
  score: LeadFunnelScore
  lineage: LeadFunnelLineage
  contactRoutes: LeadFunnelContactRoute[]
  outreachPlays: LeadFunnelOutreachPlay[]
  lifecycle: LeadFunnelLifecycle
  createdAt: string
}

export interface ProspectFunnelView {
  id: string
  proofId: string
  workspaceId: string
  leadKind: 'evidence_backed_prospect' | 'exploratory_prospect'
  state: LeadState
  laneId: LeadFunnelLaneId
  businessName: string
  address: string | null
  city: string | null
  stateCode: string | null
  market: string
  vertical: string
  verticalFitLabel: string | null
  noSignalLine: string
  recommendedAction: LeadFunnelRecommendedAction
  evidence: LeadFunnelEvidence[]
  score: {
    total: number
    fit: number | null
    contact: number | null
    reasons: LeadFunnelScoreReason[]
  }
  lineage: LeadFunnelLineage
  contactRoutes: LeadFunnelContactRoute[]
  outreachPlays: LeadFunnelOutreachPlay[]
  lifecycle: LeadFunnelLifecycle
  theme: LaneTheme
}

export interface OpportunityFunnelView {
  id: string
  proofId: string
  workspaceId: string
  leadKind: 'signal_backed_opportunity'
  state: LeadState
  laneId: LeadFunnelLaneId
  businessName: string
  address: string | null
  city: string | null
  stateCode: string | null
  market: string
  vertical: string
  verticalFitLabel: string | null
  urgency: {
    signalType: string | null
    signalLabel: string | null
    signalDate: string | null
    whyNow: string | null
  }
  recommendedAction: LeadFunnelRecommendedAction
  evidence: LeadFunnelEvidence[]
  score: LeadFunnelScore
  lineage: LeadFunnelLineage
  contactRoutes: LeadFunnelContactRoute[]
  outreachPlays: LeadFunnelOutreachPlay[]
  lifecycle: LeadFunnelLifecycle
  theme: LaneTheme
}

export type LeadFunnelViewItem =
  | { kind: 'opportunity'; view: OpportunityFunnelView }
  | { kind: 'prospect'; view: ProspectFunnelView }

export interface LeadFunnelLane {
  id: LeadFunnelLaneId
  title: string
  emptyState: string
  tone: LaneTone
  theme: LaneTheme
  items: LeadFunnelViewItem[]
}

export interface LeadFunnelReadModel {
  generatedAt: string
  source: 'storage'
  providerCallsDuringRead: 0
  dbWritesDuringRead: 0
  lanes: LeadFunnelLane[]
  itemCount: number
  partialLaneIds: LeadFunnelLaneId[]
  storageTables: string[]
  latestScoutRun: {
    id: string
    workspaceId: string
    status: string
    trigger: string
    startedAt: string
    completedAt: string | null
  } | null
}

export const PROSPECT_VIEW_FORBIDDEN_KEYS = [
  'urgency',
  'whyNow',
  'signalType',
  'signalLabel',
  'signalDate',
  'scoreFreshness',
] as const

function isoDate(value: Date | string | null | undefined): string {
  if (!value) return 'undated'
  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.getTime())) return 'undated'
  return date.toISOString().slice(0, 10)
}

function isoDateTime(value: Date | string | null | undefined): string | null {
  if (!value) return null
  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.getTime())) return null
  return date.toISOString()
}

function parseJsonRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {}
}

function asStringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
    : []
}

function leadKindFrom(value: string): LeadKind {
  if (
    value === 'signal_backed_opportunity' ||
    value === 'evidence_backed_prospect' ||
    value === 'exploratory_prospect'
  ) {
    return value
  }

  return 'exploratory_prospect'
}

function contactRouteNeedsReview(contact: LeadFunnelContactRoute): boolean {
  return !contact.verified || contact.confidence < 70
}

function stateFromRows({
  leadKind,
  opportunity,
  signal,
  evidence,
}: {
  leadKind: LeadKind
  opportunity: Opportunity | null
  signal: Signal | null
  evidence: EvidenceSource | null
}): LeadState {
  if (leadKind === 'exploratory_prospect') return 'exploratory'
  if (!evidence?.sourceUrl) return 'missing_evidence'
  if (opportunity?.status && ['skipped', 'expired', 'lost'].includes(opportunity.status)) {
    return 'weak_fit'
  }
  if (signal?.status && signal.status !== 'valid') return 'needs_review'
  return 'active'
}

export function laneForItem(item: Pick<LeadFunnelItem, 'leadKind' | 'state' | 'contactRoutes'>): LeadFunnelLaneId {
  if (item.state === 'weak_fit') return 'discarded_weak_fit'
  if (
    item.state === 'needs_review' ||
    item.state === 'missing_evidence' ||
    item.state === 'exploratory'
  ) {
    return 'needs_review'
  }

  const hasContactRouteReview = item.contactRoutes.some(contactRouteNeedsReview)
  if (hasContactRouteReview) return 'contact_route_review'

  return item.leadKind === 'signal_backed_opportunity'
    ? 'todays_opportunities'
    : 'prospect_pool'
}

export function prospectNoSignalLine(item: Pick<LeadFunnelItem, 'state' | 'verticalFitLabel'>): string {
  if (item.state === 'exploratory' || item.state === 'weak_fit') {
    return 'No fresh signal yet - thin evidence, verify before outreach.'
  }

  if (!item.verticalFitLabel) {
    return 'No fresh signal yet - evidence on file, fit unconfirmed.'
  }

  return `No fresh signal yet - fits as ${item.verticalFitLabel}.`
}

function prospectScore(item: LeadFunnelItem): ProspectFunnelView['score'] {
  const nonFreshnessReasons = item.score.reasons.filter(
    (reason) => reason.subscore !== 'opportunity_urgency',
  )
  const fit = item.score.fit
  const contact = item.score.contact
  const total =
    fit !== null || contact !== null
      ? (fit ?? 0) + (contact ?? 0)
      : item.score.freshness === null
        ? item.score.total
        : 0

  return {
    total,
    fit,
    contact,
    reasons: nonFreshnessReasons,
  }
}

export function toProspectFunnelView(item: LeadFunnelItem): ProspectFunnelView {
  if (item.leadKind === 'signal_backed_opportunity') {
    throw new Error(`toProspectFunnelView called with an opportunity (${item.id})`)
  }

  return {
    id: item.id,
    proofId: item.proofId,
    workspaceId: item.workspaceId,
    leadKind: item.leadKind,
    state: item.state,
    laneId: item.laneId,
    businessName: item.businessName,
    address: item.address,
    city: item.city,
    stateCode: item.stateCode,
    market: item.market,
    vertical: item.vertical,
    verticalFitLabel: item.verticalFitLabel,
    noSignalLine: prospectNoSignalLine(item),
    recommendedAction: item.recommendedAction,
    evidence: item.evidence,
    score: prospectScore(item),
    lineage: item.lineage,
    contactRoutes: item.contactRoutes,
    outreachPlays: item.outreachPlays,
    lifecycle: item.lifecycle,
    theme: laneTheme('prospect'),
  }
}

export function toOpportunityFunnelView(item: LeadFunnelItem): OpportunityFunnelView {
  if (item.leadKind !== 'signal_backed_opportunity') {
    throw new Error(`toOpportunityFunnelView called with a ${item.leadKind} (${item.id})`)
  }

  return {
    id: item.id,
    proofId: item.proofId,
    workspaceId: item.workspaceId,
    leadKind: 'signal_backed_opportunity',
    state: item.state,
    laneId: item.laneId,
    businessName: item.businessName,
    address: item.address,
    city: item.city,
    stateCode: item.stateCode,
    market: item.market,
    vertical: item.vertical,
    verticalFitLabel: item.verticalFitLabel,
    urgency: {
      signalType: item.signalType,
      signalLabel: item.signalLabel,
      signalDate: item.evidence[0]?.sourceDate ?? null,
      whyNow: item.whyNow,
    },
    recommendedAction: item.recommendedAction,
    evidence: item.evidence,
    score: item.score,
    lineage: item.lineage,
    contactRoutes: item.contactRoutes,
    outreachPlays: item.outreachPlays,
    lifecycle: item.lifecycle,
    theme: laneTheme('opportunity'),
  }
}

export function toLeadFunnelViewItem(item: LeadFunnelItem): LeadFunnelViewItem {
  if (item.leadKind === 'signal_backed_opportunity') {
    return { kind: 'opportunity', view: toOpportunityFunnelView(item) }
  }

  return { kind: 'prospect', view: toProspectFunnelView(item) }
}

export function buildLeadFunnelReadModel(
  items: LeadFunnelItem[],
  latestScoutRun: LeadFunnelReadModel['latestScoutRun'] = null,
): LeadFunnelReadModel {
  const viewItems = items.map(toLeadFunnelViewItem)
  const lanes = LEAD_FUNNEL_LANES.map((lane) => ({
    ...lane,
    theme: laneTheme(lane.tone),
    items: viewItems.filter((item) => item.view.laneId === lane.id),
  }))

  return {
    generatedAt: new Date().toISOString(),
    source: 'storage',
    providerCallsDuringRead: CP20C_PROVIDER_CALLS_DURING_READ,
    dbWritesDuringRead: CP20C_DB_WRITES_DURING_READ,
    lanes,
    itemCount: items.length,
    partialLaneIds: lanes.filter((lane) => lane.items.length === 0).map((lane) => lane.id),
    storageTables: [
      'opportunity_evidence_proofs',
      'opportunities',
      'prospects',
      'signals',
      'evidence_sources',
      'runtime_lineage_runs',
      'contact_routes',
      'outreach_plays',
      'lead_pass_reasons',
      'todays_run_items',
      'scout_runs',
    ],
    latestScoutRun,
  }
}

type IndexedRows = {
  opportunitiesById: Map<string, Opportunity>
  prospectsById: Map<string, Prospect>
  signalsById: Map<string, Signal>
  evidenceById: Map<string, EvidenceSource>
  lineageByEvidenceId: Map<string, RuntimeLineageRun[]>
  contactsByProspectId: Map<string, ContactRoute[]>
  outreachByOpportunityId: Map<string, OutreachPlay[]>
  passReasonsByOpportunityId: Map<string, LeadPassReason[]>
  todayRunByOpportunityId: Map<string, TodaysRunItem[]>
}

function mapRowsToItem(
  proof: OpportunityEvidenceProof,
  rows: IndexedRows,
): LeadFunnelItem {
  const opportunity = rows.opportunitiesById.get(proof.opportunityId) ?? null
  const prospect = opportunity?.prospectId
    ? rows.prospectsById.get(opportunity.prospectId) ?? null
    : null
  const signal = opportunity?.signalId ? rows.signalsById.get(opportunity.signalId) ?? null : null
  const evidenceSource = rows.evidenceById.get(proof.evidenceSourceId) ?? null
  const leadKind = leadKindFrom(proof.leadKind)
  const state = stateFromRows({ leadKind, opportunity, signal, evidence: evidenceSource })
  const contactRoutes = (opportunity?.prospectId
    ? rows.contactsByProspectId.get(opportunity.prospectId)
    : null) ?? []
  const mappedContacts = contactRoutes
    .slice()
    .sort((a, b) => b.confidence - a.confidence)
    .map((contact) => ({
      id: contact.id,
      routeType: contact.routeType,
      contactName: contact.contactName,
      contactTitle: contact.contactTitle,
      contactEmail: contact.contactEmail,
      contactPhone: contact.contactPhone,
      confidence: contact.confidence,
      verified: contact.verified,
    }))

  const parsedData = parseJsonRecord(signal?.parsedData)
  const sourceMetadata = parseJsonRecord(evidenceSource?.sourceMetadata)
  const sourceAdapterListingUrls = [
    ...new Set([
      ...proof.sourceAdapterListingUrls,
      ...asStringArray(sourceMetadata.sourceAdapterListingUrls),
    ]),
  ]
  const sourceAdapterRunIds = [
    ...new Set([
      ...proof.sourceAdapterRunIds,
      ...asStringArray(sourceMetadata.sourceAdapterRunIds),
    ]),
  ]
  const runtimeLineageRuns = (rows.lineageByEvidenceId.get(proof.evidenceSourceId) ?? [])
    .slice()
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
  const evidence = evidenceSource
    ? [
        {
          id: evidenceSource.id,
          sourceUrl: evidenceSource.sourceUrl,
          sourceTitle: evidenceSource.sourceTitle,
          sourceDate: isoDate(evidenceSource.sourceDate),
          evidenceSummary: proof.evidenceSummary,
          sourceExcerpt: proof.sourceExcerpt,
          sourceFingerprint: evidenceSource.evidenceFingerprint,
        },
      ]
    : []
  const scoreReasonSubscore =
    leadKind === 'signal_backed_opportunity' ? 'opportunity_urgency' : 'prospect_fit'
  const score: LeadFunnelScore = {
    total: proof.score,
    fit: leadKind === 'signal_backed_opportunity' ? null : proof.score,
    freshness: leadKind === 'signal_backed_opportunity' ? proof.score : null,
    contact: null,
    reasons: evidenceSource
      ? [
          {
            subscore: scoreReasonSubscore,
            points: proof.score,
            reason: proof.scoreReason,
            evidenceId: evidenceSource.id,
          },
        ]
      : [],
  }
  const item: LeadFunnelItem = {
    id: opportunity?.id ?? proof.id,
    proofId: proof.id,
    workspaceId: proof.workspaceId,
    leadKind,
    state,
    laneId: 'needs_review',
    businessName: prospect?.businessName ?? 'Unknown persisted lead',
    address: prospect?.address ?? null,
    city: prospect?.city ?? null,
    stateCode: prospect?.state ?? null,
    market: proof.market,
    vertical: proof.vertical,
    signalType: leadKind === 'signal_backed_opportunity' ? proof.signalType : null,
    signalLabel:
      leadKind === 'signal_backed_opportunity'
        ? proof.signalLabel ?? (typeof parsedData.signalLabel === 'string' ? parsedData.signalLabel : null)
        : null,
    verticalFitLabel: proof.verticalFitLabel,
    whyNow: leadKind === 'signal_backed_opportunity' ? proof.whyNow : null,
    recommendedAction: {
      label: proof.nextActionLabel,
      detail: proof.nextActionDetail,
    },
    evidence,
    score,
    lineage: {
      searchProviderRunId:
        leadKind === 'signal_backed_opportunity' ? proof.searchProviderRunId : null,
      evidenceProviderRunId:
        leadKind === 'signal_backed_opportunity' ? proof.evidenceProviderRunId : null,
      sourceAdapterRunIds:
        leadKind === 'signal_backed_opportunity' ? sourceAdapterRunIds : [],
      sourceAdapterListingUrls:
        leadKind === 'signal_backed_opportunity' ? sourceAdapterListingUrls : [],
      runtimeLineageRuns: runtimeLineageRuns.map((run) => ({
        provider: run.provider,
        providerRunId: run.providerRunId,
        runRole: run.runRole,
        status: run.status,
        sourceUrl: run.sourceUrl,
        query: run.query,
        engine: run.engine,
        estimatedCostCents: run.estimatedCostCents,
      })),
      sourceUrls: Array.from(
        new Set(
          [
            evidenceSource?.sourceUrl,
            ...sourceAdapterListingUrls,
            ...runtimeLineageRuns.map((run) => run.sourceUrl),
          ].filter((url): url is string => Boolean(url)),
        ),
      ),
    },
    contactRoutes: mappedContacts,
    outreachPlays: (rows.outreachByOpportunityId.get(proof.opportunityId) ?? [])
      .slice()
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .map((outreach) => ({
        id: outreach.id,
        subjectLine: outreach.subjectLine,
        status: outreach.status,
        signalReference: outreach.signalReference,
        createdAt: outreach.createdAt.toISOString(),
      })),
    lifecycle: {
      state,
      opportunityStatus: opportunity?.status ?? null,
      signalStatus: signal?.status ?? null,
      contactRouteReview: mappedContacts.some(contactRouteNeedsReview),
      passReasons: (rows.passReasonsByOpportunityId.get(proof.opportunityId) ?? []).map(
        (reason) => reason.reason,
      ),
      todayRunStatus:
        rows.todayRunByOpportunityId.get(proof.opportunityId)?.[0]?.status ?? null,
    },
    createdAt: proof.createdAt.toISOString(),
  }

  item.laneId = laneForItem(item)
  return item
}

function groupByNullableKey<T>(
  rows: T[],
  keyFn: (row: T) => string | null | undefined,
): Map<string, T[]> {
  const grouped = new Map<string, T[]>()

  for (const row of rows) {
    const key = keyFn(row)
    if (!key) continue
    const list = grouped.get(key) ?? []
    list.push(row)
    grouped.set(key, list)
  }

  return grouped
}

function latestScoutRunView(row: ScoutRun | null): LeadFunnelReadModel['latestScoutRun'] {
  if (!row) return null

  return {
    id: row.id,
    workspaceId: row.workspaceId,
    status: row.status,
    trigger: row.trigger,
    startedAt: row.startedAt.toISOString(),
    completedAt: isoDateTime(row.completedAt),
  }
}

export async function getLeadFunnelReadModelFromStorage(): Promise<LeadFunnelReadModel> {
  const {
    db,
    contactRoutes,
    evidenceSources,
    leadPassReasons,
    opportunities,
    opportunityEvidenceProofs,
    outreachPlays,
    prospects,
    runtimeLineageRuns,
    scoutRuns,
    signals,
    todaysRunItems,
  } = await import('@/db')

  const proofRows = await db
    .select()
    .from(opportunityEvidenceProofs)
    .orderBy(desc(opportunityEvidenceProofs.createdAt))

  if (proofRows.length === 0) {
    const latestScoutRun = await db.query.scoutRuns.findFirst({
      orderBy: (table, { desc: descending }) => [descending(table.startedAt)],
    })

    return buildLeadFunnelReadModel([], latestScoutRunView(latestScoutRun ?? null))
  }

  const opportunityIds = Array.from(new Set(proofRows.map((proof) => proof.opportunityId)))
  const evidenceIds = Array.from(new Set(proofRows.map((proof) => proof.evidenceSourceId)))
  const workspaceIds = Array.from(new Set(proofRows.map((proof) => proof.workspaceId)))

  const [opportunityRows, evidenceRows, lineageRows, passRows, todayRows, latestScoutRun] =
    await Promise.all([
      db
        .select()
        .from(opportunities)
        .where(inArray(opportunities.id, opportunityIds)),
      db
        .select()
        .from(evidenceSources)
        .where(inArray(evidenceSources.id, evidenceIds)),
      db
        .select()
        .from(runtimeLineageRuns)
        .where(inArray(runtimeLineageRuns.evidenceSourceId, evidenceIds)),
      db
        .select()
        .from(leadPassReasons)
        .where(inArray(leadPassReasons.opportunityId, opportunityIds)),
      db
        .select()
        .from(todaysRunItems)
        .where(inArray(todaysRunItems.opportunityId, opportunityIds)),
      db.query.scoutRuns.findFirst({
        where: (table, { inArray: inValues }) => inValues(table.workspaceId, workspaceIds),
        orderBy: (table, { desc: descending }) => [descending(table.startedAt)],
      }),
    ])

  const prospectIds = Array.from(
    new Set(opportunityRows.map((opportunity) => opportunity.prospectId).filter(Boolean)),
  ) as string[]
  const signalIds = Array.from(
    new Set(opportunityRows.map((opportunity) => opportunity.signalId).filter(Boolean)),
  ) as string[]

  const [prospectRows, signalRows, contactRows, outreachRows] = await Promise.all([
    prospectIds.length
      ? db
          .select()
          .from(prospects)
          .where(
            and(
              inArray(prospects.id, prospectIds),
              inArray(prospects.workspaceId, workspaceIds),
            ),
          )
      : Promise.resolve([]),
    signalIds.length
      ? db
          .select()
          .from(signals)
          .where(
            and(
              inArray(signals.id, signalIds),
              inArray(signals.workspaceId, workspaceIds),
            ),
          )
      : Promise.resolve([]),
    prospectIds.length
      ? db
          .select()
          .from(contactRoutes)
          .where(
            and(
              inArray(contactRoutes.prospectId, prospectIds),
              inArray(contactRoutes.workspaceId, workspaceIds),
            ),
          )
      : Promise.resolve([]),
    db
      .select()
      .from(outreachPlays)
      .where(inArray(outreachPlays.opportunityId, opportunityIds))
      .orderBy(desc(outreachPlays.createdAt)),
  ])

  const indexedRows: IndexedRows = {
    opportunitiesById: new Map(opportunityRows.map((row) => [row.id, row])),
    prospectsById: new Map(prospectRows.map((row) => [row.id, row])),
    signalsById: new Map(signalRows.map((row) => [row.id, row])),
    evidenceById: new Map(evidenceRows.map((row) => [row.id, row])),
    lineageByEvidenceId: groupByNullableKey(lineageRows, (row) => row.evidenceSourceId),
    contactsByProspectId: groupByNullableKey(contactRows, (row) => row.prospectId),
    outreachByOpportunityId: groupByNullableKey(outreachRows, (row) => row.opportunityId),
    passReasonsByOpportunityId: groupByNullableKey(passRows, (row) => row.opportunityId),
    todayRunByOpportunityId: groupByNullableKey(todayRows, (row) => row.opportunityId),
  }

  return buildLeadFunnelReadModel(
    proofRows.map((proof) => mapRowsToItem(proof, indexedRows)),
    latestScoutRunView(latestScoutRun ?? null),
  )
}
