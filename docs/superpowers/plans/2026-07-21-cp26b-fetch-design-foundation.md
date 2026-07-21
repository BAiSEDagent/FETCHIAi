# CP26B Fetch Design Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add the approved Inter-based Fetchi token and form-control foundation without migrating or visually changing any route.

**Architecture:** Keep the current theme and existing `components/ui` primitives intact. Add exact CP26A token values under a collision-safe `--fetchi-*` namespace, expose Inter without changing the current root font, and place the new primitives under `components/fetchi-ui/` so CP26C can opt Fetch into them explicitly.

**Tech Stack:** Next.js 14, React 18, TypeScript, Tailwind CSS, class-variance-authority, Radix Checkbox, Lucide React, static `tsx` smoke proof.

## Global Constraints

- Base commit is `af771acf267fa54159bd00751baea27a1d010126` on branch `codex/cp26b-design-foundation`.
- Do not migrate Fetch or change any route in CP26B.
- Do not modify existing `components/ui/*`, shared shell, Map, Leads, Chat, Settings, Admin, provider/runtime, database, auth, billing, package, lockfile, middleware, or route files.
- Coral has no product-semantic or interaction role; the optional logo-only token remains untouched.
- Standard links use indigo; evidence-source links use blue.
- Active navigation uses indigo plus a structural surface or indicator.
- Focus overlays selected state without replacing the selection tint or left bar.
- Loading buttons use one compact spinner and retain their visible label.
- Pressed controls scale to `0.98` over `120ms`; reduced motion removes the scale.
- New primitives must be unreferenced by production routes until CP26C.

---

### Task 1: Lock decisions and token/font plumbing

**Files:**
- Modify: `docs/design/FETCHI_DESIGN_SYSTEM.md`
- Modify: `docs/design/FETCHI_COMPONENT_CONTRACTS.md`
- Modify: `docs/design/FETCHI_SEMANTIC_COLOR_CONTRACTS.md`
- Modify: `app/layout.tsx`
- Modify: `app/globals.css`
- Modify: `tailwind.config.ts`
- Create: `scripts/pm/cp26b-fetch-design-foundation-smoke.ts`

**Interfaces:**
- Consumes: exact CP26A values from `docs/design/fetchi-design-tokens.json`.
- Produces: `--font-inter`, `font-inter`, and collision-safe `--fetchi-*` custom properties for the new primitive slice.

- [ ] **Step 1: Write the failing token/decision smoke assertions**

Add assertions that require the five approved decisions, the Inter variable, exact dark/light token values, exact geometry/motion values, and the approved file fence.

- [ ] **Step 2: Run the smoke and verify RED**

Run: `node --import tsx scripts/pm/cp26b-fetch-design-foundation-smoke.ts`

Expected: FAIL because the CP26B markers and namespaced tokens do not exist.

- [ ] **Step 3: Record decisions and add inert plumbing**

Update the three canonical design contracts. Load `Inter` in `app/layout.tsx` and expose only its CSS variable. Add namespaced custom properties to `app/globals.css` without changing existing aliases or root typography. Add only `font-inter`/`font-fetchi` mappings to Tailwind.

- [ ] **Step 4: Re-run the smoke for the Task 1 assertions**

Run: `node --import tsx scripts/pm/cp26b-fetch-design-foundation-smoke.ts`

Expected: the token/decision section passes and the next missing primitive assertion fails.

### Task 2: Implement the Button primitive

**Files:**
- Create: `components/fetchi-ui/button.tsx`
- Modify: `scripts/pm/cp26b-fetch-design-foundation-smoke.ts`

**Interfaces:**
- Produces: `FetchiButton`, `FetchiButtonProps`, and `fetchiButtonVariants` with `primary | secondary | ghost | subtle | danger`, `sm | md | lg`, `isLoading`, `fullWidth`, and `asChild`.

- [ ] **Step 1: Add failing Button assertions**

Require native disabled behavior, `aria-busy`, stable visible label, Lucide spinner, exact heights, indigo primary, red danger, `0.98` press scale, `120ms` motion, and reduced-motion removal.

- [ ] **Step 2: Run the smoke and verify RED**

