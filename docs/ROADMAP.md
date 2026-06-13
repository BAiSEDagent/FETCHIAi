# Fetchi Roadmap

Status: Planning source of truth. Keep this short and update as priorities change.

## Now

### Product-proof sequence - current center

Goal: keep Fetchi moving from product architecture toward implementation by proving one
contract boundary at a time before adding runtime, DB/schema, UI, or provider surface.

Recently landed product-proof chain:

- **CP6 — Candidate → Evidence Gate Contract**
  - Proved candidates cannot pass without source-linked evidence.
  - Returned approved fallback states for missing, weak, or mismatched evidence.
- **CP7 — Lead Supply Architecture Update**
  - Split signal-backed opportunities from evidence-backed prospect leads.
  - Documented the Prospect Mining lane and Prospect Pool distinction.
- **CP8 — Prospect Mining Contract Proof**
  - Added inert TypeScript contracts and deterministic validation for prospect evidence packets.
  - Proved evidence-backed prospects are Prospect Pool items, not opportunities.
- **CP9 — Prospect Mining Fixture Pack**
  - Added deterministic Commercial Cleaning prospect-mining fixtures.
  - Proved directory, maps listing, company website, and property portfolio prospects can enter Prospect Pool without becoming opportunities.
- **CP10A — README + Repo Entry Point**
  - Added the root README entry point with product laws, lead-supply lanes, engine boundaries, source-of-truth docs, protected files, commands, and validation discipline.
- **CP10B — Roadmap Rebalance + Next Proof Sequence**
  - Moved stale UI/design stabilization out of active Now.
  - Defined the contract-first sequence toward scoring and classification.
- **CP11 — Prospect Fit / Outreach Readiness Scoring Contract**
  - Added the inert prospect scoring contract.
  - Separated Prospect Fit and Outreach Readiness from Opportunity Urgency.
- **CP12 — Signal-backed Opportunity Scoring Contract**
  - Added the inert signal-backed opportunity urgency scoring contract.
  - Required signal, source-linked evidence, provider lineage, freshness window, and why-now reasons.
- **CP13 — Classification Contract Harness**
  - Added the inert Commercial Cleaning classification contract harness.
  - Proved UI-visible labels must come from approved playbook/taxonomy values.
- **CP13B-A — Stale Repo Entry Audit**
  - Audited root/docs instruction files for stale control surfaces.
  - Identified delete candidates without deleting them.
- **CP13B-B — Remove Approved Stale Root Files**
  - Deleted the approved stale root control files.
  - Preserved current entry/control surfaces.
- **CP13C — Agent Control Docs Refresh**
  - Refreshed `AGENTS.md` so future agents use current repo control surfaces.
  - Marked `DESIGN_SYSTEM_V2.md` as legacy unless explicitly scoped.
- **CP14A — Lead Funnel Product Spec**
  - Defined Lead Funnel as Prospect Pool + Signal Watch + Opportunities + Suggested Actions.
  - Preserved the separation between evidence-backed prospects and signal-backed opportunities.
- **CP14 — Prospect Pool Export Contract**
  - Defined export-ready Prospect Pool records without implementing CSV, CRM, UI, or sync behavior.
- **CP15 — Commercial Roofing Playbook v1**
  - Added the next vertical playbook/spec while preserving contract-first guardrails.
- **CP16 — Contact Route / Outreach Play Contract**
  - Closed the contact-route and safe-outreach-mode contract without sending outreach or adding runtime.

Current active mode:

- CP17 Lead Funnel Runtime Implementation Plan is active.
- CP17 is planning only and does not prove runtime behavior.
- CP16 is closed.
- Next implementation will be split into smaller checkpoints, not one broad CP18.
- No DB/schema, provider runtime, UI/routes, package, billing, auth, admin, export UI, CRM sync, or outreach changes in this mode.

## Build Completion Snapshot

These are PM planning estimates, not automated metrics:

- Working sellable product: 30-35% done.
- Product architecture / proof spine: 70-75% done.
- Launch-ready SaaS: 20-25% done.

Fetchi has a strong product-contract spine: evidence gates, prospect mining contracts, scoring seams, classification guardrails, lead-supply architecture, and Lead Funnel product definition are now documented or scaffolded. Fetchi is not yet a working lead engine because runtime discovery, evidence hydration, storage, export, billing, and customer Lead Funnel surfaces are not implemented.

## Working MVP Definition

A first sellable MVP means:

- A Commercial Cleaning user can sign up.
- The user can enter service area and business type.
- Fetchi can produce a first Lead Funnel.
- The Lead Funnel honestly separates Prospect Pool items from signal-backed opportunities.
- The user can inspect evidence and contact-route hints.
- The user can use Suggested Actions.
- The user can save, export, or draft outreach.
- The product never shows unsupported urgency claims.

## Remaining MVP Work Chunks

1. Finish contract/spec runway
   - CP14, CP15, and CP16 are closed.
   - CP17 — Lead Funnel Runtime Implementation Plan is active and planning-only.
   - CP17 must split the next implementation work into small checkpoints before runtime begins.

