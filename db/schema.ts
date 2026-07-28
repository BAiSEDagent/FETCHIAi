// db/schema.ts
// Fetchi.ai — Complete Drizzle ORM Schema
// PostgreSQL 16 via Replit's built-in database (Neon infrastructure)
// DATABASE_URL is auto-injected by Replit — never hardcode it

import {
  pgTable,
  pgEnum,
  text,
  integer,
  boolean,
  timestamp,
  uuid,
  jsonb,
  index,
  uniqueIndex,
  doublePrecision,
  check,
  foreignKey,
  primaryKey,
} from 'drizzle-orm/pg-core'
import { relations, sql } from 'drizzle-orm'

// ─────────────────────────────────────────────
// WORKSPACE SETTINGS
// workspace_id = Clerk org_id — set at signup
// ─────────────────────────────────────────────
export const workspaceSettings = pgTable('workspace_settings', {
  workspaceId:     text('workspace_id').primaryKey(),
  ownerUserId:     text('owner_user_id').notNull(),
  businessName:    text('business_name'),
  isApproved:      boolean('is_approved').default(false).notNull(),
  // 0=not started 1=vertical 2=location 3=customer 4=complete
  onboardingStep:  integer('onboarding_step').default(0).notNull(),
  // Unique referral code for viral signups — generated at workspace creation
  // Format: <slug>-<random4>, e.g. 'ADAMS-X7K2'
  referralCode:    text('referral_code'),
  // google | email — captured at signup from Clerk
  signupMethod:    text('signup_method'),
  createdAt:       timestamp('created_at').defaultNow().notNull(),
  updatedAt:       timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  referralCodeUnique: uniqueIndex('workspace_settings_referral_code_unique')
                        .on(table.referralCode),
}))

// ─────────────────────────────────────────────
// WORKSPACE SUBSCRIPTIONS
// Stripe billing + subscription state
// ─────────────────────────────────────────────
export const workspaceSubscriptions = pgTable('workspace_subscriptions', {
  workspaceId:               text('workspace_id').primaryKey()
                               .references(() => workspaceSettings.workspaceId),
  stripeCustomerId:          text('stripe_customer_id').unique(),
  stripeSubscriptionId:      text('stripe_subscription_id').unique(),
  // monthly | annual — preserves pricing-page choice from signup through checkout
  billingInterval:           text('billing_interval').default('monthly').notNull(),
  // Stripe price ID selected at signup/plan selection; source of truth remains pricing_tiers
  selectedStripePriceId:     text('selected_stripe_price_id'),
  // starter | growth | pro | scale
  tier:                      text('tier').default('starter').notNull(),
  // null = unset/custom limit; gate blocks until resolved — do not treat as unlimited
  opportunitiesLimit:        integer('opportunities_limit'),
  opportunitiesUsed:         integer('opportunities_used').default(0).notNull(),
  opportunitiesResetAt:      timestamp('opportunities_reset_at'),
  // Trial tracking — separate counter from paid counter
  trialOpportunitiesLimit:   integer('trial_opportunities_limit').default(10).notNull(),
  trialOpportunitiesUsed:    integer('trial_opportunities_used').default(0).notNull(),
  trialEndsAt:               timestamp('trial_ends_at'),
  // cents per top-up opportunity
  topupRateCents:            integer('topup_rate_cents').default(50).notNull(),
  // trialing | active | past_due | canceled | expired
  status:                    text('status').default('trialing').notNull(),
  // false = no payment method on file, true = card collected (not necessarily charged)
  paymentMethodOnFile:       boolean('payment_method_on_file').default(false).notNull(),
  createdAt:                 timestamp('created_at').defaultNow().notNull(),
  updatedAt:                 timestamp('updated_at').defaultNow().notNull(),
})

// ─────────────────────────────────────────────
// WORKSPACE LEARNING
// Outcome learning context — separate from workspace_settings
// Updated by Outcome Learning Agent after every won/lost outcome
// ─────────────────────────────────────────────
export const workspaceLearning = pgTable('workspace_learning', {
  workspaceId:      text('workspace_id').primaryKey()
                      .references(() => workspaceSettings.workspaceId),
  // Prompt injection string built from last 30 outcomes
  learningContext:  text('learning_context'),
  outcomesCounted:  integer('outcomes_counted').default(0).notNull(),
  updatedAt:        timestamp('updated_at').defaultNow().notNull(),
})

// ─────────────────────────────────────────────
// SERVICE PROFILES
// What the workspace sells + who they target
// Created during onboarding, editable in Business Profile settings
// ─────────────────────────────────────────────
export const serviceProfiles = pgTable('service_profiles', {
  id:                       uuid('id').defaultRandom().primaryKey(),
  workspaceId:              text('workspace_id').notNull()
                              .references(() => workspaceSettings.workspaceId),
  // roofing | cleaning | hvac | landscaping | events | other
  vertical:                 text('vertical'),
  serviceDescription:       text('service_description'),
  locationCity:             text('location_city'),
  locationState:            text('location_state'),
  locationRadiusMiles:      integer('location_radius_miles').default(50),
  idealCustomerDescription: text('ideal_customer_description'),
  // Optional — many service businesses don't have a website. When present,
  // Fetchi's enrichment + scoring agents can pull additional brand context.
  website:                  text('website'),
  createdAt:                timestamp('created_at').defaultNow().notNull(),
  updatedAt:                timestamp('updated_at').defaultNow().notNull(),
})

// ─────────────────────────────────────────────
// SIGNALS
// Raw detected signals — one per public event
// Deduped by signal_hash (normalized biz name + address + type + 7-day window)
// ─────────────────────────────────────────────
export const signals = pgTable('signals', {
  id:           uuid('id').defaultRandom().primaryKey(),
  workspaceId:  text('workspace_id').notNull()
                  .references(() => workspaceSettings.workspaceId),
  // storm_damage | building_permit | new_business_listing | job_posting | event
  signalType:   text('signal_type').notNull(),
  // sha256 of normalizeForDedup(bizName) + normalizeForDedup(address)
  //   + signalType + floor(detectedAtMs / 7-day-window)
  // Prevents duplicate signals for same event within 7 days
  signalHash:   text('signal_hash').notNull(),
  rawData:      jsonb('raw_data'),
  parsedData:   jsonb('parsed_data'),
  // Brief explanation of why this signal is relevant
  whyRelevant:  text('why_relevant'),
  detectedAt:   timestamp('detected_at').defaultNow().notNull(),
  // valid | stale | invalid
  status:       text('status').default('valid').notNull(),
  createdAt:    timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  // Prevent duplicate signals — core dedup constraint
  signalHashIdx:          uniqueIndex('signals_hash_idx').on(table.signalHash),
  workspaceSignalTypeIdx: index('signals_workspace_type_idx')
                            .on(table.workspaceId, table.signalType),
}))

// ─────────────────────────────────────────────
// PROSPECTS
// Business / person identified as a potential customer
// ─────────────────────────────────────────────
export const prospects = pgTable('prospects', {
  id:                 uuid('id').defaultRandom().primaryKey(),
  workspaceId:        text('workspace_id').notNull()
                        .references(() => workspaceSettings.workspaceId),
  businessName:       text('business_name').notNull(),
  address:            text('address'),
  city:               text('city'),
  state:              text('state'),
  phone:              text('phone'),
  email:              text('email'),
  website:            text('website'),
  businessType:       text('business_type'),
  // pending | complete | failed
  enrichmentStatus:   text('enrichment_status').default('pending').notNull(),
  createdAt:          timestamp('created_at').defaultNow().notNull(),
  updatedAt:          timestamp('updated_at').defaultNow().notNull(),
})

// ─────────────────────────────────────────────
// OPPORTUNITIES
// The core lead object — signal + prospect combined
// "Lead" in the UI = opportunity with status saved/contacted/won/lost
// My Leads page = opportunities WHERE status IN (saved, contacted, won, lost)
// ─────────────────────────────────────────────
export const opportunities = pgTable('opportunities', {
  id:            uuid('id').defaultRandom().primaryKey(),
  workspaceId:   text('workspace_id').notNull()
                   .references(() => workspaceSettings.workspaceId),
  signalId:      uuid('signal_id')
                   .references(() => signals.id),
  prospectId:    uuid('prospect_id')
                   .references(() => prospects.id),
  // 0-100 signal quality score
  score:         integer('score').default(0).notNull(),
  // Human-readable explanation of why this signal = opportunity now
  whyNow:        text('why_now'),
  // new | saved | contacted | responded | won | lost | skipped | expired
  status:        text('status').default('new').notNull(),
  // Outcome tracking for Outcome Learning Agent
  outcomeNotes:  text('outcome_notes'),
  outcomeValue:  integer('outcome_value'),  // job value in cents if won
  // For future marketplace / multi-user claiming — schema only, claiming logic deferred
  leadClaimedBy: text('lead_claimed_by'),
  leadVisibleTo: text('lead_visible_to').array(),
  // Prompt version used for scoring — for eval tracking
  promptVersionId: uuid('prompt_version_id'),
  createdAt:     timestamp('created_at').defaultNow().notNull(),
  updatedAt:     timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  // Prevent same signal creating two opportunities in same workspace
  workspaceSignalUnique: uniqueIndex('opportunities_workspace_signal_unique')
                           .on(table.workspaceId, table.signalId),
  workspaceStatusIdx:    index('opportunities_workspace_status_idx')
                           .on(table.workspaceId, table.status),
  scoreIdx:              index('opportunities_score_idx').on(table.score),
}))

// ─────────────────────────────────────────────
// SAVED LEADS
// Workspace-private Sweep leads and dismissed-lead memory.
// Lifecycle status is user-set, not an opportunity score or signal label.
// ─────────────────────────────────────────────
export const savedLeadLifecycleStatus = pgEnum('saved_lead_lifecycle_status', [
  'saved',
  'contacted',
  'won',
  'lost',
  'dismissed',
])

export const savedLeads = pgTable('saved_leads', {
  id:              uuid('id').defaultRandom().primaryKey(),
  workspaceId:     text('workspace_id').notNull()
                     .references(() => workspaceSettings.workspaceId),
  userId:          text('user_id').notNull(),
  dedupeKey:       text('dedupe_key').notNull(),
  businessName:    text('business_name').notNull(),
  website:         text('website'),
  phone:           text('phone').notNull(),
  address:         text('address'),
  market:          text('market'),
  source:          text('source').default('Google Maps').notNull(),
  sourceUrl:       text('source_url'),
  category:        text('category'),
  email:           text('email'),
  owner:           text('owner'),
  hook:            text('hook'),
  latitude:        doublePrecision('latitude'),
  longitude:       doublePrecision('longitude'),
  lifecycleStatus: savedLeadLifecycleStatus('lifecycle_status').default('saved').notNull(),
  note:            text('note'),
  sourceSweepRef:  text('source_sweep_ref'),
  firstSeenAt:     timestamp('first_seen_at').defaultNow().notNull(),
  lastSeenAt:      timestamp('last_seen_at').defaultNow().notNull(),
  savedAt:         timestamp('saved_at').defaultNow().notNull(),
  updatedAt:       timestamp('updated_at').defaultNow().notNull(),
  dismissedAt:     timestamp('dismissed_at'),
  rawLead:         jsonb('raw_lead').default({}).notNull(),
}, (table) => ({
  workspaceDedupeUnique: uniqueIndex('saved_leads_workspace_dedupe_unique')
                           .on(table.workspaceId, table.dedupeKey),
  workspaceStatusIdx:    index('saved_leads_workspace_status_idx')
                           .on(table.workspaceId, table.lifecycleStatus),
  workspaceUpdatedIdx:   index('saved_leads_workspace_updated_idx')
                           .on(table.workspaceId, table.updatedAt),
  workspaceMarketIdx:    index('saved_leads_workspace_market_idx')
                           .on(table.workspaceId, table.market),
  workspaceIdUnique:     uniqueIndex('saved_leads_workspace_id_unique')
                           .on(table.workspaceId, table.id),
}))

