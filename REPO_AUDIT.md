# Fetchi Repo Audit

Date: 2026-05-25

## Current state

The repo is now usable for branch-based agent work, but it had several hygiene issues that could confuse future agents:

- No root `README.md` explaining the repo workflow.
- `CODEX_KICKOFF.md` was left at the root even though it was specific to Issue #1.
- `AGENTS.md` pointed future agents at `DESIGN_SYSTEM_V2.md`, even though the working design direction has moved to a clearer token/theme boundary.
- There was no PR template enforcing checks, screenshots, or guardrail confirmation.
- There were no issue templates for scoped work or bugs.
- Replit preview/process issues were not documented, even though stale port-5000 processes caused confusing blank preview behavior.

## Open PR warning

PR #2, `Design System Lock Pass`, is still open as a draft at the time this audit was created.

Do not merge this cleanup branch if it conflicts with PR #2. If needed, merge/squash PR #2 first, then rebase this cleanup branch.

## What was cleaned

### Added canonical design source

Added:

```txt
DESIGN_SYSTEM.md
```

This file is now the canonical design contract for future UI work. It clarifies:

- Dark/operator cockpit for authenticated lead-review surfaces.
- Cream/SMB surface for public/auth/onboarding/light contexts.
- Coral as rare high-value/action/hot-signal or danger accent.
- Green as verified/saved/won/healthy/OK.
- Blue as evidence/source/audit/trust.

### Updated agent instructions

Updated:

```txt
AGENTS.md
```

Key fixes:

- Points agents at `DESIGN_SYSTEM.md` instead of stale Issue #1 context.
- Warns agents to check open PRs before starting overlapping work.
- Documents Replit stale port-5000 preview behavior.
- Keeps protected database/billing rules intact.

### Archived stale Codex handoff

Moved root Issue #1 handoff out of the main path:

```txt
CODEX_KICKOFF.md -> docs/archive/CODEX_KICKOFF_ISSUE_1.md
```

The archive now explicitly says it is historical and not active instructions.

### Added project README

Added:

```txt
README.md
```

Includes:

- Product loop.
- Product laws.
- Development commands.
- Repo workflow.
- Protected files.
- Current design source of truth.

### Added GitHub templates

Added:

```txt
.github/pull_request_template.md
.github/ISSUE_TEMPLATE/task.md
.github/ISSUE_TEMPLATE/bug.md
```

These make future agent work easier to review and reduce context drift.

## What was not changed

No application code was changed in this cleanup branch.

No protected files were changed:

```txt
db/schema.ts
db/index.ts
db/seed.ts
drizzle.config.ts
```

No dependencies were changed.

No runtime behavior was changed.

## Follow-up recommendations

After PR #2 is resolved:

1. Squash merge PR #2 if visual QA passes.
2. Delete the `codex/issue-1-design-system-lock` branch after merge.
3. Rebase this cleanup branch if needed.
4. Merge this cleanup branch.
5. Create a later dedicated design-doc archival task if old HTML mockups/assets are still cluttering the repo.

Do not delete old design assets until no active docs reference them.