Expected: FAIL because `components/fetchi-ui/button.tsx` is absent.

- [ ] **Step 3: Implement the minimal Button**

Use `Slot`, `cva`, `cn`, and `LoaderCircle`. Keep static variant definitions module-scoped and direct-import dependencies.

- [ ] **Step 4: Run the smoke and verify GREEN for Button**

Expected: Button assertions pass; the next form assertion fails.

### Task 3: Implement Input and Textarea primitives

**Files:**
- Create: `components/fetchi-ui/input.tsx`
- Create: `components/fetchi-ui/textarea.tsx`
- Modify: `scripts/pm/cp26b-fetch-design-foundation-smoke.ts`

**Interfaces:**
- Produces: `FetchiInput`/`FetchiInputProps` and `FetchiTextarea`/`FetchiTextareaProps` with `sm | md | lg` sizing and native error/disabled attributes.

- [ ] **Step 1: Add failing form-control assertions**

Require exact 28/32/40px input heights, token surfaces, Inter typography, focus-visible ring, red invalid treatment, disabled treatment, textarea resize, and native prop forwarding.

- [ ] **Step 2: Run the smoke and verify RED**

Expected: FAIL because the form-control files are absent.

- [ ] **Step 3: Implement minimal Input and Textarea**

Use `forwardRef`, `cva`, `cn`, native attributes, and no route-specific behavior.

- [ ] **Step 4: Run the smoke and verify GREEN for form controls**

Expected: Input/Textarea assertions pass; the next Field/Checkbox assertion fails.

### Task 4: Implement Field and Checkbox primitives

**Files:**
- Create: `components/fetchi-ui/field.tsx`
- Create: `components/fetchi-ui/checkbox.tsx`
- Modify: `scripts/pm/cp26b-fetch-design-foundation-smoke.ts`

**Interfaces:**
- Produces: `FetchiField` that wires label, required state, hint/error IDs, `aria-invalid`, `aria-describedby`, and `aria-errormessage` into one child control.
- Produces: `FetchiCheckbox` backed by Radix with checked/unchecked/indeterminate, label, description, disabled, form name/value, keyboard semantics, and a 44px row target.

- [ ] **Step 1: Add failing accessibility assertions**

Require programmatic label/description/error wiring, native required state, Radix checked/mixed semantics, real Check/Minus icons, disabled state, and 44px touch target.

- [ ] **Step 2: Run the smoke and verify RED**

Expected: FAIL because Field and Checkbox are absent.

- [ ] **Step 3: Implement minimal Field and Checkbox**

Use `cloneElement` for Field control wiring and Radix Checkbox for boolean/mixed behavior. Do not create a barrel file.

- [ ] **Step 4: Run the smoke and verify GREEN**

Run: `node --import tsx scripts/pm/cp26b-fetch-design-foundation-smoke.ts`

Expected: PASS with the approved changed-file list and unchanged route inventory.

### Task 5: Validate and prepare local proof

**Files:**
- No new files.

**Interfaces:**
- Produces: local proof only; no push or PR.

- [ ] **Step 1: Run formatting/whitespace proof**

Run: `git diff --check`

Expected: exit 0.

- [ ] **Step 2: Run the CP26B smoke**

Run: `node --import tsx scripts/pm/cp26b-fetch-design-foundation-smoke.ts`

Expected: PASS.

- [ ] **Step 3: Run type-check**

Run: `npm run type-check`

Expected: exit 0.

- [ ] **Step 4: Attempt the clean production build**

Run: move the generated `.next` directory aside if present, then `npm run build`.

Expected in Replit: exit 0. In the local Codex environment, record the pre-existing `DATABASE_URL` collection blocker if it recurs after successful compilation/type validation; do not modify database or environment files.

- [ ] **Step 5: Report exact checkpoint scope**

Run: `git status -sb`, `git branch --show-current`, `git rev-parse --short HEAD`, `git log --oneline main..HEAD`, `git diff --name-status main..HEAD`, `git diff --stat main..HEAD`, and route inventory comparison.

Expected: only the approved docs, inert foundation, primitives, smoke, and this plan; no route changes.
