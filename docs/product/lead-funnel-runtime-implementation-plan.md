# Lead Funnel Runtime Implementation Plan

Status: CP17 planning only. This document does not prove the runtime works.

## 1. Status and Scope

CP17 creates the implementation plan for the first working Lead Funnel runtime.
It does not implement the runtime and does not authorize runtime work.

This checkpoint does not authorize:

- DB/schema changes
- provider calls or provider runtime
- UI, app routes, route handlers, or components
- scheduling
- Mapbox, geolocation, map, or nearby behavior
- CRM sync, CSV/export implementation, billing, auth, admin, or settings behavior
- outreach sending

Design and planning are not runtime proof. A later checkpoint must prove each
runtime slice with code, local commands, lineage, acceptance criteria, and
customer-visible output.

Fetchi remains one horizontal signal-to-opportunity engine with vertical-aware
playbooks. The product promise is: "Tell us what your business sells - we'll
find buyers who need it this week."

The Lead Funnel loop remains:

Signal -> Prospect + Enrichment -> Opportunity -> Contact Route -> Outreach Play

Lead Funnel means:

- Prospect Pool
- Signal Watch
- Opportunities
- Suggested Actions

The product laws remain binding:

- No opportunity without a fresh signal.
- No lead without evidence.
- No score without reason.
- No explanation without action.
- No unsupported user-visible claim.
- Outreach CTA is available from any lead; evidence determines the safe outreach
  mode.
- UI-visible labels come from approved playbooks/taxonomy only.

## 2. Runtime Architecture

Fetchi should implement one shared Lead Funnel Run Executor.

Every runtime entry point must call the same executor with a different
`RunModeConfig`. The six run modes are configurations, not separate systems.

Shared pipeline:

1. Run request
2. Resolve workspace and playbook
3. Create budget envelope
4. Generate bounded queries
5. Discover candidates
6. Normalize/deduplicate entities
7. Hydrate evidence
8. Evidence gate
9. Classify using approved playbook labels
10. Score with reasons
11. Claim Guard
12. Contact route and safe outreach mode
13. Persist Lead Funnel outputs and lineage
14. Emit promotion, cost, and outcome hooks

Separate chat, onboarding, cron, and map runners are forbidden because they would
create divergent trust behavior. The same public fact must be handled the same
way whether the user starts from chat, onboarding, a scheduled scout, a watch,
or a spatial scope. Different runners would also duplicate budget logic,
freshness windows, evidence gates, Claim Guard behavior, deduplication,
promotion, and outcome learning.

The buyer universe is the base map, not the border. Spatial scope can constrain
a run, but it must not create a separate map-only lead system.

## 3. RunMode Configuration Contract

Planning-level `RunModeConfig` fields:

- `trigger`
- `searchScope`
- `knownUniverseScope`
- `prospectMiningEnabled`
- `signalDiscoveryEnabled`
- `freshnessRequirement`
- `serviceAreaOrSpatialScope`
- `maxSearches`
- `maxHydrations`
- `maxLlmCalls`
- `maxRecordsProcessed`
- `maxEstimatedSpend`
- `maxRuntime`
- `allowedOutputLanes`
- `scheduleMetadata`
- `userVisiblePurpose`

Configuration matrix:

