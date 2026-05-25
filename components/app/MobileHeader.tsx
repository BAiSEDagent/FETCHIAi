'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Menu } from 'lucide-react'
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet'
import { FetchiAvatar } from './FetchiAvatar'
import { Sidebar } from './Sidebar'
import { SignOutControl } from './SignOutControl'

type Props = {
  leadsCount: number
  creditsSlot?: React.ReactNode
}

export function MobileHeader({ leadsCount, creditsSlot }: Props) {
  const [open, setOpen] = useState(false)

  return (
    <header className="lg:hidden sticky top-0 z-30 bg-surface flex items-center justify-between px-2 h-14 shadow-fetchi-sticky">
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild>
          <button
            aria-label="Open menu"
            className="h-11 w-11 flex items-center justify-center text-text/75 hover:text-text rounded-xl hover:bg-text/5 transition-colors"
          >
            <Menu className="h-5 w-5" />
          </button>
        </SheetTrigger>
        <SheetContent
          side="left"
          className="theme-dark w-[220px] p-0 bg-surface text-text border-0"
        >
          <Sidebar
            leadsCount={leadsCount}
            creditsSlot={creditsSlot}
            onNavigate={() => setOpen(false)}
          />
        </SheetContent>
      </Sheet>

      <Link
        href="/app/chat"
        className="flex items-center gap-2 hover:opacity-90 transition-opacity"
      >
        <FetchiAvatar size={24} />
        <span className="fetchi-wordmark text-[18px] text-text">Fetchi</span>
      </Link>

      <SignOutControl variant="mobile-header" />
    </header>
  )
}