// ─────────────────────────────────────────────
// EVIDENCE SOURCES
// Public official source artifacts only. No workspace-private status, outcome,
// contact, CRM, or outreach state belongs here.
// ─────────────────────────────────────────────
export const evidenceSources = pgTable('evidence_sources', {
  id:                  uuid('id').defaultRandom().primaryKey(),
  // tdlr_tabs_project | future official/public source type
  sourceType:          text('source_type').notNull(),
  // tdlr | county_permit_portal | future public authority
  sourceAuthority:     text('source_authority').notNull(),
  // External stable id, e.g. TABS2026022803
  externalId:          text('external_id').notNull(),
  sourceUrl:           text('source_url').notNull(),
  sourceTitle:         text('source_title'),
  sourceDate:          timestamp('source_date').notNull(),
  evidenceFingerprint: text('evidence_fingerprint').notNull(),
  // Sanitized public source metadata only. No API keys or workspace-private state.
  sourceMetadata:      jsonb('source_metadata').default({}).notNull(),
  firstSeenAt:         timestamp('first_seen_at').defaultNow().notNull(),
  lastSeenAt:          timestamp('last_seen_at').defaultNow().notNull(),
}, (table) => ({
  typeExternalUnique: uniqueIndex('evidence_sources_type_external_unique')
                        .on(table.sourceType, table.externalId),
  sourceUrlUnique:    uniqueIndex('evidence_sources_url_unique')
                        .on(table.sourceUrl),
  sourceDateIdx:      index('evidence_sources_date_idx').on(table.sourceDate),
  fingerprintIdx:     index('evidence_sources_fingerprint_idx')
                        .on(table.evidenceFingerprint),
}))

// ─────────────────────────────────────────────
// RUNTIME LINEAGE RUNS
// Provider/source-adapter replay metadata only. Never store API keys.
// ─────────────────────────────────────────────
export const runtimeLineageRuns = pgTable('runtime_lineage_runs', {
  id:                 uuid('id').defaultRandom().primaryKey(),
  // serpapi | tdlr-tabs | firecrawl
  provider:           text('provider').notNull(),
  providerRunId:      text('provider_run_id').notNull(),
  // source_validation | source_adapter_listing | evidence_hydration
  runRole:            text('run_role').notNull(),
  // ok | error | skipped
  status:             text('status').default('ok').notNull(),
  evidenceSourceId:   uuid('evidence_source_id')
                        .references(() => evidenceSources.id),
  sourceUrl:          text('source_url'),
  query:              text('query'),
  engine:             text('engine'),
  estimatedCostCents: integer('estimated_cost_cents').default(0).notNull(),
  startedAt:          timestamp('started_at').defaultNow().notNull(),
  completedAt:        timestamp('completed_at'),
  // Sanitized request/result metadata for replay. No secrets.
  requestMetadata:    jsonb('request_metadata').default({}).notNull(),
  responseMetadata:   jsonb('response_metadata').default({}).notNull(),
  createdAt:          timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  providerRunUnique: uniqueIndex('runtime_lineage_provider_run_unique')
                       .on(table.providerRunId),
  providerRoleIdx:   index('runtime_lineage_provider_role_idx')
                       .on(table.provider, table.runRole),
  evidenceSourceIdx: index('runtime_lineage_evidence_source_idx')
                       .on(table.evidenceSourceId),
  sourceUrlIdx:      index('runtime_lineage_source_url_idx').on(table.sourceUrl),
}))

// ─────────────────────────────────────────────
// SAVED-LEAD INVESTIGATION CONTRACT STORAGE
// CP26C.2A additive definitions only. These tables are not applied by this
// checkpoint and no runtime imports or database writes are introduced.
// ─────────────────────────────────────────────

export const savedLeadInvestigationDailyUsage = pgTable(
  'saved_lead_investigation_daily_usage',
  {
    workspaceId:     text('workspace_id').notNull(),
    workspaceDayKey: text('workspace_day_key').notNull(),
    timezone:        text('timezone').notNull(),
    resetAt:         timestamp('reset_at', { withTimezone: true }).notNull(),
    usedCount:       integer('used_count').default(0).notNull(),
    limitSnapshot:   integer('limit_snapshot').notNull(),
    createdAt:       timestamp('created_at', { withTimezone: true })
                       .defaultNow().notNull(),
    updatedAt:       timestamp('updated_at', { withTimezone: true })
                       .defaultNow().notNull(),
  },
  (table) => ({
    workspaceFk: foreignKey({
      name: 'saved_lead_inv_usage_workspace_fk',
      columns: [table.workspaceId],
      foreignColumns: [workspaceSettings.workspaceId],
    }),
    pk: primaryKey({
      name: 'saved_lead_inv_daily_usage_pk',
      columns: [table.workspaceId, table.workspaceDayKey],
    }),
    nonnegativeUsage: check(
      'saved_lead_inv_daily_usage_nonnegative',
      sql`${table.usedCount} >= 0`,
    ),
    positiveLimit: check(
      'saved_lead_inv_daily_usage_positive_limit',
      sql`${table.limitSnapshot} > 0`,
    ),
    withinLimit: check(
      'saved_lead_inv_daily_usage_within_limit',
      sql`${table.usedCount} <= ${table.limitSnapshot}`,
    ),
  }),
)

export const savedLeadInvestigationRuns = pgTable(
  'saved_lead_investigation_runs',
  {
    id:                        uuid('id').defaultRandom().primaryKey(),
    workspaceId:               text('workspace_id').notNull(),
    savedLeadId:               uuid('saved_lead_id').notNull(),
    clientRequestId:           text('client_request_id').notNull(),
    playbookId:                text('playbook_id').notNull(),
    playbookVersion:           text('playbook_version').notNull(),
    status:                    text('status').default('created').notNull(),
    currentPhase:              text('current_phase')
                                 .default('resolving_identity').notNull(),
    heartbeatAt:               timestamp('heartbeat_at', { withTimezone: true }),
    initialIdentityResolution: jsonb('initial_identity_resolution'),
    identityResolution:        jsonb('identity_resolution'),
    sourcePlan:                jsonb('source_plan'),
    budgetCeiling:             jsonb('budget_ceiling').notNull(),
    usageActual:               jsonb('usage_actual').default({}).notNull(),
    workspaceDayKey:           text('workspace_day_key'),
    usageCountedAt:            timestamp('usage_counted_at', { withTimezone: true }),
    categoryIdsChecked:        jsonb('category_ids_checked').default([]).notNull(),
    triggerState:              text('trigger_state'),
    triggerReasonCode:         text('trigger_reason_code'),
    startedAt:                 timestamp('started_at', { withTimezone: true }),
    updatedAt:                 timestamp('updated_at', { withTimezone: true })
                                 .defaultNow().notNull(),
    checkedAt:                 timestamp('checked_at', { withTimezone: true }),
    recheckEligibleAt:         timestamp('recheck_eligible_at', { withTimezone: true }),
    resultExpiresAt:           timestamp('result_expires_at', { withTimezone: true }),
    failureCode:               text('failure_code'),
    failureRetryable:          boolean('failure_retryable').default(false).notNull(),
    createdAt:                 timestamp('created_at', { withTimezone: true })
                                 .defaultNow().notNull(),
  },
  (table) => ({
    workspaceFk: foreignKey({
      name: 'saved_lead_inv_run_workspace_fk',
      columns: [table.workspaceId],
      foreignColumns: [workspaceSettings.workspaceId],
    }),
    workspaceClientRequestUnique: uniqueIndex('saved_lead_inv_run_client_unique')
      .on(table.workspaceId, table.clientRequestId),
    activeRunUnique: uniqueIndex('saved_lead_inv_run_active_unique')
      .on(table.workspaceId, table.savedLeadId)
      .where(sql`${table.status} in ('created', 'running')`),
    latestRunIdx: index('saved_lead_inv_run_latest_idx')
      .on(table.workspaceId, table.savedLeadId, table.createdAt),
    workspaceRunUnique: uniqueIndex('saved_lead_inv_run_workspace_id_unique')
      .on(table.workspaceId, table.id),
    workspaceLeadRunUnique: uniqueIndex('saved_lead_inv_run_scope_unique')
      .on(table.workspaceId, table.savedLeadId, table.id),
    savedLeadOwnershipFk: foreignKey({
      name: 'saved_lead_inv_run_saved_lead_fk',
      columns: [table.workspaceId, table.savedLeadId],
      foreignColumns: [savedLeads.workspaceId, savedLeads.id],
    }),
    dailyUsageFk: foreignKey({
      name: 'saved_lead_inv_run_daily_usage_fk',
      columns: [table.workspaceId, table.workspaceDayKey],
      foreignColumns: [
        savedLeadInvestigationDailyUsage.workspaceId,
        savedLeadInvestigationDailyUsage.workspaceDayKey,
      ],
    }),
    usagePairCheck: check(
      'saved_lead_inv_run_usage_pair_check',
      sql`(${table.workspaceDayKey} is null and ${table.usageCountedAt} is null) or (${table.workspaceDayKey} is not null and ${table.usageCountedAt} is not null)`,
    ),
    statusCheck: check(
      'saved_lead_inv_run_status_check',
      sql`${table.status} in ('created', 'running', 'completed', 'failed')`,
    ),
    phaseCheck: check(
      'saved_lead_inv_run_phase_check',
      sql`${table.currentPhase} in ('resolving_identity', 'checking_structured_sources', 'searching_entity_domain', 'searching_public_web', 'reading_sources', 'validating_evidence', 'completed')`,
    ),
    triggerStateCheck: check(
      'saved_lead_inv_run_trigger_state_check',
      sql`${table.triggerState} is null or ${table.triggerState} in ('signal_found', 'no_signal')`,
    ),
  }),
)

export const savedLeadInvestigationState = pgTable(
  'saved_lead_investigation_state',
  {
    workspaceId:          text('workspace_id').notNull(),
    savedLeadId:          uuid('saved_lead_id').notNull(),
    latestAttemptRunId:   uuid('latest_attempt_run_id').notNull(),
    latestSuccessfulRunId: uuid('latest_successful_run_id'),
    checkedAt:            timestamp('checked_at', { withTimezone: true }),
    recheckEligibleAt:    timestamp('recheck_eligible_at', { withTimezone: true }),
    resultExpiresAt:      timestamp('result_expires_at', { withTimezone: true }),
    createdAt:            timestamp('created_at', { withTimezone: true })
                            .defaultNow().notNull(),
    updatedAt:            timestamp('updated_at', { withTimezone: true })
                            .defaultNow().notNull(),
  },
  (table) => ({
    workspaceFk: foreignKey({
      name: 'saved_lead_inv_state_workspace_fk',
      columns: [table.workspaceId],
      foreignColumns: [workspaceSettings.workspaceId],
    }),
    pk: primaryKey({
      name: 'saved_lead_inv_state_pk',
      columns: [table.workspaceId, table.savedLeadId],
    }),
    savedLeadOwnershipFk: foreignKey({
      name: 'saved_lead_inv_state_saved_lead_fk',
      columns: [table.workspaceId, table.savedLeadId],
      foreignColumns: [savedLeads.workspaceId, savedLeads.id],
    }),
    latestAttemptFk: foreignKey({
      name: 'saved_lead_inv_state_attempt_fk',
      columns: [
        table.workspaceId,
        table.savedLeadId,
        table.latestAttemptRunId,
      ],
      foreignColumns: [
        savedLeadInvestigationRuns.workspaceId,
        savedLeadInvestigationRuns.savedLeadId,
        savedLeadInvestigationRuns.id,
      ],
    }),
    latestSuccessfulFk: foreignKey({
      name: 'saved_lead_inv_state_success_fk',
      columns: [
        table.workspaceId,
        table.savedLeadId,
        table.latestSuccessfulRunId,
      ],
      foreignColumns: [
        savedLeadInvestigationRuns.workspaceId,
        savedLeadInvestigationRuns.savedLeadId,
        savedLeadInvestigationRuns.id,
      ],
    }),
    latestSuccessfulIdx: index('saved_lead_inv_state_success_idx')
      .on(table.workspaceId, table.latestSuccessfulRunId),
  }),
)

