# Fetchi Component Contracts

Status: Canonical CP26A component documentation. This file normalizes the
supplied Claude component exports for future implementation. It does not add
production components or approve copying the exported JSX verbatim.

See [the system contract](FETCHI_DESIGN_SYSTEM.md),
[the semantic color contract](FETCHI_SEMANTIC_COLOR_CONTRACTS.md),
[the exact tokens](fetchi-design-tokens.json), and
[source provenance](FETCHI_REFERENCE_PROVENANCE.md).

## Export inventory and maturity

The supplied manifest exports 23 primitives:

| Group | Exported primitives | Contract status |
| --- | --- | --- |
| Brand | `FetchiMark`, `FetchiWordmark`, `FetchiAvatar` | Source-backed target |
| Buttons | `Button`, `IconButton` | Source-backed target; accessibility hardening required |
| Forms | `Input`, `Textarea`, `Select`, `Checkbox`, `Switch`, `Field` | Source-backed target; semantic hardening required |
| Display | `Badge`, `LabelPill`, `StatusGlyph`, `SignalBars`, `KbdHint`, `Separator`, `GlyphTile` | Source-backed target; semantic collision gates apply |
| Cards | `Card`, `SettingsGroup`, `SettingsRow`, `EmptyState`, `SelectableRow` | Source-backed target; interactive semantics required |

The source README names `LeadCard`, `SignalChip`, `ScorePill`, `LifecycleDisc`,
`EvidenceRow`, `Sidebar`, `NavItem`, `Topbar`, `CommandItem`, `Menu`, `Tooltip`,
and `Dialog` as planned, not exported. They have no approved production API in
CP26A. Do not invent them during CP26B unless the checkpoint explicitly scopes
and resolves them.

## Shared implementation rules

- Use authentic Fetchi brand assets and the repository's approved icon library.
  Do not approximate visible assets with text, emoji, CSS drawings, or handmade
  substitute icons.
- Use the exact documented tokens; do not add near-duplicate colors, radii,
  shadows, spacing values, or motion timings inside a component.
- Keep lifecycle, signal, verification, freshness, fit, score, contact
  confidence, destructive intent, selection, and focus as separate props or
  model fields. Never derive one from another.
- Use native HTML semantics where available. A visual state is not a substitute
  for role, accessible name, value, checked state, expanded state, error state,
  or keyboard behavior.
- Required actions cannot be hover-only. Mobile and keyboard users must reach
  the same task path.
- Exactly one primary action is allowed per view. Nearby alternatives use
  secondary, ghost, subtle, or danger treatment according to intent.

## Brand primitives

### `FetchiMark`

- Renders the stacked Fetchi mark at a proportional size.
- Tones: brand, mono, and ink.
- Brand tone uses the authentic coral mark. Mono inherits the approved host
  color. Ink is limited to the approved brand-tile context.
- The mark is decorative when adjacent to an accessible `fetchi` name and must
  not create duplicate announcements.

### `FetchiWordmark`

- Renders lowercase `fetchi`, optionally with the mark.
- Uses Inter weight `800`; do not capitalize or add tracking.
- The visible wordmark may provide the accessible brand name; any adjacent mark
  then remains decorative.

### `FetchiAvatar`

- Places the mark in a rounded tile for system identity.
- It must not be used as a mascot or as a human identity.
- A standalone meaningful avatar requires an accessible Fetchi name; decorative
  duplicates remain hidden from assistive technology.

## Button primitives

### `Button`

Exported variants are `primary`, `secondary`, `ghost`, `subtle`, and `danger`.
Exported sizes are `sm`, `md`, and `lg`, corresponding to `28`, `32`, and
`40px` heights in the button source. It supports leading/trailing icons,
full-width layout, loading, disabled state, and a visible label.

- Primary: the one key action in the view; indigo fill.
- Secondary: adjacent action on a quiet surface.
- Ghost: low-emphasis text or toolbar action.
- Subtle: quiet filled action.
- Danger: explicit destructive confirmation; red plus a destructive verb.
- Loading blocks duplicate activation, exposes busy state, and retains an
  accessible name and visible label. It uses one compact spinner.
- Disabled uses the native disabled state and cannot fire interaction.
- Pressed controls use `scale(0.98)` over `120ms`; reduced motion removes the
  scale. Focus-visible uses the approved indigo ring geometry.