| Mode | Trigger | Search scope | Known-universe scope | Prospect mining | Signal discovery | Freshness requirement | Service area / spatial scope | Max searches | Max hydrations | Max LLM calls | Max records | Max spend | Max runtime | Allowed output lanes | Schedule metadata | User-visible purpose |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1. Onboarding Seed Run | new workspace setup | bounded launch vertical + initial service area | none or seed import | yes | limited | fit evidence may be current; opportunities require fresh dated signal | required service area | low | low | low | low | low | short | Prospect Pool, Needs Review, Contact Route Review, Discarded | none | build the first buyer universe |
| 2. Chat-triggered Discovery Run | explicit user chat request | user intent + approved playbook + bounded service area | workspace records may be used for dedupe/watch context | yes | yes | fresh signal required for Opportunity | required metro/service area unless user narrows it | low to medium | low to medium | low to medium | medium | capped per request | interactive | Prospect Pool, Signal-backed Opportunity, Needs Review, Contact Route Review, Discarded, Suggested Action, promotion event | none | answer the user's discovery request with useful leads |
| 3. Prospect Pool Watch Run | explicit watch or saved pool refresh | existing Prospect Pool and known public sources | watched/saved/pool accounts | no or limited | yes | fresh dated signal required for promotion | inherited from workspace/account | low | targeted | low | bounded by watch list | low | background-safe | Signal-backed Opportunity, Needs Review, Contact Route Review, Discarded, Suggested Action, promotion event | watch cadence and last run | find what changed for known accounts |
| 4. Local Signal Discovery Run | explicit local signal search | public signals in a bounded local area | optional workspace dedupe | limited | yes | fresh dated signal required | metro, radius, service area, or named area | medium | medium | medium | medium | capped per search | short to medium | Signal-backed Opportunity, Prospect Pool, Needs Review, Discarded, Suggested Action, promotion event | none | find fresh nearby or local buying signals |
| 5. Universe Expansion / Prospect Mining Run | explicit expansion action | account/prospect discovery for approved vertical | workspace universe for dedupe | yes | limited | no urgency claims without fresh signal | service area or named market | medium | medium | low to medium | medium | capped per action | medium | Prospect Pool, Needs Review, Contact Route Review, Discarded, Suggested Action | none | expand the buyer universe with evidence-backed prospects |
| 6. Scheduled Scout Run | scheduled workspace scout | configured vertical + service area + watch universe | workspace pool, saved, watched, and recent outcomes | yes, budgeted | yes | fresh dated signal required for Opportunity | configured workspace market | capped by plan | capped by plan | capped by plan | capped by plan | plan-gated | finite batch | Signal-backed Opportunity, Prospect Pool, Needs Review, Contact Route Review, Discarded, Suggested Action, promotion event | cadence, next run, quiet-day policy, budget | scout the market and prepare Today/Morning Brief |

## 4. First Runtime Proof Order

Mode 2 is the proof: Chat-triggered Discovery Run comes first.

Mode 6 is the business: Scheduled Scout comes only after the manual executor
works reliably.

Scheduling must wrap the same executor. It must not create another runner.

First live proof slice:

- Commercial Cleaning
- one metro/service area
- one shared executor
- chat-triggered run
- Prospect Pool and signal-backed Opportunity outputs
- evidence lineage
- scoring reasons
- Claim Guard
- contact route
- safe outreach mode
- cost ledger
- outcome hooks

The first proof should be narrow enough to inspect by hand. A user asks for a
Commercial Cleaning lead-funnel discovery run in one metro, the executor returns
evidence-backed prospects and fresh-signal opportunities, and every surfaced
claim can be traced to a source, score reason, and allowed playbook label.

## 5. Lead Funnel Output Lanes

Normalized output categories:

- Prospect Pool
- Signal-backed Opportunity
- Needs Review
- Contact Route Review
- Discarded
- promotion event
- Suggested Action

Evidence-backed Prospects can receive safe evidence-limited or generic outreach.
They cannot claim urgency, active need, damage, budget, buying intent, authority,
or "needs this week" without fresh evidence.

Signal-backed Opportunities require fresh dated signal evidence, why-now reason,
approved playbook classification, score reasons, Claim Guard pass, and a safe
action. If any requirement fails, the output moves to Needs Review, Contact
Route Review, Discarded, or Prospect Pool as appropriate.

## 6. Global Entity/Evidence vs Workspace Records

The runtime should plan three layers.

### A. Global Normalized Public Entities/Evidence

Global public data stores facts that can be reused safely:

- property/account identity
- public source evidence
- signal event
- entity resolution
- location lineage

Global evidence should deduplicate repeated public records. It must not carry
workspace-private behavior, customer notes, customer action history, watch
state, or private outcomes.

### B. Workspace-Specific Lead Funnel Records

Workspace records store the user's relationship to the public entity:

- fit
- score and reasons
- lifecycle
- watch state
- contact route
- safe outreach mode
- blocked claims
- private outcomes

