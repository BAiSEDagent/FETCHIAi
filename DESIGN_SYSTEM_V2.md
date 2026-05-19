# Fetchi Design System v2

This is the working design system for the Fetchi customer app. Everything in the customer surfaces (landing, auth, onboarding, chat, leads, settings, customer shell) should match this doc. The admin console is out of scope.

The system is a deliberate blend of three influences:

- **Cash App** — mobile-first, bold, one decision per screen, big tappable targets, low friction, no clutter.
- **Claude.ai** — calm, warm, spacious, generous line-height, soft neutral surfaces, conversational.
- **Fetchi identity (preserved)** — ツ avatar, brand green, parchment background, Outfit headings, DM Sans body.

**Do not clone Cash App or Claude.** Take the feel, not the visuals.

---

## 1. Visual principles

1. **Calm by default.** Soft surfaces, no harsh borders, generous spacing, no decorative noise.
2. **One decision per screen on mobile.** A clear primary CTA, secondary action as text, everything else demoted.
3. **Evidence-first.** Lead cards lead with the business + signal + why-now. Score is secondary.
4. **Warm, never cold.** Off-white card surfaces over parchment background, never pure `#FFFFFF` on light layouts (white reads clinical against the parchment).
5. **The ツ avatar is the only "stamp."** Keep its rotation + offset shadow. Do not replicate that retro stamp treatment on cards, panels, or buttons.
6. **Mobile first, always.** Design at 375px wide first, then scale up. Tap targets ≥ 44×44.
7. **Borders are quiet.** Default border is `1px @ 8% opacity near-black`. Only use stronger borders for focus, selection, and destructive states.

---

## 2. Color rules

| Token | Hex | Tailwind | Use |
| --- | --- | --- | --- |
| Parchment | `#EBE6D9` | `bg-brand-parchment` | App background, auth pages, onboarding background |
| Cream | `#FAF8F2` | `bg-brand-cream` | Default card / panel surface on parchment |
| Cream muted | `#F2EEDF` | `bg-brand-cream-muted` | Input surfaces, chat assistant bubble, inset rows |
| Brand green | `#58937E` | `bg-brand-green` / `text-brand-green` | Primary actions, active accents, score, success |
| Brand dark | `#3D6B5A` | `bg-brand-dark` / `text-brand-dark` | Hover for primary, deep accent text |
| Brand light | `#EAF3EF` | `bg-brand-light` / `text-brand-dark` | Selected states, info chips, "why now" panel |
| Coral | `#D85A30` | `bg-brand-coral` / `text-brand-coral` | Destructive only — errors, dangerous actions |
| Near-black | `#2D2B2A` | `bg-brand-near-black` / `text-brand-near-black` | Primary text, sidebar background, primary CTA bg |

**Rules**

- Never put pure `#FFFFFF` on the parchment background. Use `bg-brand-cream` for cards.
- Coral is **only** for destructive/warning. Never decorative. Never a CTA.
- The 1px border default is `border-brand-near-black/8`. Selected/active is `border-brand-green/40`. Focus is `ring-2 ring-brand-green/40 ring-offset-2 ring-offset-brand-parchment`.
- Avoid arbitrary status palettes like `#3730A3`, `#854F0B`. Reuse brand-light / brand-near-black / brand-coral with opacity tweaks. The one exception: a soft amber `bg-amber-50 text-amber-900` for `responded`.

---

## 3. Type scale

Outfit for headings (600–700), DM Sans for body (400–600).

| Name | Size / leading | Weight | Use |
| --- | --- | --- | --- |
| `text-display` | `36px / 1.1` | Outfit 700 | Landing hero |
| `text-h1` | `28px / 1.15` | Outfit 600 | Page titles |
| `text-h2` | `22px / 1.2` | Outfit 600 | Section titles |
| `text-h3` | `17px / 1.3` | Outfit 600 | Card titles |
| `text-body-lg` | `15px / 1.6` | DM Sans 400 | Default body on auth + onboarding (more breathing room) |
| `text-body` | `14px / 1.55` | DM Sans 400 | Default body in dense surfaces |
| `text-caption` | `12.5px / 1.5` | DM Sans 500 | Secondary metadata |
| `text-micro` | `11px / 1.3 uppercase tracking-[1px]` | DM Sans 700 | Eyebrows, labels |

Chat messages use `text-[14.5px] leading-[1.65]` for assistant content and `text-[14px] leading-[1.55]` for user content. Numbers (scores, counters) use `tabular-nums`.

---

## 4. Spacing & radius

