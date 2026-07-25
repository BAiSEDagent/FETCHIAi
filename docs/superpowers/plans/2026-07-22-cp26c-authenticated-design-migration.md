# CP26C Authenticated Brand System v5 Migration Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to execute this plan task-by-task. Each implementation task receives a fresh implementer and a task-scoped spec/quality review before the next task begins.

**Goal:** Apply the approved Fetchi Brand System v5 to every authenticated customer surface while preserving all existing routes, data contracts, mutations, workspace scoping, accessibility semantics, and product behavior.

**Architecture:** Opt only the authenticated shell into the existing CP26B `--fetchi-*` token namespace and Inter typography. Keep onboarding, public/auth, admin, internal proof routes, and shared `components/ui/*` untouched. Reuse the authentic Fetchi mark/wordmark and Lucide icons. Migrate product-interaction color ownership from coral/green to indigo while retaining blue for evidence links, green/amber/red for their documented semantic roles, and lifecycle hues only for lifecycle carriers.

**Tech Stack:** Next.js 14 App Router, React 18, TypeScript, Tailwind CSS, Radix UI, Lucide React, Drizzle-backed server routes, Mapbox GL, static DB-free `tsx` smoke validation.

## Verified starting state

- Worktree: `/Users/adamteschel/Desktop/LEAD_GEN_SAAS/LEAD GEN SAAS/FETCHIAi-CP26C`
- Branch: `codex/cp26c-authenticated-design-migration`
- Base and `origin/main`: `68c63af89e46c7e11ee3776a8062ead05a737b75`
- Ahead/behind: `0/0`
- Baseline route inventory: 23 `page.tsx`/`route.tsx` files
- Baseline `npm run type-check`: pass
- No inherited `docs/design-spikes`, CP19 provider/runtime edits, or untracked files

## Canonical visual and contract sources

- `docs/DESIGN_SOURCE_OF_TRUTH.md`
- `docs/design/FETCHI_DESIGN_SYSTEM.md`
- `docs/design/FETCHI_COMPONENT_CONTRACTS.md`
- `docs/design/FETCHI_SEMANTIC_COLOR_CONTRACTS.md`
- `docs/design/FETCHI_REFERENCE_PROVENANCE.md`
- `docs/design/fetchi-design-tokens.json`
- `CONTEXT/DESIGN/LINEAR_DESIGN_SYSTEM/FETCHI.AI.pdf`
- `CONTEXT/DESIGN/LINEAR_DESIGN_SYSTEM/IMAGES/*.png`
- Supplied My Leads mobile screenshot is a qualitative density/navigation anchor; the individual v5 sheets are the exact token/component authority.

## Global constraints

- Local work only: do not push, create a remote branch/PR, merge, or modify GitHub.
- Do not touch historical branches/worktrees or preserved recovery artifacts.
- Do not modify `replit.md`, `FETCHI_CLAUDE_CODE_BRIEF.md`, database/schema/seed/config files, package files or lockfiles, middleware, API routes, any `actions.ts`, `lib/runtime/**`, `lib/providers/**`, Clerk/auth logic, Stripe/billing logic, Admin, onboarding, public marketing/pricing, internal proof routes, `components/ui/**`, CRM/export logic, or outreach sending.
- Do not add dependencies, routes, claims, data fields, behaviors, or product concepts.
- Preserve current route behavior, server/client boundaries, data loading, forms, mutations, exports, notes, status updates, Mapbox behavior, Chat behavior, workspace scoping, focus order, labels, and keyboard semantics.
- Inter is the authenticated product font. Do not globally alter public/onboarding typography.
- Coral remains confined to the authentic brand mark. It has no product interaction or semantic role.
- Indigo `#5E6AD2` owns primary actions, selection, focus, active navigation, links, and interactive emphasis; hover is `#828FFF`, press is `#5058C0`.
- Blue `#4C8DF6` is evidence/source ownership only. Green is success/go, amber is aging/warning, red is destructive/lost/error.
- Lifecycle colors appear only on lifecycle discs, filters, status glyphs, badges, and equivalent lifecycle carriers.
- Authenticated shell uses the exact cool near-black ramp, text ramp, 4px spacing grid, 8px controls, 12px cards, quiet hairlines, flat resting surfaces, and restrained overlay/menu elevation.
- Mobile touch targets remain at least 44px even when the visual control is 28/32/40px.
- Selected rows use an indigo tint plus a 2px left accent bar; focus overlays selection rather than replacing it.
- Use only authentic brand components and Lucide icons; no emoji, mascot, handcrafted SVG/CSS art, or new assets.
- Keep the worktree clean between task commits. Each task must include a focused validation run, self-review, and task reviewer approval.

