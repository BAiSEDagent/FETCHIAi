# Fetchi Agent Rules

These rules apply to every coding agent working in this repository: Replit Agent, Claude Code, Codex, Cursor, or any future automation.

## Source of truth

- GitHub is the source of truth for code, docs, issues, and PRs.
- Work from the current `main` branch unless an issue or PR says otherwise.
- Prefer one task per branch and one PR per task.
- Do not make broad unrelated edits while solving a narrow task.

## Product context

Fetchi is a signal-based lead generation SaaS for local and commercial service businesses. It watches public buying signals, turns them into evidence-backed opportunities, explains why each lead matters now, and helps the user take action.

The core product loop is:

```txt
Signal → Prospect + Enrichment → Opportunity → Contact Route → Outreach Play
```

The three product laws:

1. No lead without evidence.
2. No score without reason.
3. No explanation without action.

## Design rules

- Customer surfaces must follow `DESIGN_SYSTEM_V2.md`.
- The current design north star is: **Calmer. One decision per step. Big tap targets. No SaaS clutter.**
- The five attached asset screenshots referenced in `DESIGN_SYSTEM_V2.md` are the visual ground truth for customer surfaces.
- Do not treat the older HTML files in `design/` as the final visual target when they conflict with `DESIGN_SYSTEM_V2.md`.
- Admin surfaces are intentionally separate from the customer app design language.
- Design at 375px mobile width first, then scale up.
- Minimum touch target is 44×44px.
- Never use pure white cards directly on parchment customer surfaces; use the cream/brand surface tokens from `DESIGN_SYSTEM_V2.md`.
- The stamp/shadow treatment is reserved for the ツ avatar only.

## Protected files

Do not modify these files unless the issue explicitly asks for it:

```txt
db/schema.ts
db/index.ts
db/seed.ts
drizzle.config.ts
```

These files define the database contract and billing/trial gate primitives. Do not rewrite them for style, convenience, or compile fixes.

## Architecture rules

- All database queries must be workspace-scoped with `workspace_id` / `workspaceId`.
- Do not hardcode prices, opportunity limits, score thresholds, cron schedules, email copy, prompt copy, feature gates, or provider/model choices.
- Runtime config should come from database-backed config tables where already modeled.
- All LLM calls must route through the provider abstraction in `lib/agents/providers.ts` or its current repo equivalent.
- All search calls must route through the search provider abstraction in `lib/search/` or its current repo equivalent.
- SerpApi is the discovery/search layer, not the enrichment layer.
- Firecrawl, if added, should be provider-abstracted enrichment after a URL/domain/source is found. Do not replace SerpApi with Firecrawl.
- Never expose raw stack traces, API errors, secrets, or provider responses to users.

## Stripe and billing rules

- Do not use the Replit Stripe connector.
- Stripe is BYOK.
- Do not modify the subscription schema, `consumeOpportunityCredit()`, or `checkTrialGate()` unless explicitly assigned.
- Do not bypass trial gates, card gates, opportunity counters, or usage accounting for UI convenience.

## Replit rules

- Replit is the preview/runtime environment, not the sole source of truth.
- Do not enable Replit AI Integrations for Anthropic/OpenAI/Google unless the issue explicitly asks for it.
- Do not set `DATABASE_URL` manually. Replit injects it.
- Do not add secrets to source files.

## Change discipline

Before implementation:

1. Read the issue.
2. Identify the exact files needed.
3. Check `DESIGN_SYSTEM_V2.md` for customer UI tasks.
4. Check existing components before creating new primitives.

During implementation:

- Keep changes scoped.
- Prefer small reusable primitives over one-off styling.
- Avoid arbitrary colors, spacing, shadows, and custom status palettes.
- Do not delete working features to simplify the task.
- Do not replace real logic with mocks unless the issue explicitly calls for fixtures.

Before reporting done:

- Run `npm run type-check` when TypeScript changed.
- Run `npm run build` when app structure, routes, or shared components changed.
- Include the commands run and results in the PR or final report.
- For UI changes, include screenshots at 375px mobile and desktop.

## PR expectations

Every PR should include:

```txt
Summary
Files changed
Acceptance criteria covered
Tests/checks run
Screenshots for UI changes
Known limitations or follow-up tasks
```

If a task cannot be completed safely, stop and explain the blocker instead of improvising around protected architecture.
