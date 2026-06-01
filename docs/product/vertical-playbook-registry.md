# Fetchi Vertical Playbook Registry

Status: Product/spec source of truth. Do not treat this as implemented behavior until the classifier/playbook pipeline exists and passes fixture tests.

## Product Model

Fetchi is one horizontal signal-to-opportunity engine with vertical-specific interpretation.

Fetchi should not be cloned into separate niche apps. The same app, codebase, admin system, and opportunity engine should support multiple verticals by loading the correct vertical playbook.

## Launch Verticals

Fetchi launches with ten core-supported verticals:

1. Commercial Roofing
2. HVAC
3. Commercial Cleaning / Janitorial
4. Plumbing
5. Landscaping / Property Maintenance
6. Electrical Contractors
7. Restoration Services
8. Pest Control
9. Painting / Tenant Improvement
10. Dumpster Rental / Junk Removal

These are core-supported verticals, not beta placeholders.

`Other` may exist as a controlled/custom path, but it should not imply the same level of automation as the ten core-supported verticals.

## What Core-Supported Means

Each core-supported vertical must define, at minimum:

1. Approved signal types
2. Approved card labels
3. Vertical-fit / service labels
4. Score weighting rules
5. Disqualification rules
6. Evidence requirements
7. Outreach templates
8. Example seed/demo cards
9. Query templates
10. Weak-fit / needs-review fallback behavior

A vertical is not core-supported merely because it appears in onboarding. It is core-supported when the above playbook rules exist and are used by the opportunity pipeline.

## Vertical Playbook Registry

A vertical playbook should eventually define:

- `vertical_key`
- `vertical_name`
- signup/public status
- supported signal types
- approved card labels
- approved service-fit labels
- scoring weights
- disqualification rules
- evidence requirements
- query templates
- outreach templates
- example cards
- fallback states
- icon/glyph mappings
- playbook version
- active/inactive state

The exact storage form is not decided here. It may begin as versioned config, then move to database/admin-managed configuration later.

## Engine Flow

The intended engine flow is:

```txt
Signal -> Vertical Playbook -> Opportunity Classifier -> Scoring -> Labels -> Outreach
```

The same raw signal may become different opportunities depending on the vertical.

Example:

- Commercial renovation permit + Commercial Roofing -> `PERMIT · ROOF`
- Commercial renovation permit + Commercial Cleaning -> `BUILDOUT · CLEANING`
- Commercial renovation permit + Electrical Contractors -> `ELECTRICAL · BUILDOUT`
- Commercial renovation permit + Dumpster Rental / Junk Removal -> `RENOVATION · DUMPSTER`
- Commercial renovation permit + Painting / Tenant Improvement -> `TENANT IMPROVEMENT · PAINT`

## Label Control

AI may interpret, classify, explain, and draft outreach.

AI must not freestyle UI labels.

UI-visible labels must come from approved vertical playbooks/taxonomy.

If the classifier cannot map a raw signal to an approved label with enough confidence and evidence, it must use a fallback state rather than inventing a confident label.

## Onboarding Implication

Onboarding should present the ten launch verticals as supported choices:

- Commercial Roofing
- HVAC
- Commercial Cleaning
- Plumbing
- Landscaping / Property Maintenance
- Electrical
- Water / Fire / Mold Restoration
- Pest Control
- Painting / Tenant Improvement
- Dumpster / Junk Removal
- Other

For supported verticals, copy may be confident:

> Fetchi knows which public signals usually indicate demand for this service.

For `Other`, use a controlled custom path:

> Fetchi can still look for local buying signals, but this service type may require custom tuning before results are accurate.

## Adding a New Vertical Later

Adding vertical #11 should mean adding a new playbook/config set, not cloning the app or rewriting card components.

A new vertical should require:

- vertical metadata
- supported signal types
- approved labels
- vertical-fit labels
- evidence rules
- disqualification rules
- scoring rules
- query templates
- outreach templates
- examples / fixtures
- fallback behavior

## Guardrails

- Do not hardcode vertical logic into React components.
- Do not let AI freestyle UI labels.
- Do not derive card color from vertical type.
- Keep color/surface grammar separate from vertical taxonomy.
- Do not claim agent behavior is proven because a design board shows examples.
- Prove vertical behavior with fixtures/tests that feed structured signals through playbooks and verify approved outputs.

## Current Status

Spec only.

No schema change is approved by this file.
No implementation is approved by this file.
No new branch is implied by this file.
