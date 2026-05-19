'use client'

import { useMemo, useState, useTransition } from 'react'
import type { EmailTemplate } from '@/db'
import { updateEmailTemplate } from './actions'
import { errorMessage } from '@/lib/enums'

function substitute(text: string, vars: Record<string, string>): string {
  return text.replace(/\{\{\s*([\w.-]+)\s*\}\}/g, (_, key: string) => {
    const v = vars[key]
    return v === undefined || v === '' ? `{{${key}}}` : v
  })
}

function listVariables(t: EmailTemplate): string[] {
  if (Array.isArray(t.variables)) {
    return t.variables.filter((v): v is string => typeof v === 'string')
  }
  return []
}

export function TemplateEditor({ template }: { template: EmailTemplate }) {
  const [name, setName] = useState(template.name)
  const [subject, setSubject] = useState(template.subject)
  const [bodyHtml, setBodyHtml] = useState(template.bodyHtml)
  const [bodyText, setBodyText] = useState(template.bodyText)
  const [isActive, setIsActive] = useState(template.isActive)
  const [err, setErr] = useState<string | null>(null)
  const [savedAt, setSavedAt] = useState<number | null>(null)
  const [pending, startTransition] = useTransition()

  const vars = listVariables(template)
  const [previewVars, setPreviewVars] = useState<Record<string, string>>(
    Object.fromEntries(vars.map(v => [v, sampleFor(v)])),
  )

  const previewSubject = useMemo(() => substitute(subject, previewVars), [subject, previewVars])
  const previewHtml = useMemo(() => substitute(bodyHtml, previewVars), [bodyHtml, previewVars])
  const previewText = useMemo(() => substitute(bodyText, previewVars), [bodyText, previewVars])

  function onSave() {
    setErr(null)
    startTransition(async () => {
      try {
        await updateEmailTemplate({
          id: template.id,
          name: name.trim() || template.slug,
          subject,
          bodyHtml,
          bodyText,
          isActive,
        })
        setSavedAt(Date.now())
      } catch (e: unknown) {
        setErr(errorMessage(e, 'Save failed'))
      }
    })
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-outfit font-semibold text-[15px]">
            {template.name}
            <span className="ml-2 font-mono text-[11px] text-brand-near-black/45">
              {template.slug} v{template.version}
            </span>
          </h2>
          <label className="flex items-center gap-2 text-[11px] text-brand-near-black/65">
            <input type="checkbox" checked={isActive} onChange={e => setIsActive(e.target.checked)} className="w-4 h-4" />
            Active
          </label>
        </div>

        <Field label="Name">
          <input
            value={name}
            onChange={e => setName(e.target.value)}
            className="w-full px-3 py-2 min-h-[40px] border border-brand-near-black/15 rounded text-[13px]"
          />
        </Field>
        <Field label="Subject">
          <input
            value={subject}
            onChange={e => setSubject(e.target.value)}
            className="w-full px-3 py-2 min-h-[40px] border border-brand-near-black/15 rounded text-[13px] font-mono"
          />
        </Field>
        <Field label="Body — HTML">
          <textarea
            value={bodyHtml}
            onChange={e => setBodyHtml(e.target.value)}
            rows={8}
            className="w-full px-3 py-2 border border-brand-near-black/15 rounded text-[12px] font-mono"
          />
        </Field>
        <Field label="Body — plain text">
          <textarea
            value={bodyText}
            onChange={e => setBodyText(e.target.value)}
            rows={6}
            className="w-full px-3 py-2 border border-brand-near-black/15 rounded text-[12px] font-mono"
          />
        </Field>

        <div className="flex items-center gap-3 pt-2">
          <button
            onClick={onSave}
            disabled={pending}
            className="text-[12px] font-medium px-4 py-2.5 min-h-[44px] min-w-[44px] rounded-md bg-brand-near-black text-white hover:bg-brand-green disabled:opacity-50"
          >
            {pending ? 'Saving…' : savedAt ? 'Saved ✓' : 'Save changes'}
          </button>
          {err && <span className="text-[11px] text-coral">{err}</span>}
        </div>
      </div>

      <div className="space-y-3">
        <h2 className="font-outfit font-semibold text-[15px]">Preview</h2>

        {vars.length > 0 && (
          <Field label="Sample variable values">
            <div className="grid grid-cols-2 gap-2">
              {vars.map(v => (
                <label key={v} className="flex flex-col gap-1">
                  <span className="text-[10px] font-mono text-brand-near-black/55">{v}</span>
                  <input
                    value={previewVars[v] ?? ''}
                    onChange={e => setPreviewVars({ ...previewVars, [v]: e.target.value })}
                    className="px-2 py-1.5 min-h-[36px] border border-brand-near-black/15 rounded text-[12px]"
                  />
                </label>
              ))}
            </div>
          </Field>
        )}

        <div className="border border-brand-near-black/10 rounded-[8px] overflow-hidden bg-[#faf9f6]">
          <div className="px-3 py-2 text-[11px] uppercase tracking-[0.08em] text-brand-near-black/55 border-b border-brand-near-black/10">
            Subject
          </div>
          <div className="px-3 py-2 text-[13px] font-medium">{previewSubject}</div>
        </div>

        <div className="border border-brand-near-black/10 rounded-[8px] overflow-hidden bg-white">
          <div className="px-3 py-2 text-[11px] uppercase tracking-[0.08em] text-brand-near-black/55 border-b border-brand-near-black/10 bg-[#faf9f6]">
            HTML preview
          </div>
          {/*
            Render the template body in a sandboxed iframe so any <script>,
            event handlers, or remote loads in admin-authored HTML cannot
            execute in the admin's session. sandbox="" with no allow-* tokens
            disables JS, forms, top-nav, popups, and same-origin access.
          */}
          <iframe
            title="Email HTML preview"
            sandbox=""
            srcDoc={`<!doctype html><meta charset="utf-8"><base target="_blank"><style>body{font:13px/1.5 system-ui,-apple-system,Segoe UI,sans-serif;color:#2D2B2A;padding:14px;margin:0}a{color:#3D6B5A}</style>${previewHtml}`}
            className="w-full h-[260px] bg-white"
          />
        </div>

        <div className="border border-brand-near-black/10 rounded-[8px] overflow-hidden bg-white">
          <div className="px-3 py-2 text-[11px] uppercase tracking-[0.08em] text-brand-near-black/55 border-b border-brand-near-black/10 bg-[#faf9f6]">
            Plain text preview
          </div>
          <pre className="px-4 py-3 text-[12px] whitespace-pre-wrap font-mono">{previewText}</pre>
        </div>
      </div>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block text-[11px] uppercase tracking-[0.06em] text-brand-near-black/55 mb-1">{label}</span>
      {children}
    </label>
  )
}

function sampleFor(name: string): string {
  switch (name) {
    case 'first_name':      return 'Adam'
    case 'date':            return new Date().toLocaleDateString()
    case 'trial_end_date':  return new Date(Date.now() + 4 * 86400000).toLocaleDateString()
    case 'lead_count':      return '7'
    case 'lead_list_html':  return '<ul><li>Parkview Office Complex — score 94</li><li>Addison Corporate Park — score 88</li></ul>'
    case 'lead_list_text':  return '· Parkview Office Complex — score 94\n· Addison Corporate Park — score 88'
    case 'app_url':         return 'https://fetchi.ai'
    default:                return `<${name}>`
  }
}
