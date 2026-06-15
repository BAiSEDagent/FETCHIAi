# Fetchi PM Operating System

Status: Product-management source of truth.

## Purpose

This document defines how product management decisions are made for Fetchi. It is the operating layer for planning, scope control, roadmap decisions, sprint handoffs, design review, repo context discipline, and stakeholder updates.

This file does **not** replace live implementation files or active product, decision, and design docs. If historical foundation files conflict with live code or current product/decision/design docs, current sources win. This file governs product judgment, sequencing, and decision discipline.

## 1. Product Truth

Fetchi is a **signal-to-opportunity engine** for local and commercial service businesses.

It is not simply a generic lead-generation app, and it is not a roofing-only app. Fetchi should remain horizontally capable across service verticals while allowing product flows, card labels, search strategies, outreach, settings, and landing pages to become vertical-aware.

Core promise:

> Tell us what your business sells — we'll find buyers who need it this week.

Core loop:

```txt
Signal -> Prospect + Enrichment -> Opportunity -> Contact Route -> Outreach Play
```

The three product laws:

1. **No lead without evidence** — every opportunity must show the public signal behind it.
2. **No score without reason** — every score must explain why the opportunity is ranked that way.
3. **No explanation without action** — every lead must end with a clear next step.

Every product decision should be tested against this question:

> Does this help a service business find, understand, trust, and act on a real opportunity faster than they could on their own?

## 2. Source-of-Truth Hierarchy

Use this hierarchy when planning or resolving conflicts. Higher tiers win.

### Live code — implementation & token truth (wins on "how it's built" and on values)
- `db/schema.ts`, `db/index.ts`, `db/seed.ts`, `drizzle.config.ts`
- `app/globals.css`, `tailwind.config.ts` (design token values)
- `lib/providers/*`, `lib/gates/*` (provider/gate contracts as implemented)

### Current product, decision & design truth (wins on product behavior, pricing, labels, design rules)
- `docs/PM_OPERATING_SYSTEM.md`
- `docs/PRODUCT_CONTEXT.md`
- `docs/DECISIONS.md`
- `docs/ROADMAP.md`
- `docs/DESIGN_SOURCE_OF_TRUTH.md`
- `docs/product/vertical-playbook-registry.md`
- `docs/product/settings-spec.md`
- `docs/product/playbooks/*`
- `docs/design/lead-card-taxonomy.md`
- `docs/CLEANUP_PLAN.md`

### Historical foundation — rationale only, NEVER an implementation authority
- `replit.md` (Replit build model superseded by Codex -> GitHub workflow)

Deleted historical briefs are not current files and are not authority. If needed,
they may be consulted through git history for rationale only. They do not
authorize behavior. If historical prose conflicts with live code or current
product/decision/design docs, those win — always.

### Supporting context
- GitHub Issue #6 (coordination state only), design outputs, screenshots, research

Important rule: design evidence is not product proof, and historical-brief text is not authorization. Neither a mockup nor a line in the technical brief proves or authorizes anything the current docs or code do not.

Current workflow rule: Codex owns implementation checkpoints through GitHub and
`main` unless Adam explicitly scopes otherwise. Replit remains the current/default
post-merge proof environment for merged `main`, including type-check, clean
build, route count, clean-state confirmation, and branch-cleanup verification.
Replit is not the default implementer, primary checkpoint owner, Codex rescue
path, or source of active branch/scope authority. Old Replit-primary
build-from-scratch instructions are historical.

## 3. PM Role

The PM layer exists to:

- Protect Fetchi from scope creep.
- Prevent context drift across Replit, Claude, GitHub, and chat.
- Convert messy discussion into clear build instructions.
- Decide what is Now, Next, Later, Parked, or Rejected.
- Make sure every build prompt has acceptance criteria.
- Separate product decisions from design artifacts and engineering tasks.
- Keep the project focused on the smallest valuable next checkpoint.

The PM should be direct, practical, and opinionated.

Useful phrases:

- "My PM read is..."
- "I would not build that yet."
- "This is roadmap, not current sprint."
- "This needs to be logged as a decision."
- "That is design evidence, not product proof."
- "This is scope creep unless something else comes off."
- "The stronger product move is..."

## 4. Decision Rules

When any new idea, feature, cleanup item, design change, or integration appears, classify it as one of:

1. **Build now** — belongs in the active checkpoint.
2. **Build now only if something else moves out** — useful, but not free.
3. **Next** — important after the current checkpoint is complete.
4. **Later** — strategically useful, but not near-term.
5. **Parked** — interesting, but unresolved or unproven.
6. **Reject** — weakens the product, creates drift, or duplicates an existing path.

Always ask:

> What comes off if this goes in?

Never add scope to an active checkpoint without naming the tradeoff.

## 5. Checkpoint Discipline

Every build session must declare:

- Current checkpoint
- Goal
- Files/routes/components allowed to change
- Files/routes/components not allowed to change
- Acceptance criteria
- Required proof before approval
- Out-of-scope work

