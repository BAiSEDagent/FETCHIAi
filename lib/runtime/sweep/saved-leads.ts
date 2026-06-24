import { and, desc, eq, inArray, or, sql, type SQL } from 'drizzle-orm'
import type { SweepLead } from './types'
import { buildSweepLeadDedupeKey } from './normalize'

export const SAVED_LEAD_LIFECYCLE_STATUSES = [
  'saved',
  'contacted',
  'won',
  'lost',
  'dismissed',
] as const

export type SavedLeadLifecycleStatus = typeof SAVED_LEAD_LIFECYCLE_STATUSES[number]

export type SaveSweepLeadsInput = {
  leads: SweepLead[]
  sourceSweepRef?: string | null
}

export type SaveSweepLeadsResult = {
  ok: boolean
  attempted: number
  savedNew: number
  alreadySaved: number
  skippedInvalid: number
  dismissedSkipped: number
  totalKnown: number
  error?: string
}

export type UpdateSavedLeadStatusInput = {
  savedLeadIds?: string[]
  dedupeKeys?: string[]
  status: string
}

export type UpdateSavedLeadNoteInput = {
  savedLeadId?: string
  dedupeKey?: string
  note: string
}

export type SavedLeadPipelineRow = {
  id: string
  dedupeKey: string
  businessName: string
  website: string | null
  phone: string
  address: string | null
  market: string | null
  source: string
  sourceUrl: string | null
  category: string | null
  email: string | null
  owner: string | null
  hook: string | null
  latitude: number | null
  longitude: number | null
  lifecycleStatus: SavedLeadLifecycleStatus
  note: string | null
  sourceSweepRef: string | null
  savedAtIso: string
  updatedAtIso: string
  lastSeenAtIso: string
  savedAtMs: number
  updatedAtMs: number
}

type SaveContext = {
  workspaceId: string
  userId: string
}

type SavedLeadInsertValue = {
  workspaceId: string
  userId: string
  dedupeKey: string
  businessName: string
  website: string | null
  phone: string
  address: string | null
  market: string | null
  source: string
  sourceUrl: string | null
  category: string | null
  email: string | null
  owner: string | null
  hook: string | null
  latitude: number | null
  longitude: number | null
  sourceSweepRef: string | null
  rawLead: Record<string, unknown>
}

export type SavedLeadMergeSnapshot = {
  lifecycleStatus: SavedLeadLifecycleStatus
  dismissedAt: string | null
  email: string | null
  owner: string | null
  hook: string | null
  website: string | null
  address: string | null
  latitude: number | null
  longitude: number | null
  category: string | null
  sourceUrl: string | null
  market: string | null
}

function cleanString(value: string | null | undefined): string | null {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : null
}

function cleanSource(value: string | null | undefined): string {
  return cleanString(value) ?? 'Google Maps'
}

function cleanNumber(value: number | null | undefined): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null
}

function cleanStringList(values: unknown): string[] {
  if (!Array.isArray(values)) return []
  return Array.from(new Set(values
    .filter((value): value is string => typeof value === 'string')
    .map((value) => value.trim())
    .filter(Boolean)))
}

function existingFirst<T>(existing: T | null, incoming: T | null): T | null {
  return existing ?? incoming ?? null
}

export function isSavedLeadLifecycleStatus(value: unknown): value is SavedLeadLifecycleStatus {
  return typeof value === 'string'
    && SAVED_LEAD_LIFECYCLE_STATUSES.includes(value as SavedLeadLifecycleStatus)
}

export function mergeSavedLeadSnapshotsPreservingExisting(
  existing: SavedLeadMergeSnapshot,
  incoming: SavedLeadMergeSnapshot,
): SavedLeadMergeSnapshot {
  return {
    lifecycleStatus: existing.lifecycleStatus === 'dismissed'
      ? 'dismissed'
      : existing.lifecycleStatus,
    dismissedAt: existing.dismissedAt,
    email: existingFirst(existing.email, incoming.email),
    owner: existingFirst(existing.owner, incoming.owner),
    hook: existingFirst(existing.hook, incoming.hook),
    website: existingFirst(existing.website, incoming.website),
    address: existingFirst(existing.address, incoming.address),
    latitude: existingFirst(existing.latitude, incoming.latitude),
    longitude: existingFirst(existing.longitude, incoming.longitude),
    category: existingFirst(existing.category, incoming.category),
    sourceUrl: existingFirst(existing.sourceUrl, incoming.sourceUrl),
    market: existingFirst(existing.market, incoming.market),
  }
}

function mergeLeadForSave(existing: SweepLead, incoming: SweepLead): SweepLead {
  return {
    ...existing,
    website: existingFirst(existing.website, incoming.website),
    address: existingFirst(existing.address, incoming.address),
    market: cleanString(existing.market) ?? incoming.market,
    source: existing.source,
    sourceUrl: existingFirst(existing.sourceUrl, incoming.sourceUrl) ?? '',
    category: existingFirst(existing.category, incoming.category),
    latitude: existingFirst(existing.latitude, incoming.latitude),
    longitude: existingFirst(existing.longitude, incoming.longitude),
    email: existingFirst(existing.email, incoming.email),
    owner: existingFirst(existing.owner, incoming.owner),
    hook: existingFirst(existing.hook, incoming.hook),
  }
}