Workspace records determine how a public entity appears in that workspace's
Lead Funnel. They can differ across customers because fit, playbook, service
area, contact readiness, lifecycle, and outcomes differ.

### C. Optional Future External CRM Linkage

External CRM linkage is later:

- external IDs and sync state later
- no parallel CRM-only entity model

CRM sync must attach to workspace records. It must not create a second source of
truth or convert prospects into opportunities through CRM object shape alone.

Hard non-exclusive public market rule:

- A public signal may produce workspace-specific opportunities for multiple
  eligible customers.
- Prior exposure to one workspace must never suppress it for another.
- Deduplicate evidence globally.
- Deduplicate repeated records within a workspace.
- Never globally reserve or exhaust a valid public lead.
- First-to-act advantage comes from speed, relevance, contact readiness, and
  outreach quality.
- Watches, contacts, visits, wins, and losses remain private per workspace.

## 7. Entity Resolution and Idempotency

Runtime implementation must preserve:

- one persistent property/account entity
- many evidence/signal events
- no duplicate pins or duplicate workspace leads
- stable source/event IDs
- replay-safe runs
- idempotent writes
- retry behavior
- promotion without losing prior lifecycle history
- duplicate detection across onboarding, chat, scheduled, and map-scoped runs

Entity resolution should prefer stable public identifiers when available, then
source URL, source record ID, address, phone/domain, and normalized name/location
matching. Low-confidence matches go to Needs Review instead of silently merging.

Idempotency rules:

- Replaying the same run must not create duplicate entities, signals, prospects,
  opportunities, pins, suggested actions, or outcome hooks.
- Retrying a failed stage must reuse the run, stage, candidate, evidence, and
  budget lineage already produced.
- Promoting a Prospect to an Opportunity must preserve the existing workspace
  lifecycle history and add a promotion event.
- Demoting or discarding a record must preserve why the decision happened.

## 8. Prospect -> Opportunity Promotion Event

Prospect-to-Opportunity promotion is a first-class domain event:

Known Prospect
-> fresh dated signal discovered
-> evidence passes
-> approved classification and score
-> Claim Guard passes
-> Prospect is promoted to Opportunity
-> Suggested Action and safe outreach mode become available

Required promotion fields:

- `promotionEventId`
- `workspaceId`
- `globalEntityId`
- `priorWorkspaceLeadId`
- `newOpportunityId`
- `runId`
- `runMode`
- `playbookId`
- `signalEventId`
- `freshnessWindow`
- `evidenceIds`
- `classificationLabel`
- `score`
- `scoreReasons`
- `claimGuardResult`
- `contactRouteId`
- `allowedOutreachMode`
- `suggestedActionIds`
- `occurredAt`
- `lineage`

The promotion event is workspace-private even when its underlying public signal
is global. Another workspace may independently receive an opportunity from the
same public signal if its playbook, service area, and evidence gates pass.

This checkpoint does not implement notifications.

## 9. Morning Brief / Today Retention Loop

Morning Brief must be finite and finishable.

Primary loop:

Fetchi scouts
-> Today shows what changed
-> user acts or passes with reason
-> outcomes are captured
-> future runs improve

Prioritized brief items:

- newly promoted Opportunities
- new signal-backed Opportunities
- new evidence-backed Prospects
- Needs Review
- new contact routes
- safe outreach modes
- Suggested Actions

Quiet days must stay honest. Fetchi should not fill quiet days with fake
urgency, score churn, streaks, generic re-engagement prompts, or old prospects
pretending to be new. A quiet day can say no qualifying fresh signals were found
and recommend a bounded next action.

Morning Brief is not an infinite feed. It is a daily or session-level decision
surface that ends with act, pass with reason, save/watch, request outreach,
export, or review later.

## 10. Outcome Event Capture

Outcome Learning is not a seventh run mode. It is the feedback layer every mode
emits into.

Capture from run one:

- viewed
- saved
- passed_with_reason
- contacted
- outreach_requested
- outreach_drafted
- exported
- shared
- wrong_buyer
- wrong_contact
- duplicate
- responded
- won
- lost
- no_response
- weak_or_missing_evidence
- visited
- spoke_to_someone
- left_card
- no_answer
- access_restricted
- follow_up_requested
- contact_route_learned

