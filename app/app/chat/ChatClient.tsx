'use client'

import { useState, useRef, useEffect, useTransition } from 'react'
import { Mic, Send } from 'lucide-react'
import { sendChatMessage } from './actions'
import type { ChatMessage } from '@/lib/seed-chat'
import { ChatBubble, ChatTypingIndicator } from '@/components/app/ChatBubble'
import { LeadCard } from '@/components/app/LeadCard'
import { FetchiAvatar } from '@/components/app/FetchiAvatar'

type Props = {
  initialMessages: ChatMessage[]
  greetingName: string | null
  isEmptyRun: boolean
  sourcesChecked: number
  scoutingLocation?: string | null
  leadsReady?: number
}

export function ChatClient({ initialMessages, greetingName, isEmptyRun, leadsReady = 0 }: Props) {
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages)
  const [input, setInput] = useState('')
  const [pending, startTransition] = useTransition()
  const endRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    endRef.current?.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth' })
  }, [messages.length])

  function send() {
    const text = input.trim()
    if (!text || pending) return
    const userMsg: ChatMessage = { id: `u-${Date.now()}`, role: 'user', content: text, createdAt: new Date().toISOString() }
    setMessages(prev => [...prev, userMsg])
    setInput('')
    startTransition(async () => {
      try {
        const res = await sendChatMessage(text)
        setMessages(prev => [...prev, { id: `a-${Date.now()}`, role: 'assistant', content: res.reply, createdAt: res.at }])
      } catch {
        setMessages(prev => [...prev, { id: `e-${Date.now()}`, role: 'assistant', content: 'Something hiccupped — try that again in a moment.', createdAt: new Date().toISOString() }])
      }
    })
  }

  const hasInput = input.trim().length > 0
  const greetFirst = greetingName ? greetingName.split(' ')[0] : null

  return (
    <div data-fetchi-chat-v5 className="flex h-[calc(100vh-3.5rem)] flex-col bg-bg lg:h-screen">
      <div className="border-b border-border px-5 pb-4 pt-5 lg:px-7 lg:pb-5 lg:pt-6">
        <h1 className="font-fetchi text-h1 tracking-[-0.02em] text-text">{greetFirst ? `Hey, ${greetFirst}` : 'Fetchi'}</h1>
      </div>

      <div className="flex-1 overflow-y-auto px-4 lg:px-7 pb-6 space-y-5">
        <div className="flex items-center gap-3">
          <FetchiAvatar size={36} className="flex-shrink-0" />
          <div className="min-w-0">
            <div className="text-[14px] font-semibold leading-tight text-text">Fetchi</div>
            <div className="mt-0.5 flex items-center gap-1.5 text-[12.5px] text-text2">
              <span className="h-1.5 w-1.5 rounded-full bg-semanticGreen" aria-label="active" />
              Fetchi chat
              {leadsReady > 0 && <span className="text-textMuted">· {leadsReady} lead{leadsReady === 1 ? '' : 's'} ready</span>}
            </div>
          </div>
        </div>

        {isEmptyRun && (
          <div role="status" className="rounded-xl border border-border bg-surface px-5 py-4">
            <div className="text-[14px] font-semibold text-text mb-1">No strong lead to show yet</div>
            <div className="text-[12.5px] leading-relaxed text-text2">Send another message or fetch new leads when you are ready.</div>
          </div>
        )}

        {messages.map(m => (
          <ChatBubble key={m.id} role={m.role} trailing={m.leads && m.leads.length > 0 ? (
            <div className="flex flex-col gap-3 pt-1">
              {m.leads.map(l => <LeadCard key={l.opportunityId} href={`/app/leads/${l.opportunityId}`} businessName={l.businessName} signalLabel={l.signalLabel} score={l.score} location={l.location ?? null} whyNow={l.whyNow ?? null} ageLabel={l.ageLabel ?? null} evidenceChips={l.evidenceChips} variant="chat-hero" />)}
            </div>
          ) : undefined}>{m.content}</ChatBubble>
        ))}

        {pending && <ChatTypingIndicator />}
        <div ref={endRef} />
      </div>

      <div data-fetchi-chat-composer-v5 className="sticky bottom-0 border-t border-border bg-[var(--fetchi-bg-elevated)] px-3 pt-3 lg:px-5" style={{ paddingBottom: 'max(env(safe-area-inset-bottom), 12px)' }}>
        <div className="flex items-center gap-2">
          <button type="button" aria-label="Voice input (coming soon)" title="Voice input is not available yet" className="flex h-11 w-11 flex-shrink-0 cursor-not-allowed items-center justify-center rounded-lg border border-border bg-fetchiOverlay text-textMuted" disabled><Mic className="h-[18px] w-[18px]" /></button>
          <div className={`flex flex-1 items-center rounded-lg border bg-fetchiOverlay transition-colors focus-within:border-fetchiAccent focus-within:shadow-[var(--fetchi-focus-ring)] ${hasInput ? 'border-[var(--fetchi-accent-border)]' : 'border-border'}`}>
            <input value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() } }} placeholder="Ask Fetchi something…" className="flex-1 px-5 py-2.5 bg-transparent text-[14.5px] text-text placeholder:text-text/40 outline-none min-h-[44px]" aria-label="Message Fetchi" />
          </div>
          <button type="button" aria-label="Send message" onClick={send} disabled={pending || !hasInput} className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-lg bg-fetchiAccent text-white transition-colors hover:bg-[var(--fetchi-accent-hover)] active:bg-[var(--fetchi-accent-press)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fetchiAccent/55 disabled:cursor-not-allowed disabled:bg-fetchiOverlay disabled:text-textMuted"><Send className="h-[18px] w-[18px]" /></button>
        </div>
      </div>
    </div>
  )
}
