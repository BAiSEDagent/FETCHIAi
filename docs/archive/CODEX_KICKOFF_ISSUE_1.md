# Archived Codex Kickoff: Issue #1 — Design System Lock Pass

This file is archived historical context from the first Codex workflow.

Do not treat this as the active agent instruction file. Current agent rules live in `AGENTS.md`; current design rules live in `DESIGN_SYSTEM.md`.

---

# Original content

# Codex Kickoff: Issue #1 — Design System Lock Pass

This file gives Codex the starting context for the first controlled task.

## Start here

Read these in order:

1. `AGENTS.md`
2. `DESIGN_SYSTEM_V2.md`
3. GitHub Issue #1: Design System Lock Pass
4. Existing customer app routes/components for onboarding, chat, lead detail, settings, and signal sensitivity

## Mission

Complete Issue #1 only.

Lock the customer-facing design system before deeper backend work continues.

The design north star is:

> Calmer. One decision per step. Big tap targets. No SaaS clutter.

This is not a redesign from scratch. It is a controlled alignment pass that makes existing customer surfaces obey `DESIGN_SYSTEM_V2.md`.

## Hard constraints

Do not change these protected files:

```txt
db/schema.ts
db/index.ts
db/seed.ts
drizzle.config.ts
```

Do not touch:

- Stripe logic
- auth logic
- search provider logic
- LLM provider logic
- background agents
- trial gates
- billing gates
- opportunity counters
- database schema
- seed data

## Implementation approach

Prefer this order:

1. Audit the current customer UI against `DESIGN_SYSTEM_V2.md`.
2. Identify existing reusable primitives before creating new ones.
3. Fix Tailwind tokens and global styles first if needed.
4. Repair shared customer primitives before screen-level one-offs.
5. Update only the screens needed to satisfy Issue #1 acceptance criteria.
6. Keep admin surfaces out of scope unless a shared global style accidentally affects them.

## Customer surfaces to prioritize

- Onboarding
- Chat
- Lead detail
- Settings home
- Signal sensitivity

Use the five attached asset screenshots referenced in `DESIGN_SYSTEM_V2.md` as visual ground truth.

Do not treat older HTML files in `design/` as final visual targets when they conflict with `DESIGN_SYSTEM_V2.md`.

## Acceptance focus

The PR should satisfy:

- Outfit headings, DM Sans body
- parchment / cream / muted cream hierarchy
- brand green, near-black, and coral used semantically
- no pure white cards directly on parchment customer surfaces
- ツ avatar retains brand treatment
- stamp shadow is not reused elsewhere
- onboarding is one-question-per-step
- chat lead cards are inline conversational transaction cards
- lead detail uses centered transaction-card hero with large green score
- settings use calm grouped rows/cards, not dense tables
- signal sensitivity presents one primary decision with three calm radio cards
- mobile works at 375px before desktop refinements
- all interactive elements meet 44×44px minimum touch target
- no unrelated backend or data-model changes

## Required PR report

Include:

```txt
Summary
Files changed
Acceptance criteria covered
Tests/checks run
Screenshots for UI changes
Known limitations or follow-up tasks
```

Run and report:

```bash
npm run type-check
npm run build
```

If screenshots cannot be captured in the environment, state that clearly and explain what was verified instead.
