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

Current active mode:

- Roadmap MVP completion and remaining-work clarity.
- CP15 Commercial Roofing Playbook v1 is the active checkpoint.
- Next proof sequence planning around contact route/outreach contracts and Lead Funnel runtime planning.
- No runtime expansion until the next contract checkpoint is explicitly scoped.
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
   - CP14 — Prospect Pool Export Contract.
   - CP15 — Commercial Roofing Playbook v1.
   - CP16 — Contact Route / Outreach Play Contract.
   - CP17 — Lead Funnel Runtime Implementation Plan.

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

### CP14 — Prospect Pool Export Contract

- Contract/spec proof.
- Define export readiness fields.
- Define blocked claims and blocked fields.
- Define CRM-ready mapping shape.
- Define CSV/export guardrails.
- Add inert deterministic smoke proof only.
- No actual CRM sync/export UI yet.

### CP15 — Commercial Roofing Playbook v1

- Add the next vertical playbook after scoring, classification, Lead Funnel, and export seams are proven.
- Use the same playbook/config model as Commercial Cleaning.
- Add an inert classification contract smoke proof for approved Commercial Roofing labels and blocked claims.
- Do not hardcode vertical behavior into components or runtime.

### CP16 — Contact Route / Outreach Play Contract

- Contract only.
- Define contact route hints, confidence, blocked claims, and outreach-play eligibility.
- Draft-only outreach guardrails.
- No auto-send, CRM sync, provider runtime, DB/schema, or UI implementation.

### CP17 — Lead Funnel Runtime Implementation Plan

- Implementation plan only.
- Sequence storage, provider runtime, lineage, customer surfaces, export, billing gates, and validation.
- Identify required explicit DB/schema checkpoints before any schema work.

### CP18 — Lead Funnel MVP Implementation

- Implementation checkpoint after CP17 is approved.
- Keep scope tied to the working MVP definition.
- Do not overbuild beyond the first Lead Funnel path.

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
- `docs/design/lead-card-taxonomy.md`
- `docs/DECISIONS.md`
- `docs/CLEANUP_PLAN.md`
- `docs/DESIGN_SOURCE_OF_TRUTH.md`