2. Lead Funnel storage and normalization
   - Lead Funnel record shape.
   - Prospect Pool records.
   - Opportunity records.
   - Watchlist / Needs Review states.
   - Evidence source storage.
   - Blocked claims storage.
   - Contact route hints.
   - Run lineage.
   - Note: likely requires an explicit protected DB/schema checkpoint.

3. Discovery + evidence hydration runtime
   - SerpApi = discovery / what changed.
   - Firecrawl = evidence hydration/extraction after source exists.
   - LLM = classify/explain/draft inside approved playbooks/contracts.
   - DB/audit = lineage.
   - No broad crawling.
   - No random agent marketplace.

4. Customer Lead Funnel surfaces
   - Today's Opportunities.
   - Prospect Pool.
   - Watchlist.
   - Needs Review.
   - Lead Detail evidence.
   - Suggested Actions.
   - Export-ready prospects.

5. Export and outreach
   - CSV export first.
   - Google Sheets-shaped export fields.
   - Outreach draft only, not auto-send.
   - Contact route confidence.
   - Blocked claims included.

6. Billing and launch readiness
   - Stripe BYOK.
   - Trial/credit gates.
   - Usage limits.
   - Admin controls.
   - Production env checks.
   - Basic support/feedback loop.

## Next

### CP17 — Lead Funnel Runtime Implementation Plan

- Implementation plan only.
- Define one shared Lead Funnel Run Executor with six run-mode configurations.
- Sequence storage, provider runtime, lineage, customer surfaces, outcome capture, nearby, export, notifications, billing gates, and validation.
- Identify required explicit DB/schema checkpoints before any schema work.
- No DB/schema, provider runtime, UI/routes, scheduling, map, CRM/export, billing, notification, or outreach implementation.

### After CP17 — Split Implementation Checkpoints

- CP18A — Protected DB/schema and normalized storage.
- CP18B — Shared executor runtime foundation.
- CP18C — Chat-triggered live discovery proof.
- CP18D — Lead Funnel persistence and lineage if not safely combined earlier.
- CP19A/CP19B+ — Outcome foundation before actionable Today/Morning Brief, then export, Nearby/My Funnel, Fresh Area Sweep, Scheduled Scout, notification delivery, and billing/usage gates as separate checkpoints.

## Later

### Settings product/design spec

Tabs:

- Usage
- Notifications
- Signal Sensitivity
- Plan & Billing

No implementation until spec is approved.

### UI/customer app polish

The PR #2-era UI/design stabilization work is no longer the active center, but it remains
important once the current contract-proof sequence is ready to reconnect to customer
surfaces.

Preserve as later polish:

- Chat
- Today’s Run
- My Leads
- Lead Detail
- Bottom navigation and customer shell stability
- Lead-card color/surface grammar QA
- Customer mobile visual QA

### CRM integrations

Sequence remains:

1. CSV export first.
2. CRM field mapping next.
3. HubSpot, Pipedrive, Zapier, and Make integrations later.

### Daily/weekly prospect mining jobs

Run scheduling comes after prospect mining contracts, fixture packs, scoring seams, export
planning, and runtime provider boundaries are proven.

### Billing/trial/subscription stabilization

Build Stripe BYOK integration around existing subscription/workspace credit logic when
ready.

### Vertical Playbook Registry implementation

Turn `docs/product/vertical-playbook-registry.md` into implementation-ready config/schema
after classification and scoring contracts are proven.

## Parked / Not Now

- Runtime Firecrawl workflow integration until scoped.
- Broad crawling.
- CRM sync implementation.
- Export UI implementation until after export contract.
- Auto-outreach.
- Cloned niche apps.
- Cloned agent marketplace.
- Building 50 verticals immediately.
- DB/schema changes without an explicit checkpoint.
- New provider runtime without an explicit checkpoint.
- Public Agency plan exposure.
- Firecrawl replacing SerpApi.
- SMS/push notifications for MVP.
- Broad refactors while product-proof sequencing is active.

## Rejected

- Unlimited plan / unlimited usage promise — use capped tiers, top-ups, or custom capped plans instead.
- Traditional free trial / free real opportunities — rejected for launch.
- Use homepage demo, videos, sample/blurred preview, guarantee/credit policy, and capped paid plans instead.

## Active Planning Docs

- `docs/PM_OPERATING_SYSTEM.md`
- `docs/PRODUCT_CONTEXT.md`
- `docs/AGENT_WEB_DATA_ARCHITECTURE.md`
- `docs/PROVIDER_CONTRACTS.md`
- `docs/product/vertical-playbook-registry.md`
- `docs/product/lead-funnel-product-spec.md`
- `docs/product/lead-funnel-runtime-implementation-plan.md`
- `docs/design/lead-card-taxonomy.md`
- `docs/DECISIONS.md`
- `docs/CLEANUP_PLAN.md`
- `docs/DESIGN_SOURCE_OF_TRUTH.md`
