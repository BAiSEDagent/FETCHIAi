'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { createPromptVersion } from './actions'
import { errorMessage } from '@/lib/enums'

type Active = {
  id: string
  name: string
  version: number
  content: string
  modelTarget: string | null
  isActive: boolean
}

export function PromptEditor({ active }: { active: Active }) {
  const [content, setContent] = useState(active.content)
  const [modelTarget, setModelTarget] = useState(active.modelTarget ?? '')
  const [setActive, setSetActive] = useState(true)
  const [pending, startTransition] = useTransition()
  const [err, setErr] = useState<string | null>(null)
  const router = useRouter()

  function onSave() {
    setErr(null)
    if (!content.trim()) {
      setErr('Prompt content cannot be empty')
      return
    }
    startTransition(async () => {
      try {
        await createPromptVersion({
          name: active.name,
          content,
          modelTarget: modelTarget.trim() || null,
          setActive,
        })
        // Refresh to pick up the new version row
        router.refresh()
      } catch (e: unknown) {
        setErr(errorMessage(e, 'Save failed'))
      }
    })
  }

  return (
    <div className="bg-white border border-brand-near-black/10 rounded-[10px] p-5">
      <div className="flex items-baseline justify-between mb-3">
        <h2 className="font-outfit font-semibold text-[15px]">
          <span className="font-mono">{active.name}</span>
          <span className="ml-2 font-mono text-[11px] text-brand-near-black/45">
            editing from v{active.version}
          </span>
        </h2>
        <span className="text-[11px] text-brand-near-black/55">
          Saving creates a new version row.
        </span>
      </div>

      <label className="block mb-3">
        <span className="block text-[11px] uppercase tracking-[0.06em] text-brand-near-black/55 mb-1">
          Model target (informational)
        </span>
        <input
          value={modelTarget}
          onChange={e => setModelTarget(e.target.value)}
          placeholder="e.g. claude-sonnet-4-6"
          className="w-72 max-w-full px-3 py-2 min-h-[40px] border border-brand-near-black/15 rounded text-[12px] font-mono"
        />
      </label>

      <label className="block mb-3">
        <span className="block text-[11px] uppercase tracking-[0.06em] text-brand-near-black/55 mb-1">
          Prompt content
        </span>
        <textarea
          value={content}
          onChange={e => setContent(e.target.value)}
          rows={18}
          className="w-full px-3 py-2 border border-brand-near-black/15 rounded text-[12px] font-mono leading-[1.55]"
        />
      </label>

      <div className="flex items-center justify-between flex-wrap gap-2">
        <label className="flex items-center gap-2 text-[12px] text-brand-near-black/70">
          <input
            type="checkbox"
            checked={setActive}
            onChange={e => setSetActive(e.target.checked)}
            className="w-4 h-4"
          />
          Activate this new version (deactivates current active)
        </label>
        <div className="flex items-center gap-3">
          {err && <span className="text-[11px] text-coral">{err}</span>}
          <button
            onClick={onSave}
            disabled={pending}
            className="text-[12px] font-medium px-4 py-2.5 min-h-[44px] min-w-[44px] rounded-md bg-brand-near-black text-white hover:bg-brand-green disabled:opacity-50"
          >
            {pending ? 'Saving…' : 'Save as new version'}
          </button>
        </div>
      </div>
    </div>
  )
}
