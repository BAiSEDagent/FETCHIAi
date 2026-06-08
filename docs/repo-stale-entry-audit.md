# Repo Stale Entry Audit

Status: CP13B-A audit-only. No files were deleted.

## Purpose

Audit root-level and docs-level instruction/control files that could mislead future agents now that Fetchi has current entry points:

- `README.md`
- `docs/PM_OPERATING_SYSTEM.md`
- `docs/ROADMAP.md`
- `docs/PRODUCT_CONTEXT.md`
- GitHub Issue #6 Agent Control Room

## Findings

| File | Classification | Reason | Recommended action | Risk if left unchanged | Delete now? yes/no | Needs Adam decision? yes/no |
|---|---|---|---|---|---|---|
| `README.md` | Keep | Current repo entry point with current product laws, lead-supply lanes, protected files, commands, and validation discipline. | Keep as primary human/agent entry point. | Low. | no | no |
| `AGENTS.md` | Update later | Useful agent rules remain, but it still references Issue #1, `DESIGN_SYSTEM_V2.md`, old kana/avatar/stamp rules, and PR #1-era design-system workflow. | Update in a scoped docs/control checkpoint to point to `README.md`, Issue #6, `docs/PM_OPERATING_SYSTEM.md`, and current source-of-truth docs. | Medium: agents may revive Issue #1 / PR #2-era design tasks or old brand rules. | no | yes |
| `CODEX_KICKOFF.md` | Delete candidate | One-off kickoff for Issue #1 Design System Lock Pass. Stale because `README.md` and Issue #6 are now the active entry/control surfaces. | Delete in CP13B-B if approved. | High: can steer Codex back to completed Issue #1 / PR #2-era work and obsolete acceptance criteria. | no | no |
| `START_HERE.md` | Delete candidate | Original handoff package instructions for building Fetchi from scratch before the repo had app code and current source-of-truth docs. | Delete in CP13B-B if approved. | High: can make future agents think this is still a zip handoff with no application code. | no | no |
| `REPLIT_AGENT_OPENING_PROMPT.md` | Delete candidate | Original Replit opening prompt asks for complete product build, old checkpoint sequence, schema pushes, and broad runtime scope. | Delete in CP13B-B if approved. | High: can trigger broad unscoped build behavior, DB/schema operations, or stale design/agent assumptions. | no | no |
| `DESIGN_SYSTEM_V2.md` | Needs Adam decision | Root design doc contains old PR #1/#2 visual ground truth, attached-asset references, old kana/avatar rules, and coral guidance that conflicts with current design truth. | Decide whether to delete, archive, or replace with a pointer to `docs/DESIGN_SOURCE_OF_TRUTH.md` and `docs/design/lead-card-taxonomy.md`. | Medium: future UI work may follow superseded customer-surface rules instead of current design source of truth. | no | yes |
| `FETCHI_CLAUDE_CODE_BRIEF.md` | Protected / do not touch | Protected technical legacy brief. It still contains older brand/build assumptions, but protected files are outside this checkpoint. | Keep untouched unless Adam explicitly scopes protected-file reconciliation. | Medium: stale technical brief can conflict with current product-proof flow, but deletion/editing is protected. | no | yes |
| `replit.md` | Protected / do not touch | Protected Replit technical instructions. It includes older brand/build assumptions but remains protected. | Keep untouched unless Adam explicitly scopes protected-file reconciliation. | Medium: Replit may read old instructions if invoked directly. | no | yes |
| `docs/PM_OPERATING_SYSTEM.md` | Keep | Current PM/checkpoint discipline and source-of-truth hierarchy. | Keep as active control doc. | Low. | no | no |
| `docs/PRODUCT_CONTEXT.md` | Update later | Current product model is useful, but the "Current Product State" wording still says build/design stabilization is the current focus. | Update in a later docs checkpoint to reflect CP6-CP13 product-proof chain. | Low to medium: may understate current contract-proof sequence. | no | no |
| `docs/ROADMAP.md` | Update later | Current roadmap structure is right, but it has not yet promoted CP11-CP13 from Next to landed. | Update after current checkpoint sequence or before CP14 planning. | Low to medium: roadmap may lag recent merged proof work. | no | no |
| `docs/CLEANUP_PLAN.md` | Keep | Current cleanup/checkpoint history. This checkpoint updates it only with CP13B-A state. | Keep and append checkpoint entries. | Low. | no | no |
| `docs/DECISIONS.md` | Keep | Stable decision log with current product/guardrail decisions. | Keep. | Low. | no | no |
| `docs/DESIGN_SOURCE_OF_TRUTH.md` | Update later | Active design authority, but it still says PR #2 branch is the active UI baseline even though PR #2 has merged into `main`. | Update in a future design/docs checkpoint; do not delete. | Medium for UI tasks: agents may treat the old PR branch as active. | no | no |
| `docs/AGENT_WEB_DATA_ARCHITECTURE.md` | Keep | Active architecture source of truth for discovery, evidence, lead lanes, and provider boundaries. | Keep untouched. | Low. | no | no |
| `docs/PROVIDER_CONTRACTS.md` | Keep | Active provider contract source of truth. | Keep untouched. | Low. | no | no |
| `docs/PLAYBOOK_SEARCH_EXAMPLES.md` | Keep | Useful CP3 bridge from playbooks to provider-ready query examples. | Keep untouched. | Low. | no | no |
| `docs/design/lead-card-taxonomy.md` | Keep | Active design/product source of truth for card labels, fallback states, and surface rules. | Keep untouched. | Low. | no | no |
| `docs/product/vertical-playbook-registry.md` | Keep | Active product/spec source of truth for vertical playbook model. | Keep untouched. | Low. | no | no |
| `docs/product/playbooks/commercial-cleaning.md` | Keep | Active v1 Commercial Cleaning playbook. | Keep untouched. | Low. | no | no |
| `docs/product/settings-spec.md` | Keep | Active spec-only planning doc for settings. | Keep untouched. | Low. | no | no |
| `docs/research/saas-chat-starter-patterns.md` | Keep | Explicitly marked research reference only and includes guardrails against stack migration. | Keep as supporting context. | Low. | no | no |

