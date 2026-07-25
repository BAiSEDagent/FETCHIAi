'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { Check, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { updateLeadOutcome } from '@/app/app/leads/[id]/actions'
import type { TodaysRunPassReason } from '@/lib/today/pass-reasons'
import { RunProgress } from './RunProgress'
import { TodayRunCard } from './TodayRunCard'
import { TodayRunDeck } from './TodayRunDeck'
import { PassReasonPanel } from './PassReasonPanel'
import { RunCompletion } from './RunCompletion'
import type { TodayRunCardData } from './types'

type Props = {
  queue: TodayRunCardData[]
  isDemo?: boolean
}

type Phase =
  | { kind: 'card' }
  | { kind: 'pass-reason' }
  | { kind: 'completion' }

const SWIPE_COMMIT_PX = 80
const TOAST_MS = 1600

export function TodayRunPage({ queue, isDemo = false }: Props) {
  const router = useRouter()
  const [index, setIndex] = React.useState(0)
  const [phase, setPhase] = React.useState<Phase>({ kind: 'card' })
  const [dragX, setDragX] = React.useState(0)
  const [exitDirection, setExitDirection] = React.useState<'left' | 'right' | null>(null)
  const [savedCount, setSavedCount] = React.useState(0)
  const [skippedCount, setSkippedCount] = React.useState(0)
  const [draftsPreparedCount, setDraftsPreparedCount] = React.useState(0)
  const [toast, setToast] = React.useState<string | null>(null)
  const [pending, startTransition] = React.useTransition()

  const total = queue.length
  const current = queue[index] ?? null
  const completed = !current || phase.kind === 'completion'

  const pointerStartRef = React.useRef<{ x: number; y: number } | null>(null)
  const draggingRef = React.useRef(false)

  // ─────────────────────────────────────────
  // Commit helpers
  // ─────────────────────────────────────────
  const advance = React.useCallback(() => {
    setExitDirection(null)
    setDragX(0)
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

  const showToast = React.useCallback((message: string) => {
    setToast(message)
    window.setTimeout(() => setToast(null), TOAST_MS)
  }, [])

  const commitAdd = React.useCallback(() => {
    if (!current || pending || exitDirection) return
    const card = current
    setExitDirection('right')
    setSavedCount(c => c + 1)
    if (card.draftPreview) setDraftsPreparedCount(c => c + 1)
    showToast(
      card.draftPreview
        ? 'Added to My Leads. Draft prepared, not sent.'
        : 'Added to My Leads.',
    )
    window.setTimeout(() => advance(), 300)
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
  }, [advance, current, exitDirection, isDemo, pending, router, showToast])

  const beginPass = React.useCallback(() => {
    if (!current || pending || exitDirection) return
    setExitDirection('left')
    window.setTimeout(() => {
      setPhase({ kind: 'pass-reason' })
      setExitDirection(null)
      setDragX(0)
    }, 280)
  }, [current, exitDirection, pending])

  const submitPass = React.useCallback(
    (input: { reasons: TodaysRunPassReason[]; note: string | null }) => {
      if (!current) return
      const card = current
      setSkippedCount(c => c + 1)
      showToast('Tagged. Fetchi will use this feedback to improve future stacks.')
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
    [advance, current, isDemo, router, showToast],
  )

  const cancelPass = React.useCallback(() => {
    setPhase({ kind: 'card' })
  }, [])

  const stopRun = React.useCallback(() => {
    router.push('/app/leads')
  }, [router])

  // ─────────────────────────────────────────
  // Keyboard shortcuts (desktop)
  // ─────────────────────────────────────────
  React.useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const t = e.target as HTMLElement | null
      const tag = t?.tagName ?? ''
      if (tag === 'INPUT' || tag === 'TEXTAREA' || t?.isContentEditable) return
      if (phase.kind === 'card') {
        if (e.key === 'ArrowLeft') {
          e.preventDefault()
          beginPass()
        } else if (e.key === 'ArrowRight') {
          e.preventDefault()
          commitAdd()
        } else if (e.key === 'Enter' && current && !isDemo) {
          e.preventDefault()
          router.push(`/app/leads/${current.opportunityId}`)
        } else if (e.key === 'Escape') {
          e.preventDefault()
          stopRun()
        }
      } else if (phase.kind === 'pass-reason') {
        if (e.key === 'Escape') {
          e.preventDefault()
          cancelPass()
        }
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [beginPass, cancelPass, commitAdd, current, isDemo, phase, router, stopRun])

  // ─────────────────────────────────────────
  // Pointer / swipe — horizontal only, lets vertical pass through to internal scroll
  // ─────────────────────────────────────────
  const onPointerDown = (e: React.PointerEvent) => {
    if (phase.kind !== 'card' || exitDirection) return
    pointerStartRef.current = { x: e.clientX, y: e.clientY }
    draggingRef.current = false
  }
  const onPointerMove = (e: React.PointerEvent) => {
    const start = pointerStartRef.current
    if (!start) return
    const dx = e.clientX - start.x
    const dy = e.clientY - start.y
    if (!draggingRef.current) {
      // Lock direction only once intent is clearly horizontal.
      if (Math.abs(dx) > 10 && Math.abs(dx) > Math.abs(dy) * 1.2) {
        draggingRef.current = true
        ;(e.target as HTMLElement).setPointerCapture?.(e.pointerId)
      } else {
        return
      }
    }
    setDragX(dx)
  }
  const onPointerUp = () => {
    const dx = dragX
    pointerStartRef.current = null
    const wasDragging = draggingRef.current
    draggingRef.current = false
    if (!wasDragging) return
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
      <div data-fetchi-today-v5 className="mt-2">
        <RunCompletion saved={0} skipped={0} draftsPrepared={0} />
      </div>
    )
  }

  if (completed) {
    return (
      <div data-fetchi-today-v5 className="space-y-4">
        <RunProgress
          index={Math.min(index, total)}
          total={total}
          savedCount={savedCount}
          skippedCount={skippedCount}
        />
        <RunCompletion
          saved={savedCount}
          skipped={skippedCount}
          draftsPrepared={draftsPreparedCount}
        />
      </div>
    )
  }

  if (phase.kind === 'pass-reason' && current) {
    return (
      <div data-fetchi-today-v5 className="space-y-4">
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

  const remaining = total - index
  const toastIsSaved = toast?.startsWith('Added to My Leads') ?? false

  return (
    <div data-fetchi-today-v5 className="space-y-4">
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
        >
          {current && <TodayRunCard card={current} isDemo={isDemo} />}
        </TodayRunDeck>
      </div>

      {/* Mobile swipe hint — sits just above the bottom nav */}
      <p
        className={cn(
          'lg:hidden fixed inset-x-0 z-30 text-center text-[10.5px] uppercase tracking-[0.14em] font-semibold text-text/40 pointer-events-none',
          'bottom-[calc(env(safe-area-inset-bottom)+100px)]',
        )}
      >
        Swipe left to pass · right to add
      </p>

      <p
        className={cn(
          'hidden lg:block text-center text-[11.5px] uppercase tracking-[0.15em] font-semibold text-text/40',
        )}
      >
        ← Pass · → Add · Enter Open lead · Esc Stop
      </p>

      {isDemo && (
        <p className="text-[11px] text-text/45 text-center">
          Showing a sample queue — your real Today&rsquo;s Run will appear here once
          Fetchi finds fresh signals for this workspace.
        </p>
      )}

      {toast && (
        <div
          role="status"
          aria-live="polite"
          className={cn(
            'fixed left-1/2 -translate-x-1/2 z-50',
            'bottom-[calc(env(safe-area-inset-bottom)+130px)] lg:bottom-10',
            'inline-flex min-h-[44px] items-center gap-2 rounded-lg border px-4 text-[13px] font-semibold',
            'bg-fetchiOverlay text-text shadow-[0_12px_28px_-18px_rgba(0,0,0,0.8)]',
            toastIsSaved ? 'border-semanticGreen/30' : 'border-semanticRed/30',
          )}
        >
          {toastIsSaved ? (
            <Check className="h-3.5 w-3.5 text-semanticGreen" />
          ) : (
            <X className="h-3.5 w-3.5 text-semanticRed" />
          )}
          {toast}
        </div>
      )}
    </div>
  )
}
