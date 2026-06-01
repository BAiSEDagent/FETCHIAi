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

## Codex task guidance

When assigned a GitHub issue or PR, Codex should:

1. Read this file first.
2. Read the linked issue in full.
3. For customer UI work, read `DESIGN_SYSTEM_V2.md` before opening implementation files.
4. Inspect existing components/routes before creating new files.
5. Produce the smallest safe diff that satisfies the acceptance criteria.
6. Prefer component primitives and token fixes over one-off styling.
7. Avoid backend, database, auth, billing, provider, or agent changes unless the issue explicitly asks for them.
8. Run the repo checks requested by the issue and report exact results.
9. If screenshots are required but the environment cannot capture them, say so clearly in the PR notes and explain what was verified instead.

For the first task, Codex should focus on Issue #1 only: `Design System Lock Pass`.

## Review guidelines

Codex code review should prioritize serious issues over style nits. Flag P0/P1 issues for:

- Any change to protected database/billing files that was not explicitly requested.
- Any customer UI change that violates `DESIGN_SYSTEM_V2.md` in a material way.
- Any hardcoded pricing, limits, score thresholds, schedules, provider/model choices, prompts, or email copy.
- Any unscoped database query that can leak data across workspaces.
- Any direct LLM/provider/search API call that bypasses the provider abstraction layer.
- Any accidental exposure of secrets, stack traces, raw provider errors, or API keys.
- Any use of the Replit Stripe connector or Replit-managed AI integrations where BYOK/provider abstraction is required.
- Any removal of trial gates, opportunity counters, or usage checks.
- Any app-structure change that breaks `npm run type-check` or `npm run build`.

Do not block PRs for small copy/style preferences unless they contradict the design system or acceptance criteria.

## Safe-area and bottom-fixed UI convention

Any `fixed bottom-0` element (`BottomNav`, sticky footers, sticky CTAs) MUST:
- use the theme background token on its own element (e.g. `bg-bg`)
- include `style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}`

Body must keep `padding-bottom: env(safe-area-inset-bottom)` and `background: var(--bg)`.

Product dark surfaces must paint into the safe area. The product layout uses a `[data-fetchi-theme-root].theme-dark` marker — `body:has([data-fetchi-theme-root].theme-dark)` flips `--bg` to dark so the safe-area paints dark.

Never:
- rely on a parent container to paint the safe-area zone
- introduce `border-t`, `<hr>`, or 1px dividers between routed content and bottom-fixed UI
- paint the inner BottomNav wrapper with its own background that ends above the safe area