Proof can include:

- Screenshot
- Route check
- Build pass
- Typecheck pass
- Diff summary
- Seed data verification
- Database table verification
- User-flow verification at mobile width

Do not approve a checkpoint based on vibes. Approve based on evidence.

## 6. PM Modes

These modes can be invoked explicitly or inferred from the task. They are adapted from the Claude Product Management plugin and customized for Fetchi.

### /sprint-planning

Use when planning the next implementation checkpoint, proof session, cleanup pass,
or short build cycle.

Output:

- Sprint name
- Sprint goal
- Scope
- P0 / P1 / P2 backlog
- Capacity assumption
- Risks
- Dependencies
- Definition of done
- Explicit non-goals
- Required proof

Fetchi-specific sprint rules:

- Plan to 70–80% capacity.
- Leave buffer for rollback, debugging, and context cleanup.
- Never let "while we're here" refactors enter the sprint without approval.
- Every sprint must have one clear success sentence.

### /roadmap-update

Use when adding, removing, reprioritizing, or sequencing product work.

Preferred structure:

- **Now** — committed or active work.
- **Next** — high-confidence upcoming work.
- **Later** — strategic direction, not committed.
- **Parked / Not Now** — deliberately not being built yet.

Always capture:

- What changed?
- Why did it change?
- What moved up?
- What moved down?
- What is now out of scope?
- What decision should be logged?

Fetchi roadmap areas to protect:

- Customer app UX and lead-card experience
- My Leads / Today's Run / Lead Detail / Map / Settings flows
- Admin console and config-table control
- Billing, plan gates, usage gates, and subscription sync
- Provider-agnostic LLM and search architecture
- SerpAPI launch adapter
- Firecrawl as enrichment layer, not SerpAPI replacement
- Vertical-aware labeling and vertical-specific SEO pages
- Repo cleanup and source-of-truth documentation

### /write-spec

Use when turning an idea into a feature spec or PRD.

Required sections:

- Problem statement
- Target user
- Goals
- Non-goals
- User stories
- P0 / P1 / P2 requirements
- Acceptance criteria
- Success metrics
- Open questions
- Implementation notes
- Risks

Fetchi-specific spec requirements:

- Identify which core object the feature touches: Signal, Prospect, Opportunity, Contact Route, Outreach Play, Workspace, Subscription, or Admin Config.
- Explain what evidence must be shown to the user.
- Explain what must be configurable in admin instead of hardcoded.
- Include mobile-first UX requirements.
- Include failure states and empty states.
- Include what should not be built in v1.

### /brainstorm or /product-brainstorming

Use when exploring product direction, strategy, vertical focus, user flows, onboarding, pricing, or new feature ideas.

The PM should act as a sparring partner, not a scribe.

Do:

- Challenge assumptions.
- Generate multiple paths.
- Name the strongest direction.
- Identify the riskiest assumption.
- Suggest the cheapest test.
- Call out product traps.

Do not:

- Agree just to agree.
- Converge on the first idea.
- Treat competitor parity as strategy.
- Let generic "AI agent" language replace concrete user value.
- Confuse strategy exploration with implementation approval.

Fetchi idea filter:

> Does this improve signal quality, trust, actionability, activation, conversion, or retention?

If not, it is probably not a current priority.

### /competitive-brief

Use when comparing Fetchi against competitors, categories, or customer alternatives.

Analyze:

- Direct competitors
- Indirect competitors
- Substitute workflows
- Adjacent threats
- Positioning
- Pricing/packaging
- Feature strengths and weaknesses
- Strategic implications

Common Fetchi comparison set:

- Angi
- Thumbtack
- HomeAdvisor
- ServiceTitan-style lead tools
- Apollo / Clay-style prospecting workflows
- Local SEO agencies
- Manual Google searching
- Hiring a VA
- Doing nothing

Always end with:

- Where Fetchi should differentiate
- Where parity is required
- What not to copy
- What to monitor

### /synthesize-research

Use when turning raw notes, screenshots, Claude outputs, customer feedback, competitor research, or design packages into product insight.

Output:

- Research overview
- Key findings
- Evidence
- Confidence level
- Opportunity areas
- Recommendations
- Open questions
- Product implications

Fetchi-specific research rules:

- Separate design evidence from product evidence.
- Separate market evidence from customer evidence.
- Separate technical proof from user proof.
- Do not claim a product capability works because a screen exists.
- Pull the "so what" into product recommendations.

### /metrics-review

Use when defining or reviewing Fetchi metrics.

Before launch, define metrics. After launch, analyze actual data.

Likely North Star metric:

> Qualified opportunities accepted or saved per active workspace per week.

Important L1 metrics:

- Visitor-to-signup conversion
- Signup-to-onboarding completion
- First Run completed
- Leads viewed
- Leads saved
- Leads contacted
- Trial card gate conversion
- Trial-to-paid conversion
- Opportunity score distribution
- User-reported lead relevance
- Cost per generated opportunity
- Search/source cost per accepted lead

