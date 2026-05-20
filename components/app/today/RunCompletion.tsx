'use client'

import * as React from 'react'
import Link from 'next/link'
import { ArrowRight, MessageSquare, Sparkles } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  ACTION_BUTTON_HEIGHT,
  CARD_RADIUS,
  CARD_SHADOW,
  CARD_SURFACE,
  PRIMARY_BUTTON_SURFACE,
  SECONDARY_BUTTON_SURFACE,
} from './tokens'

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
      className={cn(
        'p-7 lg:p-8 text-center text-brand-near-black',
        CARD_SURFACE,
        CARD_RADIUS,
        CARD_SHADOW,
      )}
    >
      <div className="mx-auto w-14 h-14 rounded-2xl bg-brand-green/15 text-brand-dark flex items-center justify-center">
        <Sparkles className="h-6 w-6" />
      </div>

      <h2 className="font-outfit text-[26px] lg:text-[30px] font-bold mt-4 leading-tight">
        Stack cleared
      </h2>
      <p className="text-[14px] text-brand-near-black/65 mt-2 leading-relaxed max-w-md mx-auto">
        You reviewed {reviewed} opportunit{reviewed === 1 ? 'y' : 'ies'}.
        {draftsLine ? (
          <>
            <br />
            <span className="text-brand-near-black/75">{draftsLine}</span>
          </>
        ) : null}
      </p>

      <dl className="mt-6 grid grid-cols-3 gap-2 max-w-md mx-auto">
        <Stat label="Saved" value={saved} tone="green" />
        <Stat label="Passed" value={skipped} tone="muted" />
        <Stat label="Drafts" value={draftsPrepared} tone="muted" />
      </dl>

      <p className="text-[12.5px] text-brand-near-black/55 mt-5">
        Fetchi will queue the next batch as fresh signals come in.
      </p>

      <div className="mt-6 grid gap-2.5 sm:grid-cols-2 max-w-md mx-auto">
        <Link
          href="/app/chat"
          className={cn(
            'inline-flex items-center justify-center gap-2 rounded-[18px] text-[14px] font-semibold transition-all',
            ACTION_BUTTON_HEIGHT,
            SECONDARY_BUTTON_SURFACE,
          )}
        >
          <MessageSquare className="h-4 w-4" />
          Back to chat
        </Link>
        <Link
          href="/app/leads"
          className={cn(
            'inline-flex items-center justify-center gap-2 rounded-[18px] text-[14px] font-semibold transition-all',
            ACTION_BUTTON_HEIGHT,
            PRIMARY_BUTTON_SURFACE,
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
    <div className="rounded-2xl bg-brand-cream/60 px-3 py-3">
      <dt className="text-[10.5px] uppercase tracking-[0.12em] font-bold text-brand-near-black/45">
        {label}
      </dt>
      <dd
        className={cn(
          'font-outfit text-[24px] lg:text-[26px] font-bold tabular-nums mt-0.5',
          tone === 'green' ? 'text-brand-green' : 'text-brand-near-black',
        )}
      >
        {value}
      </dd>
    </div>
  )
}
