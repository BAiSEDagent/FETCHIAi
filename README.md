# Fetchi.ai

Fetchi is a signal-based lead generation SaaS for local and commercial service businesses.

The product watches public buying signals, converts them into evidence-backed opportunities, explains why each lead matters now, and helps the user take action.

## Product loop

```txt
Signal → Prospect + Enrichment → Opportunity → Contact Route → Outreach Play
```

## Product laws

1. No lead without evidence.
2. No score without reason.
3. No explanation without action.

## Current repo workflow

- GitHub is the source of truth.
- Replit is the preview/runtime environment.
- Work should happen through small branches and PRs.
- One task = one PR.
- Do not mix feature work, design work, and repo hygiene in the same PR.

## Agent instructions

Before using Codex, Claude Code, Replit Agent, Cursor, or another coding agent, read:

```txt
AGENTS.md
DESIGN_SYSTEM.md
```

For UI work, `DESIGN_SYSTEM.md` is canonical. Older design docs and mockups are historical/supporting references unless an active issue explicitly says otherwise.

## Development

```bash
npm run dev
npm run type-check
npm run build
```

The Replit dev server runs on port `5000`:

```bash
next dev -p 5000 -H 0.0.0.0
```

If Replit preview is blank but the server returns HTML, check for stale/orphaned Next processes before changing application code.

## Database

```bash
npm run db:push
npm run db:seed
npm run db:verify
```

Protected database files should not be modified unless the issue explicitly calls for it:

```txt
db/schema.ts
db/index.ts
db/seed.ts
drizzle.config.ts
```

## Design source of truth

Current canonical design system:

```txt
DESIGN_SYSTEM.md
```

Historical design reference:

```txt
DESIGN_SYSTEM_V2.md
docs/archive/
```

## Pull request checklist

Every PR should include:

- Summary
- Files changed
- Acceptance criteria covered
- Tests/checks run
- Screenshots for UI changes
- Known limitations or follow-up tasks

At minimum, run:

```bash
npm run type-check
npm run build
```
