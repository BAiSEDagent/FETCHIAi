# Fetchi Roadmap

Status: Planning source of truth. Keep this short and update as priorities change.

## Now

### Product-proof sequence — current center

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

Current active mode:

- Roadmap rebalance after CP6–CP10A landed.
- Next proof sequence planning.
- No runtime expansion until the next contract checkpoint is explicitly scoped.
- No DB/schema, provider runtime, UI/routes, package, billing, auth, or admin changes in this mode.

## Next

### CP11 — Prospect Fit / Outreach Readiness Scoring Contract

- Contract only.
- Separate Prospect Fit from Outreach Readiness.
- Keep evidence-backed prospects out of opportunity urgency scoring.
- No runtime scoring.
- No UI.
- No DB/schema.

### CP12 — Signal-backed Opportunity Scoring Contract

- Define the contract for signal-backed opportunity scoring.
- Separate Opportunity Urgency from Prospect Fit and Outreach Readiness.
- Require why-now evidence before urgency scoring is available.
- Prevent fake urgency for evidence-backed prospects.

### CP13 — Classification Contract Harness

- Prove classification against approved playbook labels only.
- Start with Commercial Cleaning fixtures.
- Verify fallback behavior when labels, fit, or evidence are weak.
- No freestyle UI-visible labels.

### CP14 — Prospect Pool Export Planning

- Plan CSV/export shape before implementation.
- Define export fields, exclusions, and guardrails for evidence-backed prospects.
- Keep CRM-ready planning separate from CRM sync implementation.

### CP15 — Vertical Expansion: Commercial Roofing Playbook v1

- Add the next vertical playbook only after scoring and classification seams are proven.
- Use the same playbook/config model as Commercial Cleaning.
- Do not hardcode vertical behavior into components or runtime.

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

- Runtime Firecrawl workflow integration.
- Broad crawling.
- CRM sync implementation.
- Cloned niche apps.
- Building 50 verticals immediately.
- DB/schema changes without an explicit checkpoint.
- New provider runtime without an explicit checkpoint.
- Public Agency plan exposure.
- Firecrawl replacing SerpAPI.
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
- `docs/design/lead-card-taxonomy.md`
- `docs/DECISIONS.md`
- `docs/CLEANUP_PLAN.md`
- `docs/DESIGN_SOURCE_OF_TRUTH.md`