## Approved CP26C file fence

The checkpoint may change only the plan, one CP26C smoke, authenticated-shell styles/layout, CP26B namespaced primitives when required for production use, authentic customer app components, and authenticated customer route presentation files listed below. Any file outside this list is a stop condition.

- `docs/superpowers/plans/2026-07-22-cp26c-authenticated-design-migration.md`
- `scripts/pm/cp26c-authenticated-design-migration-smoke.ts`
- `app/globals.css`
- `tailwind.config.ts`
- `app/app/layout.tsx`
- `app/app/sweep/SweepClient.tsx`
- `app/app/chat/ChatClient.tsx`
- `app/app/leads/[id]/page.tsx`
- `app/app/leads/[id]/OutcomeForm.tsx`
- `app/app/settings/page.tsx`
- `app/app/settings/profile/page.tsx`
- `app/app/settings/profile/ProfileForm.tsx`
- `app/app/settings/signals/page.tsx`
- `app/app/settings/notifications/page.tsx`
- `app/app/settings/billing/page.tsx`
- `app/app/settings/usage/page.tsx`
- `components/app/ChatBubble.tsx`
- `components/app/CreditsWidget.tsx`
- `components/app/EmptyState.tsx`
- `components/app/ErrorState.tsx`
- `components/app/FetchiAvatar.tsx`
- `components/app/GlyphTile.tsx`
- `components/app/LeadCard.tsx`
- `components/app/LoadingState.tsx`
- `components/app/MobileBottomNav.tsx`
- `components/app/MobileHeader.tsx`
- `components/app/MobileScreenHeader.tsx`
- `components/app/MyLeadsView.tsx`
- `components/app/SectionCard.tsx`
- `components/app/SettingsGroup.tsx`
- `components/app/Sidebar.tsx`
- `components/app/SignOutControl.tsx`
- `components/app/map/MapFilterSheet.tsx`
- `components/app/map/MapLeadRail.tsx`
- `components/app/map/MapRailFilterPopover.tsx`
- `components/app/map/MapShell.tsx`
- `components/app/map/MapTopBar.tsx`
- `components/app/map/SelectedLeadSheet.tsx`
- `components/app/today/AfterAddConfirmation.tsx`
- `components/app/today/EvidenceCardBack.tsx`
- `components/app/today/PassReasonPanel.tsx`
- `components/app/today/RunCompletion.tsx`
- `components/app/today/RunProgress.tsx`
- `components/app/today/TodayRunCard.tsx`
- `components/app/today/TodayRunDeck.tsx`
- `components/app/today/TodayRunPage.tsx`
- `components/fetchi-ui/button.tsx`
- `components/fetchi-ui/checkbox.tsx`
- `components/fetchi-ui/field.tsx`
- `components/fetchi-ui/input.tsx`
- `components/fetchi-ui/CoverageIndicator.tsx`
- `components/fetchi-ui/SourceAttribution.tsx`
- `components/fetchi-ui/StatusGlyph.tsx`
- `components/fetchi-ui/textarea.tsx`

---

### Task 1: Lock the migration with a failing smoke and activate v5 in the authenticated shell

**Files:**
- Create: `scripts/pm/cp26c-authenticated-design-migration-smoke.ts`
- Modify: `app/globals.css`
- Modify: `tailwind.config.ts`
- Modify: `app/app/layout.tsx`
- Modify: `components/app/Sidebar.tsx`
- Modify: `components/app/MobileHeader.tsx`
- Modify: `components/app/MobileBottomNav.tsx`
- Modify: `components/app/MobileScreenHeader.tsx`
- Modify: `components/app/CreditsWidget.tsx`
- Modify: `components/app/FetchiAvatar.tsx`
- Modify: `components/app/SectionCard.tsx`
- Modify: `components/app/SettingsGroup.tsx`
- Modify: `components/app/EmptyState.tsx`
- Modify: `components/app/ErrorState.tsx`
- Modify: `components/app/LoadingState.tsx`
- Modify: `components/app/SignOutControl.tsx`

