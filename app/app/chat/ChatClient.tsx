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
}

export function ChatClient({
  initialMessages,
  greetingName,
  isEmptyRun,
  sourcesChecked,
}: Props) {
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages)
  const [input, setInput] = useState('')
  const [pending, startTransition] = useTransition()
  const endRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages.length])

  function send() {
    const text = input.trim()
    if (!text || pending) return
    const userMsg: ChatMessage = {
      id: `u-${Date.now()}`,
      role: 'user',
      content: text,
      createdAt: new Date().toISOString(),
    }
    setMessages(prev => [...prev, userMsg])
    setInput('')
    startTransition(async () => {
      try {
        const res = await sendChatMessage(text)
        setMessages(prev => [
          ...prev,
          {
            id: `a-${Date.now()}`,
            role: 'assistant',
            content: res.reply,
            createdAt: res.at,
          },
        ])
      } catch {
        setMessages(prev => [
          ...prev,
          {
            id: `e-${Date.now()}`,
            role: 'assistant',
            content: 'Something hiccupped — try that again in a moment.',
            createdAt: new Date().toISOString(),
          },
        ])
      }
    })
  }

  const hasInput = input.trim().length > 0

  return (
    <div className="flex flex-col h-[calc(100vh-3.5rem)] lg:h-screen bg-brand-parchment">
      <div className="px-5 lg:px-7 pt-5 pb-4 bg-brand-cream">
        <div className="font-outfit text-[20px] lg:text-[22px] font-semibold text-brand-near-black">
          {greetingName ? `Hey, ${greetingName.split(' ')[0]}` : 'Welcome to Fetchi'}
        </div>
        <div className="text-[13px] text-brand-near-black/60 mt-0.5">
          Ask for leads, draft outreach, or tell ツ what you&apos;re working on.
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 lg:px-7 py-6 space-y-5">
        {isEmptyRun && (
          <div
            role="status"
            className="mx-auto max-w-md rounded-2xl bg-brand-cream shadow-fetchi-soft px-5 py-4 text-center"
          >
            <div className="text-[14px] font-semibold text-brand-near-black mb-1">
              Fetchi checked {sourcesChecked} sources
            </div>
            <div className="text-[12.5px] text-brand-near-black/65 leading-relaxed">
              Nothing strong enough to surface yet — ツ will keep listening and
              ping you the moment a real signal lands.
            </div>
          </div>
        )}

        {messages.map(m => (
          <ChatBubble
            key={m.id}
            role={m.role}
            trailing={
              m.leads && m.leads.length > 0 ? (
                <div className="flex flex-col gap-2 pt-1">
                  {m.leads.map(l => (
                    <LeadCard
                      key={l.opportunityId}
                      href={`/app/leads/${l.opportunityId}`}
                      businessName={l.businessName}
                      signalLabel={l.signalLabel}
                      score={l.score}
                      variant="chat"
                    />
                  ))}
                </div>
              ) : undefined
            }
          >
            {m.content}
          </ChatBubble>
        ))}

        {pending && <ChatTypingIndicator />}

        <div ref={endRef} />
      </div>

      <div
        className="sticky bottom-0 bg-brand-cream shadow-fetchi-sticky px-3 lg:px-5 pt-3"
        style={{ paddingBottom: 'max(env(safe-area-inset-bottom), 12px)' }}
      >
        <div className="flex items-center gap-2">
          <button
            type="button"
            aria-label="Voice input (coming soon)"
            title="Voice input lands in Checkpoint 10"
            className="h-11 w-11 rounded-full bg-white border border-brand-near-black/10 flex items-center justify-center text-brand-near-black/45 cursor-not-allowed flex-shrink-0"
            disabled
          >
            <Mic className="h-[18px] w-[18px]" />
          </button>

          <div
            className={`flex-1 flex items-center bg-white rounded-full border transition-colors ${
              hasInput
                ? 'border-brand-green/60'
                : 'border-brand-near-black/10 focus-within:border-brand-green'
            }`}
          >
            <input
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  send()
                }
              }}
              placeholder="Ask ツ something…"
              className="flex-1 px-5 py-2.5 bg-transparent text-[14.5px] text-brand-near-black placeholder:text-brand-near-black/40 outline-none min-h-[44px]"
              aria-label="Message Fetchi"
            />
          </div>

          <button
            type="button"
            aria-label="Send message"
            onClick={send}
            disabled={pending || !hasInput}
            className={`h-11 w-11 rounded-full text-white flex items-center justify-center transition-colors flex-shrink-0 disabled:opacity-50 ${
              hasInput
                ? 'bg-brand-green hover:bg-brand-dark'
                : 'bg-brand-near-black hover:bg-brand-green'
            }`}
          >
            <Send className="h-[18px] w-[18px]" />
          </button>
        </div>
      </div>
    </div>
  )
}
