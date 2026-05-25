# Fetchi Design System

This is the canonical design source of truth for Fetchi.

Use this file before changing any customer-facing UI. Older design mockups, older HTML references, screenshots, and archived handoff docs are historical context only unless this file explicitly points to them.

## North star

> Calmer. One decision per step. Big tap targets. No SaaS clutter.

Fetchi should feel practical, trusted, mobile-native, and action-oriented for service business owners. It should never feel like a dense B2B dashboard unless the screen is explicitly an admin/operator surface.

## Theme boundary

Fetchi has two intentional visual modes:

### 1. Authenticated lead-review cockpit

Used for logged-in product surfaces where the user is reviewing opportunities, making decisions, and managing live leads.

Examples:

- My Leads
- Lead Detail
- Today / Run-style lead review
- Authenticated sidebar shell
- Map / signal-review surfaces when they are lead-work surfaces

Visual direction:

- Dark/operator cockpit foundation
- Strong contrast
- Calm but decisive cards
- Hot/high-value opportunities can use coral sparingly
- Evidence and source affordances can use blue sparingly
- Green means OK/saved/won/verified, not generic primary everywhere

### 2. Cream SMB/customer surface

Used where the product should feel welcoming, simple, and calm.

Examples:

- Landing
- Auth
- Onboarding
- Light settings contexts
- Empty states / first-use education
- Help/explanation surfaces

Visual direction:

- Warm parchment/cream surfaces
- Generous spacing
- One decision per step
- No pure white cards directly on parchment
- The ツ avatar keeps the stamp treatment; cards/buttons do not

## Color semantics

Do not choose colors by taste. Use them semantically.

| Semantic | Use |
| --- | --- |
| Near-black / dark slab | Authenticated cockpit background, primary text, high-contrast decisions |
| Cream / parchment | Public, onboarding, auth, calm settings, soft cards |
| Coral | Rare high-value/action/hot-signal accent. Also destructive/danger when needed. Do not use for generic body labels. |
| Green | Verified, saved, won, healthy, OK, selected success state. Do not make every chip/action green. |
| Blue | Evidence, source, audit, trust, link-to-proof affordances. |
| Amber/warn | Expiring, warning, caution. Use the project warn token, not stock Tailwind amber classes, when possible. |

## Component rules

- Prefer existing app primitives before creating new markup.
- Lead presentation should route through `components/app/LeadCard.tsx` unless a screen has a very specific reason not to.
- Section/card presentation should use `components/app/SectionCard.tsx` or a compatible primitive.
- The sidebar should remain quiet and utility-driven, not a marketing surface.
- The Appearance control belongs near account/sign-out, not as a primary nav item.
- Customer UI must support 375px mobile first.
- Minimum touch target is 44×44px.

## Typography

- Headings: Outfit, 600–700.
- Body: DM Sans, 400–600.
- Numbers/counters/scores: use `tabular-nums`.
- Avoid micro-label clutter unless the label is decision-critical.

## Layout principles

1. One primary action per step.
2. Evidence before explanation.
3. Explanation before action.
4. Action before decoration.
5. No dense tables on customer surfaces.
6. Admin can be denser, but admin is visually separate from the customer app.

## Avatar rule

The ツ avatar is the only element allowed to use the rotated stamp/shadow treatment.

Do not reuse stamp shadows on cards, buttons, panels, or badges.

## References and archives

- `DESIGN_SYSTEM_V2.md` is retained as a historical CP2/CP2.3 reference only.
- `docs/archive/` contains old prompt handoffs and historical design context.
- If a future mockup conflicts with this file, update this file first before asking agents to implement the mockup.

## Agent instruction

Agents should treat this file as the design contract. If a task references older assets, screenshots, or HTML files, use them only as supporting context and resolve conflicts in favor of this file unless the issue explicitly updates the canonical design system.
