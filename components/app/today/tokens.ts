// Surface tokens for the Today's Run morning-ritual deck.
// v2.3 dark operator surface — the deck lives inside the dark /app theme.

export const CARD_RADIUS = 'rounded-[22px]'
// Elevated dark card sitting on the dark page bg. Uses the raised token so it
// adapts if the dark scale is retuned — never a literal hex here.
export const CARD_SURFACE = 'bg-raised'

// Stacked elevation: deep lift shadow + tight ambient + hairline inset.
// Tuned for dark surfaces (heavier black) with a faint inner light hairline
// so the card edge reads against the page.
export const CARD_SHADOW =
  'shadow-[0_24px_48px_-18px_rgba(0,0,0,0.55),0_8px_16px_-12px_rgba(0,0,0,0.45),inset_0_0_0_1px_rgba(255,255,255,0.04)]'

// Ghost layers behind the front card.
export const GHOST_1_TRANSFORM = 'translate-y-[9px] scale-[0.97]'
export const GHOST_2_TRANSFORM = 'translate-y-[18px] scale-[0.94]'

// Deck viewport — fixed-height clipped frame.
export const DECK_VIEWPORT_FRAME =
  'relative overflow-hidden rounded-[22px] h-[min(540px,calc(100svh-390px))] min-h-[460px] lg:h-[600px] lg:min-h-[560px]'

// Button heights from spec.
export const ACTION_BUTTON_HEIGHT = 'h-[60px]'

// Primary "Add" button — coral (primary CTA discipline). One of the five
// coral surfaces in the system: hot ribbon, primary CTA, hot score, trial
// gate, marketing italic.
export const PRIMARY_BUTTON_SURFACE =
  'bg-coral text-white shadow-[0_10px_22px_-12px_rgba(244,91,59,0.65),0_2px_4px_rgba(0,0,0,0.25),inset_0_1px_0_rgba(255,255,255,0.18)] hover:bg-coralDeep'

// Secondary buttons — neutral elevated dark surface with subtle inner hairline.
export const SECONDARY_BUTTON_SURFACE =
  'bg-surface text-text/85 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.10),0_1px_2px_rgba(0,0,0,0.25)] hover:text-text hover:bg-raised hover:shadow-[inset_0_0_0_1px_rgba(255,255,255,0.18),0_1px_2px_rgba(0,0,0,0.25)]'