**CP26B approved behavior:** standard links use indigo, evidence-source links
use blue, active navigation uses indigo plus structure, selected-plus-focused
rows retain selection under an overlaid focus ring, loading uses a compact
spinner with a visible label, and press motion is `scale(0.98)` over `120ms`
with a reduced-motion override.

### `IconButton`

Exported variants are `ghost` and `secondary`; exported sizes are `28`, `32`,
and `36px`. Every instance requires a meaningful accessible label. Tooltips may
supplement but never replace that name. Mobile hit area must reach the `44px`
minimum even when the visible glyph/control remains compact.

## Form primitives

### `Input`, `Textarea`, and `Select`

- Inputs and selects expose `sm`, `md`, and `lg` sizes with exported heights of
  `28`, `32`, and `40px`; textarea grows vertically from its content/rows.
- A `Field` supplies the visible label, helper text, required indication, and
  error message.
- Placeholder text is an example or hint, never the only label.
- Errors use red boundary treatment plus plain error text and programmatic
  association (`aria-invalid` and described-by/error-message wiring in the
  eventual implementation).
- Focus-visible uses the approved ring and does not depend on mouse-focus state.
- `Select` keeps native selection and keyboard behavior unless a separately
  approved composite contract replaces it.

### `Checkbox`

- Represents a submitted or independently selectable boolean/mixed choice.
- Supports checked, unchecked, indeterminate, disabled, label, and description.
- Future implementation must use a native checkbox or reproduce its complete
  focus, keyboard, form, and assistive-technology contract. The exported
  clickable `span` is visual evidence, not an approved production pattern.

### `Switch`

- Represents an immediate-effect setting, not a choice that applies only after
  form submission.
- Supports on/off, disabled, controlled, and uncontrolled states.
- Use a button/switch semantic with accessible name, `aria-checked`, Space/Enter
  behavior, visible focus, and clear persisted-result feedback.

### `Field`

- Orders label, control, then one hint or error region.
- Required indication is visible and programmatic.
- Error text replaces the hint visually only if the accessible relationship
  still supplies all necessary instruction.

## Card and row primitives

### `Card`

- `raised` is the card/tile surface; `flat` is an inline panel.
- Default padding is `16px`; `20px` is the larger tokenized option.
- The source provides optional edge highlight and interactive hover lift.
- A non-interactive card is a grouping container, not a clickable affordance.
- An interactive card must be a link/button or contain a clear primary
  interactive element; do not put click behavior on a generic `div`.
- Avoid cards inside cards. Prefer flat groups, dividers, and aligned rows.

### `SettingsGroup` and `SettingsRow`

- A settings group has one heading/description and a quiet surface containing
  divided rows.
- A row has a label and optional description on the left and one control or
  value on the right.
- A navigable row uses link/button semantics and keyboard behavior. A row with
  an embedded switch or select must not create conflicting nested activation.
- Mobile reflows long labels and descriptions without shrinking the target or
  clipping the control.

### `SelectableRow`

- Represents one item in a scannable Fetch or Leads list.
- Exported default height is `44px`, with leading, content, and trailing slots.
- Hover uses a quiet neutral tint. Selected uses the indigo selection treatment
  plus the `2px` left bar.
- Selection is distinct from opening the row, lifecycle, freshness, focus, and
  checkbox state. The data model and event contract must name each action.
- A focused-selected fixture is mandatory and blocked on the PM layering
  decision.
- The future implementation must define list/grid semantics, arrow-key behavior
  where applicable, visible focus, and accessible selection state. The exported
  generic `div` is not sufficient production semantics.

### `EmptyState`

- Uses one short, strong line, one plain next step, and at most one relevant
  action.
- Says what Fetchi checked or what the owner can do next. It never looks like a
  crash, dead end, or unsupported certainty.
- An optional real icon may support the message. Do not use emoji, a mascot, or
  a decorative illustration to hide missing information.

## Display primitives

### `Badge`

- Compact carrier for counts, freshness, evidence, aging, or lightweight
  semantic state.
- It is not a lifecycle or score carrier.
- Badge text remains explicit; a colored dot alone is insufficient.
- Exported sizes are `18` and `22px` high. Avoid proliferating pills when plain
  text or aligned metadata is clearer.

### `LabelPill`

- Structural evidence for a vertical/category label and optional collapsed
  label group.
- It does not establish an approved arbitrary color palette. Vertical fit has
  no owned hue until the PM decision is recorded.
- Multiple labels may collapse by count only when the full set remains
  discoverable and accessible.

### `StatusGlyph`