**Spacing rhythm** — `4 / 6 / 8 / 12 / 16 / 20 / 24 / 32 / 48`. Do not invent values in between unless absolutely required.

**Radius scale**

| Token | Tailwind | Use |
| --- | --- | --- |
| 8px | `rounded-lg` | Inputs, small chips |
| 12px | `rounded-xl` | Buttons, badges, secondary cards |
| 16px | `rounded-2xl` | Default card surface |
| 20px | `rounded-[20px]` | Hero / auth shell cards |
| Pill | `rounded-full` | Chips, score badges, composer input, icon buttons |

The shadcn CSS `--radius` is kept at `0.75rem` so primitive `Card` / `Button` defaults match `rounded-xl`. Customer surfaces should reach for `rounded-2xl` directly on raw `div`s when they want the larger card shape.

---

## 5. Shadows

| Token | CSS | Use |
| --- | --- | --- |
| `shadow-fetchi-soft` | `0 1px 2px rgba(45,43,42,0.04), 0 6px 18px -10px rgba(45,43,42,0.10)` | Default card elevation on parchment |
| `shadow-fetchi-card` | `0 2px 4px rgba(45,43,42,0.04), 0 12px 30px -12px rgba(45,43,42,0.16)` | Hero / auth shell |
| `shadow-fetchi-sticky` | `0 -6px 24px -8px rgba(45,43,42,0.10)` | Chat composer, mobile sticky bars |
| `shadow-fetchi-stamp` | `5px 5px 0 #2D2B2A` | **Reserved for the ツ avatar only.** Do not reuse on cards. |

---

## 6. Buttons

Public API of `<Button>` is unchanged — same `variant` and `size` props. Restyled additively:

| Variant | Bg → hover | Text | Border |
| --- | --- | --- | --- |
| `default` (primary) | `bg-brand-near-black → bg-brand-green` | white | none |
| `secondary` | `bg-brand-cream → bg-white` | near-black | `border-brand-near-black/10` |
| `outline` | `transparent → bg-brand-cream` | near-black | `border-brand-near-black/15` |
| `ghost` | `transparent → bg-brand-near-black/5` | near-black | none |
| `destructive` | `bg-brand-coral → bg-brand-coral/90` | white | none |
| `link` | inline | brand-green | underline on hover |

Sizes: `default h-11 px-5`, `sm h-10 px-4`, `lg h-12 px-7 text-[15px]`, `icon h-11 w-11`. All sizes meet the 44px touch target on mobile.

CTA recipe on mobile: full-width primary `Button size="lg"` pinned to the bottom of the screen above the safe-area inset. Secondary action is a centered ghost text link beneath it.

---

## 7. Cards & surfaces

**Default card recipe**

```tsx
<div className="rounded-2xl bg-brand-cream shadow-fetchi-soft p-5 lg:p-6">
  …
</div>
```

- No border by default. Shadow + warm cream surface separates it from parchment.
- Inset rows get `bg-brand-cream-muted rounded-xl` instead of a hairline divider.
- When stacking cards in a list, gap is `gap-3` on mobile, `gap-4` on lg.
- Use `<Card>` (shadcn) anywhere a generic card is wanted — its defaults map to this recipe via CSS variables. Reach for raw `div` only when you want the 20px radius or a special inner layout.

**Section card** — `components/app/SectionCard.tsx`. The reusable canonical card. Accepts `eyebrow`, `title`, `description`, `actions`, `children`.

**Settings group** — `components/app/SettingsGroup.tsx`. A `SectionCard` variant with built-in vertical rhythm for label/input stacks.

---

## 8. Chat & messages

- Composer **floats** above the mobile bottom nav: `sticky bottom-0` with `pb-[max(env(safe-area-inset-bottom),12px)]`. Background `bg-brand-cream` with `shadow-fetchi-sticky`, not a top border.
- The input is a pill: `rounded-full bg-white border border-brand-near-black/10 focus-within:border-brand-green`.
- Send button is `bg-brand-near-black text-white rounded-full h-11 w-11`, switches to `bg-brand-green` when the input has content.
- Voice button is a ghost circle next to it — disabled visually but consistent in size.
- Assistant bubble: `bg-brand-cream-muted rounded-2xl rounded-tl-md px-4 py-3 text-[14.5px] leading-[1.65] text-brand-near-black`. **No border** — let the muted cream do the work.
- User bubble: `bg-brand-near-black text-white rounded-2xl rounded-tr-md px-4 py-2.5 text-[14px] leading-[1.55]`.
- Max bubble width: `max-w-[82%]` mobile, `max-w-[68%]` lg.
- Embedded lead cards in chat render via `<LeadCard variant="chat">`.

