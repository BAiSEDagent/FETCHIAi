/**
 * scripts/dev/seed-demo-workspace.ts
 *
 * DEV-ONLY. Copies the seed_workspace_01 fixture data (signals, prospects,
 * opportunities, contact_routes, outreach_plays) into your real Clerk
 * workspace so you can manually QA the CP2.3 visual refresh against real
 * cards. Idempotent — re-running clears any previously copied demo rows for
 * the target workspace and re-inserts a fresh copy.
 *
 * Target workspace resolution (in order):
 *   1) First id in FETCHI_ADMIN_USER_IDS env var (comma-separated)
 *   2) The single non-seed_workspace_01 row in workspace_settings
 *
 * Run:  npx tsx scripts/dev/seed-demo-workspace.ts
 *
 * Does NOT touch: db/schema.ts, db/index.ts, db/seed.ts, drizzle.config.ts,
 * or seed_workspace_01 itself.
 */

import { eq, and, inArray, ne } from 'drizzle-orm'
import {
  db,
  workspaceSettings,
  signals,
  prospects,
  opportunities,
  contactRoutes,
  outreachPlays,
  leadPassReasons,
  todaysRunItems,
} from '../../db'

const SEED_WORKSPACE = 'seed_workspace_01'

async function resolveTargetWorkspaceId(): Promise<string> {
  const envIds = (process.env.FETCHI_ADMIN_USER_IDS ?? '')
    .split(',')
    .map(s => s.trim())
    .filter(Boolean)

  if (envIds.length > 0) {
    const row = await db.query.workspaceSettings.findFirst({
      where: (t, { eq: e }) => e(t.workspaceId, envIds[0]),
    })
    if (row) return row.workspaceId
    console.warn(
      `FETCHI_ADMIN_USER_IDS[0]=${envIds[0]} not found in workspace_settings — falling back to single-workspace heuristic.`,
    )
  }

  const candidates = await db
    .select()
    .from(workspaceSettings)
    .where(ne(workspaceSettings.workspaceId, SEED_WORKSPACE))

  if (candidates.length === 0) {
    throw new Error(
      'No non-seed workspace found. Sign in to the app once so your workspace is provisioned, then re-run this script.',
    )
  }
  if (candidates.length > 1) {
    throw new Error(
      `Found ${candidates.length} non-seed workspaces — cannot auto-pick. Set FETCHI_ADMIN_USER_IDS to the target Clerk user id.`,
    )
  }
  return candidates[0].workspaceId
}

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0]

async function clearDemoRows(tx: Tx, workspaceId: string) {
  // Delete in FK-safe order (child → parent). todays_run_items.outreach_play_id
  // references outreach_plays.id, so todays_run_items must go first.
  // Anything in these tables for the target workspace is treated as
  // previously-copied demo data (this is a dev QA script — real outcomes
  // live elsewhere once agents come online).
  await tx.delete(todaysRunItems).where(eq(todaysRunItems.workspaceId, workspaceId))
  await tx.delete(outreachPlays).where(eq(outreachPlays.workspaceId, workspaceId))
  await tx.delete(leadPassReasons).where(eq(leadPassReasons.workspaceId, workspaceId))
  await tx.delete(opportunities).where(eq(opportunities.workspaceId, workspaceId))
  await tx.delete(contactRoutes).where(eq(contactRoutes.workspaceId, workspaceId))
  await tx.delete(prospects).where(eq(prospects.workspaceId, workspaceId))
  await tx.delete(signals).where(eq(signals.workspaceId, workspaceId))
}