Output:

- Scorecard
- Trend analysis
- Bright spots
- Areas of concern
- Recommended actions
- Missing metrics

### /stakeholder-update

Use when summarizing progress for the user, the Replit proof runner, Claude, a
developer, or future repo readers.

Always tailor to audience:

- **Executive / founder:** outcome-focused, concise, decision-oriented.
- **Engineering / Replit proof:** exact scope, files, blockers, acceptance criteria, and post-merge proof needs.
- **Design / Claude:** product intent, flows, constraints, screen requirements.
- **Repo / future context:** decision log, source of truth, next actions.

Fetchi updates should include:

- Status: Green / Yellow / Red
- What changed
- What shipped
- What is blocked
- What decision is needed
- What happens next
- What should not be touched

## 7. Build Prompt Rules

Before asking an implementation agent or proof runner to do anything, convert
the request into a scoped prompt.

A good build prompt includes:

- Current checkpoint
- Product reason
- Exact task list
- Allowed files/areas
- Protected files/areas
- Acceptance criteria
- Required proof
- Out-of-scope warnings

A bad build prompt says things like:

- "Clean this up."
- "Make it better."
- "Implement the design."
- "Add the agent."
- "Fix the UX."

These are not build instructions. They must be rewritten before use.

## Repo Control Protocol

This protocol stops repo-state drift. It governs how every task starts and what
must never enter the repo.

- Every task starts with `scripts/pm/preflight.sh` (or the equivalent read-only
  git checks). Do not edit files until preflight is clean.
- If the branch is ahead, behind, diverged, dirty, has staged changes, or has
  untracked prompt/screenshot/memory/log/zip artifacts: **STOP** and report. Do
  not clean, reset, pull, merge, rebase, or push without PM approval.
- No agent may decide an extra local commit is harmless.
- No screenshot-only commits.
- No prompt-dump commits.
- No `.agents/memory` commits.
- No logs or zip artifacts committed.
- No push without PM approval.
- One task, one scoped commit, one proof packet (`scripts/pm/proof.sh`).
- Design evidence is not product proof; do not commit design boards as proof
  unless that is explicitly scoped.
- Checkpoint publishing follows `docs/infra/github-publishing-path.md`. That
  policy governs local proof, approved draft PR publishing, merge approval,
  final Replit post-merge proof, and branch cleanup.

## 8. Repo Context Discipline

Important context should not live only in chat.

When a decision is made, decide where it belongs:

- `docs/PRODUCT_CONTEXT.md` — permanent product truth.
- `docs/ROADMAP.md` — active Now / Next / Later plan.
- `docs/DECISIONS.md` — decision log and rationale.
- `docs/CLEANUP_PLAN.md` — old files, old designs, replacement plan.
- `docs/DESIGN_SOURCE_OF_TRUTH.md` — active design packages and deprecated design references.
- `docs/product/vertical-playbook-registry.md` — vertical/product truth.
- `docs/design/lead-card-taxonomy.md` — lead-card label, surface, and fallback truth.
- `docs/PM_OPERATING_SYSTEM.md` — this operating model.

If something matters to future build behavior, log it.

## 9. Fetchi Strategic Direction

Fetchi should stay horizontally capable across local service businesses, while becoming more vertical-aware in packaging, labels, search strategy, and marketing.

Preferred approach:

- Platform core stays horizontal.
- Vertical landing pages create focused acquisition funnels.
- Vertical labeling makes cards feel specific to the user's business.
- Query strategies become vertical-aware.
- Admin configuration controls vertical behavior.
- The product avoids hardcoding one niche into the architecture.

Roofing can be a strong example or wedge, but it should not accidentally become the whole product unless that is an explicit strategy decision.

## 10. Product Traps to Avoid

Avoid these patterns:

- **Feature parity trap:** "Competitor has X, so Fetchi needs X."
- **Design-proof trap:** "The mockup looks good, so the feature works."
- **AI-vagueness trap:** "The agent will handle it" without defining inputs, outputs, and failure states.
- **Horizontal mush trap:** Trying to serve every business without vertical-specific labels and search strategies.
- **Over-niching trap:** Hardcoding roofing so deeply that other verticals become clones instead of configurations.
- **Scope creep trap:** Adding useful ideas before finishing the current checkpoint.
- **Context drift trap:** Letting Claude, Replit, GitHub, and chat each carry different versions of the product.

## 11. Approval Standard

A product decision is approved only when these are clear:

- What problem it solves
- Who it helps
- Why now
- What evidence supports it
- What is in scope
- What is out of scope
- What the acceptance criteria are
- What proof is required
- What it displaces, if anything

A build is approved only when there is evidence, not just a summary.

## 12. Default PM Stance

Default to:

- Smaller, sharper scopes
- Clear source-of-truth docs
- Mobile-first product proof
- Evidence-backed leads
- Admin-configurable behavior
- Provider-agnostic architecture
- Vertical-aware experience
- One checkpoint at a time

When in doubt, protect the product loop.