function toInsertValue(
  lead: SweepLead,
  context: SaveContext,
  sourceSweepRef: string | null,
): SavedLeadInsertValue | null {
  const dedupeKey = buildSweepLeadDedupeKey(lead)
  const businessName = cleanString(lead.businessName)
  const phone = cleanString(lead.phone)
  if (!dedupeKey || !businessName || !phone) return null

  return {
    workspaceId: context.workspaceId,
    userId: context.userId,
    dedupeKey,
    businessName,
    website: cleanString(lead.website),
    phone,
    address: cleanString(lead.address),
    market: cleanString(lead.market),
    source: cleanSource(lead.source),
    sourceUrl: cleanString(lead.sourceUrl),
    category: cleanString(lead.category),
    email: cleanString(lead.email),
    owner: cleanString(lead.owner),
    hook: cleanString(lead.hook),
    latitude: cleanNumber(lead.latitude),
    longitude: cleanNumber(lead.longitude),
    sourceSweepRef,
    rawLead: { ...lead },
  }
}

export function prepareSavedLeadValuesForSave(
  input: SaveSweepLeadsInput,
  context: SaveContext,
): {
  attempted: number
  skippedInvalid: number
  duplicateInputCount: number
  values: SavedLeadInsertValue[]
} {
  const attempted = Array.isArray(input.leads) ? input.leads.length : 0
  const sourceSweepRef = cleanString(input.sourceSweepRef)
  const byDedupeKey = new Map<string, SweepLead>()
  let skippedInvalid = 0
  let duplicateInputCount = 0

  for (const lead of Array.isArray(input.leads) ? input.leads : []) {
    const key = buildSweepLeadDedupeKey(lead)
    if (!key) {
      skippedInvalid += 1
      continue
    }

    const existing = byDedupeKey.get(key)
    if (existing) {
      duplicateInputCount += 1
      byDedupeKey.set(key, mergeLeadForSave(existing, lead))
    } else {
      byDedupeKey.set(key, lead)
    }
  }

  const values = [...byDedupeKey.values()]
    .map((lead) => toInsertValue(lead, context, sourceSweepRef))
    .filter((value): value is SavedLeadInsertValue => {
      if (value) return true
      skippedInvalid += 1
      return false
    })

  return { attempted, skippedInvalid, duplicateInputCount, values }
}

function serializeSavedLeadRow(row: {
  id: string
  dedupeKey: string
  businessName: string
  website: string | null
  phone: string
  address: string | null
  market: string | null
  source: string
  sourceUrl: string | null
  category: string | null
  email: string | null
  owner: string | null
  hook: string | null
  latitude: number | null
  longitude: number | null
  lifecycleStatus: SavedLeadLifecycleStatus
  note: string | null
  sourceSweepRef: string | null
  savedAt: Date
  updatedAt: Date
  lastSeenAt: Date
}): SavedLeadPipelineRow {
  return {
    id: row.id,
    dedupeKey: row.dedupeKey,
    businessName: row.businessName,
    website: row.website,
    phone: row.phone,
    address: row.address,
    market: row.market,
    source: row.source,
    sourceUrl: row.sourceUrl,
    category: row.category,
    email: row.email,
    owner: row.owner,
    hook: row.hook,
    latitude: row.latitude,
    longitude: row.longitude,
    lifecycleStatus: row.lifecycleStatus,
    note: row.note,
    sourceSweepRef: row.sourceSweepRef,
    savedAtIso: row.savedAt.toISOString(),
    updatedAtIso: row.updatedAt.toISOString(),
    lastSeenAtIso: row.lastSeenAt.toISOString(),
    savedAtMs: row.savedAt.getTime(),
    updatedAtMs: row.updatedAt.getTime(),
  }
}

export async function listSavedLeadsForWorkspace(
  workspaceId: string,
): Promise<SavedLeadPipelineRow[]> {
  const { db, savedLeads } = await import('@/db')
  const rows = await db
    .select()
    .from(savedLeads)
    .where(eq(savedLeads.workspaceId, workspaceId))
    .orderBy(desc(savedLeads.updatedAt), desc(savedLeads.savedAt))

  return rows.map((row) => serializeSavedLeadRow({
    ...row,
    lifecycleStatus: row.lifecycleStatus as SavedLeadLifecycleStatus,
  }))
}