**Interfaces:**
- Produces an authenticated-only v5 root that supplies the exact dark/light surface and text aliases used by existing Tailwind utilities.
- Preserves the existing appearance preference behavior while defaulting the authenticated app to dark.
- Produces the only CP26C smoke, including route, file-fence, protected-scope, coral-ownership, typography, token, focus, and selection checks.

- [ ] **Step 1: Write the failing CP26C smoke**

  Assert: base route inventory remains 23; authenticated root has a dedicated v5 class/data contract; exact v5 aliases and Inter activation exist only under that root; shell geometry is 224px/48px on desktop and 44px touch-safe on mobile; active nav/focus use indigo; coral is absent from all authenticated app/product source; selected-row contract exists; lifecycle/evidence colors remain distinct; all changed files remain inside the approved fence; all protected paths remain unchanged.

- [ ] **Step 2: Run RED**

  Run: `node --import tsx scripts/pm/cp26c-authenticated-design-migration-smoke.ts`

  Expected: FAIL on the missing authenticated v5 activation and/or existing coral/green interaction ownership.

- [ ] **Step 3: Activate authenticated-only v5 tokens and typography**

  Add a dedicated authenticated root class in `app/app/layout.tsx`. In `app/globals.css`, map the legacy utility variables only inside that root to the exact v5 tokens, locally alias heading/body typography to Inter, add focus/selection helpers, and retain a namespaced light mapping for the existing appearance preference. Do not change root/public defaults.

- [ ] **Step 4: Migrate the shell and shared states**

  Set the desktop shell to the 224px sidebar/48px topbar contract, tighten hairlines/radii/spacing, use authentic coral mark only, make active navigation indigo with structural selection, move controls/focus to indigo, retain semantic status colors, and keep all links/menus/touch targets accessible.

- [ ] **Step 5: Re-run focused proof**

  Run the CP26C smoke and `npm run type-check`. Expected: shell/token assertions pass; smoke may remain red only for downstream surface assertions intentionally introduced by later tasks.

- [ ] **Step 6: Commit and task-review**

  Commit only Task 1 files. Reviewer checks authenticated-only scoping, exact token ownership, behavior preservation, and absence of public/onboarding leakage.

### Task 2: Migrate Fetch, My Leads, lead cards, and opportunity detail

**Files:**
- Modify: `app/app/sweep/SweepClient.tsx`
- Modify: `components/app/MyLeadsView.tsx`
- Modify: `components/app/LeadCard.tsx`
- Modify: `components/app/GlyphTile.tsx`
- Modify: `app/app/leads/[id]/page.tsx`
- Modify: `app/app/leads/[id]/OutcomeForm.tsx`
- Modify: `scripts/pm/cp26c-authenticated-design-migration-smoke.ts`
- Modify the existing `components/fetchi-ui/*` primitives only if a production-use accessibility or API defect is discovered; do not broaden their API speculatively.

**Interfaces:**
- Preserves existing Fetch runtime calls, filters, selection state, exports, saved-lead notes/status mutations, lead detail data, and outcome mutation.
- Produces a v5 My Leads mailbox aligned to the approved mobile anchor and component sheets.

- [ ] **Step 1: Add failing surface assertions**

  Require My Leads cool-black surface/tokens, v5 search and export controls, lifecycle filter ownership, 44px row targets, selected/pressed/focus states, v5 action sheet, indigo primary controls, no hard-coded warm palette, and unchanged export/status/note hooks.

- [ ] **Step 2: Run RED**

  Run the CP26C smoke. Expected: FAIL on the current hard-coded CP23 warm mailbox and coral/green product actions.

- [ ] **Step 3: Migrate Fetch and shared lead presentation**

  Replace interaction-green/coral with indigo, preserve green only for saved/success confirmation, blue only for evidence/source links, and lifecycle hues only for status carriers. Apply v5 controls, cards, quiet borders, compact density, Inter hierarchy, and existing `fetchi-ui` primitives where compatible.

- [ ] **Step 4: Migrate My Leads and the action sheet**

  Remove hard-coded warm hex values. Preserve all five filters, counts, search, CSV/JSON export, row navigation, available/missing field semantics, notes, status transitions, undo, keyboard focus, and mobile sheet behavior. Match the anchor's information hierarchy without inventing data or actions.

