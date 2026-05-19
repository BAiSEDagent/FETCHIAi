'use client'

import { useState, useTransition } from 'react'
import type { AgentRegistryEntry } from '@/db'
import { updateAgent } from './actions'
import { errorMessage } from '@/lib/enums'

export function AgentRow({
  agent, providers, promptSlugs,
}: { agent: AgentRegistryEntry; providers: string[]; promptSlugs: string[] }) {
  const [provider, setProvider] = useState(agent.provider)
  const [model, setModel] = useState(agent.model)
  const [escProvider, setEscProvider] = useState(agent.escalationProvider ?? '')
  const [escModel, setEscModel] = useState(agent.escalationModel ?? '')
  const [promptKey, setPromptKey] = useState(agent.promptKey ?? '')
  const [maxTokens, setMaxTokens] = useState(String(agent.maxTokens))
  const [temperature, setTemperature] = useState(agent.temperature)
  const [isActive, setIsActive] = useState(agent.isActive)
  const [pending, startTransition] = useTransition()
  const [err, setErr] = useState<string | null>(null)
  const [savedAt, setSavedAt] = useState<number | null>(null)

  function onSave() {
    setErr(null)
    startTransition(async () => {
      try {
        await updateAgent({
          id: agent.id,
          provider: provider.trim(),
          model: model.trim(),
          escalationProvider: escProvider.trim() || null,
          escalationModel: escModel.trim() || null,
          promptKey: promptKey.trim() || null,
          maxTokens: Number(maxTokens) || 1024,
          temperature: temperature.trim() || '0.3',
          isActive,
        })
        setSavedAt(Date.now())
      } catch (e: unknown) {
        setErr(errorMessage(e, 'Save failed'))
      }
    })
  }

  // Allow keys from prompts table OR keep an existing custom key
  const promptOptions = Array.from(new Set([...(promptKey ? [promptKey] : []), ...promptSlugs]))

  return (
    <tr className="border-b border-brand-near-black/5 align-middle">
      <td className="px-3 py-2">
        <div className="font-medium text-brand-near-black">{agent.name}</div>
        <div className="font-mono text-[10px] text-brand-near-black/50">{agent.slug} · {agent.pattern}</div>
      </td>
      <td className="px-3 py-2">
        <select value={provider} onChange={e => setProvider(e.target.value)} className={cell()}>
          {!providers.includes(provider) && (
            <option value={provider}>{provider} (unset — choose one)</option>
          )}
          {providers.map(p => <option key={p} value={p}>{p}</option>)}
        </select>
      </td>
      <td className="px-3 py-2">
        <input value={model} onChange={e => setModel(e.target.value)} className={cell('w-36 font-mono')} placeholder="set-in-admin" />
      </td>
      <td className="px-3 py-2">
        <select value={escProvider} onChange={e => setEscProvider(e.target.value)} className={cell()}>
          <option value="">— none —</option>
          {providers.map(p => <option key={p} value={p}>{p}</option>)}
        </select>
      </td>
      <td className="px-3 py-2">
        <input value={escModel} onChange={e => setEscModel(e.target.value)} className={cell('w-36 font-mono')} placeholder="optional" />
      </td>
      <td className="px-3 py-2">
        <select value={promptKey} onChange={e => setPromptKey(e.target.value)} className={cell()}>
          <option value="">— none —</option>
          {promptOptions.map(p => <option key={p} value={p}>{p}</option>)}
        </select>
      </td>
      <td className="px-3 py-2">
        <input value={maxTokens} type="number" onChange={e => setMaxTokens(e.target.value)} className={cell('w-20')} />
      </td>
      <td className="px-3 py-2">
        <input value={temperature} onChange={e => setTemperature(e.target.value)} className={cell('w-16 font-mono')} />
      </td>
      <td className="px-3 py-2">
        <input type="checkbox" checked={isActive} onChange={e => setIsActive(e.target.checked)} className="w-4 h-4" />
      </td>
      <td className="px-3 py-2">
        <button
          onClick={onSave}
          disabled={pending}
          className="text-[11px] font-medium px-3 py-2 min-h-[44px] min-w-[44px] rounded-md bg-brand-near-black text-white hover:bg-brand-green disabled:opacity-50"
        >
          {pending ? 'Saving…' : savedAt ? 'Saved' : 'Save'}
        </button>
        {err && <div className="text-[10px] text-coral mt-1 max-w-[140px]">{err}</div>}
      </td>
    </tr>
  )
}

function cell(extra: string = ''): string {
  return `${extra} px-2 py-1.5 min-h-[36px] border border-brand-near-black/15 rounded text-[12px] bg-white focus:border-brand-green outline-none`
}