async function main() {
  console.log('Fetchi — dev demo data copy\n')

  const targetWorkspaceId = await resolveTargetWorkspaceId()
  if (targetWorkspaceId === SEED_WORKSPACE) {
    throw new Error(
      'Refusing to run against seed_workspace_01 — that is the source fixture. Set FETCHI_ADMIN_USER_IDS to your real Clerk user id.',
    )
  }
  console.log(`Target workspace: ${targetWorkspaceId}`)
  console.log(`Source workspace: ${SEED_WORKSPACE}\n`)

  // Snapshot result counts so we can log outside the transaction.
  let signalsCopied = 0
  let prospectsCopied = 0
  let opportunitiesCopied = 0
  let contactRoutesCopied = 0
  let outreachInsertedCount = 0

  await db.transaction(async tx => {
    console.log('Clearing previously-copied demo rows for target...')
    await clearDemoRows(tx, targetWorkspaceId)

  // 1) signals
  const seedSignals = await tx
    .select()
    .from(signals)
    .where(eq(signals.workspaceId, SEED_WORKSPACE))
  const signalIdMap = new Map<string, string>()
  if (seedSignals.length > 0) {
    const inserted = await tx
      .insert(signals)
      .values(
        seedSignals.map(s => ({
          workspaceId: targetWorkspaceId,
          signalType: s.signalType,
          // Hash must remain globally unique — namespace it by workspace
          signalHash: `${targetWorkspaceId.slice(-8)}:${s.signalHash}`,
          rawData: s.rawData,
          parsedData: s.parsedData,
          whyRelevant: s.whyRelevant,
          detectedAt: s.detectedAt,
          status: s.status,
        })),
      )
      .returning({ id: signals.id })
    seedSignals.forEach((s, i) => signalIdMap.set(s.id, inserted[i].id))
  }

  // 2) prospects
  const seedProspects = await tx
    .select()
    .from(prospects)
    .where(eq(prospects.workspaceId, SEED_WORKSPACE))
  const prospectIdMap = new Map<string, string>()
  if (seedProspects.length > 0) {
    const inserted = await tx
      .insert(prospects)
      .values(
        seedProspects.map(p => ({
          workspaceId: targetWorkspaceId,
          businessName: p.businessName,
          address: p.address,
          city: p.city,
          state: p.state,
          phone: p.phone,
          email: p.email,
          website: p.website,
          businessType: p.businessType,
          enrichmentStatus: p.enrichmentStatus,
        })),
      )
      .returning({ id: prospects.id })
    seedProspects.forEach((p, i) => prospectIdMap.set(p.id, inserted[i].id))
  }

  // 3) opportunities (need mapped signal_id + prospect_id)
  const seedOpps = await tx
    .select()
    .from(opportunities)
    .where(eq(opportunities.workspaceId, SEED_WORKSPACE))
  const opportunityIdMap = new Map<string, string>()
  if (seedOpps.length > 0) {
    const inserted = await tx
      .insert(opportunities)
      .values(
        seedOpps.map(o => ({
          workspaceId: targetWorkspaceId,
          signalId: o.signalId ? signalIdMap.get(o.signalId) ?? null : null,
          prospectId: o.prospectId
            ? prospectIdMap.get(o.prospectId) ?? null
            : null,
          score: o.score,
          whyNow: o.whyNow,
          status: o.status,
          outcomeNotes: o.outcomeNotes,
          outcomeValue: o.outcomeValue,
          leadClaimedBy: o.leadClaimedBy,
          leadVisibleTo: o.leadVisibleTo ?? null,
          promptVersionId: o.promptVersionId,
        })),
      )
      .returning({ id: opportunities.id })
    seedOpps.forEach((o, i) => opportunityIdMap.set(o.id, inserted[i].id))
  }

  // 4) contact_routes (need mapped prospect_id)
  const seedContacts = await tx
    .select()
    .from(contactRoutes)
    .where(eq(contactRoutes.workspaceId, SEED_WORKSPACE))
  const contactRouteIdMap = new Map<string, string>()
  if (seedContacts.length > 0) {
    const rows = seedContacts.filter(
      c => !c.prospectId || prospectIdMap.has(c.prospectId),
    )
    if (rows.length > 0) {
      const inserted = await tx
        .insert(contactRoutes)
        .values(
          rows.map(c => ({
            workspaceId: targetWorkspaceId,
            prospectId: c.prospectId
              ? prospectIdMap.get(c.prospectId) ?? null
              : null,
            contactName: c.contactName,
            contactTitle: c.contactTitle,
            contactEmail: c.contactEmail,
            contactPhone: c.contactPhone,
            routeType: c.routeType,
            confidence: c.confidence,
            verified: c.verified,
          })),
        )
        .returning({ id: contactRoutes.id })
      rows.forEach((c, i) => contactRouteIdMap.set(c.id, inserted[i].id))
    }
  }

  // 5) outreach_plays (need mapped opportunity_id + contact_route_id)
  const seedPlays = await tx
    .select()
    .from(outreachPlays)
    .where(eq(outreachPlays.workspaceId, SEED_WORKSPACE))
  if (seedPlays.length > 0) {
    const rows = seedPlays.filter(
      p => !p.opportunityId || opportunityIdMap.has(p.opportunityId),
    )
    if (rows.length > 0) {
      const inserted = await tx
        .insert(outreachPlays)
        .values(
          rows.map(p => ({
            workspaceId: targetWorkspaceId,
            opportunityId: p.opportunityId
              ? opportunityIdMap.get(p.opportunityId) ?? null
              : null,
            contactRouteId: p.contactRouteId
              ? contactRouteIdMap.get(p.contactRouteId) ?? null
              : null,
            subjectLine: p.subjectLine,
            body: p.body,
            signalReference: p.signalReference,
            status: p.status,
            sentAt: p.sentAt,
            responseReceivedAt: p.responseReceivedAt,
            promptVersionId: p.promptVersionId,
            modelUsed: p.modelUsed,
          })),
        )
        .returning({ id: outreachPlays.id })
      outreachInsertedCount = inserted.length
    }
  }

    signalsCopied = seedSignals.length
    prospectsCopied = seedProspects.length
    opportunitiesCopied = seedOpps.length
    contactRoutesCopied = contactRouteIdMap.size
  })

  console.log('\nCopied (committed in single transaction):')
  console.log(`  signals          ${signalsCopied.toString().padStart(3)}`)
  console.log(`  prospects        ${prospectsCopied.toString().padStart(3)}`)
  console.log(`  opportunities    ${opportunitiesCopied.toString().padStart(3)}`)
  console.log(`  contact_routes   ${contactRoutesCopied.toString().padStart(3)}`)
  console.log(`  outreach_plays   ${outreachInsertedCount.toString().padStart(3)}`)

  const finalOppCount = await db
    .select()
    .from(opportunities)
    .where(
      and(
        eq(opportunities.workspaceId, targetWorkspaceId),
        inArray(opportunities.status, [
          'new',
          'saved',
          'contacted',
          'responded',
          'won',
          'lost',
        ]),
      ),
    )
  console.log(
    `\nTarget workspace now holds ${finalOppCount.length} opportunities. Done.`,
  )
  process.exit(0)
}

main().catch(err => {
  console.error('seed-demo-workspace failed:', err)
  process.exit(1)
})
