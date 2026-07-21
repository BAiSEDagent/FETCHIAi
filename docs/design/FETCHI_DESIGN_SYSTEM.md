# Fetchi Design System Contract

Status: Canonical CP26A design documentation. This file defines the target
design contract for later migration work. It does not prove that production UI
implements the contract and does not authorize a component, route, or CSS
change.

## Authority and companion documents

The source order for this contract is:

1. supplied Claude Fetchi Design System exports;
2. existing Fetchi product laws, taxonomy, and source-of-truth documents;
3. Linear references for quality and interaction evidence only; and
4. current production UI as migration context only.

Use these companions together:

- [Exact token values](fetchi-design-tokens.json)
- [Semantic color contracts](FETCHI_SEMANTIC_COLOR_CONTRACTS.md)
- [Component contracts](FETCHI_COMPONENT_CONTRACTS.md)
- [Source and conflict provenance](FETCHI_REFERENCE_PROVENANCE.md)
- [Lead-card taxonomy](lead-card-taxonomy.md)
- [Current design source of truth](../DESIGN_SOURCE_OF_TRUTH.md)

The token JSON records the token CSS and manifest verbatim. Conflicting export
values remain named in the provenance document and are not silently resolved.
Any item marked **PM decision required** is blocked from CP26B implementation.

## Product and design laws

The design system must preserve the product model instead of turning Fetchi
into a generic dashboard:

- No opportunity without a signal.
- No prospect without evidence.
- No score without a reason.
- No explanation without an action.
- No urgency without a dated artifact.
- Parchment is reserved for formal records.
- Missing evidence, weak fit, review-needed, exploratory, and other fallback
  states remain honest, muted, or dashed.
- Lifecycle, signal strength, evidence verification, freshness, vertical fit,
  score, contact confidence, destructive state, and interaction state are
  separate channels.

Coral is brand-mark-only and has no product-semantic or interaction role. Do
not use coral, score, status, lifecycle, vertical, or a generic high-priority
label to imply urgency. Urgency requires dated evidence, an explicit label, and
a clear action.

## Design direction

The target is calm, dense, precise, and operator-first. The authenticated app
uses a cool neutral-dark shell, compact type and controls, quiet hairlines,
restrained elevation, and one indigo interaction accent. Structure comes from
alignment, spacing, type hierarchy, and surface steps—not nested cards,
decorative borders, gradients, glass effects, oversized controls, or a color
for every concept.

Linear is a craft reference only. Do not copy Linear layouts, terminology,
branding, icons, product concepts, or screenshots. Fetchi retains its own brand
mark, vocabulary, owner workflow, evidence model, and lifecycle.

## Brand system

### Mark

- Use the authentic stacked Fetchi mark. Do not redraw, approximate, or replace
  it with a text symbol, emoji, mascot, or unrelated glyph.
- The exported brand tone is coral `#F45B3B`.
- Mono and ink treatments are allowed only when the host context requires a
  single-color mark or an ink mark on a brand tile.
- Brand asset use does not grant coral a general semantic or interaction role.

### Wordmark

- The wordmark is always lowercase `fetchi`.
- The export sets it in Inter at weight `800`, with no added capitalization.
- Do not improvise a new lockup, tracking treatment, or avatar identity.

### Avatar

- The avatar is the authentic mark inside a compact rounded tile.
- It may identify Fetchi in Chat, notifications, app-icon contexts, and other
  places where the system—not a human—is the speaker.
- An avatar does not authorize a mascot, personality illustration, or floating
  assistant treatment.

## Surfaces

### Authenticated dark surface

The dark theme is the default for the authenticated operator product: shell,
lists, pipeline, previews, history, and settings. Its exact ramp is:

| Role | Token | Value |
| --- | --- | --- |
| App background | `--bg` | `#08090A` |
| Elevated chrome | `--bg-elevated` | `#0C0D0F` |
| Panel/sidebar | `--surface` | `#0F1011` |
| Card/list row | `--raised` | `#141516` |
| Input/menu fill | `--overlay` | `#191A1C` |
| Overlay hover | `--overlay-hover` | `#202123` |
| Overlay active | `--overlay-active` | `#26282B` |

Each step needs a job. Do not alternate surfaces merely to make every region a
box. Prefer flat siblings and hairline separation to nested cards.

### Restricted light surface

The `.theme-light` export is restricted to marketing, pricing, and onboarding.
A public vertical page may use it only when that page is acting as a marketing
surface. It is not an alternate authenticated theme and must not leak into
operator lists, pipeline, map controls, chat, or settings.

### Parchment

Parchment `#E8E0CE`, ink `#26241F`, muted parchment `#CFC6B0`, and border
`#CBC1A9` are reserved for formal records such as permit-style evidence. Use
the treatment sparingly. It is not a warm page shell, a default card color, an
urgency signal, or a decorative theme.

## Typography and content hierarchy

Inter is the UI and display family. The system mono stack is restricted to
signal tokens, identifiers, and inline machine-like values. Numerals that need
column alignment use tabular figures.

| Role | Size | Line height | Typical weight |
| --- | --- | --- | --- |
| Display | `40px` | `1.08` | `700` |
| H1 | `22px` | `1.25` | `600` |
| H2 | `17px` | `1.35` | `600` |
| H3/card title | `15px` | `1.4` | `600` |
| Large body | `15px` | `1.55` | `400` or `500` |
| Body | `14px` | `1.5` | `400` or `500` |
| Small | `13px` | `1.45` | `400` or `500` |
| Caption | `12px` | `1.4` | `400` or `500` |
| Micro | `11px` | `1.3` | `500` or `600` |
| Eyebrow | `10.5px` | context-specific | `600` |

