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
    <div className={cn('flex gap-2.5 items-start', isUser && 'flex-row-reverse')}>
      {isUser ? (
        <div
          className="w-8 h-8 rounded-full flex items-center justify-center text-[12px] font-bold flex-shrink-0 mt-0.5 bg-text/10 text-text"
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
            'px-4 py-2.5 whitespace-pre-wrap',
            isUser
              ? 'bg-text/10 text-text rounded-2xl rounded-tr-md text-[14px] leading-[1.55]'
              : 'bg-raised text-text rounded-2xl rounded-tl-md text-[14.5px] leading-[1.65]',
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
    <div className="flex gap-2.5 items-start">
      <FetchiAvatar size={32} className="flex-shrink-0" />
      <div className="bg-raised rounded-2xl rounded-tl-md px-4 py-3 flex gap-1.5">
        <span className="w-1.5 h-1.5 rounded-full bg-ok animate-bounce" />
        <span className="w-1.5 h-1.5 rounded-full bg-ok animate-bounce" style={{ animationDelay: '120ms' }} />
        <span className="w-1.5 h-1.5 rounded-full bg-ok animate-bounce" style={{ animationDelay: '240ms' }} />
      </div>
    </div>
  )
}
