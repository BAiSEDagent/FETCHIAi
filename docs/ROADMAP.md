# Fetchi Roadmap

Status: Planning source of truth. Keep this short and update as priorities change.

## Now

### Lead supply architecture — CP7 docs-only

Goal: define how Fetchi can grow lead supply without weakening the signal-to-opportunity
promise.

Engine model:

- **Opportunity Engine** — signal discovery, evidence hydration, evidence gate,
  classification/scoring, and qualified opportunities. This lane owns
  Opportunity Urgency and requires a fresh public buying signal.
- **Prospect Mining Engine** — prospect mining, evidence packets, prospect-fit review,
  and Prospect Pool inventory. This lane creates evidence-backed prospects, not urgent
  opportunities.
- **Enrichment Engine** — contact route, buyer context, website/location/account details,
  and source confidence for either opportunities or prospects.

Lead supply model:

- Prospect Pool holds evidence-backed prospects that are useful for pipeline building but
  do not have a confirmed fresh buying signal.
- Evidence-backed prospects can become CRM-ready later, but they must not claim urgency,
  "why now," or "needs this week" without a separate signal.

Export and CRM sequence:

1. CSV export first.
2. CRM field mapping next.
3. HubSpot, Pipedrive, Zapier, and Make integrations later.
4. Daily/weekly prospect mining jobs later, after the Prospect Mining Engine contract is
   proven.

Score split:

- **Prospect Fit** — account and vertical fit for evidence-backed prospects.
- **Outreach Readiness** — contactability, source confidence, and buyer-context quality.
- **Opportunity Urgency** — signal-backed timeliness only; unavailable for no-signal
  prospects.

Scope boundary: CP7 is docs/spec only. No runtime work, DB/schema changes, UI/routes,
provider implementation, package changes, classifier/scoring implementation, or outreach
implementation.

### UI/design stabilization

Goal: make the current customer app surfaces coherent enough to become the baseline.

Current focus:

- PR #2 / `codex/issue-1-design-system-lock`
- Chat
- Today’s Run
- My Leads
- Lead Detail
- Bottom navigation and customer shell stability
- Lead-card color/surface grammar
- Context docs and repo source-of-truth cleanup

Definition of done:

- `npm run type-check` passes
- `rm -rf .next && npm run build` passes
- customer mobile screens pass visual QA
- stale screenshot artifacts are removed before merge
- repo docs clearly identify active source of truth

## Next

### Settings product/design spec

Tabs:

- Usage
- Notifications
- Signal Sensitivity
- Plan & Billing

No implementation until spec is approved.

### Vertical-fit card board and playbook template

Goal: validate card taxonomy visually across the ten launch verticals and then produce one complete vertical playbook template, likely Commercial Cleaning first.

### Repo hygiene pass

Goal: clean up stale docs/assets/branches and merge or reconcile repo hygiene work after PR #2 is settled.

## Later

### Vertical Playbook Registry implementation

Turn `docs/product/vertical-playbook-registry.md` into implementation-ready config/schema.

### Agent/classifier proof harness

Create fixtures/tests showing that raw signals plus vertical playbooks produce approved labels, scores, fallback states, and outreach angles.

### Provider/enrichment layer

Keep SerpAPI as signal discovery. Add Firecrawl as an enrichment layer after a URL/domain/source is known.

### Billing/trial/subscription stabilization

Build Stripe BYOK integration around existing subscription/workspace credit logic when ready.

## Parked / Not Now

- Cloning Fetchi into separate niche apps
- Building 50 verticals immediately
- Public Agency plan exposure
- Firecrawl replacing SerpAPI
- SMS/push notifications for MVP
- Broad refactors while UI baseline is unsettled

## Rejected

- Unlimited plan / unlimited usage promise — use capped tiers, top-ups, or custom capped plans instead
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
