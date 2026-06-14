# Fetchi Agent Rules

These rules apply to every coding agent working in this repository: Replit Agent, Claude Code, Codex, Cursor, or any future automation.

> ## Pointer
> Active branch: `main`. Active checkpoint and scope live in GitHub Issue #6 and the linked checkpoint issue.
> Authority hierarchy: `docs/PM_OPERATING_SYSTEM.md` §2. Design rules: `docs/DESIGN_SOURCE_OF_TRUTH.md`. Token values: `app/globals.css` + `tailwind.config.ts`.

## Start Here

Agents should use the current repo entry and control surfaces in this order:

1. `README.md`
2. GitHub Issue #6 Agent Control Room for coordination state only, plus the linked checkpoint issue for active scope
3. `docs/PM_OPERATING_SYSTEM.md`
4. `docs/ROADMAP.md`
5. `docs/PRODUCT_CONTEXT.md`
6. Scoped source docs for the assigned task

Work from the current `main` branch unless the active issue, PR, or checkpoint explicitly says otherwise. Prefer one task per branch and one PR per task. Keep diffs narrow and avoid unrelated edits.

## Product Context

Fetchi is a signal-to-opportunity engine for local and commercial service businesses. Fetchi watches public buying signals, enriches prospects with evidence, separates Prospect Pool items from signal-backed opportunities, and helps users take action when the evidence supports it.

Core loop:

```txt
Signal -> Prospect + Enrichment -> Opportunity -> Contact Route -> Outreach Play
```

## Product Laws

- No opportunity without signal.
- No lead without evidence.
- No score without reason.
- No explanation without action.

## Lead Supply Lanes

Signal-backed Opportunities can carry urgency only when signal, evidence, and why-now reasons exist. Opportunity urgency is not allowed from score, status, vertical, or prospect evidence alone.

Evidence-backed Prospects can enter the Prospect Pool, but must not claim urgency, opportunity status, coral urgency treatment, or opportunity urgency scores. Prospects can have Prospect Fit and Outreach Readiness signals, but they are not opportunities until a qualifying signal-backed opportunity path exists.

Status, signal, vertical fit, freshness, score, and surface color are separate product concepts. Do not collapse them into one label or one color rule.

## Source Docs

Use the current source docs for the task surface:

- `docs/DESIGN_SOURCE_OF_TRUTH.md` is the current design source of truth.
- `docs/design/lead-card-taxonomy.md` is the current label, fallback, and surface-color source of truth.
- `docs/product/vertical-playbook-registry.md` and scoped playbooks define approved UI-visible taxonomy labels.
- `docs/AGENT_WEB_DATA_ARCHITECTURE.md`, `docs/PROVIDER_CONTRACTS.md`, and `docs/PLAYBOOK_SEARCH_EXAMPLES.md` describe provider and evidence architecture.
- `docs/repo-stale-entry-audit.md` tracks stale or legacy repo-control surfaces.

`DESIGN_SYSTEM_V2.md` was deleted as stale design authority. Do not use it,
PR #2, or `codex/issue-1-design-system-lock` as active customer UI authority.

## Provider Boundaries

- SerpApi = discovery.
- Firecrawl = evidence hydration/extraction after a source exists.
- LLMs may classify, score, explain, and draft only inside approved contracts, playbooks, and taxonomy.
- UI-visible labels must come from approved taxonomy and playbooks, not freeform LLM text.
- DB/audit = lineage.

Do not make direct provider calls outside scoped provider abstraction work. Do not add provider runtime, Firecrawl workflow runtime, broad crawling, scoring runtime, classifier runtime, outreach runtime, CRM sync, or export implementation unless explicitly scoped.

Never expose raw stack traces, API errors, secrets, provider payloads, or API keys to users.

## Protected Files

Do not modify these files unless the issue explicitly asks for it:

```txt
replit.md
FETCHI_CLAUDE_CODE_BRIEF.md
db/schema.ts
db/index.ts
db/seed.ts
drizzle.config.ts
```

Also avoid DB/schema, auth, billing, provider/search/agent logic, admin, settings, middleware, package files, and runtime implementation changes unless explicitly scoped.

## Architecture Rules

- All database queries must be workspace-scoped with `workspace_id` / `workspaceId`.
- Do not hardcode prices, opportunity limits, score thresholds, cron schedules, email copy, prompt copy, feature gates, provider choices, or model choices.
- Runtime config should come from database-backed config tables where already modeled.
- All LLM calls must route through the provider abstraction in the current repo equivalent.
- All search calls must route through the search provider abstraction in the current repo equivalent.
- Do not replace real logic with mocks unless the issue explicitly calls for fixtures.
- Do not add secrets to source files.

## Change Discipline

Before implementation:

1. Read the active checkpoint or issue.
2. Confirm branch, base, role, preflight, postflight, and file-lock rules.
3. Identify the exact allowed files.
4. Inspect existing components, contracts, scripts, or docs before creating new primitives.

During implementation:

- Keep changes scoped.
- Prefer existing patterns and small reusable primitives.
- Avoid broad cleanup mixed with product work.
- Avoid protected/runtime work unless explicitly scoped.
- Do not delete working features to simplify the task.
- Do not modify package files unless explicitly scoped.

## Validation Discipline

Before reporting done, run the checks required by the checkpoint. Default proof expectations:

- `npm run type-check`
- `rm -rf .next && npm run build`
- route count for builds when relevant
- smoke scripts for product-proof checkpoints
- screenshots only for UI checkpoints
- exact blockers if local env, DNS, credential, dependency, or connector issues prevent proof

Use temporary shell-only environment placeholders for local build proof only when approved or already established for the checkpoint. Do not write `.env` files or real secrets.

## Codex and GitHub Workflow

- Do not push or open a PR until Adam approves.
- Use the GitHub connector path for Codex PR publication when requested.
- Do not use unauthenticated shell `git push`.
- Do not merge without explicit approval.
- Replit remains the current/default post-merge proof environment when requested.
  It is not the default implementer, the primary checkpoint owner, a Codex
  rescue path, or the source of active branch/scope authority.

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

## Review Guidelines

Code review should prioritize serious issues over style nits. Flag P0/P1 issues for:

- Any change to protected files that was not explicitly requested.
- Any hardcoded pricing, limits, score thresholds, schedules, provider/model choices, prompts, or email copy.
- Any unscoped database query that can leak data across workspaces.
- Any direct LLM/provider/search API call that bypasses the provider abstraction layer.
- Any accidental exposure of secrets, stack traces, raw provider errors, or API keys.
- Any removal of plan gates, opportunity counters, usage checks, evidence gates, or score reasons.
- Any app-structure change that breaks `npm run type-check` or `npm run build`.

Do not block PRs for small copy/style preferences unless they contradict active source docs or acceptance criteria.

## Safe-Area and Bottom-Fixed UI Convention

Any `fixed bottom-0` element (`BottomNav`, sticky footers, sticky CTAs) must:

- use the theme background token on its own element, for example `bg-bg`
- include `style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}`

Body must keep `padding-bottom: env(safe-area-inset-bottom)` and `background: var(--bg)`.

Product dark surfaces must paint into the safe area. The product layout uses a `[data-fetchi-theme-root].theme-dark` marker; `body:has([data-fetchi-theme-root].theme-dark)` flips `--bg` to dark so the safe area paints dark.

Never:

- rely on a parent container to paint the safe-area zone
- introduce `border-t`, `<hr>`, or 1px dividers between routed content and bottom-fixed UI
- paint the inner BottomNav wrapper with its own background that ends above the safe area