export const savedLeadInvestigationSources = pgTable(
  'saved_lead_investigation_sources',
  {
    id:                  uuid('id').defaultRandom().primaryKey(),
    workspaceId:         text('workspace_id').notNull(),
    investigationRunId:  uuid('investigation_run_id').notNull(),
    registrySourceKey:   text('registry_source_key').notNull(),
    tier:                integer('tier').notNull(),
    availability:        text('availability').notNull(),
    checkState:          text('check_state').notNull(),
    candidateRank:       integer('candidate_rank'),
    fallbackReason:      text('fallback_reason'),
    runtimeLineageRunId: uuid('runtime_lineage_run_id'),
    evidenceSourceId:    uuid('evidence_source_id'),
    createdAt:           timestamp('created_at', { withTimezone: true })
                           .defaultNow().notNull(),
    updatedAt:           timestamp('updated_at', { withTimezone: true })
                           .defaultNow().notNull(),
  },
  (table) => ({
    workspaceFk: foreignKey({
      name: 'saved_lead_inv_source_workspace_fk',
      columns: [table.workspaceId],
      foreignColumns: [workspaceSettings.workspaceId],
    }),
    runtimeLineageFk: foreignKey({
      name: 'saved_lead_inv_source_lineage_fk',
      columns: [table.runtimeLineageRunId],
      foreignColumns: [runtimeLineageRuns.id],
    }),
    evidenceSourceFk: foreignKey({
      name: 'saved_lead_inv_source_evidence_fk',
      columns: [table.evidenceSourceId],
      foreignColumns: [evidenceSources.id],
    }),
    workspaceSourceUnique: uniqueIndex('saved_lead_inv_source_workspace_id_unique')
      .on(table.workspaceId, table.id),
    workspaceRunSourceUnique: uniqueIndex('saved_lead_inv_source_run_id_unique')
      .on(table.workspaceId, table.investigationRunId, table.id),
    sourceArtifactUnique: uniqueIndex('saved_lead_inv_source_artifact_unique')
      .on(
        table.workspaceId,
        table.investigationRunId,
        table.id,
        table.evidenceSourceId,
      ),
    runFk: foreignKey({
      name: 'saved_lead_inv_source_run_fk',
      columns: [table.workspaceId, table.investigationRunId],
      foreignColumns: [
        savedLeadInvestigationRuns.workspaceId,
        savedLeadInvestigationRuns.id,
      ],
    }),
    primarySourceUnique: uniqueIndex('saved_lead_inv_source_primary_unique')
      .on(table.workspaceId, table.investigationRunId, table.registrySourceKey)
      .where(sql`${table.candidateRank} is null`),
    candidateSourceUnique: uniqueIndex('saved_lead_inv_source_candidate_unique')
      .on(
        table.workspaceId,
        table.investigationRunId,
        table.registrySourceKey,
        table.candidateRank,
      )
      .where(sql`${table.candidateRank} is not null`),
    lookupIdx: index('saved_lead_inv_source_lookup_idx')
      .on(
        table.workspaceId,
        table.investigationRunId,
        table.tier,
        table.candidateRank,
      ),
    tierCheck: check(
      'saved_lead_inv_source_tier_check',
      sql`${table.tier} between 1 and 3`,
    ),
    rankCheck: check(
      'saved_lead_inv_source_rank_check',
      sql`${table.candidateRank} is null or ${table.candidateRank} > 0`,
    ),
    availabilityCheck: check(
      'saved_lead_inv_source_avail_check',
      sql`${table.availability} in ('available', 'unavailable', 'unsupported', 'not_applicable')`,
    ),
    checkStateCheck: check(
      'saved_lead_inv_source_state_check',
      sql`${table.checkState} in ('planned', 'checked', 'failed', 'skipped_budget', 'not_checked')`,
    ),
  }),
)

export const savedLeadTriggerFindings = pgTable(
  'saved_lead_trigger_findings',
  {
    id:                       uuid('id').defaultRandom().primaryKey(),
    workspaceId:              text('workspace_id').notNull(),
    investigationRunId:       uuid('investigation_run_id').notNull(),
    investigationSourceId:    uuid('investigation_source_id').notNull(),
    evidenceSourceId:         uuid('evidence_source_id').notNull(),
    approvedSignalFamilyId:   text('approved_signal_family_id').notNull(),
    approvedSignalLabelId:    text('approved_signal_label_id').notNull(),
    exactExcerpt:             text('exact_excerpt'),
    structuredEvidenceSnapshot: jsonb('structured_evidence_snapshot'),
    eventDate:                timestamp('event_date', { withTimezone: true }).notNull(),
    freshnessEnd:             timestamp('freshness_end', { withTimezone: true }).notNull(),
    identityMatchReasonCodes: jsonb('identity_match_reason_codes').default([]).notNull(),
    qualificationReasonCodes: jsonb('qualification_reason_codes').default([]).notNull(),
    proofHash:                text('proof_hash').notNull(),
    createdAt:                timestamp('created_at', { withTimezone: true })
                                .defaultNow().notNull(),
  },
  (table) => ({
    workspaceFk: foreignKey({
      name: 'saved_lead_trigger_workspace_fk',
      columns: [table.workspaceId],
      foreignColumns: [workspaceSettings.workspaceId],
    }),
    evidenceSourceFk: foreignKey({
      name: 'saved_lead_trigger_evidence_fk',
      columns: [table.evidenceSourceId],
      foreignColumns: [evidenceSources.id],
    }),
    workspaceProofUnique: uniqueIndex('saved_lead_trigger_workspace_proof_unique')
      .on(table.workspaceId, table.proofHash),
    runUnique: uniqueIndex('saved_lead_trigger_run_unique')
      .on(table.workspaceId, table.investigationRunId),
    runFk: foreignKey({
      name: 'saved_lead_trigger_run_fk',
      columns: [table.workspaceId, table.investigationRunId],
      foreignColumns: [
        savedLeadInvestigationRuns.workspaceId,
        savedLeadInvestigationRuns.id,
      ],
    }),
    sourceFk: foreignKey({
      name: 'saved_lead_trigger_source_artifact_fk',
      columns: [
        table.workspaceId,
        table.investigationRunId,
        table.investigationSourceId,
        table.evidenceSourceId,
      ],
      foreignColumns: [
        savedLeadInvestigationSources.workspaceId,
        savedLeadInvestigationSources.investigationRunId,
        savedLeadInvestigationSources.id,
        savedLeadInvestigationSources.evidenceSourceId,
      ],
    }),
    evidenceCheck: check(
      'saved_lead_trigger_evidence_check',
      sql`nullif(trim(${table.exactExcerpt}), '') is not null or ${table.structuredEvidenceSnapshot} is not null`,
    ),
    freshnessCheck: check(
      'saved_lead_trigger_freshness_check',
      sql`${table.freshnessEnd} >= ${table.eventDate}`,
    ),
  }),
)

export const savedLeadProfileFindings = pgTable(
  'saved_lead_profile_findings',
  {
    id:                       uuid('id').defaultRandom().primaryKey(),
    workspaceId:              text('workspace_id').notNull(),
    investigationRunId:       uuid('investigation_run_id').notNull(),
    investigationSourceId:    uuid('investigation_source_id').notNull(),
    evidenceSourceId:         uuid('evidence_source_id').notNull(),
    factKey:                  text('fact_key').notNull(),
    value:                    text('value').notNull(),
    exactExcerpt:             text('exact_excerpt'),
    structuredEvidenceSnapshot: jsonb('structured_evidence_snapshot'),
    observedDate:             timestamp('observed_date', { withTimezone: true }).notNull(),
    eventDate:                timestamp('event_date', { withTimezone: true }),
    identityMatchReasonCodes: jsonb('identity_match_reason_codes').default([]).notNull(),
    conflictGroupId:          text('conflict_group_id'),
    conflictReasonCodes:      jsonb('conflict_reason_codes').default([]).notNull(),
    factExpiration:           timestamp('fact_expiration', { withTimezone: true }).notNull(),
    proofHash:                text('proof_hash').notNull(),
    createdAt:                timestamp('created_at', { withTimezone: true })
                                .defaultNow().notNull(),
  },
  (table) => ({
    workspaceFk: foreignKey({
      name: 'saved_lead_profile_workspace_fk',
      columns: [table.workspaceId],
      foreignColumns: [workspaceSettings.workspaceId],
    }),
    evidenceSourceFk: foreignKey({
      name: 'saved_lead_profile_evidence_fk',
      columns: [table.evidenceSourceId],
      foreignColumns: [evidenceSources.id],
    }),
    workspaceProofUnique: uniqueIndex('saved_lead_profile_workspace_proof_unique')
      .on(table.workspaceId, table.proofHash),
    conflictLookupIdx: index('saved_lead_profile_conflict_idx')
      .on(table.workspaceId, table.investigationRunId, table.conflictGroupId)
      .where(sql`${table.conflictGroupId} is not null`),
    runFk: foreignKey({
      name: 'saved_lead_profile_run_fk',
      columns: [table.workspaceId, table.investigationRunId],
      foreignColumns: [
        savedLeadInvestigationRuns.workspaceId,
        savedLeadInvestigationRuns.id,
      ],
    }),
    sourceFk: foreignKey({
      name: 'saved_lead_profile_source_artifact_fk',
      columns: [
        table.workspaceId,
        table.investigationRunId,
        table.investigationSourceId,
        table.evidenceSourceId,
      ],
      foreignColumns: [
        savedLeadInvestigationSources.workspaceId,
        savedLeadInvestigationSources.investigationRunId,
        savedLeadInvestigationSources.id,
        savedLeadInvestigationSources.evidenceSourceId,
      ],
    }),
    evidenceCheck: check(
      'saved_lead_profile_evidence_check',
      sql`nullif(trim(${table.exactExcerpt}), '') is not null or ${table.structuredEvidenceSnapshot} is not null`,
    ),
    factKeyCheck: check(
      'saved_lead_profile_fact_key_check',
      sql`${table.factKey} in ('official_name', 'business_category', 'domain', 'phone', 'email', 'street_address', 'ownership_or_management', 'facility_or_property_type', 'service_area', 'opening_or_founded_date', 'license_or_permit_reference', 'permit_history', 'latest_permit_date', 'project_or_expansion_context', 'careers_or_hiring_context')`,
    ),
    conflictPairCheck: check(
      'saved_lead_profile_conflict_pair_check',
      sql`(${table.conflictGroupId} is null and jsonb_array_length(${table.conflictReasonCodes}) = 0) or (${table.conflictGroupId} is not null and jsonb_array_length(${table.conflictReasonCodes}) > 0)`,
    ),
  }),
)

