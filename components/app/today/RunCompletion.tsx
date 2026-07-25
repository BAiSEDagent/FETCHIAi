'use client'

import * as React from 'react'
import Link from 'next/link'
import { ArrowRight, MessageSquare, Sparkles } from 'lucide-react'
import { cn } from '@/lib/utils'

type Props = {
  saved: number
  skipped: number
  draftsPrepared: number
}

export function RunCompletion({
  saved,
  skipped,
  draftsPrepared,
}: Props) {
  const reviewed = saved + skipped
  const draftsLine =
    draftsPrepared > 0
      ? `${draftsPrepared} ${draftsPrepared === 1 ? 'draft' : 'drafts'} prepared \u2014 review before sending`
      : null
  return (
    <section
      data-fetchi-flat-panel-v5
      className={cn(
        'rounded-xl border border-text/10 bg-raised p-7 text-center text-text lg:p-8',
      )}
    >
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-xl border border-semanticGreen/25 bg-semanticGreen/10 text-semanticGreen">
        <Sparkles className="h-6 w-6" />
      </div>

      <h2 className="mt-4 font-fetchi text-h1 font-semibold tracking-[-0.02em]">
        Stack cleared
      </h2>
      <p className="text-[14px] text-text/65 mt-2 leading-relaxed max-w-md mx-auto">
        You reviewed {reviewed} opportunit{reviewed === 1 ? 'y' : 'ies'}.
        {draftsLine ? (
          <>
            <br />
            <span className="text-text/75">{draftsLine}</span>
          </>
        ) : null}
      </p>

      <dl className="mt-6 grid grid-cols-3 gap-2 max-w-md mx-auto">
        <Stat label="Saved" value={saved} tone="green" />
        <Stat label="Passed" value={skipped} tone="muted" />
        <Stat label="Drafts" value={draftsPrepared} tone="muted" />
      </dl>

      <p className="text-[12.5px] text-text/55 mt-5">
        Fetchi will queue the next batch as fresh signals come in.
      </p>

      <div className="mt-6 grid gap-2.5 sm:grid-cols-2 max-w-md mx-auto">
        <Link
          href="/app/chat"
          className={cn(
            'inline-flex h-11 min-h-[44px] items-center justify-center gap-2 rounded-lg border border-text/10 bg-fetchiOverlay px-4 text-[14px] font-semibold text-text/85 transition-colors',
            'hover:bg-fetchiOverlayHover hover:text-text',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fetchiAccent focus-visible:ring-offset-2 focus-visible:ring-offset-bg',
          )}
        >
          <MessageSquare className="h-4 w-4" />
          Back to chat
        </Link>
        <Link
          href="/app/leads"
          className={cn(
            'inline-flex h-11 min-h-[44px] items-center justify-center gap-2 rounded-lg bg-fetchiAccent px-4 text-[14px] font-semibold text-white transition-colors',
            'hover:bg-[var(--fetchi-accent-hover)] active:bg-[var(--fetchi-accent-press)]',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fetchiAccent focus-visible:ring-offset-2 focus-visible:ring-offset-bg',
          )}
        >
          See My Leads
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </section>
  )
}

function Stat({
  label,
  value,
  tone,
}: {
  label: string
  value: number | string
  tone: 'green' | 'muted'
}) {
  return (
    <div className="rounded-lg border border-text/10 bg-fetchiOverlay px-3 py-3">
      <dt className="text-[10.5px] uppercase tracking-[0.12em] font-bold text-text/45">
        {label}
      </dt>
      <dd
        className={cn(
          'mt-0.5 text-[24px] font-semibold tabular-nums tracking-[-0.02em] lg:text-[26px]',
          tone === 'green' ? 'text-semanticGreen' : 'text-text',
        )}
      >
        {value}
      </dd>
    </div>
  )
}