Separate workspace-private events from anonymized aggregate learning inputs.
Workspace-private events include contact attempts, notes, visits, outcomes,
watches, saved records, wins, losses, and pass reasons. Aggregate learning
inputs may count patterns only after privacy and minimum-sample rules pass.

Future learning hierarchy:

global -> vertical -> region/metro -> buyer/signal type -> workspace

Guardrails:

- no prior without sample size
- no fake precision
- no cross-workspace private-data leakage
- no single large workspace dominating
- preserve exploration for under-sampled segments

This checkpoint does not implement ML or autonomous learning.

## 11. Cost Physics and Budget Envelope

Every run must have per-run and per-stage accounting:

- search calls
- hydration calls
- LLM calls
- records processed
- estimated spend
- actual spend when available
- runtime
- retry cost
- discarded-after-spend count

Progressive spend rule:

cheap discovery
-> initial evidence
-> qualification
-> additional enrichment
-> classification/scoring
-> explanation/outreach

The executor should spend the cheapest dollars first and stop before expensive
stages when an earlier gate fails.

Metrics:

- cost per candidate
- cost per evidence-backed Prospect
- cost per signal-backed Opportunity
- cost per surfaced record
- cost per contacted lead
- cost per response
- cost per won customer
- wasted searches/hydrations/LLM calls

Budget envelope fields should include allowed max calls, records, spend, and
runtime from `RunModeConfig`, plus actual observed usage. Budget exhaustion is a
first-class failure state, not a silent truncation.

## 12. Failure, Fallback, and Replay

Stage-level failures to plan:

- provider unavailable
- no results
- evidence hydration failure
- weak evidence
- stale signal
- classification uncertainty
- Claim Guard block
- missing contact route
- budget exhausted
- duplicate record
- partial run completion

Every failure must produce:

- reason
- safe fallback state
- recommended next action
- replay/audit lineage

No silent degradation is allowed.

Fallback examples:

- Provider unavailable: stop the affected stage, preserve run lineage, show
  retry later or narrow scope.
- No results: finish the run honestly with zero qualifying records and a next
  action.
- Weak evidence: route to Needs Review or Prospect Pool, never Opportunity.
- Stale signal: keep as Prospect Pool or discard the opportunity claim.
- Classification uncertainty: use Needs Review and do not invent labels.
- Claim Guard block: remove or block unsafe claims and downgrade the output lane.
- Missing contact route: surface Contact Route Review or generic/evidence-limited
  outreach mode.
- Duplicate record: attach lineage to the existing entity/workspace record.
- Partial run completion: show completed stages, failed stages, spend, and safe
  replay path.

## 13. Geospatial Readiness and Nearby

Plan geospatial readiness from run one without implementing the map.

Requirements:

- geocode property/account records when evidence supports location
- preserve coordinate source/lineage and confidence
- one persistent property/account entity, not duplicate pins per signal
- executor accepts optional lat/lng/radius/service-area scope
- spatial scope is configuration, not a new runner

Future map paths:

### A. Instant Nearby

- on-demand user location or dropped pin
- queries existing workspace Lead Funnel records only
- distance-sorted
- no silent provider spend

### B. Fresh Area Sweep

- explicit user CTA
- budgeted shared-executor run with spatial scope
- may discover new Prospects and fresh Opportunities

Location/privacy rules:

- on-demand only
- no background tracking in MVP
- job locations, dropped pins, visits, and outcomes are workspace-private
- no competitor watch/view counts

## 14. Nearby + My Funnel + Fresh UI Contract Planning

This checkpoint does not design or implement UI. It only plans product behavior.

Nearby means mixed distance-ranked useful records from the workspace Lead Funnel:
prospects, opportunities, saved accounts, watched accounts, follow-ups, visited
records, and recent job context when available.

My Funnel means the user's existing Prospect Pool, Saved, Contacted, Responded,
Won/customer, follow-up, previously visited, active/recent job, watched, and
review states.

Fresh means new signal-backed Opportunities and recent promotions.