- Lifecycle-only ring grammar: new is hollow, reviewing is dashed, Saved uses a
  dot, Contacted uses a filled-in ring, Won uses a check, and Lost uses an x.
- Always pair with an accessible lifecycle label when the glyph conveys state.
- The current repo taxonomy also includes Responded, which the export omits.
  Mapping Responded is a PM decision and is blocked from CP26B.

### `SignalBars`

- Represents evidence/signal strength, never numeric fit score.
- Exported levels are none, weak, moderate, strong, and time-sensitive.
- Time-sensitive amber requires a dated-artifact gate that is not present in
  the exported primitive. That data/API contract is a PM decision.
- Always expose an accessible text equivalent; bar shape and color alone are
  insufficient.

### `GlyphTile`

- Carries a fixed signal-type icon from the approved icon mapping.
- Uses the real icon library at the approved size/stroke; never an approximate
  drawing, emoji, or freestyle AI-selected icon.
- Tone supports the signal/evidence context only and cannot encode score or
  lifecycle.

### `KbdHint`

- Displays keyboard shortcuts as supporting instruction.
- Render platform-appropriate keys, keep the underlying command operable, and
  expose an understandable accessible name.
- A hint never creates a shortcut by itself.

### `Separator`

- Uses a quiet horizontal or vertical hairline to group content.
- Supply separator semantics when the line conveys structure; decorative lines
  remain hidden from assistive technology.
- Do not use repeated separators to rebuild nested card borders.

## Evidence and fallback contracts

The source names `EvidenceRow`, `LeadCard`, `SignalChip`, and `ScorePill` as
planned only. Until approved implementations exist:

- evidence shows source/artifact, verification context, and time;
- freshness shows an age or timestamp, not only green;
- score is a bare tabular integer with FIT/SCORE label and a reason;
- contact confidence remains explicit and neutral until it has an approved
  encoding;
- `needs_review`, `weak_fit`, `missing_evidence`, `exploratory`, and `discarded`
  use explicit labels and muted/dashed treatment;
- fallback never borrows disabled, loading, error, or lifecycle styling;
- no UI label is invented outside approved playbooks and taxonomy.

## Navigation primitives

`Sidebar`, `NavItem`, `Topbar`, and `CommandItem` are planned in the source but
not exported. The only approved navigation-level requirements in CP26A are:

- authenticated navigation remains dark, compact, and keyboard reachable;
- active location is structural and text-labeled, not color-only;
- required actions remain available without hover;
- mobile navigation provides the same destinations and state meaning with
  `44px` minimum targets;
- active navigation uses indigo plus a structural surface or indicator;
- no Linear terminology, layout, or icon identity is copied.

Do not invent a navigation API or redesign the shell in CP26B unless separately
approved.

## State matrix

| State | Visual contract | Behavioral/accessibility contract |
| --- | --- | --- |
| Rest | Correct surface and text hierarchy | Native semantics and accessible name present |
| Hover | One quiet surface/text step; optional tiny lift for interactive cards | No required meaning or action appears only here |
| Pressed | Press token and `scale(0.98)` over `120ms`; no scale under reduced motion | Activation follows native control behavior |
| Selected | Indigo tint plus left bar | Selection state exposed; not confused with focus/open/lifecycle |
| Focus-visible | Indigo focus ring overlays and preserves any selection tint/bar | Visible for keyboard use; logical focus order |
| Disabled | Reduced emphasis plus unavailable state | Native disabled or equivalent; cannot activate |
| Loading | Stable label/name plus progress treatment | Busy state exposed; duplicate activation blocked |
| Error | Red edge/message | Error associated and announced; correction remains possible |
| Missing evidence | Muted/dashed and explicit reason | Remains readable/reachable; not disabled or hidden |
| Fallback | Muted/dashed taxonomy state | Exact fallback value and next action available |

## Desktop and mobile proof requirements

Future implementation proof must cover desktop mouse and keyboard, mobile touch,
responsive reflow, zoom/text growth, focus-visible, reduced motion, loading,
disabled, error, fallback, and selected-plus-focus. Console-clean screenshots
are supporting evidence only; automated interaction and accessibility checks
must prove behavior.

## CP26B boundary

The narrowest safe CP26B is token plumbing plus a small, non-route primitive
slice after PM decisions are closed. It must not include a gallery, app-shell
redesign, full Leads/Fetch/Map/Chat/Settings migration, new package dependency,
or copied source specimen. Each primitive needs state, keyboard, semantic-color,
contrast, mobile target, and reduced-motion proof before adoption.