// ─────────────────────────────────────────────
// OPPORTUNITY EVIDENCE PROOFS
// Workspace-private proof snapshot linking a surfaced opportunity to source,
// lineage, gate reasons, score reason, and next action.
// ─────────────────────────────────────────────
export const opportunityEvidenceProofs = pgTable('opportunity_evidence_proofs', {
  id:                       uuid('id').defaultRandom().primaryKey(),
  workspaceId:              text('workspace_id').notNull()
                              .references(() => workspaceSettings.workspaceId),
  opportunityId:            uuid('opportunity_id').notNull()
                              .references(() => opportunities.id),
  evidenceSourceId:         uuid('evidence_source_id').notNull()
                              .references(() => evidenceSources.id),
  proofHash:                text('proof_hash').notNull(),
  leadKind:                 text('lead_kind')
                              .default('signal_backed_opportunity')
                              .notNull(),
  providerMode:             text('provider_mode').default('LIVE').notNull(),
  market:                   text('market').notNull(),
  vertical:                 text('vertical').notNull(),
  signalType:               text('signal_type').notNull(),
  signalLabel:              text('signal_label').notNull(),
  verticalFitLabel:         text('vertical_fit_label').notNull(),
  score:                    integer('score').notNull(),
  whyNow:                   text('why_now').notNull(),
  scoreReason:              text('score_reason').notNull(),
  nextActionLabel:          text('next_action_label').notNull(),
  nextActionDetail:         text('next_action_detail').notNull(),
  evidenceSummary:          text('evidence_summary').notNull(),
  sourceExcerpt:            text('source_excerpt').notNull(),
  sourceFingerprint:        text('source_fingerprint').notNull(),
  searchProviderRunId:      text('search_provider_run_id').notNull(),
  evidenceProviderRunId:    text('evidence_provider_run_id').notNull(),
  sourceAdapterRunIds:      text('source_adapter_run_ids').array().default([]).notNull(),
  sourceAdapterListingUrls: text('source_adapter_listing_urls').array().default([]).notNull(),
  gateReasons:              jsonb('gate_reasons').default({}).notNull(),
  providerLineage:          jsonb('provider_lineage').default({}).notNull(),
  proofMetadata:            jsonb('proof_metadata').default({}).notNull(),
  createdAt:                timestamp('created_at').defaultNow().notNull(),
  updatedAt:                timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  opportunityUnique: uniqueIndex('opportunity_evidence_proofs_opportunity_unique')
                       .on(table.opportunityId),
  proofHashUnique:   uniqueIndex('opportunity_evidence_proofs_hash_unique')
                       .on(table.proofHash),
  workspaceIdx:      index('opportunity_evidence_proofs_workspace_idx')
                       .on(table.workspaceId),
  evidenceSourceIdx: index('opportunity_evidence_proofs_source_idx')
                       .on(table.evidenceSourceId),
}))

// ─────────────────────────────────────────────
// LEAD PASS REASONS
// Captures structured feedback when a user passes on a lead in Today's Stack.
// Used as training data for the Quality Scoring Agent to improve future scoring
// and tighten the workspace's ideal-customer profile.
// One row per pass action. A user can pick multiple reasons per pass.
// ─────────────────────────────────────────────
export const leadPassReasons = pgTable('lead_pass_reasons', {
  id:             uuid('id').defaultRandom().primaryKey(),
  workspaceId:    text('workspace_id').notNull()
                    .references(() => workspaceSettings.workspaceId),
  opportunityId:  uuid('opportunity_id').notNull()
                    .references(() => opportunities.id),
  // wrong_contact | already_has_vendor | too_small | out_of_area |
  // bad_signal | not_my_customer | other
  reason:         text('reason').notNull(),
  // Optional free-text note when user adds context
  note:           text('note'),
  // Surface where the pass happened — today_stack | leads_list | lead_profile
  source:         text('source').default('today_stack').notNull(),
  createdAt:      timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  workspaceReasonIdx: index('lead_pass_reasons_workspace_reason_idx')
                        .on(table.workspaceId, table.reason),
  opportunityIdx:     index('lead_pass_reasons_opportunity_idx')
                        .on(table.opportunityId),
}))

// ─────────────────────────────────────────────
// TODAYS RUN ITEMS
// When a lead is added to Today's Run from the swipe stack, it lands here.
// Today's Run is the route/action plan for a contractor's day.
// Items get ordered for optimal route, drafts get prepared (not sent).
// ─────────────────────────────────────────────
export const todaysRunItems = pgTable('todays_run_items', {
  id:                uuid('id').defaultRandom().primaryKey(),
  workspaceId:       text('workspace_id').notNull()
                       .references(() => workspaceSettings.workspaceId),
  opportunityId:     uuid('opportunity_id').notNull()
                       .references(() => opportunities.id),
  // Run date — defaults to today; lets users plan next-day runs
  runDate:           timestamp('run_date').defaultNow().notNull(),
  // Display order in the run list (1, 2, 3...)
  routeOrder:        integer('route_order').notNull(),
  // pending | drafted | sent | completed | removed
  status:            text('status').default('pending').notNull(),
  // Reference to the auto-prepared outreach draft (never sent automatically)
  outreachPlayId:    uuid('outreach_play_id')
                       .references(() => outreachPlays.id),
  addedAt:           timestamp('added_at').defaultNow().notNull(),
  completedAt:       timestamp('completed_at'),
}, (table) => ({
  workspaceRunDateIdx: index('todays_run_workspace_date_idx')
                         .on(table.workspaceId, table.runDate),
  // Same lead can't be on the same day's run twice
  workspaceOpportunityDateUnique: uniqueIndex('todays_run_workspace_opp_date_unique')
                                    .on(table.workspaceId, table.opportunityId, table.runDate),
}))

// ─────────────────────────────────────────────
// SCOUT SCHEDULES
// Per-workspace control over automatic scouting.
// User-facing UX talks about "lead cards delivered"; internally this controls
// how often Fetchi auto-runs SerpAPI scans and LLM scoring on the workspace's behalf.
// ─────────────────────────────────────────────
export const scoutSchedules = pgTable('scout_schedules', {
  workspaceId:         text('workspace_id').primaryKey()
                         .references(() => workspaceSettings.workspaceId),
  // Internal modes: off | once_daily | three_daily | aggressive | custom
  // Customer-facing labels must stay calm:
  // off = "Only when I ask"
  // once_daily = "Once each morning"
  // three_daily = "A few times per day"
  // custom/aggressive = "Custom schedule" (Pro/Scale/admin only)
  // Default at signup is set by tier; user can change anytime in Settings → Scouting
  mode:                text('mode').default('once_daily').notNull(),
  // Schedule expressed as cron expressions (array, evaluated in workspace timezone)
  // e.g. ['0 6 * * *'] for once daily 6am, ['0 6,12,17 * * *'] for 3x daily
  cronExpressions:     text('cron_expressions').array().default([]).notNull(),
  // Workspace timezone (IANA, e.g. 'America/Chicago') — defaults to org profile
  timezone:            text('timezone').default('UTC').notNull(),
  // Pause state — auto-set by margin protection rules
  // active | user_paused | system_paused_low_credits | system_paused_low_yield | system_paused_inactive
  status:              text('status').default('active').notNull(),
  pausedReason:        text('paused_reason'),
  pausedAt:            timestamp('paused_at'),
  // Coverage gate from onboarding / Market Coverage admin.
  // unchecked | strong | moderate | limited | unsupported
  coverageStatus:      text('coverage_status').default('unchecked').notNull(),
  coverageCheckedAt:   timestamp('coverage_checked_at'),
  // User-readable explanation shown in Settings → Scouting
  coverageMessage:     text('coverage_message'),
  // Track auto-scout consumption
  scansToday:          integer('scans_today').default(0).notNull(),
  scansThisMonth:      integer('scans_this_month').default(0).notNull(),
  lastScanAt:          timestamp('last_scan_at'),
  lastScanResultedInLead: boolean('last_scan_resulted_in_lead').default(false).notNull(),
  createdAt:           timestamp('created_at').defaultNow().notNull(),
  updatedAt:           timestamp('updated_at').defaultNow().notNull(),
})

// ─────────────────────────────────────────────
// SCOUT RUNS
// Every individual scout execution (scheduled or manual).
// Used for cost tracking, margin protection, and the customer-facing
// "Fetchi checked 218 sources this morning" transparency message.
// ─────────────────────────────────────────────
export const scoutRuns = pgTable('scout_runs', {
  id:                  uuid('id').defaultRandom().primaryKey(),
  workspaceId:         text('workspace_id').notNull()
                         .references(() => workspaceSettings.workspaceId),
  // scheduled | manual_chat | manual_map | admin_test
  trigger:             text('trigger').notNull(),
  startedAt:           timestamp('started_at').defaultNow().notNull(),
  completedAt:         timestamp('completed_at'),
  // running | completed | failed | budget_exceeded | no_results
  status:              text('status').default('running').notNull(),
  // Cost & yield tracking
  sourcesChecked:      integer('sources_checked').default(0).notNull(),
  serpApiCallsMade:    integer('serp_api_calls_made').default(0).notNull(),
  llmTokensUsed:       integer('llm_tokens_used').default(0).notNull(),
  estimatedCostCents:  integer('estimated_cost_cents').default(0).notNull(),
  signalsFound:        integer('signals_found').default(0).notNull(),
  duplicatesFiltered:  integer('duplicates_filtered').default(0).notNull(),
  // Final delivered count — what the user sees as new lead cards
  // If 0, no lead credit is consumed (margin policy: don't charge for empty scans)
  leadsDelivered:      integer('leads_delivered').default(0).notNull(),
  // Why nothing landed — surfaces as user-facing suggestion
  // 'no_signals_found' | 'all_duplicates' | 'all_below_threshold' | null
  emptyReason:         text('empty_reason'),
  // Whether this run consumed a delivered-lead credit
  creditConsumed:      boolean('credit_consumed').default(false).notNull(),
  metadata:            jsonb('metadata').default({}).notNull(),
}, (table) => ({
  workspaceStartedIdx: index('scout_runs_workspace_started_idx')
                         .on(table.workspaceId, table.startedAt),
  statusIdx:           index('scout_runs_status_idx').on(table.status),
}))

// ─────────────────────────────────────────────
// MARKET COVERAGE
// Admin-controlled coverage map for scheduled scouting.
// Scheduled scouts are coverage-gated; manual chat searches remain allowed within plan limits.
// ─────────────────────────────────────────────
export const marketCoverage = pgTable('market_coverage', {
  id:                  uuid('id').defaultRandom().primaryKey(),
  // Usually US at launch, but included so Japan/other markets can be added later.
  country:             text('country').default('US').notNull(),
  state:               text('state').notNull(),
  metro:               text('metro'),
  city:                text('city'),
  county:              text('county'),
  // roofing | cleaning | hvac | landscaping | plumbing | events | all
  vertical:            text('vertical').default('all').notNull(),
  // strong | moderate | limited | unsupported
  coverageStatus:      text('coverage_status').default('limited').notNull(),
  // 0-100 confidence that scheduled scouting can produce profitable leads here
  coverageScore:       integer('coverage_score').default(0).notNull(),
  // off | once_daily | three_daily | custom — mode recommended by coverage, still capped by tier
  recommendedScoutMode: text('recommended_scout_mode').default('off').notNull(),
  // Coverage-specific scheduled scan cap; actual cap = min(tier cap, coverage cap, spend cap)
  maxDailyScans:       integer('max_daily_scans').default(0).notNull(),
  supportedSignalTypes: text('supported_signal_types').array().default([]).notNull(),
  enabledSignalTypes:  text('enabled_signal_types').array().default([]).notNull(),
  notes:               text('notes'),
  lastCoverageCheckAt: timestamp('last_coverage_check_at'),
  isActive:            boolean('is_active').default(true).notNull(),
  createdAt:           timestamp('created_at').defaultNow().notNull(),
  updatedAt:           timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  marketCoverageLookupIdx: uniqueIndex('market_coverage_lookup_idx')
                             .on(table.country, table.state, table.city, table.vertical),
  marketCoverageStatusIdx: index('market_coverage_status_idx')
                             .on(table.coverageStatus),
}))

