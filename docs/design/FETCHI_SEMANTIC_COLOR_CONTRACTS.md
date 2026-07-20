# Fetchi Semantic Color Contracts

Status: Canonical CP26A semantic documentation. Exact values come from the
supplied Claude token package. Where source artifacts conflict, the row is
blocked as **PM decision required** rather than normalized by guesswork.

See [the exact token file](fetchi-design-tokens.json),
[the component contracts](FETCHI_COMPONENT_CONTRACTS.md), and
[source provenance](FETCHI_REFERENCE_PROVENANCE.md).

## Non-conflation rule

The following channels are independent:

```txt
lifecycle != signal strength != evidence verification != freshness
!= vertical fit != score != contact confidence != destructive state
!= selection or focus
```

No color, badge, glyph, label, or card surface may stand in for more than one
channel at once. Color is always paired with a channel-specific carrier and a
non-color cue.

## Channel ownership

| Channel | Exported color | Allowed carrier | Required non-color cue | Forbidden use |
| --- | --- | --- | --- | --- |
| General interaction | Indigo `#5E6AD2` | Primary action, selected-row treatment, focus tokens, pending link decision | Button label, selected bar/structure, focus geometry | Lifecycle, score, freshness, fit, contact confidence |
| Brand mark | Coral `#F45B3B` | Authentic Fetchi mark | Mark silhouette and brand placement | Generic UI accent, status, score, category |
| Evidence/info | Blue `#4C8DF6` | Evidence badge, source link or signal glyph pending link decision | Evidence/source label or fixed glyph | Contacted lifecycle glyph, score |
| Fresh/go/success | Green `#3FB77E` | Fresh-evidence badge, success feedback, pending active-nav decision | “Fresh evidence”/success label, timestamp, or navigation structure | Won lifecycle glyph, score |
| Aging/warning | Amber `#E0A64B` | Aging badge, warning, expiring evidence | Age, expiry, or dated artifact | Saved lifecycle glyph, generic priority |
| Destructive/error | Red `#EB5C57` | Danger action, error boundary/input message | Destructive verb or associated error text | Lost lifecycle glyph, generic negative score |
| Saved lifecycle | `#E9B44C` | Lifecycle `StatusGlyph` and lifecycle filter only | Saved label plus exported ring/dot shape | Aging, warning, signal strength |
| Contacted lifecycle | `#4C8DF6` | Lifecycle `StatusGlyph` and lifecycle filter only | Contacted label plus filled-in ring shape | Evidence/info carrier |
| Won lifecycle | `#3FB77E` | Lifecycle `StatusGlyph` and lifecycle filter only | Won label plus check shape | Freshness or generic success carrier |
| Lost lifecycle | `#EB5C57` | Lifecycle `StatusGlyph` and lifecycle filter only | Lost label plus x shape | Error or destructive-action carrier |
| Formal record | Parchment `#E8E0CE` | Permit-style/formal evidence record | Record type, source, and date | Shell, generic card, urgency, selection |
| Fallback/uncertainty | Neutral text and border tokens | Muted or dashed fallback label/row | Explicit fallback reason | Bright semantic success or urgency color |
| Score | No owned hue | Bare tabular integer under FIT/SCORE label | Reason/explanation and label | Color ramp, card surface, lifecycle hue |
| Vertical fit | No approved owned hue | Label text; exported `LabelPill` is only structural evidence | Approved playbook/taxonomy label | Lifecycle, evidence, freshness, or score color |
| Contact confidence | No exported token or primitive | Not yet defined | Explicit label and reason | Reuse of evidence, lifecycle, freshness, or selection color |

## Binding evidence and urgency rules

- An opportunity requires a signal.
- A prospect requires evidence.
- A score requires a reason.
- An explanation requires an action.
- Urgency requires a dated artifact and a real action window.
- A high score, lifecycle state, vertical, generic signal, or recent-looking
  card does not create urgency.
- Missing evidence, weak fit, review-needed, exploratory, and discarded states
  remain muted or dashed and state the limitation.

The existing Fetchi taxonomy allows coral only for urgent actions supported by
fresh, dated evidence. Claude v5 says coral appears only in the brand mark and
never in UI. Until the PM resolves that conflict, CP26B must not add a coral
action or urgency surface. This preserves the intersection of both rules
without declaring either source silently obsolete.

