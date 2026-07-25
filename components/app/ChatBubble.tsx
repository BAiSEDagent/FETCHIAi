import * as React from 'react'
import { cn } from '@/lib/utils'
import { FetchiAvatar } from './FetchiAvatar'

type Role = 'user' | 'assistant'

export function ChatBubble({
  role,
  children,
  trailing,
}: {
  role: Role
  children: React.ReactNode
  trailing?: React.ReactNode
}) {
  const isUser = role === 'user'
  return (
    <div data-fetchi-chat-bubble-v5 className={cn('flex items-start gap-2.5', isUser && 'flex-row-reverse')}>
      {isUser ? (
        <div
          className="mt-0.5 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-[var(--fetchi-accent-subtle)] text-[11px] font-semibold text-fetchiAccent"
          aria-hidden
        >
          You
        </div>
      ) : (
        <FetchiAvatar size={32} className="flex-shrink-0 mt-0.5" />
      )}
      <div className={cn('flex flex-col gap-2 max-w-[82%] lg:max-w-[68%]', isUser && 'items-end')}>
        <div
          className={cn(
            'whitespace-pre-wrap rounded-xl border px-4 py-2.5',
            isUser
              ? 'border-[var(--fetchi-accent-border)] bg-[var(--fetchi-accent-subtle)] text-[14px] leading-[1.55] text-text'
              : 'border-border bg-fetchiOverlay text-[14.5px] leading-[1.65] text-text',
          )}
        >
          {children}
        </div>
        {trailing && <div className="w-full">{trailing}</div>}
      </div>
    </div>
  )
}

export function ChatTypingIndicator() {
  return (
    <div className="flex gap-2.5 items-start" role="status" aria-live="polite">
      <FetchiAvatar size={32} className="flex-shrink-0" />
      <div className="flex gap-1.5 rounded-xl border border-border bg-fetchiOverlay px-4 py-3" aria-hidden="true">
        <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-fetchiAccent motion-reduce:animate-none" />
        <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-fetchiAccent motion-reduce:animate-none" style={{ animationDelay: '120ms' }} />
        <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-fetchiAccent motion-reduce:animate-none" style={{ animationDelay: '240ms' }} />
      </div>
      <span className="sr-only">Fetchi is typing</span>
    </div>
  )
}