// ─────────────────────────────────────────────
// CONTACT ROUTES
// Who to contact at the prospect + how confident we are
// ─────────────────────────────────────────────
export const contactRoutes = pgTable('contact_routes', {
  id:             uuid('id').defaultRandom().primaryKey(),
  workspaceId:    text('workspace_id').notNull()
                    .references(() => workspaceSettings.workspaceId),
  prospectId:     uuid('prospect_id')
                    .references(() => prospects.id),
  contactName:    text('contact_name'),
  contactTitle:   text('contact_title'),
  contactEmail:   text('contact_email'),
  contactPhone:   text('contact_phone'),
  // email | phone | linkedin | form
  routeType:      text('route_type').default('email').notNull(),
  // 0-100 confidence in contact info accuracy
  confidence:     integer('confidence').default(0).notNull(),
  verified:       boolean('verified').default(false).notNull(),
  createdAt:      timestamp('created_at').defaultNow().notNull(),
})

// ─────────────────────────────────────────────
// OUTREACH PLAYS
// Generated email drafts for each opportunity
// ─────────────────────────────────────────────
export const outreachPlays = pgTable('outreach_plays', {
  id:                  uuid('id').defaultRandom().primaryKey(),
  workspaceId:         text('workspace_id').notNull()
                         .references(() => workspaceSettings.workspaceId),
  opportunityId:       uuid('opportunity_id')
                         .references(() => opportunities.id),
  contactRouteId:      uuid('contact_route_id')
                         .references(() => contactRoutes.id),
  subjectLine:         text('subject_line'),
  body:                text('body').notNull(),
  // The specific signal detail referenced in this outreach
  signalReference:     text('signal_reference'),
  // draft | sent | responded
  status:              text('status').default('draft').notNull(),
  sentAt:              timestamp('sent_at'),
  responseReceivedAt:  timestamp('response_received_at'),
  // For prompt version tracking + evals
  promptVersionId:     uuid('prompt_version_id'),
  modelUsed:           text('model_used'),
  createdAt:           timestamp('created_at').defaultNow().notNull(),
  updatedAt:           timestamp('updated_at').defaultNow().notNull(),
})

// ─────────────────────────────────────────────
// PROMPTS
// Versioned prompt store — never hardcode prompts in app code
// All Claude prompts read from this table at runtime
// ─────────────────────────────────────────────
export const prompts = pgTable('prompts', {
  id:                 uuid('id').defaultRandom().primaryKey(),
  // signal_classification | why_now_generation | outreach_drafting |
  // opportunity_scoring | conversation_system | enrichment |
  // deduplication | staleness_check
  name:               text('name').notNull(),
  version:            integer('version').notNull(),
  content:            text('content').notNull(),
  // Which model this prompt is tuned for
  modelTarget:        text('model_target'),
  isActive:           boolean('is_active').default(false).notNull(),
  // A/B testing — percentage of traffic (0-100) routed to this version
  trafficPercentage:  integer('traffic_percentage').default(100).notNull(),
  performanceMetrics: jsonb('performance_metrics').default({}).notNull(),
  createdBy:          text('created_by'),
  createdAt:          timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  nameVersionUnique: uniqueIndex('prompts_name_version_unique')
                       .on(table.name, table.version),
  // Fast lookup of active prompt by name
  activePromptIdx:   index('prompts_active_idx')
                       .on(table.name, table.isActive),
}))

// ─────────────────────────────────────────────
// NOTIFICATION PREFERENCES
// Per-workspace email notification settings
// SMS intentionally omitted — email only at launch (TCPA risk)
// ─────────────────────────────────────────────
export const notificationPreferences = pgTable('notification_preferences', {
  workspaceId:           text('workspace_id').primaryKey()
                           .references(() => workspaceSettings.workspaceId),
  dailyDigestEnabled:    boolean('daily_digest_enabled').default(true).notNull(),
  // HH:MM format in user's local time
  dailyDigestTime:       text('daily_digest_time').default('07:00').notNull(),
  pushOnHighScore:       boolean('push_on_high_score').default(true).notNull(),
  highScoreThreshold:    integer('high_score_threshold').default(85).notNull(),
  pushOnExpiringLeads:   boolean('push_on_expiring_leads').default(true).notNull(),
  weeklySummaryEnabled:  boolean('weekly_summary_enabled').default(false).notNull(),
  limitWarningEnabled:   boolean('limit_warning_enabled').default(true).notNull(),
  // If null, falls back to Clerk user's primary email
  notificationEmail:     text('notification_email'),
  updatedAt:             timestamp('updated_at').defaultNow().notNull(),
})

// ─────────────────────────────────────────────
// SIGNAL PREFERENCES
// Per-workspace signal type toggles + quality filters
// ─────────────────────────────────────────────
export const signalPreferences = pgTable('signal_preferences', {
  workspaceId:            text('workspace_id').primaryKey()
                            .references(() => workspaceSettings.workspaceId),
  permitsEnabled:         boolean('permits_enabled').default(true).notNull(),
  stormEnabled:           boolean('storm_enabled').default(true).notNull(),
  newListingsEnabled:     boolean('new_listings_enabled').default(true).notNull(),
  jobPostingsEnabled:     boolean('job_postings_enabled').default(false).notNull(),
  eventsEnabled:          boolean('events_enabled').default(false).notNull(),
  // Minimum score to surface an opportunity (0-100)
  minScoreThreshold:      integer('min_score_threshold').default(70).notNull(),
  // Array of keywords that disqualify a lead
  excludedKeywords:       text('excluded_keywords').array().default([]).notNull(),
  updatedAt:              timestamp('updated_at').defaultNow().notNull(),
})

// ─────────────────────────────────────────────
// EVENTS
// Passive analytics — every meaningful user action
// Schema and instrumentation both ship in Phase 1.
// ─────────────────────────────────────────────
export const events = pgTable('events', {
  id:          uuid('id').defaultRandom().primaryKey(),
  workspaceId: text('workspace_id').notNull()
                 .references(() => workspaceSettings.workspaceId),
  userId:      text('user_id').notNull(),
  // trial_gate_shown | trial_gate_converted | trial_gate_dismissed |
  // email_verification_completed | disposable_email_blocked |
  // opportunity_viewed | lead_saved | outreach_drafted | outreach_sent |
  // outcome_logged | onboarding_step_completed | out_of_scope_question
  eventType:   text('event_type').notNull(),
  metadata:    jsonb('metadata').default({}).notNull(),
  createdAt:   timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  workspaceEventIdx: index('events_workspace_type_idx')
                       .on(table.workspaceId, table.eventType),
  createdAtIdx:      index('events_created_at_idx').on(table.createdAt),
}))

// ─────────────────────────────────────────────
// AGENT RUNS
// Observability for all background agent executions
// ─────────────────────────────────────────────
export const agentRuns = pgTable('agent_runs', {
  id:                   uuid('id').defaultRandom().primaryKey(),
  workspaceId:          text('workspace_id').notNull()
                          .references(() => workspaceSettings.workspaceId),
  // signal_detection | enrichment | deduplication | staleness |
  // quality_scoring | outcome_learning | onboarding_completion | notification
  agentType:            text('agent_type').notNull(),
  // running | completed | failed
  status:               text('status').default('running').notNull(),
  startedAt:            timestamp('started_at').defaultNow().notNull(),
  completedAt:          timestamp('completed_at'),
  errorMessage:         text('error_message'),
  signalsFound:         integer('signals_found').default(0).notNull(),
  opportunitiesCreated: integer('opportunities_created').default(0).notNull(),
  metadata:             jsonb('metadata').default({}).notNull(),
}, (table) => ({
  workspaceAgentIdx: index('agent_runs_workspace_idx')
                       .on(table.workspaceId, table.startedAt),
}))

// ─────────────────────────────────────────────
// SEARCH PROVIDERS
// Provider registry for search layer. Search architecture is provider-agnostic;
// SerpAPI is the default launch provider. Runtime code reads this table and
// routes through lib/search/SearchProvider — never directly from app routes.
// ─────────────────────────────────────────────
export const searchProviders = pgTable('search_providers', {
  id:                    uuid('id').defaultRandom().primaryKey(),
  slug:                  text('slug').notNull(),  // serpapi | future_provider
  name:                  text('name').notNull(),
  providerType:          text('provider_type').notNull(), // serpapi | custom | future_provider
  isActive:              boolean('is_active').default(true).notNull(),
  adapterPath:           text('adapter_path').notNull(),  // lib/search/providers/serpapi.ts
  apiKeySecretName:      text('api_key_secret_name'),     // SERPAPI_API_KEY
  skillReference:        text('skill_reference'),         // .claude/skills/serpapi-web-search/SKILL.md
  docsUrl:               text('docs_url'),
  defaultWebEngine:      text('default_web_engine'),
  defaultNewsEngine:     text('default_news_engine'),
  defaultMapsEngine:     text('default_maps_engine'),
  defaultJobsEngine:     text('default_jobs_engine'),
  enabledVerticals:      text('enabled_verticals').array().default([]).notNull(),
  enabledSignalTypes:    text('enabled_signal_types').array().default([]).notNull(),
  costEstimateCents:     integer('cost_estimate_cents').default(1).notNull(),
  failoverProviderSlug:  text('failover_provider_slug'),
  // Structured provider notes for admins/builders. Do not rely on this as
  // the only source of API behavior; adapter code owns request/parse logic.
  adminNotes:            text('admin_notes'),
  createdAt:             timestamp('created_at').defaultNow().notNull(),
  updatedAt:             timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  slugUnique: uniqueIndex('search_providers_slug_unique').on(table.slug),
}))

// ─────────────────────────────────────────────
// QUERY STRATEGIES
// Signal search strategies read by the Query Builder
// Seeded in db/seed.ts — never hardcoded in app code
// ─────────────────────────────────────────────
export const queryStrategies = pgTable('query_strategies', {
  id:              uuid('id').defaultRandom().primaryKey(),
  // roofing | cleaning | hvac | landscaping | events | all
  vertical:        text('vertical').notNull(),
  // storm_damage | building_permit | new_business_listing | job_posting | event
  signalType:      text('signal_type').notNull(),
  // Search provider to route through. Defaults to SerpAPI at launch but can be changed later.
  searchProviderSlug: text('search_provider_slug').default('serpapi').notNull(),
  // Provider-specific engine. For SerpAPI at launch: google_light | google_news_light | google_maps | google_jobs.
  // Field name remains serpApiEngine for backward compatibility in seed/spec, but app logic treats it as providerEngine.
  serpApiEngine:   text('serp_api_engine').notNull(),
  // Template string with {city}, {state}, {vertical} placeholders
  queryTemplate:   text('query_template').notNull(),
  // 1 = highest priority, 3 = lowest
  priority:        integer('priority').default(2).notNull(),
  isActive:        boolean('is_active').default(true).notNull(),
  createdAt:       timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  strategyUnique: uniqueIndex('query_strategies_unique')
                    .on(table.vertical, table.signalType, table.searchProviderSlug, table.serpApiEngine, table.queryTemplate),
}))

