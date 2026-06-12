# Fetchi Decisions Log

Status: Product and repo decision log. Add entries when a decision changes future behavior.

## How to Use This File

Each decision should include:

- date
- decision
- rationale
- scope
- status
- links to related docs/issues/PRs

Use Issue #6 for live coordination. Promote stable decisions here.

## Decisions

### 2026-05 — Fetchi product model

Decision: Fetchi is one horizontal signal-to-opportunity engine with vertical-specific interpretation.

Rationale: The product should not become a cloned niche app per vertical, but it also should not feel generic. Vertical-aware labels, scoring, query strategies, and outreach make one engine feel specific to each user.

Status: Approved product direction.

Related docs:

- `docs/PRODUCT_CONTEXT.md`
- `docs/product/vertical-playbook-registry.md`

### 2026-05 — Launch with 10 core-supported verticals

Decision: Fetchi should launch with ten core-supported verticals, not 5 core + 5 beta.

Launch verticals:

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

Status: Approved product/spec direction. Not implemented.

Related docs:

- `docs/product/vertical-playbook-registry.md`

### 2026-05 — Vertical Playbook Registry

Decision: Future verticals should be added by playbook/config, not by cloning the app or rewriting card components.

Status: Approved product/spec direction. Not implemented.

Related docs:

- `docs/product/vertical-playbook-registry.md`

### 2026-05 — AI label guardrail

Decision: AI may interpret and classify, but UI-visible labels must come from approved vertical playbooks/taxonomy. AI must not freestyle card labels.

Status: Approved guardrail. Not fully implemented.

Related docs:

- `docs/product/vertical-playbook-registry.md`
- `docs/design/lead-card-taxonomy.md`

### 2026-05 — Card surface contract

Decision: Score does not decide card surface color.

Coral is urgent-action surface only. Dark raised is default for previews, pipeline, history, and stable app surfaces. Parchment is for formal record/permit-style surfaces. Fallback states use muted/dashed/dimmed treatments.

Status: Approved design/product rule. Implementation still needs continued QA.

Related docs:

- `docs/design/lead-card-taxonomy.md`

### 2026-05 — Design evidence is not product proof

Decision: A design board can validate visual direction and taxonomy intent, but it does not prove the agent, classifier, scoring, or playbook system works.

Status: Approved PM rule.

Related docs:

- `docs/PM_OPERATING_SYSTEM.md`
- `docs/design/lead-card-taxonomy.md`

### 2026-05 — Settings spec sequencing

Decision: Usage, Notifications, Signal Sensitivity, and Plan & Billing need product/design specs before implementation.

Status: Settings Spec v2 approved for repo source-of-truth. Implementation still requires scoped build prompts. Quiet hours, editable notification email override, future signal categories, `pricing_tiers.is_public`, promo-on-active-subscription, custom downgrade/proration, and vertical-playbook-aware sensitivity copy remain deferred.

Related docs:

- `docs/product/settings-spec.md`

### 2026-05 — Capped plans only

Decision:
Fetchi should use explicit capped tiers, top-ups, or custom capped limits. Fetchi should not advertise or sell an unlimited plan.

Rationale:
Fetchi has real search, enrichment, agent, and delivery costs. Unlimited usage creates margin risk, quality pressure, and unclear expectations.

Scope:
If `opportunities_limit` is null in existing data, customer-facing UI must treat it as unconfigured/custom/syncing, not as unlimited.

Status:
Approved product/pricing rule.

### 2026-05 — No traditional free trial

Decision:
Fetchi does not offer a traditional free trial.

Rationale:
Fetchi has real search, enrichment, agent, evidence, contact-routing, and outreach costs. Traditional free trials attract low-intent users and create cost/quality pressure before value is proven.

Scope:
Fetchi may use homepage demos, videos, sample opportunities, blurred previews, or guided product-preview experiences before payment. Real opportunity delivery, contact routes, and outreach unlock behind capped paid plans.

Status:
Approved product/pricing rule.

### 2026-05 — Pricing tiers public visibility

Decision: `pricing_tiers.is_public` is conceptually approved as a future schema/config decision. Agency should remain in database/config but be hidden from public pricing and in-app tier picker for MVP.

Status: Spec-only. No schema change yet.

### 2026-05 — Firecrawl role

Decision: Firecrawl should be treated as enrichment after a source URL/domain/directory/prospect is found. SerpAPI remains the launch broad search/signal discovery layer.

Status: Product architecture direction. Not implemented in this cleanup pass.

### 2026-05 — Repo cleanup phases

Decision: Repo cleanup should happen as a dedicated hygiene pass, not mixed into feature implementation.

Status: Tracked. Not started.

Related docs:

- `docs/CLEANUP_PLAN.md`

### 2026-06 — CP-INFRA GitHub publishing path

Decision: GitHub connector git-data single-commit publishing is the preferred
fallback when shell `git push` is unavailable. Contents API per-file publishing
is exception-only, requires Adam approval, and requires blob-SHA verification
for every changed file. Agents must not configure ad hoc credentials or install
`gh` mid-checkpoint. Replit remains the final post-merge proof runner on
`main`.

Rationale: CP15 and CP-CG1 showed that Codex-local commits may be valid local
proof while GitHub cannot ingest the local commit object through shell push.
Publishing mechanics must recreate approved file contents without drifting into
product work.

Scope: Checkpoint publishing, draft PR, merge, post-merge proof, and branch
cleanup flow only.

Status: Approved operating decision.

Related docs:

- `docs/infra/github-publishing-path.md`
- `docs/PM_OPERATING_SYSTEM.md`
