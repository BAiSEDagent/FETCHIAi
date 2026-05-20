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
const EXIT_TILT = 14

function usePrefersReducedMotion(): boolean {
  const [reduce, setReduce] = React.useState(false)
  React.useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    const update = () => setReduce(mq.matches)
    update()
    mq.addEventListener?.('change', update)
    return () => mq.removeEventListener?.('change', update)
  }, [])
  return reduce
}

export function TodayRunDeck({
  remaining,
  dragX,
  exitDirection,
  flipped,
  front,
  back,
}: Props) {
  const reduceMotion = usePrefersReducedMotion()

  const tilt = reduceMotion ? 0 : dragX / 28
  let translateX = reduceMotion ? 0 : dragX
  let rotate = tilt
  let opacity = 1
  let transition = reduceMotion
    ? 'opacity 120ms ease'
    : 'transform 220ms cubic-bezier(0.2,0.8,0.2,1), opacity 220ms ease'

  if (exitDirection) {
    if (reduceMotion) {
      translateX = 0
      rotate = 0
      opacity = 0
      transition = 'opacity 160ms ease'
    } else {
      translateX = exitDirection === 'right' ? EXIT_DISTANCE : -EXIT_DISTANCE
      rotate = exitDirection === 'right' ? EXIT_TILT : -EXIT_TILT
      opacity = 0
      transition =
        'transform 320ms cubic-bezier(0.4,0,0.6,1), opacity 320ms ease'
    }
  } else if (dragX !== 0 && !reduceMotion) {
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
            'opacity-90',
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
            transition: reduceMotion
              ? 'none'
              : 'transform 460ms cubic-bezier(0.2,0.8,0.2,1)',
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

        {/* Stamp overlay on programmatic exit */}
        {exitDirection && (
          <Stamp direction={exitDirection} reduceMotion={reduceMotion} />
        )}
      </div>

      {/* Live swipe hint — only while actively dragging */}
      {Math.abs(dragX) > 24 && !exitDirection && !reduceMotion && (
        <SwipeHint
          direction={dragX > 0 ? 'right' : 'left'}
          intensity={Math.min(1, Math.abs(dragX) / 110)}
        />
      )}
    </div>
  )
}

function Stamp({
  direction,
  reduceMotion,
}: {
  direction: 'left' | 'right'
  reduceMotion: boolean
}) {
  const isAdd = direction === 'right'
  return (
    <div
      aria-hidden
      className={cn(
        'pointer-events-none absolute top-8 inline-flex items-center justify-center',
        'rounded-[14px] px-4 h-[44px] text-[16px] font-extrabold uppercase tracking-[0.15em]',
        'shadow-[0_4px_12px_-2px_rgba(45,43,42,0.25)]',
        isAdd
          ? 'right-6 bg-brand-green text-white border-2 border-white/40 -rotate-[10deg]'
          : 'left-6 bg-brand-near-black text-white border-2 border-white/30 rotate-[10deg]',
      )}
      style={{
        animation: reduceMotion
          ? undefined
          : 'todays-run-stamp 320ms cubic-bezier(0.2,0.8,0.2,1) both',
      }}
    >
      {isAdd ? 'Added' : 'Passed'}
      <style>{`
        @keyframes todays-run-stamp {
          0% { opacity: 0; transform: scale(0.4) rotate(${isAdd ? '-20deg' : '20deg'}); }
          60% { opacity: 1; transform: scale(1.1) rotate(${isAdd ? '-8deg' : '8deg'}); }
          100% { opacity: 1; transform: scale(1) rotate(${isAdd ? '-10deg' : '10deg'}); }
        }
      `}</style>
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
        'pointer-events-none absolute top-6 inline-flex items-center rounded-full px-3 h-[28px]',
        'text-[12px] font-bold uppercase tracking-[0.1em]',
        direction === 'right'
          ? 'right-6 bg-brand-green text-white -rotate-[8deg]'
          : 'left-6 bg-brand-near-black text-white rotate-[8deg]',
      )}
      style={{ opacity: intensity }}
    >
      {label}
    </div>
  )
}