// ─────────────────────────────────────────────
// WEATHER EVENTS
// Pre-fetched nightly from NWS API
// Used by Query Builder to detect storm signal opportunities
// ─────────────────────────────────────────────
export const weatherEvents = pgTable('weather_events', {
  id:            uuid('id').defaultRandom().primaryKey(),
  eventType:     text('event_type').notNull(),  // hail | wind | flood | tornado
  severity:      text('severity'),              // minor | moderate | severe | extreme
  affectedArea:  text('affected_area'),         // city/county description
  state:         text('state'),
  // Lat/lng for geo-matching to workspace service areas
  latitude:      text('latitude'),
  longitude:     text('longitude'),
  // Hail size in inches if applicable
  hailSizeInches: text('hail_size_inches'),
  eventDate:     timestamp('event_date').notNull(),
  expiresAt:     timestamp('expires_at'),
  rawData:       jsonb('raw_data'),
  createdAt:     timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  eventDateIdx: index('weather_events_date_idx').on(table.eventDate),
  stateIdx:     index('weather_events_state_idx').on(table.state),
}))

// ─────────────────────────────────────────────
// WEBHOOK CONFIGS
// Per-workspace outbound webhooks
// ─────────────────────────────────────────────
export const webhookConfigs = pgTable('webhook_configs', {
  id:          uuid('id').defaultRandom().primaryKey(),
  workspaceId: text('workspace_id').notNull()
                 .references(() => workspaceSettings.workspaceId),
  endpointUrl: text('endpoint_url').notNull(),
  // HMAC secret for signature verification
  secret:      text('secret').notNull(),
  // Array of event types this webhook fires on
  events:      text('events').array().notNull(),
  isActive:    boolean('is_active').default(true).notNull(),
  createdAt:   timestamp('created_at').defaultNow().notNull(),
})

// ─────────────────────────────────────────────
// SEO PAGES
// Programmatic SEO landing pages — schema + template in Phase 1; populate with real signal counts as data accumulates
// One template, many city/vertical combinations
// ─────────────────────────────────────────────
export const seoPages = pgTable('seo_pages', {
  id:              uuid('id').defaultRandom().primaryKey(),
  slug:            text('slug').notNull(),
  vertical:        text('vertical'),
  city:            text('city'),
  state:           text('state'),
  // vertical_city | signal_type | alternative
  pageType:        text('page_type').notNull(),
  h1:              text('h1').notNull(),
  metaDescription: text('meta_description').notNull(),
  // For /alternatives/[competitor] pages
  competitorName:  text('competitor_name'),
  isPublished:     boolean('is_published').default(false).notNull(),
  createdAt:       timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  slugUnique: uniqueIndex('seo_pages_slug_unique').on(table.slug),
}))

// ─────────────────────────────────────────────
// SIGNUP RATE LIMITS
// IP-based signup rate limiting (abuse prevention)
// Never store raw IP — store sha256 hash only
// Cleanup: delete rows where window_start < now() - 24 hours
// ─────────────────────────────────────────────
export const signupRateLimits = pgTable('signup_rate_limits', {
  // sha256 of client IP — never store raw IP
  ipHash:      text('ip_hash').primaryKey(),
  count:       integer('count').default(1).notNull(),
  windowStart: timestamp('window_start').defaultNow().notNull(),
})


// ─────────────────────────────────────────────
// RELATIONS
// Drizzle relations for type-safe joins
// ─────────────────────────────────────────────

export const workspaceSettingsRelations = relations(workspaceSettings, ({ one, many }) => ({
  subscription:            one(workspaceSubscriptions),
  learning:                one(workspaceLearning),
  serviceProfile:          one(serviceProfiles),
  signalPreferences:       one(signalPreferences),
  notificationPreferences: one(notificationPreferences),
  signals:                 many(signals),
  prospects:               many(prospects),
  opportunities:           many(opportunities),
  savedLeads:              many(savedLeads),
  agentRuns:               many(agentRuns),
  events:                  many(events),
  opportunityEvidenceProofs: many(opportunityEvidenceProofs),
}))

export const signalsRelations = relations(signals, ({ one, many }) => ({
  workspace:     one(workspaceSettings, {
    fields: [signals.workspaceId],
    references: [workspaceSettings.workspaceId],
  }),
  opportunities: many(opportunities),
}))

export const prospectsRelations = relations(prospects, ({ one, many }) => ({
  workspace:     one(workspaceSettings, {
    fields: [prospects.workspaceId],
    references: [workspaceSettings.workspaceId],
  }),
  opportunities: many(opportunities),
  contactRoutes: many(contactRoutes),
}))

export const opportunitiesRelations = relations(opportunities, ({ one, many }) => ({
  workspace:     one(workspaceSettings, {
    fields: [opportunities.workspaceId],
    references: [workspaceSettings.workspaceId],
  }),
  signal:        one(signals, {
    fields: [opportunities.signalId],
    references: [signals.id],
  }),
  prospect:      one(prospects, {
    fields: [opportunities.prospectId],
    references: [prospects.id],
  }),
  outreachPlays: many(outreachPlays),
  evidenceProofs: many(opportunityEvidenceProofs),
}))

export const savedLeadsRelations = relations(savedLeads, ({ one }) => ({
  workspace: one(workspaceSettings, {
    fields: [savedLeads.workspaceId],
    references: [workspaceSettings.workspaceId],
  }),
}))

export const evidenceSourcesRelations = relations(evidenceSources, ({ many }) => ({
  runtimeLineageRuns: many(runtimeLineageRuns),
  opportunityEvidenceProofs: many(opportunityEvidenceProofs),
}))

export const runtimeLineageRunsRelations = relations(runtimeLineageRuns, ({ one }) => ({
  evidenceSource: one(evidenceSources, {
    fields: [runtimeLineageRuns.evidenceSourceId],
    references: [evidenceSources.id],
  }),
}))

export const opportunityEvidenceProofsRelations = relations(opportunityEvidenceProofs, ({ one }) => ({
  workspace: one(workspaceSettings, {
    fields: [opportunityEvidenceProofs.workspaceId],
    references: [workspaceSettings.workspaceId],
  }),
  opportunity: one(opportunities, {
    fields: [opportunityEvidenceProofs.opportunityId],
    references: [opportunities.id],
  }),
  evidenceSource: one(evidenceSources, {
    fields: [opportunityEvidenceProofs.evidenceSourceId],
    references: [evidenceSources.id],
  }),
}))

export const contactRoutesRelations = relations(contactRoutes, ({ one }) => ({
  prospect: one(prospects, {
    fields: [contactRoutes.prospectId],
    references: [prospects.id],
  }),
}))

export const outreachPlaysRelations = relations(outreachPlays, ({ one }) => ({
  opportunity:  one(opportunities, {
    fields: [outreachPlays.opportunityId],
    references: [opportunities.id],
  }),
  contactRoute: one(contactRoutes, {
    fields: [outreachPlays.contactRouteId],
    references: [contactRoutes.id],
  }),
}))


// ─────────────────────────────────────────────
// TYPE EXPORTS
// Inferred types for use throughout the app
// Use these instead of writing types by hand
// ─────────────────────────────────────────────

export type WorkspaceSettings     = typeof workspaceSettings.$inferSelect
export type NewWorkspaceSettings  = typeof workspaceSettings.$inferInsert

export type WorkspaceSubscription     = typeof workspaceSubscriptions.$inferSelect
export type NewWorkspaceSubscription  = typeof workspaceSubscriptions.$inferInsert

export type ServiceProfile     = typeof serviceProfiles.$inferSelect
export type NewServiceProfile  = typeof serviceProfiles.$inferInsert

export type Signal     = typeof signals.$inferSelect
export type NewSignal  = typeof signals.$inferInsert

export type Prospect     = typeof prospects.$inferSelect
export type NewProspect  = typeof prospects.$inferInsert

export type Opportunity     = typeof opportunities.$inferSelect
export type NewOpportunity  = typeof opportunities.$inferInsert

export type SavedLead     = typeof savedLeads.$inferSelect
export type NewSavedLead  = typeof savedLeads.$inferInsert

export type EvidenceSource     = typeof evidenceSources.$inferSelect
export type NewEvidenceSource  = typeof evidenceSources.$inferInsert

export type RuntimeLineageRun     = typeof runtimeLineageRuns.$inferSelect
export type NewRuntimeLineageRun  = typeof runtimeLineageRuns.$inferInsert

export type SavedLeadInvestigationStateRow =
  typeof savedLeadInvestigationState.$inferSelect
export type NewSavedLeadInvestigationStateRow =
  typeof savedLeadInvestigationState.$inferInsert

export type SavedLeadInvestigationRunRow =
  typeof savedLeadInvestigationRuns.$inferSelect
export type NewSavedLeadInvestigationRunRow =
  typeof savedLeadInvestigationRuns.$inferInsert

export type SavedLeadInvestigationSourceRow =
  typeof savedLeadInvestigationSources.$inferSelect
export type NewSavedLeadInvestigationSourceRow =
  typeof savedLeadInvestigationSources.$inferInsert

export type SavedLeadTriggerFindingRow =
  typeof savedLeadTriggerFindings.$inferSelect
export type NewSavedLeadTriggerFindingRow =
  typeof savedLeadTriggerFindings.$inferInsert

export type SavedLeadProfileFindingRow =
  typeof savedLeadProfileFindings.$inferSelect
export type NewSavedLeadProfileFindingRow =
  typeof savedLeadProfileFindings.$inferInsert

export type SavedLeadInvestigationDailyUsageRow =
  typeof savedLeadInvestigationDailyUsage.$inferSelect
export type NewSavedLeadInvestigationDailyUsageRow =
  typeof savedLeadInvestigationDailyUsage.$inferInsert

export type OpportunityEvidenceProof     = typeof opportunityEvidenceProofs.$inferSelect
export type NewOpportunityEvidenceProof  = typeof opportunityEvidenceProofs.$inferInsert

export type ContactRoute     = typeof contactRoutes.$inferSelect
export type NewContactRoute  = typeof contactRoutes.$inferInsert

export type LeadPassReason    = typeof leadPassReasons.$inferSelect
export type NewLeadPassReason = typeof leadPassReasons.$inferInsert

export type TodaysRunItem     = typeof todaysRunItems.$inferSelect
export type NewTodaysRunItem  = typeof todaysRunItems.$inferInsert

export type ScoutSchedule     = typeof scoutSchedules.$inferSelect
export type NewScoutSchedule  = typeof scoutSchedules.$inferInsert

export type ScoutRun          = typeof scoutRuns.$inferSelect
export type NewScoutRun       = typeof scoutRuns.$inferInsert

export type MarketCoverage     = typeof marketCoverage.$inferSelect
export type NewMarketCoverage  = typeof marketCoverage.$inferInsert

export type OutreachPlay     = typeof outreachPlays.$inferSelect
export type NewOutreachPlay  = typeof outreachPlays.$inferInsert

export type Prompt     = typeof prompts.$inferSelect
export type NewPrompt  = typeof prompts.$inferInsert

export type AgentRun     = typeof agentRuns.$inferSelect
export type NewAgentRun  = typeof agentRuns.$inferInsert

export type Event     = typeof events.$inferSelect
export type NewEvent  = typeof events.$inferInsert

export type SignalPreferences    = typeof signalPreferences.$inferSelect
export type NotificationPrefs    = typeof notificationPreferences.$inferSelect
export type WeatherEvent         = typeof weatherEvents.$inferSelect
export type SearchProvider       = typeof searchProviders.$inferSelect
export type NewSearchProvider    = typeof searchProviders.$inferInsert
export type QueryStrategy        = typeof queryStrategies.$inferSelect