Sweep fresh means an explicit budgeted discovery action that calls the shared
executor with spatial scope.

Map/nearby behavior must use the same records and trust rules as Today/Leads.
Relationship context must remain separate from signal, vertical-fit, freshness,
score, and surface color.

## 15. In-Person Outreach Planning

Plan a future narrow contract extension for an `in_person` outreach/contact
channel or equivalent.

Rules:

- doorstep talking points are user-visible claims
- same evidence and Claim Guard requirements apply
- Prospects may receive generic/evidence-limited introductions
- Opportunities may receive source-backed talking points
- no implication of access permission or solicitation permission
- no background location tracking

Do not reopen or edit CP16 in CP17. Schedule the follow-up checkpoint instead.

## 16. Notification Eligibility Planning

Notification events to plan later without implementing delivery:

- Prospect promoted to Opportunity
- high-fit new Opportunity
- new contact route for watched/saved account
- real freshness/expiration window
- weekly market digest

Never notify for:

- pool growth counts alone
- score recalculation alone
- streaks
- generic re-engagement begging
- unsupported urgency

Every notification is a user-visible claim and must satisfy the same evidence
and Claim Guard rules as the record, brief, outreach draft, or explanation it
points to.

## 17. Implementation Checkpoint Sequence

Do not combine the remaining runtime work into one broad CP18. Use small,
reviewable checkpoints with explicit protected files and proof.

### CP18A - Protected DB/Schema and Normalized Storage

Goal: define storage for global entities/evidence, workspace Lead Funnel records,
run lineage, budget ledger, and promotion events.

Allowed files/areas: protected DB/schema files only when explicitly scoped,
types/tests needed for storage proof, docs updates.

Protected files: provider runtime, app/routes/UI, scheduling, billing, CRM,
export, map/geolocation, outreach sending.

Dependencies: CP17 approved.

Storage requirements:

- normalized property/account location
- latitude/longitude when supported by evidence
- coordinate source
- coordinate confidence
- geocoding/location lineage
- compatibility with radius and service-area queries
- one persistent entity rather than duplicate pins per signal

Acceptance criteria: storage supports global vs workspace split, idempotency,
lineage, cost ledger, promotion event, outcome hooks, normalized
property/account location, latitude/longitude when supported by evidence,
coordinate source, coordinate confidence, geocoding/location lineage,
compatibility with radius and service-area queries, and one persistent entity
rather than duplicate pins per signal.

Proof required: schema/type validation, deterministic storage tests, migration
or schema proof as approved.

Explicit non-goals: no provider calls, no UI, no scheduler, no outreach, no CRM,
no geocoding implementation, and no map behavior.

### CP18B - Shared Executor Runtime Foundation

Goal: implement the executor shell, `RunModeConfig`, budget envelope, stage
interfaces, idempotency keys, and no-op/inert stage tests.

Allowed files/areas: runtime foundation modules and tests explicitly scoped for
executor orchestration.

Protected files: UI/routes unless explicitly required for test harness, provider
live calls, scheduler, CRM/export, billing, map/geolocation.

Dependencies: CP18A-approved storage contracts and normalized record shapes.
Executor tests may use deterministic adapters or test doubles implementing those
approved contracts, but may not introduce or depend on an alternative data model.

Acceptance criteria: all six modes call the same executor; stage order, budget
stops, failure states, and lineage are deterministic.

Proof required: unit tests proving config differences without separate runners.

Explicit non-goals: no live discovery, no LLM classification, no customer UI.

### CP18C - Chat-triggered Live Discovery Proof

Goal: prove Mode 2 for Commercial Cleaning in one metro through the shared
executor.

Allowed files/areas: bounded provider integrations, executor stage
implementation, tests/smoke script, docs.

Protected files: scheduling, map/geolocation, CRM/export, billing, notifications,
admin/settings.

Dependencies: CP18B.

Acceptance criteria: returns Prospect Pool and signal-backed Opportunity outputs
with evidence lineage, score reasons, Claim Guard, contact route, safe outreach
mode, cost ledger, and outcome hook points.

Proof required: local smoke output with lineage and spend; no fake leads.