---

## 9. Lead cards

`components/app/LeadCard.tsx` is the single source for lead presentation. Variants:

- `list` — used in `/app/leads`. Full-width row with icon, business + signal, why-now snippet, status pill (sm+), score chip.
- `chat` — used in chat. Compact row, just business + signal + score. Tap → opens lead.

All variants:

- Surface: `bg-brand-cream rounded-2xl shadow-fetchi-soft`.
- Score chip: `rounded-full px-3 py-1 text-[12px] font-bold tabular-nums`, color tier by score (≥85 green-on-brand-light, ≥70 amber-on-amber-50, otherwise neutral).
- Signal label: green dot + caption text.
- Why-now: 2-line clamp, `text-[13px] text-brand-near-black/70 leading-relaxed`.

---

## 10. Onboarding

- Background is `bg-brand-parchment`. Card uses the `SectionCard` shell — `rounded-[20px] bg-brand-cream shadow-fetchi-card`. **No more `border-2 + shadow-[4px_4px_0]` stamp on the onboarding card.** That treatment is reserved for the ツ avatar.
- One question per step. Title `text-h1`, supporting copy `text-body-lg text-brand-near-black/65`.
- Step indicator: 4 dots, active filled green, completed outlined green with check, future neutral. Connector lines between them.
- Primary CTA spans the full card width, `size="lg"`. Back link is a centered ghost beneath it.
- Selection cards use `border border-brand-near-black/10` default → `border-brand-green bg-brand-light` selected. No `border-2`.

---

## 11. Mobile bottom nav

- 5 items × 64px tall.
- Inactive: `text-brand-near-black/55`, icon stroke `1.8`. Active: `text-brand-near-black`, icon stroke `2.2`, with a `4px` green pill above the icon.
- Background `bg-brand-cream` so it shares the cream surface family on mobile.
- Sticky shadow on top via `shadow-fetchi-sticky` instead of a 1px border.
- `pb-[env(safe-area-inset-bottom)]` retained.

---

## 12. Empty / loading / error states

Three reusable components in `components/app/`:

- `<EmptyState icon title body action?>` — centered, large icon glyph, h2 title, body subtitle, optional primary button.
- `<LoadingState label?>` — 3-dot green bouncing loader.
- `<ErrorState title body retry?>` — coral-tinted card surface, title in near-black, body in dark, optional retry button.

Every customer route renders one of these for its empty/loading/error path.

---

## 13. Auth surfaces

- `/`, `/sign-in`, `/sign-up`, `/verify-email`, `/blocked` all share one shell: parchment background, ツ avatar + wordmark lockup, card uses `rounded-[20px] bg-brand-cream shadow-fetchi-card`.
- Clerk components are themed via `appearance.elements` overrides in `app/layout.tsx`: `formButtonPrimary` becomes the Fetchi primary; `card`, `socialButtonsBlockButton`, `formFieldInput`, `formFieldLabel`, and `footerActionLink` all get Fetchi tokens.

---

## What to avoid

- **No `border-2 + shadow-[4px_4px_0_#2D2B2A]` stamp on anything except the ツ avatar.**
- **No `border-2` on inputs or buttons.** Use 1px borders + green focus.
- **No pure white surfaces over the parchment.** Always cream.
- **No `<44px` tap targets.**
- **No desktop-first layouts.**
- **No raw error strings.** Use `<ErrorState>` or `errorMessage()`.
- **No indigo `#3730A3` / amber `#854F0B`–style status palettes from CP2.**
- **No animation libraries.** Tailwind transitions only.
- **No new dependencies.**

---

## Token note: HSL with alpha

`--border` and `--input` are defined as `H S% L% / A` (e.g. `30 4% 17% / 0.08`) so that `hsl(var(--border))` resolves to a translucent color. **Do not** compose an additional alpha modifier on top of these (e.g. `hsl(var(--border) / 0.5)` will produce invalid CSS in older parsers). If you need a different opacity, reach for a literal class like `border-brand-near-black/15`, not a slash modifier on the CSS var.

---

## Implementation conventions

- When updating `components/ui/*` primitives, preserve every existing prop, variant name, and import path. Improvements are additive.
- Prefer the new `SectionCard`, `SettingsGroup`, `LeadCard`, `ChatBubble`, `EmptyState`, `LoadingState`, `ErrorState`, `MobileScreenHeader` over hand-rolled markup in routes.
- Server actions, validation, and data-loading code are not touched in CP2.2 — only their containers and field styling change.
- Every route still respects the `workspace_id` scoping rules and the existing onboarding-gate redirect.