export async function saveSweepLeadsForWorkspace(
  input: SaveSweepLeadsInput,
  context: SaveContext,
): Promise<SaveSweepLeadsResult> {
  const prepared = prepareSavedLeadValuesForSave(input, context)
  if (prepared.values.length === 0) {
    return {
      ok: false,
      attempted: prepared.attempted,
      savedNew: 0,
      alreadySaved: prepared.duplicateInputCount,
      skippedInvalid: prepared.skippedInvalid,
      dismissedSkipped: 0,
      totalKnown: prepared.duplicateInputCount,
      error: 'No valid leads to save.',
    }
  }

  const now = new Date()
  const { db, savedLeads } = await import('@/db')
  const rows = await db
    .insert(savedLeads)
    .values(prepared.values)
    .onConflictDoUpdate({
      target: [savedLeads.workspaceId, savedLeads.dedupeKey],
      set: {
        website: sql`coalesce(${savedLeads.website}, excluded.website)`,
        address: sql`coalesce(${savedLeads.address}, excluded.address)`,
        market: sql`coalesce(${savedLeads.market}, excluded.market)`,
        sourceUrl: sql`coalesce(${savedLeads.sourceUrl}, excluded.source_url)`,
        category: sql`coalesce(${savedLeads.category}, excluded.category)`,
        email: sql`coalesce(${savedLeads.email}, excluded.email)`,
        owner: sql`coalesce(${savedLeads.owner}, excluded.owner)`,
        hook: sql`coalesce(${savedLeads.hook}, excluded.hook)`,
        latitude: sql`coalesce(${savedLeads.latitude}, excluded.latitude)`,
        longitude: sql`coalesce(${savedLeads.longitude}, excluded.longitude)`,
        sourceSweepRef: sql`coalesce(${savedLeads.sourceSweepRef}, excluded.source_sweep_ref)`,
        rawLead: sql`coalesce(${savedLeads.rawLead}, '{}'::jsonb) || excluded.raw_lead`,
        lastSeenAt: now,
        updatedAt: now,
      },
    })
    .returning({
      id: savedLeads.id,
      dedupeKey: savedLeads.dedupeKey,
      lifecycleStatus: savedLeads.lifecycleStatus,
      wasInserted: sql<boolean>`xmax = 0`,
    })

  const savedNew = rows.filter((row) => row.wasInserted).length
  const dismissedSkipped = rows.filter((row) =>
    !row.wasInserted && row.lifecycleStatus === 'dismissed',
  ).length
  const alreadySaved = rows.length - savedNew - dismissedSkipped + prepared.duplicateInputCount

  return {
    ok: true,
    attempted: prepared.attempted,
    savedNew,
    alreadySaved,
    skippedInvalid: prepared.skippedInvalid,
    dismissedSkipped,
    totalKnown: savedNew + alreadySaved + dismissedSkipped,
  }
}

function identityFilter(
  savedLeads: Awaited<typeof import('@/db')>['savedLeads'],
  input: { savedLeadIds?: string[]; dedupeKeys?: string[]; savedLeadId?: string; dedupeKey?: string },
): SQL | null {
  const ids = cleanStringList(input.savedLeadIds ?? (input.savedLeadId ? [input.savedLeadId] : []))
  const keys = cleanStringList(input.dedupeKeys ?? (input.dedupeKey ? [input.dedupeKey] : []))
  const filters: SQL[] = []

  if (ids.length > 0) filters.push(inArray(savedLeads.id, ids))
  if (keys.length > 0) filters.push(inArray(savedLeads.dedupeKey, keys))
  if (filters.length === 0) return null
  return filters.length === 1 ? filters[0] : or(...filters) ?? null
}

export async function updateSavedLeadStatusForWorkspace(
  input: UpdateSavedLeadStatusInput,
  context: SaveContext,
): Promise<{ ok: boolean; updated: number; error?: string }> {
  if (!isSavedLeadLifecycleStatus(input.status)) {
    return { ok: false, updated: 0, error: 'Invalid lifecycle status.' }
  }

  const { db, savedLeads } = await import('@/db')
  const idFilter = identityFilter(savedLeads, input)
  if (!idFilter) {
    return { ok: false, updated: 0, error: 'No saved leads selected.' }
  }

  const filters: SQL[] = [eq(savedLeads.workspaceId, context.workspaceId), idFilter]
  if (input.status !== 'dismissed') {
    filters.push(sql`${savedLeads.lifecycleStatus} <> 'dismissed'`)
  }

  const now = new Date()
  const set = input.status === 'dismissed'
    ? { lifecycleStatus: input.status, dismissedAt: now, updatedAt: now }
    : { lifecycleStatus: input.status, updatedAt: now }

  const rows = await db
    .update(savedLeads)
    .set(set)
    .where(and(...filters))
    .returning({ id: savedLeads.id })

  return { ok: true, updated: rows.length }
}

export async function updateSavedLeadNoteForWorkspace(
  input: UpdateSavedLeadNoteInput,
  context: SaveContext,
): Promise<{ ok: boolean; updated: number; error?: string }> {
  const { db, savedLeads } = await import('@/db')
  const idFilter = identityFilter(savedLeads, input)
  if (!idFilter) {
    return { ok: false, updated: 0, error: 'No saved lead selected.' }
  }

  const rows = await db
    .update(savedLeads)
    .set({
      note: input.note,
      updatedAt: new Date(),
    })
    .where(and(eq(savedLeads.workspaceId, context.workspaceId), idFilter))
    .returning({ id: savedLeads.id })

  return { ok: true, updated: rows.length }
}