Explicit non-goals: no scheduled scout, no broad verticals, no UI polish.

### CP18D - Lead Funnel Persistence and Lineage

Goal: persist outputs from live runs without duplicate workspace records or lost
promotion history.

Allowed files/areas: persistence adapters, lineage tests, storage docs.

Protected files: new provider behavior, UI/routes, scheduler, CRM/export,
billing, notification delivery.

Dependencies: CP18A and CP18C.

Acceptance criteria: replay-safe writes, duplicate detection, promotion event,
and failure audit records.

Proof required: deterministic replay tests and local persisted smoke result.

Explicit non-goals: no new discovery modes, no customer surface.

### CP19A - Outcome Event Foundation

Goal: establish workspace-private outcome-event persistence and action
interfaces before any actionable customer surface.

Allowed files/areas: outcome event contracts, storage, action handlers/tests
explicitly scoped.

Protected files: autonomous learning, ML, cross-workspace visibility, provider
runtime expansion, customer surface implementation.

Dependencies: CP18D.

Acceptance criteria: supported event list is persisted with workspace privacy,
action interfaces exist for approved customer actions, and aggregate-learning
boundaries are explicit.

Proof required: event persistence tests and deterministic action-interface tests.

Explicit non-goals: no actionable customer surface, no ML model, no
conversion-prior display.

Earlier executor and live-discovery checkpoints may emit outcome hook points, but
those hooks alone do not satisfy outcome capture from run one. CP19A is the
checkpoint that establishes the persistence and action interfaces required for
customer actions to become durable workspace-private outcome events.

### CP19B - Today/Morning Brief Customer Surface

Goal: expose finite Today/Morning Brief behavior for persisted Lead Funnel
records after outcome-event foundation exists.

Allowed files/areas: customer surface files explicitly scoped for Today/Brief,
read-only Lead Funnel queries, CP19A action-interface integration, docs/tests.

Protected files: provider runtime expansion, DB/schema changes unless separately
approved, scheduler, export/CRM, billing, notifications.

Dependencies: CP18D and CP19A.

Acceptance criteria: shows new promotions, opportunities, prospects, reviews,
contact routes, safe modes, and actions without fake urgency; captures actions
such as `saved`, `passed_with_reason`, `contacted`, `outreach_requested`,
`wrong_buyer`, `wrong_contact`, and other approved outcomes through CP19A.

Proof required: local UI/build proof, fixture or persisted-data proof, and
action-capture smoke through CP19A interfaces.

Explicit non-goals: no infinite feed, no push/email notifications.

### CP20 - CSV/Export

Goal: implement CSV/Sheets-shaped export for eligible Prospect Pool records.

Allowed files/areas: export code, export tests, docs.

Protected files: CRM sync, opportunity export-as-deal behavior, billing unless
separately scoped.

Dependencies: CP14 export contract and persisted Lead Funnel records.

Acceptance criteria: export-ready prospects preserve evidence, blocked claims,
contact route context, and not-opportunity-yet reason.

Proof required: deterministic CSV output and blocked-field tests.

Explicit non-goals: no CRM sync, no auto-send.

### CP21 - Instant Nearby / My Funnel

Goal: show distance-ranked existing workspace records without silent provider
spend.

Allowed files/areas: map/nearby UI and read-only spatial query behavior
explicitly scoped.

Protected files: provider discovery, Fresh Area Sweep, background tracking,
notifications.

Dependencies: geospatial storage readiness and persisted Lead Funnel records.

Acceptance criteria: Nearby and My Funnel use existing records and preserve trust
rules.

Proof required: local UI/build proof and no-provider-spend assertion.

Explicit non-goals: no new leads from opening the map.

### CP22 - Fresh Area Sweep + In-person Outcome

Goal: implement explicit budgeted Fresh Area Sweep and in-person outcome capture.

Allowed files/areas: shared executor spatial config, explicit CTA path,
in-person outcome contract/tests.

Protected files: background GPS, route optimization, implicit provider spend.

Dependencies: CP18C, CP19A, CP21.

Acceptance criteria: Sweep uses shared executor and spatial scope; in-person
claims obey Claim Guard.