// ─────────────────────────────────────────────
// AGENT REGISTRY
// Provider-agnostic agent configuration table
// Every agent declares its own provider + model independently
// All config is runtime-changeable from the admin panel — no redeployment needed
//
// Provider strategy:
//   conversation, outreach → anthropic (user-facing quality matters)
//   signal_detection, deduplication, staleness,
//   enrichment, quality_scoring, notification → groq (volume tasks, 10-30x cheaper)
//   outcome_learning, onboarding → google (analytical/email, cheap + capable)
//   escalation (all) → anthropic opus (hard decisions, rare calls)
// ─────────────────────────────────────────────
export const agentRegistry = pgTable('agent_registry', {
  id:                 uuid('id').defaultRandom().primaryKey(),
  slug:               text('slug').notNull(),   // conversation | signal_detection | outreach | etc.
  name:               text('name').notNull(),
  description:        text('description'),
  // realtime = user-facing synchronous | background = scheduled/triggered async
  pattern:            text('pattern').notNull(),
  // anthropic | openai | google | groq | together | custom
  provider:           text('provider').notNull(),
  model:              text('model').notNull(),
  // Optional escalation to a higher-tier model for hard decisions
  escalationProvider: text('escalation_provider'),
  escalationModel:    text('escalation_model'),
  promptKey:          text('prompt_key'),       // FK to prompts.name
  isActive:           boolean('is_active').default(true).notNull(),
  maxTokens:          integer('max_tokens').default(1024).notNull(),
  // 0.0 = deterministic, 1.0 = creative
  temperature:        text('temperature').default('0.3').notNull(),
  timeoutMs:          integer('timeout_ms').default(30000).notNull(),
  retries:            integer('retries').default(2).notNull(),
  batchSize:          integer('batch_size'),    // null = not a batch agent
  concurrency:        integer('concurrency').default(1).notNull(),
  // Array of tool/skill names this agent can call
  skills:             text('skills').array().default([]).notNull(),
  // Performance tracking
  avgLatencyMs:       integer('avg_latency_ms'),
  avgCostCents:       integer('avg_cost_cents'),
  successRate:        text('success_rate'),
  createdAt:          timestamp('created_at').defaultNow().notNull(),
  updatedAt:          timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  slugUnique: uniqueIndex('agent_registry_slug_unique').on(table.slug),
}))

// ─────────────────────────────────────────────
// ADMIN TABLES (May 15 session)
// Internal operations — not customer-facing
// ─────────────────────────────────────────────

export const adminNotes = pgTable('admin_notes', {
  id:          uuid('id').defaultRandom().primaryKey(),
  workspaceId: text('workspace_id').notNull()
                 .references(() => workspaceSettings.workspaceId),
  adminUserId: text('admin_user_id').notNull(),  // Clerk user ID of the admin
  note:        text('note').notNull(),
  createdAt:   timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  workspaceIdx: index('admin_notes_workspace_idx').on(table.workspaceId),
}))

export const abuseFlags = pgTable('abuse_flags', {
  id:           uuid('id').defaultRandom().primaryKey(),
  workspaceId:  text('workspace_id')
                  .references(() => workspaceSettings.workspaceId),
  // low | medium | high | critical
  severity:     text('severity').notNull(),
  // disposable_email | duplicate_workspace | rate_limit_exceeded |
  // excessive_credits | suspicious_ip | rapid_signups
  flagType:     text('flag_type').notNull(),
  detail:       text('detail'),
  // open | reviewed | resolved | false_positive
  status:       text('status').default('open').notNull(),
  resolvedBy:   text('resolved_by'),
  resolvedAt:   timestamp('resolved_at'),
  createdAt:    timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  statusIdx:   index('abuse_flags_status_idx').on(table.status, table.severity),
}))

export const announcements = pgTable('announcements', {
  id:          uuid('id').defaultRandom().primaryKey(),
  title:       text('title').notNull(),
  body:        text('body').notNull(),
  // info | warning | maintenance | feature
  type:        text('type').default('info').notNull(),
  // all | specific workspaces
  audience:    text('audience').default('all').notNull(),
  targetIds:   text('target_ids').array(),  // workspace IDs if audience = specific
  isActive:    boolean('is_active').default(true).notNull(),
  startsAt:    timestamp('starts_at'),
  endsAt:      timestamp('ends_at'),
  createdBy:   text('created_by').notNull(),
  createdAt:   timestamp('created_at').defaultNow().notNull(),
})

export const featureFlags = pgTable('feature_flags', {
  id:           uuid('id').defaultRandom().primaryKey(),
  flag:         text('flag').notNull(),         // e.g. 'voice_input' | 'map_tab'
  description:  text('description'),
  // global | workspace | percentage
  scope:        text('scope').default('global').notNull(),
  isEnabled:    boolean('is_enabled').default(false).notNull(),
  // For percentage rollouts (0-100)
  rolloutPct:   integer('rollout_pct').default(0).notNull(),
  // For workspace-specific flags
  workspaceIds: text('workspace_ids').array(),
  updatedBy:    text('updated_by'),
  updatedAt:    timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  flagUnique: uniqueIndex('feature_flags_flag_unique').on(table.flag),
}))


// ─────────────────────────────────────────────
// PRICING TIERS
// All pricing data — editable from admin panel
// Code reads from this table at runtime — never hardcodes prices or limits
// ─────────────────────────────────────────────
export const pricingTiers = pgTable('pricing_tiers', {
  id:                   uuid('id').defaultRandom().primaryKey(),
  slug:                 text('slug').notNull(),  // starter | growth | pro | scale
  name:                 text('name').notNull(),
  description:          text('description'),
  monthlyPriceCents:    integer('monthly_price_cents').notNull(),
  annualPriceCents:     integer('annual_price_cents').notNull(),
  opportunitiesLimit:   integer('opportunities_limit'),  // null = unset limit; gate blocks until resolved — do not treat as unlimited
  // Top-up rate in cents per opportunity — lower for annual subscribers
  topupRateCentsMonthly: integer('topup_rate_cents_monthly').notNull(),
  topupRateCentsAnnual:  integer('topup_rate_cents_annual').notNull(),
  // Stripe price IDs — set via admin or env
  stripePriceIdMonthly: text('stripe_price_id_monthly'),
  stripePriceIdAnnual:  text('stripe_price_id_annual'),
  // Display order on pricing page (1=first)
  displayOrder:         integer('display_order').notNull(),
  isPopular:            boolean('is_popular').default(false).notNull(),
  isActive:             boolean('is_active').default(true).notNull(),
  // Marketing copy
  featuresBullets:      text('features_bullets').array().default([]).notNull(),
  createdAt:            timestamp('created_at').defaultNow().notNull(),
  updatedAt:            timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  slugUnique: uniqueIndex('pricing_tiers_slug_unique').on(table.slug),
}))

// ─────────────────────────────────────────────
// SYSTEM SETTINGS
// Global key/value tunables — editable from admin panel
// Use for thresholds, timers, rate limits, anything that might be tweaked quarterly
// Code reads at runtime with fallback defaults if key not set
// ─────────────────────────────────────────────
export const systemSettings = pgTable('system_settings', {
  key:         text('key').primaryKey(),
  value:       text('value').notNull(),
  // string | number | boolean | json — for parsing on read
  valueType:   text('value_type').notNull(),
  category:    text('category').notNull(),  // trial | signals | rate_limits | cron | abuse
  description: text('description'),
  updatedBy:   text('updated_by'),
  updatedAt:   timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  categoryIdx: index('system_settings_category_idx').on(table.category),
}))

// ─────────────────────────────────────────────
// EMAIL TEMPLATES
// Editable email content — admin panel writes, Resend reads at send time
// Subject and body support {{variable}} substitution
// ─────────────────────────────────────────────
export const emailTemplates = pgTable('email_templates', {
  id:          uuid('id').defaultRandom().primaryKey(),
  slug:        text('slug').notNull(),  // daily_digest | trial_gate_followup | etc.
  name:        text('name').notNull(),
  subject:     text('subject').notNull(),
  bodyHtml:    text('body_html').notNull(),
  bodyText:    text('body_text').notNull(),
  // Description of expected template variables
  variables:   jsonb('variables').default([]).notNull(),
  isActive:    boolean('is_active').default(true).notNull(),
  // For A/B testing of email content
  trafficPct:  integer('traffic_pct').default(100).notNull(),
  version:     integer('version').default(1).notNull(),
  updatedBy:   text('updated_by'),
  createdAt:   timestamp('created_at').defaultNow().notNull(),
  updatedAt:   timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  slugVersionUnique: uniqueIndex('email_templates_slug_version_unique')
                       .on(table.slug, table.version),
}))

// ─────────────────────────────────────────────
// TIER FEATURES
// Which features are unlocked at each tier — editable from admin panel
// Code checks this table before rendering or running gated features
// ─────────────────────────────────────────────
export const tierFeatures = pgTable('tier_features', {
  id:          uuid('id').defaultRandom().primaryKey(),
  tierSlug:    text('tier_slug').notNull(),  // FK to pricing_tiers.slug
  featureKey:  text('feature_key').notNull(),  // voice_input | map_tab | webhooks | etc.
  isEnabled:   boolean('is_enabled').default(false).notNull(),
  // Optional usage cap (e.g. 5 voice transcriptions/day on Starter)
  usageCap:    integer('usage_cap'),
  updatedAt:   timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  tierFeatureUnique: uniqueIndex('tier_features_tier_feature_unique')
                       .on(table.tierSlug, table.featureKey),
}))


// ─────────────────────────────────────────────
// TYPE EXPORTS — admin-controlled config tables
// ─────────────────────────────────────────────
export type PricingTier     = typeof pricingTiers.$inferSelect
export type NewPricingTier  = typeof pricingTiers.$inferInsert

export type SystemSetting     = typeof systemSettings.$inferSelect
export type NewSystemSetting  = typeof systemSettings.$inferInsert

export type EmailTemplate     = typeof emailTemplates.$inferSelect
export type NewEmailTemplate  = typeof emailTemplates.$inferInsert

export type TierFeature       = typeof tierFeatures.$inferSelect
export type NewTierFeature    = typeof tierFeatures.$inferInsert

// ─────────────────────────────────────────────
// TYPE EXPORTS — registry and admin tables
// ─────────────────────────────────────────────
export type AgentRegistryEntry  = typeof agentRegistry.$inferSelect
export type NewAgentRegistryEntry = typeof agentRegistry.$inferInsert

export type AdminNote    = typeof adminNotes.$inferSelect
export type AbuseFlag    = typeof abuseFlags.$inferSelect
export type Announcement = typeof announcements.$inferSelect
export type FeatureFlag  = typeof featureFlags.$inferSelect


// ═══════════════════════════════════════════════════════════════════
// REFERRALS, PROMOS, AFFILIATES, CONVERSION TRACKING, OAUTH
// ═══════════════════════════════════════════════════════════════════

