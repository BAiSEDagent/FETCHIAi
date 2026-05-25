'use client'

import { useState, useRef, useEffect, useTransition } from 'react'
import { Mic, Send } from 'lucide-react'
import { sendChatMessage } from './actions'
import type { ChatMessage } from '@/lib/seed-chat'
import { ChatBubble, ChatTypingIndicator } from '@/components/app/ChatBubble'
import { LeadCard } from '@/components/app/LeadCard'

type Props = {
  initialMessages: ChatMessage[]
  greetingName: string | null
  isEmptyRun: boolean
  sourcesChecked: number
  scoutingLocation?: string | null
  leadsReady?: number
}

export function ChatClient({ initialMessages, greetingName, isEmptyRun, sourcesChecked, scoutingLocation, leadsReady = 0 }: Props) {
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages)
  const [input, setInput] = useState('')
  const [pending, startTransition] = useTransition()
  const endRef = useRef<HTMLDivElement>(null)

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages.length])

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
    <div className="flex flex-col h-[calc(100vh-3.5rem)] lg:h-screen bg-bg">
      <div className="px-5 lg:px-7 pt-6 lg:pt-7 pb-5">
        <h1 className="font-outfit text-h1 lg:text-[32px] text-text">{greetFirst ? `Hey, ${greetFirst}` : 'Fetchi'}</h1>
      </div>

      <div className="flex-1 overflow-y-auto px-4 lg:px-7 pb-6 space-y-5">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-ok text-white text-[12px] font-bold flex items-center justify-center flex-shrink-0" aria-hidden>ツ</div>
          <div className="min-w-0">
            <div className="text-[14px] font-bold text-text leading-tight">Fetchi</div>
            <div className="text-[12.5px] text-text/60 mt-0.5 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-ok" aria-label="active" />
              {scoutingLocation ? `Scouting ${scoutingLocation}` : 'Listening for signals'}
              {leadsReady > 0 && <span className="text-text/45">· {leadsReady} lead{leadsReady === 1 ? '' : 's'} ready</span>}
            </div>
          </div>
        </div>

        {isEmptyRun && (
          <div role="status" className="rounded-2xl bg-surface shadow-fetchi-soft px-5 py-4">
            <div className="text-[14px] font-semibold text-text mb-1">Fetchi checked {sourcesChecked} sources</div>
            <div className="text-[12.5px] text-text/65 leading-relaxed">Nothing strong enough to surface yet — ツ will keep listening and ping you the moment a real signal lands.</div>
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

      <div className="sticky bottom-0 bg-surface shadow-fetchi-sticky px-3 lg:px-5 pt-3" style={{ paddingBottom: 'max(env(safe-area-inset-bottom), 12px)' }}>
        <div className="flex items-center gap-2">
          <button type="button" aria-label="Voice input (coming soon)" title="Voice input lands in Checkpoint 10" className="h-11 w-11 rounded-full bg-raised border border-text/10 flex items-center justify-center text-text/45 cursor-not-allowed flex-shrink-0" disabled><Mic className="h-[18px] w-[18px]" /></button>
          <div className={`flex-1 flex items-center bg-raised rounded-full border transition-colors ${hasInput ? 'border-coral/60' : 'border-text/10 focus-within:border-blue'}`}>
            <input value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() } }} placeholder="Ask ツ something…" className="flex-1 px-5 py-2.5 bg-transparent text-[14.5px] text-text placeholder:text-text/40 outline-none min-h-[44px]" aria-label="Message Fetchi" />
          </div>
          <button type="button" aria-label="Send message" onClick={send} disabled={pending || !hasInput} className={`h-11 w-11 rounded-full text-white flex items-center justify-center transition-colors flex-shrink-0 disabled:opacity-50 ${hasInput ? 'bg-coral hover:bg-coralDeep' : 'bg-text/10 hover:bg-coral'}`}><Send className="h-[18px] w-[18px]" /></button>
        </div>
      </div>
    </div>
  )
}
