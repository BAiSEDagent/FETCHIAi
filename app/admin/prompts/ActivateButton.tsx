'use client'

import { useTransition } from 'react'
import { activatePromptVersion } from './actions'

export function ActivateButton({ id, name }: { id: string; name: string }) {
  const [pending, startTransition] = useTransition()
  return (
    <button
      onClick={() => startTransition(() => activatePromptVersion(id, name))}
      disabled={pending}
      className="text-[11px] font-medium px-3 py-2 min-h-[44px] min-w-[44px] rounded-md border border-brand-near-black/15 hover:border-brand-green hover:text-brand-green disabled:opacity-50"
    >
      {pending ? '…' : 'Activate'}
    </button>
  )
}
