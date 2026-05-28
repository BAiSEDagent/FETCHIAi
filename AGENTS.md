# AGENTS.md — Fetchi codebase conventions for AI agents

Conventions any AI coding agent (Codex, Claude Code, etc.) must follow when editing this repo.

## Bottom-fixed UI must paint the iOS safe-area

Any `fixed bottom-0` element (`BottomNav`, sticky footers, sticky CTAs) MUST:
- use the theme background token on its own element (e.g. `bg-bg`)
- include `style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}`

Body must keep `padding-bottom: env(safe-area-inset-bottom)` and `background: var(--bg)`.

Product dark surfaces must paint into the safe area. The product layout uses a `[data-fetchi-theme-root].theme-dark` marker — `body:has([data-fetchi-theme-root].theme-dark)` flips `--bg` to dark so the safe-area paints dark.

Never:
- rely on a parent container to paint the safe-area zone
- introduce `border-t`, `<hr>`, or 1px dividers between routed content and bottom-fixed UI
- paint the inner BottomNav wrapper with its own background that ends above the safe area
