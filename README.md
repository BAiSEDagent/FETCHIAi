# Fetchi

Fetchi is a signal-to-opportunity engine for local and commercial service businesses.

Core promise:

> Tell us what your business sells — we'll find buyers who need it this week.

Core loop:

```txt
Signal -> Prospect + Enrichment -> Opportunity -> Contact Route -> Outreach Play
```

Fetchi is not a generic scraped lead list, not a roofing-only product, and not a set of cloned niche apps. It is one horizontal platform that becomes vertical-aware through playbooks, evidence requirements, labels, query strategies, scoring, and outreach templates.

Fetchi is also not signal-only. The product needs discovery, evidence hydration, classification, scoring, explanation, lineage, and action routing to turn a raw signal into something useful.

## Product Laws

1. **No opportunity without signal.** A surfaced opportunity requires a fresh public buying signal plus source-linked evidence.
2. **No lead without evidence.** Every surfaced lead must cite public or legitimate evidence.
3. **No score without reason.** A score is not valid unless the system can explain why.
4. **No explanation without action.** Every opportunity should lead to a clear next step the user can take.

Current lead-card and prospect-mining rules also separate:

```txt
Status != Signal != Vertical-fit != Freshness != Score != Surface color
```

## Lead Supply Model

Fetchi has two honest lead-supply lanes plus shared enrichment.

### Signal-backed Opportunities

- Start with a fresh public buying signal.
- Treat a search result or snippet as a candidate, not an opportunity.
- Require evidence hydration, evidence-gate pass, approved playbook labels, and reasons before surfacing.
- Can claim urgency, "why now," or an action window only when evidence supports it.

### Evidence-backed Prospects

- Are high-fit target accounts with public or legitimate evidence.
- Do not have a confirmed fresh buying signal.
- Can enter the Prospect Pool for pipeline research and later enrichment.
- May receive CP16-approved evidence-limited outreach drafts or generic safe
  templates.
- Must not claim unsupported urgency, active need, buying intent, budget,
  authority, damage, opportunity status, "why now," "needs this week," coral
  urgency, or opportunity urgency scores unless a separate buying signal is
  found.

### Enrichment

- Supports either lane.
- Adds website, location, contact-route hints, buyer context, account details, and source confidence.
- Does not change lead kind by itself.

## Engine Boundaries

- **SerpApi = discovery.** It finds candidate signals or prospect sources. It does not create opportunities.
- **Firecrawl = evidence hydration/extraction.** It hydrates source URLs, extracts evidence, and supports enrichment after a source exists.
- **LLMs = classify, score, explain, and draft.** They operate inside approved playbooks and taxonomy. They must not freestyle UI-visible labels.
- **DB/audit = lineage.** It records provider runs, source evidence, decisions, score reasons, contact routes, and replayable history.

## Launch Verticals

Fetchi's planned launch verticals are:

1. Commercial Roofing
2. HVAC
3. Commercial Cleaning / Janitorial
4. Plumbing
5. Landscaping / Property Maintenance
6. Electrical Contractors
7. Restoration Services
8. Pest Control
9. Painting / Tenant Improvement
10. Dumpster Rental / Junk Removal

Commercial Cleaning / Janitorial and Commercial Roofing currently have authored
v1 playbook specs. Other launch verticals remain planned until their playbooks
and proof fixtures exist.

## Current Implementation Status

This repo is in product-proof and app-stabilization mode.

Current landed proof/scaffold areas include:

- Customer app shell and lead surfaces from the design-system baseline.
- Provider contracts and no-op/real smoke proof scaffolding from earlier checkpoints.
- Candidate-to-evidence gate contracts.
- Prospect-mining contracts.
- Deterministic Commercial Cleaning prospect-mining fixture proof.

Current non-goals:

- Do not treat design boards as agent/classifier/search proof.
- Do not treat evidence-backed prospects as opportunities.
- Do not claim unsupported vertical behavior without playbook fixtures.
- Do not wire new provider, DB, auth, billing, admin, settings, or route behavior without a scoped checkpoint.

## Source of Truth

Start with these docs:

- `docs/PM_OPERATING_SYSTEM.md` — checkpoint discipline, source-of-truth hierarchy, repo control rules
- `docs/PRODUCT_CONTEXT.md` — product model, laws, launch verticals, lead-supply lanes
- `docs/ROADMAP.md` — current Now / Next / Later sequencing
- `docs/DECISIONS.md` — stable product decisions
- `docs/CLEANUP_PLAN.md` — repo hygiene and product-proof checkpoint history
- `docs/AGENT_WEB_DATA_ARCHITECTURE.md` — signal, prospect, enrichment, evidence, and opportunity architecture
- `docs/PROVIDER_CONTRACTS.md` — SearchProvider, EvidenceProvider, and prospect-mining contract boundaries
- `docs/product/vertical-playbook-registry.md` — vertical playbook model and launch verticals
- `docs/product/playbooks/*` — current v1 vertical playbooks
- `docs/design/lead-card-taxonomy.md` — lead-card label, fallback, and surface-color rules
- `docs/DESIGN_SOURCE_OF_TRUTH.md` — current design-system source-of-truth notes

## Protected Files

Do not touch these unless the active checkpoint explicitly scopes them:

- `replit.md`
- `db/schema.ts`
- `db/index.ts`
- `db/seed.ts`
- `drizzle.config.ts`

Also avoid auth, Clerk, middleware, billing, Stripe, provider/search/agent logic, admin, settings, homepage, signup, and onboarding changes unless explicitly scoped.

`replit.md` is historical/superseded unless a current checkpoint explicitly
scopes otherwise. Deleted historical briefs are not current files or authority;
use git history only for rationale if needed.

## Getting Started

Create a local environment file from the example and fill only the values needed
for the surface you are running:

```bash
cp .env.example .env.local
```

Local development requires a PostgreSQL-compatible `DATABASE_URL`. Replit
injects it automatically; outside Replit, provide a local or development
database URL in the shell or `.env.local`.

Install dependencies:

```bash
npm ci
```

For local/dev database setup, sync the current Drizzle schema and seed data:

```bash
npm run db:push
npm run db:seed
```

`npm run db:push` is a local/dev schema sync path. It is not a production
migration strategy.

Run the app:

```bash
npm run dev
```

The dev server uses port `5000` and binds to `0.0.0.0`.

Useful commands:

```bash
npm run type-check
npm run build
npm run db:verify
```

Builds may require shell environment variables such as `DATABASE_URL` and Clerk keys. Do not commit `.env` files or real secrets.

## Validation

Before claiming a checkpoint is complete, run the scoped proof plus:

```bash
npm run type-check
rm -rf .next
npm run build
```

For product-proof scripts, use the specific smoke command from the checkpoint. Recent examples:

```bash
./node_modules/.bin/tsx scripts/pm/evidence-gate-smoke.ts
./node_modules/.bin/tsx scripts/pm/prospect-mining-contract-smoke.ts
./node_modules/.bin/tsx scripts/pm/prospect-mining-fixture-smoke.ts
```

If a command cannot run locally because of environment, dependency, DNS, or credential limits, report the exact blocker and do not claim proof.

## Repository Discipline

- Work from clean `main` unless a checkpoint says otherwise.
- Keep each checkpoint narrowly scoped.
- Use normal local file edits for implementation work.
- Do not use GitHub contents/API writes for code changes unless the user explicitly asks for connector publishing.
- Do not push or open a PR until Adam approves.
- Keep protected files, package files, attached assets, `.agents`, and generated artifacts out of unrelated checkpoints.