Hierarchy comes from weight, restrained size differences, tracking, and
placement. Headings use tight tracking; eyebrows are uppercase with `0.14em`
tracking. Product copy otherwise uses sentence case. Lifecycle labels are
single-word Title Case. Avoid weak hierarchies made from one size and one
weight, and avoid oversized headings that create dead space.

Voice is a sharp, honest scout reporting to an owner. Use plain business words,
evidence-first claims, compact ages, and verb-first actions. Do not claim
certainty, urgency, contactability, or delivery that the evidence does not
support. No emoji and no mascot appear in product UI.

## Spacing, density, and geometry

- Use the exported 4px spacing grid: `0`, `4`, `8`, `12`, `16`, `20`, `24`,
  `28`, `32`, `40`, `48`, and `64px`.
- Default card padding is `16px`; the larger option is `20px`.
- Desktop control heights are `28`, `32`, `36`, and `40px` according to the
  component role. Mobile interactive targets have a `44px` minimum.
- Chip heights are `22` and `26px`.
- Radii are `4`, `6`, `8`, `10`, `12`, and `16px`, plus `999px` for a true
  pill. Controls normally use `8px`; cards use `12px`.
- Content is capped at `840px`, reading content at `680px`, the exported
  sidebar at `224px`, and top-bar height at `48px`.
- Compact density must not sacrifice touch targets, readable labels, or clear
  grouping.

## Borders and elevation

Dark surfaces prefer translucent inset hairlines over visible outlines. The
export provides white alpha steps from `0.04` through `0.14`, a default solid
border `#23252A`, a subtle border `#191A1D`, and a strong border `#34343A`.
Use the strong edge for emphasis, not as a universal box boundary.

Surfaces are flat at rest. Card lift is subtle and only for interactive cards.
Menus and dialogs may use the deeper exported shadows because they actually
float. The primary action may use the restrained indigo CTA shadow. Formal
parchment records may use the exported offset stamp shadow. Do not use elevation
to compensate for unclear hierarchy.

## Interaction states

- Indigo is the general interaction accent for the primary action, selection,
  focus, and—pending the link-color decision—links.
- Hover moves a surface or text treatment one quiet step upward.
- Press moves to the press token and may apply a slight scale reduction. The
  exported sources disagree on the exact scale; CP26B must not choose one until
  the PM decision is recorded.
- Selected rows use a translucent indigo treatment and a `2px` indigo left
  bar. Selection must remain legible without relying on color alone.
- Keyboard focus uses the exported indigo focus tokens and must be visible only
  when focus indication is appropriate (`:focus-visible` in web UI).
- Disabled controls remain identifiable, non-interactive, and unavailable to
  submission. Reduced opacity is supporting treatment, not the only cue.
- Loading preserves the control label or accessible name, blocks duplicate
  activation, and exposes busy state. The export contains two loader patterns;
  pattern selection is a PM decision.
- Errors use the red semantic channel plus plain, associated error text.
- Missing-evidence and fallback states use muted or dashed treatment plus an
  explicit label or explanation. They never look like a loading failure.

The combined focus-plus-selection treatment is unresolved. Focus must remain
perceivable and selection must remain stable, but CP26B must not invent the
layering or emphasis before the PM decision in the semantic contract.

## Motion

The exported durations are `120ms`, `180ms`, and `260ms`, using quick decelerate
curves. Motion is limited to color, opacity, small transforms, and floating
surface transitions. No springs, bounces, large entrances, or decorative
motion.

Reduced-motion preferences must remove non-essential translation, scaling,
pulsing, and repeated loading motion while preserving state changes and task
feedback. This is an implementation accessibility requirement; it does not add
a new token value.

## Responsive interaction

Desktop prioritizes scanning, keyboard navigation, compact rows, aligned
metadata, and predictable focus movement. Hover may reveal secondary actions,
but no required action or meaning may exist only on hover.

Mobile uses the same product hierarchy and semantic channels, not a separate
visual system. Controls must meet the exported touch minimum, secondary actions
must be reachable without hover, text and evidence may reflow without horizontal
scroll, and selection/focus/disabled/error states must remain distinguishable.
Do not turn the mobile view into oversized stacked cards.

## Accessibility contract

- Use native interactive elements whenever possible and preserve their keyboard
  and assistive-technology behavior.
- Every icon-only control has a meaningful accessible name.
- Labels, descriptions, errors, and busy states are programmatically associated
  with their controls.
- Focus-visible treatment is never removed and is tested in every theme and
  component state.
- Color never carries lifecycle, verification, urgency, selection, success,
  destructive intent, or error by itself. Pair it with text, shape, icon,
  position, or dated evidence as appropriate.
- Text, icons, boundaries, and focus indicators must meet WCAG AA contrast in
  their actual combinations. Token presence is not proof of contrast; CP26B
  must test combinations before production adoption.
- Respect reduced motion, zoom, text reflow, and mobile touch requirements.

## Implementation boundary

The supplied component JSX, declarations, specimens, and screenshots are design
evidence. They are not production-ready APIs and must not be copied blindly.
CP26B may implement only the approved token and primitive slice after all
blocking PM decisions are resolved. It must preserve product taxonomy, use the
existing icon library and authentic brand assets, add automated accessibility
and state tests, and prove production migration separately.

This CP26A document does not authorize a visual gallery, app-shell redesign,
route, component, stylesheet, package, authentication, database, provider,
billing, or runtime change.
