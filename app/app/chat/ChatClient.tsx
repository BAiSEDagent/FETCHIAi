'use client'

import { useState, useRef, useEffect, useTransition } from 'react'
import Link from 'next/link'
import { Mic, Send } from 'lucide-react'
import { sendChatMessage } from './actions'
import type { ChatMessage } from '@/lib/seed-chat'

type Props = {
  initialMessages: ChatMessage[]
  greetingName: string | null
  isEmptyRun: boolean
  sourcesChecked: number
}

function Bubble({ msg }: { msg: ChatMessage }) {
  const isUser = msg.role === 'user'
  return (
    <div className={`flex gap-2.5 items-start ${isUser ? 'flex-row-reverse' : ''}`}>
      <div
        className={`w-7 h-7 rounded-full flex items-center justify-center text-[12px] font-semibold flex-shrink-0 ${
          isUser
            ? 'bg-brand-near-black/12 text-brand-near-black/70 border border-brand-near-black/10'
            : 'bg-brand-green text-white'
        }`}
      >
        {isUser ? 'A' : 'ツ'}
      </div>
      <div className="max-w-[78%] space-y-2">
        <div
          className={`px-4 py-2.5 text-[13px] leading-[1.6] ${
            isUser
              ? 'bg-brand-near-black text-white rounded-[14px] rounded-tr-[4px]'
              : 'bg-white text-brand-near-black border border-brand-near-black/10 rounded-[14px] rounded-tl-[4px]'
          }`}
        >
          {msg.content}
        </div>
        {msg.leads && msg.leads.length > 0 && (
          <div className="flex flex-col gap-2">
            {msg.leads.map(l => (
              <Link
                key={l.opportunityId}
                href={`/app/leads/${l.opportunityId}`}
                className="bg-[#F0EDE4] border border-brand-near-black/10 rounded-xl px-4 py-3 flex items-center justify-between gap-3 hover:border-brand-green hover:bg-brand-light transition-colors"
              >
                <div className="min-w-0 flex-1">
                  <div className="text-[13px] font-semibold text-brand-near-black truncate">
                    {l.businessName}
                  </div>
                  <div className="text-[11px] text-brand-near-black/55 flex items-center gap-1.5 mt-0.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-brand-green" />
                    {l.signalLabel}
                  </div>
                </div>
                <span className="text-[11px] font-bold rounded-full px-2.5 py-1 bg-brand-light text-brand-dark border border-brand-green/20 flex-shrink-0">
                  {l.score}
                </span>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
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

  return (
    <div className="flex flex-col h-[calc(100vh-3.5rem)] lg:h-screen">
      <div className="px-5 py-4 border-b border-brand-near-black/8 bg-white">
        <div className="font-outfit text-lg text-brand-near-black">
          {greetingName ? `Hey, ${greetingName.split(' ')[0]}` : 'Welcome to Fetchi'}
        </div>
        <div className="text-xs text-brand-near-black/55">
          Ask for leads, draft outreach, or tell ツ what you&apos;re working on.
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 lg:px-6 py-5 space-y-4 bg-brand-parchment">
        {isEmptyRun && (
          <div
            role="status"
            className="mx-auto max-w-md rounded-2xl border border-brand-near-black/10 bg-white px-4 py-3 text-center text-[12px] text-brand-near-black/70 shadow-sm"
          >
            <div className="font-semibold text-brand-near-black mb-0.5">
              Fetchi checked {sourcesChecked} sources
            </div>
            <div>
              Nothing strong enough to surface yet — ツ will keep listening and
              ping you the moment a real signal lands.
            </div>
          </div>
        )}
        {messages.map(m => (
          <Bubble key={m.id} msg={m} />
        ))}
        {pending && (
          <div className="flex gap-2.5 items-start">
            <div className="w-7 h-7 rounded-full bg-brand-green text-white text-[12px] font-semibold flex items-center justify-center">
              ツ
            </div>
            <div className="bg-white border border-brand-near-black/10 rounded-[14px] rounded-tl-[4px] px-4 py-3 flex gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-brand-green animate-bounce" />
              <span
                className="w-1.5 h-1.5 rounded-full bg-brand-green animate-bounce"
                style={{ animationDelay: '120ms' }}
              />
              <span
                className="w-1.5 h-1.5 rounded-full bg-brand-green animate-bounce"
                style={{ animationDelay: '240ms' }}
              />
            </div>
          </div>
        )}
        <div ref={endRef} />
      </div>

      <div className="border-t border-brand-near-black/8 bg-white px-3 py-3 flex items-center gap-2 sticky bottom-0">
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
          className="flex-1 px-4 py-2.5 border-2 border-brand-near-black/12 rounded-full text-[13px] bg-[#F0EDE4] focus:bg-white focus:border-brand-green outline-none min-h-[44px]"
        />
        <button
          type="button"
          aria-label="Voice input (coming soon)"
          title="Voice input lands in Checkpoint 10"
          className="h-11 w-11 rounded-full bg-brand-near-black/6 border border-brand-near-black/10 flex items-center justify-center text-brand-near-black/60 cursor-not-allowed"
          disabled
        >
          <Mic className="h-4 w-4" />
        </button>
        <button
          type="button"
          aria-label="Send message"
          onClick={send}
          disabled={pending || !input.trim()}
          className="h-11 w-11 rounded-full bg-brand-green hover:bg-brand-dark text-white flex items-center justify-center disabled:opacity-50"
        >
          <Send className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}