- [ ] **Step 5: Migrate opportunity/saved-lead detail**

  Apply v5 cards, evidence-link ownership, lifecycle badges, form controls, focus/invalid states, and compact responsive layout. Do not change server queries, UUID handling, data fallbacks, or `OutcomeForm` mutation payloads.

- [ ] **Step 6: Verify, commit, and task-review**

  Run CP26C smoke and type-check. Reviewer explicitly compares behavior-bearing code paths against the task-base diff and blocks any changed data/action/export semantics.

### Task 3: Migrate Chat and Map surfaces

**Files:**
- Modify: `app/app/chat/ChatClient.tsx`
- Modify: `components/app/ChatBubble.tsx`
- Modify: `components/app/map/MapFilterSheet.tsx`
- Modify: `components/app/map/MapLeadRail.tsx`
- Modify: `components/app/map/MapRailFilterPopover.tsx`
- Modify: `components/app/map/MapShell.tsx`
- Modify: `components/app/map/MapTopBar.tsx`
- Modify: `components/app/map/SelectedLeadSheet.tsx`
- Modify: `scripts/pm/cp26c-authenticated-design-migration-smoke.ts`

**Interfaces:**
- Preserves Chat message state/submission, seeded content, lead cards, empty state, and input semantics.
- Preserves Mapbox initialization, resize/viewport behavior, filters, selected-lead sync, desktop rail, mobile sheet, links, and data.

- [ ] **Step 1: Add failing Chat/Map assertions and run RED**

  Require indigo send/focus/active controls, v5 message surfaces, authentic avatar, cool map chrome, selected rail tint plus 2px indigo bar, evidence blue ownership, and no changed Mapbox behavioral identifiers or message submission handlers.

- [ ] **Step 2: Migrate Chat presentation**

  Apply v5 header, avatar tile, bubble/input/composer states, indigo primary send, and quiet shell separation. Preserve all handlers, message array behavior, disabled states, and labels.

- [ ] **Step 3: Migrate Map presentation**

  Apply v5 rail/topbar/filter/popover/sheet geometry and color ownership. Preserve map canvas code unless a class-only presentation change is unavoidable; do not change Mapbox events, source/layer setup, viewport math, filters, or selection state.

- [ ] **Step 4: Verify, commit, and task-review**

  Run CP26C smoke and type-check. Reviewer checks that the diff is presentation-only and that Mapbox/Chat behaviors are byte-equivalent or semantically unchanged.

### Task 4: Migrate Today run surfaces

**Files:**
- Modify: `components/app/today/AfterAddConfirmation.tsx`
- Modify: `components/app/today/EvidenceCardBack.tsx`
- Modify: `components/app/today/PassReasonPanel.tsx`
- Modify: `components/app/today/RunCompletion.tsx`
- Modify: `components/app/today/RunProgress.tsx`
- Modify: `components/app/today/TodayRunCard.tsx`
- Modify: `components/app/today/TodayRunDeck.tsx`
- Modify: `components/app/today/TodayRunPage.tsx`
- Modify: `scripts/pm/cp26c-authenticated-design-migration-smoke.ts`

**Interfaces:**
- Preserves queue ordering, keyboard/swipe controls, card flip, pass/save/contact outcomes, evidence/contact display, progress, completion, and mutation calls.

- [ ] **Step 1: Add failing Today assertions and run RED**

  Require v5 card surfaces/hairlines, indigo interaction ownership, semantic evidence and success colors, real Lucide glyphs, focus-visible geometry, and unchanged action/control labels.

- [ ] **Step 2: Migrate the deck and card faces**

  Re-skin only. Keep card sizing and gesture affordances stable unless the v5 spacing grid requires a presentation-only adjustment. Preserve the parchment treatment exclusively where the current formal evidence record contract calls for it.

- [ ] **Step 3: Migrate progress, completion, confirmation, and pass states**

  Use green only for success/saved confirmation, red only for destructive/lost/pass context, and indigo for neutral active actions/progress selection.

- [ ] **Step 4: Verify, commit, and task-review**

  Run CP26C smoke and type-check. Reviewer checks that action calls, state transitions, keyboard handlers, and accessibility text are unchanged.

### Task 5: Migrate customer Settings

