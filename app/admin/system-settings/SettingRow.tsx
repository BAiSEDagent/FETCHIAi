'use client'

import { useState, useTransition } from 'react'
import type { SystemSetting } from '@/db'
import { updateSystemSetting } from './actions'
import { errorMessage } from '@/lib/enums'

export function SettingRow({ setting }: { setting: SystemSetting }) {
  const [value, setValue] = useState(setting.value)
  const [err, setErr] = useState<string | null>(null)
  const [savedAt, setSavedAt] = useState<number | null>(null)
  const [pending, startTransition] = useTransition()
  const dirty = value !== setting.value

  function commit() {
    if (!dirty) return
    setErr(null)
    startTransition(async () => {
      try {
        if (setting.valueType === 'number' && isNaN(Number(value))) {
          throw new Error('Value must be a number')
        }
        if (setting.valueType === 'boolean' && !['true', 'false'].includes(value.trim().toLowerCase())) {
          throw new Error('Value must be "true" or "false"')
        }
        if (setting.valueType === 'json') {
          JSON.parse(value)
        }
        await updateSystemSetting(setting.key, value)
        setSavedAt(Date.now())
      } catch (e: unknown) {
        setErr(errorMessage(e, 'Save failed'))
      }
    })
  }

  const isBool = setting.valueType === 'boolean'

  return (
    <li className="px-5 py-3 border-b border-brand-near-black/5 last:border-b-0 flex items-start gap-4">
      <div className="flex-1 min-w-0">
        <div className="font-mono text-[12px] text-brand-near-black">{setting.key}</div>
        {setting.description && (
          <p className="text-[11px] text-brand-near-black/55 mt-0.5 leading-snug">{setting.description}</p>
        )}
        <div className="text-[10px] text-brand-near-black/40 mt-0.5">
          type: <span className="font-mono">{setting.valueType}</span>
          {setting.updatedBy && <> · last edited by <span className="font-mono">{setting.updatedBy.slice(0, 14)}…</span></>}
        </div>
      </div>
      <div className="flex flex-col gap-1 w-[260px] flex-shrink-0">
        {isBool ? (
          <select
            value={value}
            onChange={e => setValue(e.target.value)}
            onBlur={commit}
            className="w-full px-2 py-2 min-h-[36px] border border-brand-near-black/15 rounded text-[12px] font-mono bg-white"
          >
            <option value="true">true</option>
            <option value="false">false</option>
          </select>
        ) : setting.valueType === 'json' ? (
          <textarea
            value={value}
            onChange={e => setValue(e.target.value)}
            onBlur={commit}
            rows={3}
            className="w-full px-2 py-1.5 border border-brand-near-black/15 rounded text-[11px] font-mono bg-white"
          />
        ) : (
          <input
            value={value}
            onChange={e => setValue(e.target.value)}
            onBlur={commit}
            inputMode={setting.valueType === 'number' ? 'numeric' : undefined}
            className="w-full px-2 py-2 min-h-[36px] border border-brand-near-black/15 rounded text-[12px] font-mono bg-white"
          />
        )}
        <div className="text-[10px] flex items-center justify-end gap-2 min-h-[16px]">
          {pending && <span className="text-brand-near-black/55">Saving…</span>}
          {!pending && err && <span className="text-coral">{err}</span>}
          {!pending && !err && savedAt && !dirty && <span className="text-brand-green">Saved</span>}
          {!pending && dirty && <span className="text-[#8B5E1A]">Unsaved — blur to save</span>}
        </div>
      </div>
    </li>
  )
}