Proof required: local smoke proof with spatial config and outcome event.

Explicit non-goals: no background tracking, no route planning.

### CP23 - Scheduled Scout

Goal: wrap the shared executor in scheduled workspace scout behavior.

Allowed files/areas: scheduler integration, scout config, budget gates, tests.

Protected files: new runner, notification delivery, billing enforcement unless
separately scoped.

Dependencies: CP18C, CP18D, CP19A, CP19B.

Acceptance criteria: scheduled runs reuse the executor, respect budgets, produce
finite brief-ready outputs, and avoid fake urgency.

Proof required: local schedule simulation and replay/idempotency proof.

Explicit non-goals: no separate cron runner logic.

### CP24 - Notification Delivery

Goal: deliver notifications for eligible evidence-backed events.

Allowed files/areas: notification eligibility, delivery integration, tests.

Protected files: unsupported urgency, streaks, generic re-engagement.

Dependencies: CP19B and CP23.

Acceptance criteria: every notification maps to an eligible event and passes
Claim Guard.

Proof required: eligibility tests and delivery smoke with safe test channel.

Explicit non-goals: no notification for pool growth counts alone.

### CP25 - Billing/Usage Gate

Goal: gate run budgets, usage, and plan limits around proven runtime behavior.

Allowed files/areas: billing/usage gate files explicitly scoped, tests, docs.

Protected files: unrelated pricing/admin/settings behavior.

Dependencies: executor cost ledger and enough runtime proof to price responsibly.

Acceptance criteria: plan limits cap searches, hydrations, LLM calls, spend, and
scheduled runs.

Proof required: usage gate tests and cost-ledger integration proof.

Explicit non-goals: no pricing page redesign unless separately scoped.

## 18. First Ten-Customer Proof Experiment

Plan a paid 30-day experiment:

- one vertical
- one or two metros
- ten businesses

Track:

- brief opens per week
- action/pass-with-reason rate
- time to first contacted lead
- verified response/win
- user statement that they would not have found it otherwise
- renewal/cancel reason
- run cost per useful output

Mission-critical signal:

Users open the brief before the notification or complain when it is late.

Interesting-but-not-essential signal:

Users browse and save but do not contact or act.

## 19. Build Now / Next / Later / Reject

Build now in planning:

- one executor + six configs
- shared trust loop
- storage/data split
- promotion event
- finite Morning Brief
- outcome capture
- cost envelope
- geospatial readiness
- non-exclusive market rules
- implementation sequence

Next:

- manual chat-triggered runtime
- normalized storage/lineage
- outcome capture
- Today/Morning Brief
- CSV portability
- Instant Nearby/My Funnel

Later:

- Scheduled Scout
- push/email notifications
- Promotion Map/watch patterns
- Market Pulse
- external CRM sync
- shareable work order
- conversion-prior display
- territory reports

Reject/Park:

- six separate runners
- graph-database migration for its own sake
- global lead reservation/exhaustion
- cross-workspace watch/activity visibility
- generic CRM replacement
- optimized route planning
- background GPS tracking
- infinite feed/streaks
- fake urgency to fill quiet markets

## 20. What Comes Off If This Goes In?

These move out of the near-term path:

- map polish before runtime
- broad Market Pulse
- push/email notification delivery
- external CRM sync
- territory reports
- outcome benchmark display
- broad team collaboration
- additional vertical expansion until the core brief-to-action-to-outcome loop
  works

## 21. Open Questions / Decisions Requiring Adam

Genuine unresolved decisions:

- Which one or two metros should the first ten-customer Commercial Cleaning
  experiment use?
- What per-run dollar cap is acceptable for the first manual chat-triggered
  proof?

Settled decisions:

- one executor, six configs
- no chat bypass around guardrails
- public leads are non-exclusive
- outreach CTA always available with safe-mode downgrade
- outcome capture begins from run one
- CP18A includes run lineage
- quiet-day copy is approved during the Today/Morning Brief surface checkpoint
- CSV is first, using Google Sheets-shaped fields
- Instant Nearby does not silently spend provider credits
- external CRM is later
- no background GPS in MVP
