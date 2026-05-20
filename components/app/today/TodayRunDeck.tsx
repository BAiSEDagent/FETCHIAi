'use client'

import * as React from 'react'
import { cn } from '@/lib/utils'
import {
  CARD_RADIUS,
  CARD_SHADOW,
  CARD_SURFACE,
  GHOST_1_TRANSFORM,
  GHOST_2_TRANSFORM,
} from './tokens'

type Props = {
  /** Number of cards still in the queue, including the current one. */
  remaining: number
  /** Live drag offset on the front card, in px. Positive = right (Add). */
  dragX: number
  /** Programmatic exit animation direction; null while resting. */
  exitDirection: 'left' | 'right' | null
  flipped: boolean
  front: React.ReactNode
  back: React.ReactNode
}

const EXIT_DISTANCE = 480
const EXIT_TILT = 18

export function TodayRunDeck({
  remaining,
  dragX,
  exitDirection,
  flipped,
  front,
  back,
}: Props) {
  const tilt = dragX / 24 // subtle rotation while dragging
  let translateX = dragX
  let rotate = tilt
  let opacity = 1
  let transition = 'transform 220ms cubic-bezier(0.2,0.8,0.2,1), opacity 220ms ease'

  if (exitDirection) {
    translateX = exitDirection === 'right' ? EXIT_DISTANCE : -EXIT_DISTANCE
    rotate = exitDirection === 'right' ? EXIT_TILT : -EXIT_TILT
    opacity = 0
    transition = 'transform 280ms cubic-bezier(0.4,0.0,0.6,1), opacity 280ms ease'
  } else if (dragX !== 0) {
    transition = 'none'
  }

  return (
    <div className="relative">
      {/* Ghost layers — only shown if there are cards behind the front one. */}
      {remaining >= 3 && (
        <div
          aria-hidden
          className={cn(
            'absolute inset-0 mx-auto',
            CARD_SURFACE,
            CARD_RADIUS,
            CARD_SHADOW,
            GHOST_2_TRANSFORM,
            'opacity-70',
          )}
        />
      )}
      {remaining >= 2 && (
        <div
          aria-hidden
          className={cn(
            'absolute inset-0 mx-auto',
            CARD_SURFACE,
            CARD_RADIUS,
            CARD_SHADOW,
            GHOST_1_TRANSFORM,
            'opacity-85',
          )}
        />
      )}

      {/* Front card with flip + drag transform */}
      <div
        className="relative"
        style={{
          transform: `translate3d(${translateX}px, 0, 0) rotate(${rotate}deg)`,
          transition,
          opacity,
          perspective: '1200px',
        }}
      >
        <div
          className="relative"
          style={{
            transformStyle: 'preserve-3d',
            transition: 'transform 420ms cubic-bezier(0.2,0.8,0.2,1)',
            transform: flipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
          }}
        >
          <div
            style={{
              backfaceVisibility: 'hidden',
              WebkitBackfaceVisibility: 'hidden',
            }}
          >
            {front}
          </div>
          <div
            className="absolute inset-0"
            style={{
              backfaceVisibility: 'hidden',
              WebkitBackfaceVisibility: 'hidden',
              transform: 'rotateY(180deg)',
            }}
          >
            {back}
          </div>
        </div>
      </div>

      {/* Swipe affordance hints — only visible while dragging meaningfully */}
      {Math.abs(dragX) > 24 && !exitDirection && (
        <SwipeHint direction={dragX > 0 ? 'right' : 'left'} intensity={Math.min(1, Math.abs(dragX) / 120)} />
      )}
    </div>
  )
}

function SwipeHint({
  direction,
  intensity,
}: {
  direction: 'left' | 'right'
  intensity: number
}) {
  const label = direction === 'right' ? 'Add' : 'Pass'
  return (
    <div
      aria-hidden
      className={cn(
        'pointer-events-none absolute top-6 inline-flex items-center rounded-full px-3 h-[28px] text-[12px] font-bold uppercase tracking-[0.1em] -rotate-[8deg]',
        direction === 'right'
          ? 'right-6 bg-brand-green text-white'
          : 'left-6 bg-brand-near-black text-white',
      )}
      style={{ opacity: intensity }}
    >
      {label}
    </div>
  )
}
