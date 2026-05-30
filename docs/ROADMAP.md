# Fetchi Roadmap

Status: Planning source of truth. Keep this short and update as priorities change.

## Now

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
- Unlimited plan
- Broad refactors while UI baseline is unsettled

## Active Planning Docs

- `docs/PM_OPERATING_SYSTEM.md`
- `docs/PRODUCT_CONTEXT.md`
- `docs/product/vertical-playbook-registry.md`
- `docs/design/lead-card-taxonomy.md`
- `docs/DECISIONS.md`
- `docs/CLEANUP_PLAN.md`
- `docs/DESIGN_SOURCE_OF_TRUTH.md`