## Collision analysis

### Indigo interaction versus coral brand/action

The v5 PDF, token CSS, manifest, README, and v5 brand sheet agree that indigo is
the interaction accent and coral is the brand-mark color. Existing Fetchi law
also permits coral for qualifying urgent actions. The package does not define
how a coral urgent action would coexist with an indigo primary action.

**PM decision required:** choose whether coral remains brand-only or whether a
strictly gated urgent-action primitive survives. If it survives, the PM must
define its carrier, evidence gate, coexistence with the one-primary-per-view
rule, and test fixtures. No score-to-coral rule is permitted.

### Blue evidence versus Contacted lifecycle

Both use `#4C8DF6`. The export separates them by carrier: evidence uses a badge,
source link, or fixed signal glyph; Contacted uses the lifecycle ring glyph and
the word “Contacted.” Do not render an unlabeled blue dot and expect the user to
infer the channel.

The package also assigns links to both indigo and blue in different prose.

**PM decision required:** choose one link-color rule or define evidence-source
links as a named exception. Until then, CP26B must not normalize link color.

### Green fresh evidence versus success versus Won lifecycle

All three use `#3FB77E`. Freshness requires a freshness label and a timestamp;
success requires a success message or completion icon; Won requires the
lifecycle glyph and the word “Won.” They may not share an unlabeled dot, pill,
or surface treatment.

The export also assigns active navigation to green while assigning active and
selected interaction to indigo.

**PM decision required:** choose the active-navigation channel. Until then,
navigation color is blocked from CP26B.

### Amber Saved lifecycle versus aging and time-sensitive evidence

Saved uses `#E9B44C`; aging and warning use `#E0A64B`. Their proximity makes
shape and text mandatory. Saved stays inside the lifecycle glyph/filter grammar.
Aging uses an age or expiry. Time-sensitive evidence must include a dated
artifact; signal strength alone cannot earn the amber alert treatment.

The exported `SignalBars` allows an amber level `4` but does not encode the
dated-artifact guard.

**PM decision required:** define the data contract that permits level `4` before
that state is implemented.

### Destructive red versus Lost lifecycle

Both use `#EB5C57`. Destructive red belongs to a danger action or associated
error state with an explicit destructive/error label. Lost belongs to the
lifecycle glyph/filter grammar with the word “Lost” and the exported x shape.
Do not use a red row or red badge as an ambiguous shortcut for either.

The carrier distinction resolves the visual grammar. Product copy and semantic
markup remain mandatory.

### Focus versus selection

The package specifies selected rows as an indigo tint plus a `2px` left bar and
focus as an indigo ring on a background gap. It does not provide a combined
focused-and-selected specimen or a hierarchy for overlapping emphasis.

**PM decision required:** approve the combined-state layering and contrast.
Focus must remain visible to keyboard users without making selection disappear
or creating a double-selected appearance. CP26B must include a focused-selected
fixture before shipping the row primitive.

### Vertical fit and contact confidence

The export provides a generic label pill with an arbitrary dot color but no
approved vertical palette, and it provides no contact-confidence primitive.
Reusing semantic or lifecycle hues would violate the product laws.

**PM decision required:** define non-conflicting encodings. Until then, these
channels remain neutral, explicitly labeled, and excluded from color ownership.

## Semantic state requirements

- **Hover:** an interaction state, never evidence of freshness or selection.
- **Pressed:** an interaction state, never a destructive or urgency signal by
  color alone.
- **Selected:** stable row/view choice with structural treatment, not lifecycle.
- **Focus-visible:** keyboard location, not selection or active navigation.
- **Disabled:** unavailable interaction; do not imply missing evidence.
- **Loading:** work in progress; do not imply weak confidence or fallback.
- **Error:** failed or invalid action with associated message; not Lost.
- **Missing evidence:** a trust state with explicit reason; not disabled or
  loading.
- **Fallback:** intentional uncertainty with explicit taxonomy value; not a
  broken component.

## Required implementation proof

For every future primitive or screen, test the channel matrix in dark and any
authorized light context. Include keyboard focus, selected-plus-focus, disabled,
loading, error, missing-evidence, fallback, lifecycle, freshness, and
destructive fixtures. Verify that the meaning remains clear in monochrome and
without relying on color names.