## Recommended CP13B-B deletion scope

### Files safe to delete now

- `CODEX_KICKOFF.md`
- `START_HERE.md`
- `REPLIT_AGENT_OPENING_PROMPT.md`

These are one-off root control surfaces from old build/kickoff flows. They are not protected files and now conflict with the active entry/control surfaces.

### Files that need Adam decision

- `AGENTS.md` - update rather than delete, because agents may still read it automatically.
- `DESIGN_SYSTEM_V2.md` - decide delete vs archive vs replace with a pointer.
- `FETCHI_CLAUDE_CODE_BRIEF.md` - protected; reconcile only in an explicitly scoped protected-file checkpoint.
- `replit.md` - protected; reconcile only in an explicitly scoped protected-file checkpoint.

### Files to keep untouched

- `README.md`
- `docs/PM_OPERATING_SYSTEM.md`
- `docs/PRODUCT_CONTEXT.md`
- `docs/ROADMAP.md`
- `docs/CLEANUP_PLAN.md`
- `docs/DECISIONS.md`
- `docs/DESIGN_SOURCE_OF_TRUTH.md`
- `docs/AGENT_WEB_DATA_ARCHITECTURE.md`
- `docs/PROVIDER_CONTRACTS.md`
- `docs/PLAYBOOK_SEARCH_EXAMPLES.md`
- `docs/design/lead-card-taxonomy.md`
- `docs/product/vertical-playbook-registry.md`
- `docs/product/playbooks/commercial-cleaning.md`
- `docs/product/settings-spec.md`
- `docs/research/saas-chat-starter-patterns.md`

Some kept docs need later targeted updates, but they should not be deleted in CP13B-B.
