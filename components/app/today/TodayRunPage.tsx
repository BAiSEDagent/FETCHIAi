'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'
import { updateLeadOutcome, type TodaysRunPassReason } from '@/app/app/leads/[id]/actions'
import { RunProgress } from './RunProgress'
import { RunActionBar } from './RunActionBar'
import { TodayRunCard } from './TodayRunCard'
import { TodayRunDeck } from './TodayRunDeck'
import { EvidenceCardBack } from './EvidenceCardBack'
import { PassReasonPanel } from './PassReasonPanel'
import { AfterAddConfirmation } from './AfterAddConfirmation'
import { RunCompletion } from './RunCompletion'
import type { TodayRunCardData } from './types'

type Props = {
  queue: TodayRunCardData[]
  isDemo?: boolean
}

type Phase =
  | { kind: 'card' }
  | { kind: 'pass-reason' }
  | {
      kind: 'after-add'
      // Snapshot of prior values for undo. Null when capture wasn't possible.
      snapshot: { status: 'new' | 'saved'; outcomeNotes: string | null } | null
      cardId: string
    }
  | { kind: 'completion' }

const SWIPE_COMMIT_PX = 80

export function TodayRunPage({ queue, isDemo = false }: Props) {
  const router = useRouter()
  const [index, setIndex] = React.useState(0)
  const [phase, setPhase] = React.useState<Phase>({ kind: 'card' })
  const [flipped, setFlipped] = React.useState(false)
  const [dragX, setDragX] = React.useState(0)
  const [exitDirection, setExitDirection] = React.useState<'left' | 'right' | null>(null)
  const [savedCount, setSavedCount] = React.useState(0)
  const [skippedCount, setSkippedCount] = React.useState(0)
  const [pending, startTransition] = React.useTransition()
  const startedAtRef = React.useRef<number>(Date.now())

  const total = queue.length
  const current = queue[index] ?? null
  const completed = !current || phase.kind === 'completion'

  // Track per-pointer drag state.
  const pointerStartRef = React.useRef<{ x: number; y: number } | null>(null)

  // ─────────────────────────────────────────
  // Commit helpers
  // ─────────────────────────────────────────
  const advance = React.useCallback(() => {
    setExitDirection(null)
    setDragX(0)
    setFlipped(false)
    setIndex(i => {
      const next = i + 1
      if (next >= total) {
        setPhase({ kind: 'completion' })
      } else {
        setPhase({ kind: 'card' })
      }
      return next
    })
  }, [total])

  const commitAdd = React.useCallback(() => {
    if (!current || pending) return
    const card = current
    const snapshot = { status: card.status, outcomeNotes: card.outcomeNotesSnapshot }
    setExitDirection('right')
    setSavedCount(c => c + 1)
    // Optimistic move into after-add confirmation after the exit animation.
    window.setTimeout(() => {
      setPhase({ kind: 'after-add', snapshot, cardId: card.opportunityId })
      setExitDirection(null)
      setDragX(0)
    }, 280)
    if (isDemo) return
    startTransition(async () => {
      try {
        await updateLeadOutcome({
          opportunityId: card.opportunityId,
          status: 'saved',
          outcomeNotes: card.outcomeNotesSnapshot ?? undefined,
        })
        router.refresh()
      } catch (err) {
        console.error('[todays-run] add failed', err)
      }
    })
  }, [current, isDemo, pending, router])

  const beginPass = React.useCallback(() => {
    if (!current || pending) return
    setExitDirection('left')
    window.setTimeout(() => {
      setPhase({ kind: 'pass-reason' })
      setExitDirection(null)
      setDragX(0)
    }, 280)
  }, [current, pending])

  const submitPass = React.useCallback(
    (input: { reasons: TodaysRunPassReason[]; note: string | null }) => {
      if (!current) return
      const card = current
      setSkippedCount(c => c + 1)
      if (!isDemo) {
        startTransition(async () => {
          try {
            await updateLeadOutcome({
              opportunityId: card.opportunityId,
              status: 'skipped',
              passFeedback: {
                reasons: input.reasons,
                note: input.note ?? undefined,
                signalType: card.signalType,
                businessName: card.businessName,
              },
            })
            router.refresh()
          } catch (err) {
            console.error('[todays-run] pass failed', err)
          }
        })
      }
      advance()
    },
    [advance, current, isDemo, router],
  )

  const cancelPass = React.useCallback(() => {
    setPhase({ kind: 'card' })
  }, [])

  const undoAdd = React.useCallback(() => {
    if (phase.kind !== 'after-add' || !phase.snapshot) return
    const snap = phase.snapshot
    const cardId = phase.cardId
    setSavedCount(c => Math.max(0, c - 1))
    if (!isDemo) {
      startTransition(async () => {
        try {
          await updateLeadOutcome({
            opportunityId: cardId,
            status: snap.status,
            outcomeNotes: snap.outcomeNotes ?? null,
          })
          router.refresh()
        } catch (err) {
          console.error('[todays-run] undo failed', err)
        }
      })
    }
    setPhase({ kind: 'card' })
    setExitDirection(null)
    setDragX(0)
    setFlipped(false)
  }, [isDemo, phase, router])

  const stopRun = React.useCallback(() => {
    router.push('/app/leads')
  }, [router])

  // ─────────────────────────────────────────
  // Keyboard shortcuts
  // ─────────────────────────────────────────
  React.useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const tag = (e.target as HTMLElement | null)?.tagName ?? ''
      if (tag === 'INPUT' || tag === 'TEXTAREA' || (e.target as HTMLElement | null)?.isContentEditable) {
        return
      }
      if (phase.kind === 'card') {
        if (e.key === 'ArrowLeft') {
          e.preventDefault()
          beginPass()
        } else if (e.key === 'ArrowRight') {
          e.preventDefault()
          commitAdd()
        } else if (e.key === 'ArrowUp') {
          e.preventDefault()
          setFlipped(f => !f)
        } else if (e.key === 'Escape') {
          e.preventDefault()
          stopRun()
        }
      } else if (phase.kind === 'pass-reason' || phase.kind === 'after-add') {
        if (e.key === 'Escape') {
          e.preventDefault()
          if (phase.kind === 'pass-reason') cancelPass()
          else stopRun()
        }
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [beginPass, cancelPass, commitAdd, phase, stopRun])

  // ─────────────────────────────────────────
  // Pointer / swipe handlers (mobile)
  // ─────────────────────────────────────────
  const onPointerDown = (e: React.PointerEvent) => {
    if (phase.kind !== 'card' || flipped) return
    pointerStartRef.current = { x: e.clientX, y: e.clientY }
    ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
  }
  const onPointerMove = (e: React.PointerEvent) => {
    const start = pointerStartRef.current
    if (!start) return
    const dx = e.clientX - start.x
    const dy = e.clientY - start.y
    // Only treat as horizontal drag when intent is clearly sideways.
    if (Math.abs(dx) > Math.abs(dy)) {
      setDragX(dx)
    }
  }
  const onPointerUp = () => {
    const dx = dragX
    pointerStartRef.current = null
    if (Math.abs(dx) < SWIPE_COMMIT_PX) {
      setDragX(0)
      return
    }
    if (dx > 0) commitAdd()
    else beginPass()
  }

  // ─────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────

  if (total === 0) {
    return (
      <div className="mt-2">
        <RunCompletion saved={0} skipped={0} elapsedSeconds={0} />
      </div>
    )
  }

  if (completed) {
    const elapsed = Math.max(1, Math.round((Date.now() - startedAtRef.current) / 1000))
    return (
      <div className="space-y-4">
        <RunProgress
          index={Math.min(index, total)}
          total={total}
          savedCount={savedCount}
          skippedCount={skippedCount}
        />
        <RunCompletion saved={savedCount} skipped={skippedCount} elapsedSeconds={elapsed} />
      </div>
    )
  }

  // After-Add confirmation owns its own card surface — no deck.
  if (phase.kind === 'after-add' && current) {
    return (
      <div className="space-y-4">
        <RunProgress
          index={index}
          total={total}
          savedCount={savedCount}
          skippedCount={skippedCount}
        />
        <AfterAddConfirmation
          businessName={current.businessName}
          draft={current.draftPreview}
          canUndo={phase.snapshot !== null}
          pending={pending}
          onUndo={undoAdd}
          onNext={advance}
          onStop={stopRun}
        />
      </div>
    )
  }

  // Pass reason panel — full-card replacement.
  if (phase.kind === 'pass-reason' && current) {
    return (
      <div className="space-y-4">
        <RunProgress
          index={index}
          total={total}
          savedCount={savedCount}
          skippedCount={skippedCount}
        />
        <PassReasonPanel
          businessName={current.businessName}
          pending={pending}
          onCancel={cancelPass}
          onSubmit={submitPass}
        />
      </div>
    )
  }

  // Default: deck + action bar
  const remaining = total - index

  return (
    <div className="space-y-5">
      <RunProgress
        index={index}
        total={total}
        savedCount={savedCount}
        skippedCount={skippedCount}
      />

      <div
        className="touch-pan-y select-none"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      >
        <TodayRunDeck
          remaining={remaining}
          dragX={dragX}
          exitDirection={exitDirection}
          flipped={flipped}
          front={current ? <TodayRunCard card={current} /> : null}
          back={
            current ? (
              <EvidenceCardBack card={current} onBack={() => setFlipped(false)} />
            ) : null
          }
        />
      </div>

      <RunActionBar
        onPass={beginPass}
        onEvidence={() => setFlipped(f => !f)}
        onAdd={commitAdd}
        disabled={pending || exitDirection !== null}
        flipped={flipped}
      />

      <p
        className={cn(
          'hidden lg:block text-center text-[11.5px] uppercase tracking-[0.15em] font-semibold text-brand-near-black/40',
        )}
      >
        ← Pass · ↑ Evidence · → Add · Esc Stop
      </p>

      {isDemo && (
        <p className="text-[11px] text-brand-near-black/45 text-center">
          Showing a sample queue — your real Today&rsquo;s Run will appear here once
          Fetchi finds fresh signals for this workspace.
        </p>
      )}
    </div>
  )
}
