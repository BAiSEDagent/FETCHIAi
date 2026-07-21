# Lead Card Taxonomy and Fallback States

Status: Design/product source of truth. This file defines the intended card contract. It does not prove the agent/classifier is implemented.

## Purpose

Lead cards must make clear what Fetchi knows, why the signal matters, and how confident the system is.

The card system must support ten core verticals without creating separate card designs per vertical.

## Core Distinction

Status, signal, vertical-fit, freshness, score, and surface color are separate concerns.

Do not collapse them into one visual rule.

```txt
Status != Signal != Vertical-fit != Freshness != Score != Surface color
```

## Four Label Layers

Every opportunity card may use up to four label layers:

1. Status / lifecycle label
   - Examples: `New`, `Saved`, `Contacted`, `Responded`, `Won`, `Lost`

2. Signal label
   - What fired.
   - Examples: `Permit`, `New Biz`, `Review`, `Weather`, `Hiring`, `Complaint`, `Renovation`

3. Vertical-fit / service label
   - What the signal means for this user.
   - Examples: `Roof`, `Equip Replace`, `New Office`, `Restaurant`, `HOA`, `Panel Upgrade`, `Water Damage`, `Pest Review`, `Tenant Improvement`, `Dumpster Need`

4. Freshness / urgency label
   - Time or urgency context.
   - Examples: `Today`, `6h`, `3D`, `11D`, `3W`, `Expiring`

## Surface Contract

Surface color is not a score color, vertical color, or generic signal color.

Surface should be driven by `opportunity_surface`, not by score alone.

Recommended surface meanings:

- `urgent_action` -> dark raised with an explicit dated-evidence label and action
- `default` / `pipeline` / `history` / `preview` -> dark raised
- `formal_record` / active permit-style record -> parchment
- `fallback` / uncertain -> muted/dashed/dimmed treatment

## Color-Neutral Urgency Rule

Coral has no product-semantic role. Urgency, actions, signals, scores,
lifecycle, vertical identity, and state must not use coral.

Correct rule:

```txt
card surface = opportunity_surface
score = service-fit strength
sensitivity floor = surfacing eligibility
urgency = dated evidence + explicit label + clear action
```

A high-score card remains dark unless another approved surface contract applies.

## urgent_action Evidence Rule

`urgent_action` requires dated action-window evidence, an explicit urgency
label, and a clear action. It does not own a surface color.

Dated action-window evidence means the signal carries a specific, verifiable date or time window that creates a real deadline for the contractor — permit expiry date, job posting close date, storm event timestamp, review-response window, or similar.

A high score without dated action-window evidence does not create
`urgent_action`. Score does not create urgency. Evidence does.

## Score Rule

Score expresses service-fit strength, not color.

Score should help with ranking, review priority, and sensitivity thresholds. It should not determine card surface by itself.

## Fallback States

Fallback states are trust states. They prevent Fetchi from pretending to know something it does not know.

Approved fallback states:

1. `needs_review`
   - The signal may be relevant, but Fetchi needs stronger evidence before ranking it as a high-fit opportunity.

2. `weak_fit`
   - The signal is real, but the service fit is below the workspace sensitivity or playbook confidence floor.

3. `missing_evidence`
   - The label may be allowed, but required evidence is absent or not confirmed.

4. `exploratory`
   - Usually for `Other` or newly added verticals. Fetchi is still learning the market/playbook.

5. `discarded`
   - The signal is not a fit or violates a disqualification rule. It may appear in admin/audit contexts, but should not be presented as a ranked opportunity.

Fallback cards must look intentional and honest. They must not look broken.

## Label Source Rule

UI labels must render from approved playbook/taxonomy outputs.

The card should render only structured fields such as:

- `status`
- `signal_label`
- `vertical_fit_label`
- `freshness_label`
- `score`
- `opportunity_surface`
- `confidence`
- `fallback_state`
- `evidence_summary`

If confidence is low or required evidence is missing, the card must drop to a fallback state.

It must not invent labels or show a confident score it did not earn.

## Design Board Status

The vertical-fit card board is a visual target and design artifact.

It does not prove the agent, classifier, playbook registry, or scoring logic works.

Actual proof requires fixtures/tests that feed structured signals through vertical playbooks and verify outputs.

## Required Proof Later

Before claiming Fetchi supports a vertical in production, there should be fixtures or tests showing:

- the raw signal input
- the workspace vertical/service profile
- the applied playbook
- approved signal label output
- approved vertical-fit label output
- score/confidence output
- fallback behavior when evidence is weak
- no freestyle labels

## Example Translation

Same raw signal: commercial renovation permit.

Expected vertical-aware outputs:

- Commercial Roofing -> `PERMIT · ROOF`
- Commercial Cleaning -> `BUILDOUT · CLEANING`
- Electrical Contractors -> `ELECTRICAL · BUILDOUT`
- Dumpster Rental / Junk Removal -> `RENOVATION · DUMPSTER`
- Painting / Tenant Improvement -> `TENANT IMPROVEMENT · PAINT`

## Related Docs

- `docs/product/vertical-playbook-registry.md`

## Current Status

Spec only.

No component refactor is approved by this file.
No schema change is approved by this file.
No route change is approved by this file.