**Files:**
- Modify: `app/app/settings/page.tsx`
- Modify: `app/app/settings/profile/page.tsx`
- Modify: `app/app/settings/profile/ProfileForm.tsx`
- Modify: `app/app/settings/signals/page.tsx`
- Modify: `app/app/settings/notifications/page.tsx`
- Modify: `app/app/settings/billing/page.tsx`
- Modify: `app/app/settings/usage/page.tsx`
- Modify: `components/app/SectionCard.tsx`
- Modify: `components/app/SettingsGroup.tsx`
- Modify: `scripts/pm/cp26c-authenticated-design-migration-smoke.ts`

**Interfaces:**
- Preserves Business Profile form state/payload, signal preferences display, notification semantics, billing truth states, usage calculations, and all current links.

- [ ] **Step 1: Add failing Settings assertions and run RED**

  Require v5 settings cards/selectable rows/forms/switches/radios, indigo interaction states, green success, amber warning/aging, red error, no false trial/unlimited claims, and unchanged billing/usage truth branches.

- [ ] **Step 2: Migrate Settings home and shared grouping**

  Apply the v5 selectable-row contract, compact tiles, quiet dividers, 12px cards, sentence case, Inter hierarchy, and structural active/hover/focus states.

- [ ] **Step 3: Migrate Business Profile and preferences**

  Use namespaced controls when compatible, maintain native labels/IDs/required/error wiring, retain touch-safe range/select controls, and preserve the `saveBusinessProfile` payload exactly.

- [ ] **Step 4: Migrate notifications, billing, and usage**

  Apply semantic color ownership without changing database reads, plan state logic, copy truthfulness, usage math, or billing links.

- [ ] **Step 5: Verify, commit, and task-review**

  Run CP26C smoke and type-check. Reviewer checks all settings data and mutation semantics against the task-base diff.

### Task 6: Whole-branch validation and visual QA

**Files:**
- Modify only `scripts/pm/cp26c-authenticated-design-migration-smoke.ts` if final proof reveals an assertion gap.
- Store screenshots and QA comparison artifacts outside the repository in the Codex visualization workspace; do not add unapproved repo artifacts.

**Interfaces:**
- Produces local proof only. No publication action follows this task.

- [ ] **Step 1: Run final static proofs**

  Run:

  - `git diff --check origin/main..HEAD`
  - `node --import tsx scripts/pm/cp26c-authenticated-design-migration-smoke.ts`
  - `npm run type-check`
  - a clean `npm run build` after moving aside any generated `.next` directory to a temporary recoverable location

  Build must compile cleanly. If environment/data collection blocks after compilation, report the exact blocker; do not alter DB/env/package/auth code.

- [ ] **Step 2: Reconfirm route and protected-scope integrity**

  Compare the 23-route inventory to `origin/main`. Run exact changed-file, protected-path, action/runtime/provider/database/package/middleware/API/public/onboarding/admin/internal-route audits. Confirm no new route or dependency.

- [ ] **Step 3: Run authenticated browser QA in the Codex Desktop browser**

  Start the existing app with the required local environment handoff without exposing values. Capture desktop and mobile screenshots for: shell; Fetch; My Leads; one available lead detail; Chat; Map; Today; Settings home; Business Profile; Signal Preferences; Notifications; Plan & Billing; Usage. Record viewport/state for each.

- [ ] **Step 4: Compare screenshots against canonical evidence**

  Build side-by-side comparison images outside the repo for representative shell, My Leads, controls/forms, cards/selectable rows, and semantic status states. Check exact palette, Inter hierarchy, spacing, radii, borders, selected/focus states, mobile density, overflow, and touch targets. Fix visible mismatches inside the approved file fence and repeat comparison.

- [ ] **Step 5: Check console and responsive behavior**

  Verify no new error/warning logs attributable to CP26C, no horizontal overflow, no clipped bottom navigation/sheets, keyboard-visible focus, stable Map resize, and preserved main interactions at mobile and desktop breakpoints.

- [ ] **Step 6: Request final whole-branch review**

  A fresh reviewer audits `origin/main..HEAD` against this plan, the canonical design contracts, the protected scope, and implementation reports. Address Important/Critical findings and re-run affected focused proof.

- [ ] **Step 7: Return the local checkpoint proof and stop**

  Report: fresh worktree proof; plan path; exact changed files; smoke output; type-check output; clean-build output; route count; screenshot set; console status; complete protected-scope audit; local commit list. Do not push, open a PR, merge, or start another checkpoint.
