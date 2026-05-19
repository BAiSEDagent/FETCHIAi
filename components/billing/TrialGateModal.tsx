'use client'

import * as React from 'react'
import * as DialogPrimitive from '@radix-ui/react-dialog'
import { Button } from '@/components/ui/button'

interface Props {
  leadsSeen: number
  recommendedTier: string
  recommendedInterval: 'monthly' | 'annual'
}

export function TrialGateModal({ leadsSeen, recommendedTier, recommendedInterval }: Props) {
  return (
    <DialogPrimitive.Root open>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-[60] bg-brand-near-black/70 backdrop-blur-sm" />
        <DialogPrimitive.Content
          onEscapeKeyDown={(e) => e.preventDefault()}
          onPointerDownOutside={(e) => e.preventDefault()}
          onInteractOutside={(e) => e.preventDefault()}
          className="fixed left-1/2 top-1/2 z-[70] w-[92vw] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-2xl bg-brand-cream p-6 shadow-2xl border border-brand-near-black/10"
        >
          <DialogPrimitive.Title className="font-outfit text-[22px] font-bold text-brand-near-black leading-tight">
            You&rsquo;ve seen your first {leadsSeen} leads
          </DialogPrimitive.Title>
          <DialogPrimitive.Description className="mt-2 text-[14px] text-brand-near-black/70 leading-relaxed">
            Add a card to keep finding opportunities. Your trial credits are still active &mdash;
            we won&rsquo;t charge anything until your trial ends.
          </DialogPrimitive.Description>

          <ul className="mt-4 space-y-2 text-[13.5px] text-brand-near-black/80">
            <li className="flex gap-2"><span className="text-brand-green">&#10003;</span> No charge today</li>
            <li className="flex gap-2"><span className="text-brand-green">&#10003;</span> Cancel any time from settings</li>
            <li className="flex gap-2"><span className="text-brand-green">&#10003;</span> Continue using your remaining trial credits</li>
          </ul>

          <form method="post" action="/api/stripe/checkout" className="mt-6 flex flex-col gap-2">
            <input type="hidden" name="tier" value={recommendedTier} />
            <input type="hidden" name="interval" value={recommendedInterval} />
            <Button type="submit" size="lg" className="w-full">
              Add card &mdash; keep going
            </Button>
          </form>
          <a
            href="/app/settings/billing"
            className="mt-3 block text-center text-[13px] font-semibold text-brand-near-black/65 hover:text-brand-near-black"
          >
            Compare plans
          </a>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  )
}
