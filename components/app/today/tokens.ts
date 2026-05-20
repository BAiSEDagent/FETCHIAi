// Surface tokens for the Today's Run morning-ritual deck.
// Centralized so card, deck, and ghost layers share exact values.

export const CARD_RADIUS = 'rounded-[22px]'
export const CARD_SURFACE = 'bg-[#FBF8EF]'

// Stacked elevation per Claude Design 09 spec: a deep "lifted card" shadow
// plus a tight ambient shadow plus a 1px hairline ring.
export const CARD_SHADOW =
  'shadow-[0_24px_48px_-18px_rgba(45,43,42,0.28),0_8px_16px_-12px_rgba(45,43,42,0.18),0_0_0_1px_rgba(45,43,42,0.04)]'

// Ghost layers behind the front card.
export const GHOST_1_TRANSFORM = 'translate-y-[9px] scale-[0.97]'
export const GHOST_2_TRANSFORM = 'translate-y-[18px] scale-[0.94]'

// Deck viewport is a fixed-height clipped frame. The active card fills it
// absolutely; ghost layers are decorative-only and clipped at the edges.
// Mobile uses svh so it adapts when the browser chrome resizes; capped so
// it never grows past one comfortable "morning ritual" card size.
export const DECK_VIEWPORT_FRAME =
  'relative overflow-hidden rounded-[22px] h-[min(540px,calc(100svh-390px))] min-h-[460px] lg:h-[600px] lg:min-h-[560px]'

// Button heights from spec.
export const ACTION_BUTTON_HEIGHT = 'h-[60px]'

// Primary "Add" button — brand green with elevated lift.
export const PRIMARY_BUTTON_SURFACE =
  'bg-brand-green text-white shadow-[0_10px_22px_-12px_rgba(88,147,126,0.65),0_2px_4px_rgba(45,43,42,0.08),inset_0_1px_0_rgba(255,255,255,0.18)] hover:bg-brand-dark'

// Secondary buttons — soft cream with inset border.
export const SECONDARY_BUTTON_SURFACE =
  'bg-white text-brand-near-black/80 shadow-[inset_0_0_0_1px_rgba(45,43,42,0.10),0_1px_2px_rgba(45,43,42,0.04)] hover:text-brand-near-black hover:shadow-[inset_0_0_0_1px_rgba(45,43,42,0.20),0_1px_2px_rgba(45,43,42,0.04)]'