// ─────────────────────────────────────────────
// USER REFERRALS — viral mechanism
// Every workspace gets a unique referral_code at signup
// Referrer + friend both get rewards on conversion to paid
// ─────────────────────────────────────────────
export const referrals = pgTable('referrals', {
  id:                       uuid('id').defaultRandom().primaryKey(),
  // The workspace that shared the referral link
  referrerWorkspaceId:      text('referrer_workspace_id').notNull()
                              .references(() => workspaceSettings.workspaceId),
  // The workspace that signed up using the link
  referredWorkspaceId:      text('referred_workspace_id').notNull()
                              .references(() => workspaceSettings.workspaceId),
  // The referral code used (matches workspace_settings.referral_code on referrer)
  referralCode:             text('referral_code').notNull(),
  signedUpAt:               timestamp('signed_up_at').defaultNow().notNull(),
  // Set when referred workspace converts to paid — triggers reward
  convertedAt:              timestamp('converted_at'),
  // pending | qualified | rewarded | void (fraud detected)
  status:                   text('status').default('pending').notNull(),
  // Reward applied to referrer
  referrerRewardType:       text('referrer_reward_type'),   // free_month | credits | account_credit_cents
  referrerRewardValue:      integer('referrer_reward_value'),
  referrerRewardAppliedAt:  timestamp('referrer_reward_applied_at'),
  // Reward applied to friend
  friendRewardType:         text('friend_reward_type'),     // trial_extension_days | credits
  friendRewardValue:        integer('friend_reward_value'),
  friendRewardAppliedAt:    timestamp('friend_reward_applied_at'),
  voidReason:               text('void_reason'),
  createdAt:                timestamp('created_at').defaultNow().notNull(),
  updatedAt:                timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  // Prevent same workspace being referred twice
  referredUnique:    uniqueIndex('referrals_referred_unique').on(table.referredWorkspaceId),
  referrerIdx:       index('referrals_referrer_idx').on(table.referrerWorkspaceId),
  statusIdx:         index('referrals_status_idx').on(table.status),
}))

// ─────────────────────────────────────────────
// PROMO CODES
// Admin-managed promotional codes — synced to Stripe coupons where applicable
// Code entered at signup or checkout
// ─────────────────────────────────────────────
export const promoCodes = pgTable('promo_codes', {
  id:                  uuid('id').defaultRandom().primaryKey(),
  code:                text('code').notNull(),  // e.g. 'LAUNCH50', 'ROOFER2026'
  description:         text('description'),
  // trial_extension | percent_off_first | dollar_off_first | free_credits | free_month
  type:                text('type').notNull(),
  value:               integer('value').notNull(),  // days | percent | cents | credits
  // Optional: restrict to specific tiers (array of tier slugs)
  appliesToTiers:      text('applies_to_tiers').array(),
  // Stripe coupon ID — created via Stripe API when percent/dollar discounts
  stripeCouponId:      text('stripe_coupon_id'),
  // null = no redemption cap (admin-controlled promo code; separate from opportunity limits)
  maxRedemptions:      integer('max_redemptions'),
  redemptionsSoFar:    integer('redemptions_so_far').default(0).notNull(),
  expiresAt:           timestamp('expires_at'),
  isActive:            boolean('is_active').default(true).notNull(),
  createdBy:           text('created_by'),
  createdAt:           timestamp('created_at').defaultNow().notNull(),
  updatedAt:           timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  codeUnique: uniqueIndex('promo_codes_code_unique').on(table.code),
  activeIdx:  index('promo_codes_active_idx').on(table.isActive, table.expiresAt),
}))

// ─────────────────────────────────────────────
// PROMO REDEMPTIONS
// Tracks every use of a promo code — for analytics and fraud detection
// ─────────────────────────────────────────────
export const promoRedemptions = pgTable('promo_redemptions', {
  id:           uuid('id').defaultRandom().primaryKey(),
  promoCodeId:  uuid('promo_code_id').notNull()
                  .references(() => promoCodes.id),
  workspaceId:  text('workspace_id').notNull()
                  .references(() => workspaceSettings.workspaceId),
  redeemedAt:   timestamp('redeemed_at').defaultNow().notNull(),
  // applied | reversed (e.g. if workspace deleted within 24h)
  status:       text('status').default('applied').notNull(),
}, (table) => ({
  // One promo code per workspace
  workspaceCodeUnique: uniqueIndex('promo_redemptions_workspace_code_unique')
                         .on(table.workspaceId, table.promoCodeId),
  workspaceIdx:        index('promo_redemptions_workspace_idx').on(table.workspaceId),
}))

// ─────────────────────────────────────────────
// AFFILIATES — skeleton table
// Tracks affiliate relationships, commission rates, payment info
// NOTE: payout management UI deferred — for now this is just data capture
// ─────────────────────────────────────────────
export const affiliates = pgTable('affiliates', {
  id:                    uuid('id').defaultRandom().primaryKey(),
  name:                  text('name').notNull(),
  email:                 text('email').notNull(),
  company:               text('company'),
  // Unique referral code/slug used in URLs like fetchi.ai/?ref=ADAMS123
  defaultReferralCode:   text('default_referral_code').notNull(),
  // percent_first_year | percent_lifetime | flat_per_signup
  commissionType:        text('commission_type').default('percent_first_year').notNull(),
  // Percent (1-100) or flat amount in cents depending on type
  commissionValue:       integer('commission_value').notNull(),
  // Cookie attribution window in days (default 90)
  attributionWindowDays: integer('attribution_window_days').default(90).notNull(),
  // stripe_connect | paypal | wire | check
  paymentMethod:         text('payment_method'),
  // Encrypted JSON blob of payment details — admin entry only
  paymentDetailsEncrypted: text('payment_details_encrypted'),
  // For tax reporting
  taxFormType:           text('tax_form_type'),  // w9 | w8ben | none
  taxFormFilledAt:       timestamp('tax_form_filled_at'),
  // active | paused | terminated
  status:                text('status').default('active').notNull(),
  notes:                 text('notes'),
  createdAt:             timestamp('created_at').defaultNow().notNull(),
  updatedAt:             timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  emailUnique:        uniqueIndex('affiliates_email_unique').on(table.email),
  referralCodeUnique: uniqueIndex('affiliates_referral_code_unique')
                        .on(table.defaultReferralCode),
}))

// ─────────────────────────────────────────────
// AFFILIATE REFERRALS — separate from user referrals
// Records workspace signups attributed to affiliates via ?ref= cookie
// Commission ledger entries roll up from here
// ─────────────────────────────────────────────
export const affiliateReferrals = pgTable('affiliate_referrals', {
  id:                  uuid('id').defaultRandom().primaryKey(),
  affiliateId:         uuid('affiliate_id').notNull()
                         .references(() => affiliates.id),
  workspaceId:         text('workspace_id').notNull()
                         .references(() => workspaceSettings.workspaceId),
  // Code from the URL at attribution time
  referralCodeUsed:    text('referral_code_used').notNull(),
  // When cookie was set (landing page visit)
  cookieSetAt:         timestamp('cookie_set_at'),
  // When workspace signed up
  signedUpAt:          timestamp('signed_up_at').defaultNow().notNull(),
  // When workspace first converted to paid
  convertedAt:         timestamp('converted_at'),
  // Running total of commission accrued (cents) — updated via webhook
  commissionAccruedCents: integer('commission_accrued_cents').default(0).notNull(),
  commissionPaidCents:    integer('commission_paid_cents').default(0).notNull(),
  // pending | active | churned
  workspaceStatus:     text('workspace_status').default('pending').notNull(),
  createdAt:           timestamp('created_at').defaultNow().notNull(),
  updatedAt:           timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  workspaceUnique:  uniqueIndex('affiliate_referrals_workspace_unique')
                      .on(table.workspaceId),
  affiliateIdx:     index('affiliate_referrals_affiliate_idx').on(table.affiliateId),
}))

// ─────────────────────────────────────────────
// SIGNUP SOURCES — conversion tracking
// Captured at signup from UTM params, referrer, landing page
// One row per workspace — never updated after creation
// ─────────────────────────────────────────────
export const signupSources = pgTable('signup_sources', {
  workspaceId:        text('workspace_id').primaryKey()
                        .references(() => workspaceSettings.workspaceId),
  // UTM params
  utmSource:          text('utm_source'),
  utmMedium:          text('utm_medium'),
  utmCampaign:        text('utm_campaign'),
  utmContent:         text('utm_content'),
  utmTerm:            text('utm_term'),
  // Referrer URL (where they came from)
  referrerUrl:        text('referrer_url'),
  // Landing page URL on Fetchi
  landingPageUrl:     text('landing_page_url'),
  // Codes used at signup
  promoCodeUsed:      text('promo_code_used'),       // FK lookup via promo_codes.code
  affiliateCodeUsed:  text('affiliate_code_used'),   // FK lookup via affiliates.default_referral_code
  userReferralCodeUsed: text('user_referral_code_used'),  // FK lookup via workspace_settings.referral_code
  // Inferred attributes
  signupMethod:       text('signup_method'),  // google | email
  ipCountry:          text('ip_country'),
  deviceType:         text('device_type'),    // mobile | desktop | tablet
  capturedAt:         timestamp('captured_at').defaultNow().notNull(),
}, (table) => ({
  utmSourceIdx:    index('signup_sources_utm_source_idx').on(table.utmSource),
  utmCampaignIdx:  index('signup_sources_utm_campaign_idx').on(table.utmCampaign),
}))

// ─────────────────────────────────────────────
// OAUTH CONNECTIONS — for outreach send-as
// Stores Google Workspace and Microsoft 365 OAuth tokens
// Used to send outreach drafts from the contractor's real email address
// Tokens encrypted at rest
// ─────────────────────────────────────────────
export const oauthConnections = pgTable('oauth_connections', {
  id:                  uuid('id').defaultRandom().primaryKey(),
  workspaceId:         text('workspace_id').notNull()
                         .references(() => workspaceSettings.workspaceId),
  // google | microsoft
  provider:            text('provider').notNull(),
  // The email address authorized
  accountEmail:        text('account_email').notNull(),
  // Encrypted via APP_SECRET — never store in plaintext
  accessTokenEncrypted:  text('access_token_encrypted').notNull(),
  refreshTokenEncrypted: text('refresh_token_encrypted'),
  tokenExpiresAt:      timestamp('token_expires_at'),
  // Scopes granted (e.g. ['gmail.send', 'gmail.compose'])
  scopes:              text('scopes').array().notNull(),
  // active | revoked | expired | error
  status:              text('status').default('active').notNull(),
  lastUsedAt:          timestamp('last_used_at'),
  lastErrorAt:         timestamp('last_error_at'),
  lastErrorMessage:    text('last_error_message'),
  createdAt:           timestamp('created_at').defaultNow().notNull(),
  updatedAt:           timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  // One connection per workspace per email account
  workspaceAccountUnique: uniqueIndex('oauth_connections_workspace_account_unique')
                            .on(table.workspaceId, table.accountEmail),
  workspaceIdx:           index('oauth_connections_workspace_idx').on(table.workspaceId),
}))


// ─────────────────────────────────────────────
// TYPE EXPORTS — referrals, promos, affiliates, tracking, oauth
// ─────────────────────────────────────────────
export type Referral           = typeof referrals.$inferSelect
export type NewReferral        = typeof referrals.$inferInsert

export type PromoCode          = typeof promoCodes.$inferSelect
export type NewPromoCode       = typeof promoCodes.$inferInsert

export type PromoRedemption    = typeof promoRedemptions.$inferSelect
export type NewPromoRedemption = typeof promoRedemptions.$inferInsert

export type Affiliate          = typeof affiliates.$inferSelect
export type NewAffiliate       = typeof affiliates.$inferInsert

export type AffiliateReferral  = typeof affiliateReferrals.$inferSelect
export type NewAffiliateReferral = typeof affiliateReferrals.$inferInsert

export type SignupSource       = typeof signupSources.$inferSelect
export type NewSignupSource    = typeof signupSources.$inferInsert

export type OAuthConnection    = typeof oauthConnections.$inferSelect
export type NewOAuthConnection = typeof oauthConnections.$inferInsert
