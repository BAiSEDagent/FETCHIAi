'use client'

import { Menu } from 'lucide-react'
import { FetchiAvatar } from './FetchiAvatar'
import { Sidebar } from './Sidebar'
import { Button } from '@/components/ui/button'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet'

type Props = {
  leadsCount: number
  creditsSlot?: React.ReactNode
}

export function MobileHeader({ leadsCount, creditsSlot }: Props) {
  return (
    <header className="lg:hidden sticky top-0 z-40 bg-surface/95 backdrop-blur-xl border-b border-text/8 px-4 h-16 flex items-center justify-between">
      <div className="flex items-center gap-2.5 min-w-0">
        <FetchiAvatar size={30} />
        <span className="fetchi-wordmark text-[20px] text-text truncate">Fetchi</span>
      </div>
      <Sheet>
        <SheetTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="h-11 w-11 rounded-xl text-text hover:bg-text/[0.06]"
            aria-label="Open menu"
          >
            <Menu className="h-5 w-5" />
          </Button>
        </SheetTrigger>
        <SheetContent
          side="left"
          data-fetchi-theme-root
          className="theme-dark w-[220px] p-0 bg-surface text-text border-0"
        >
          <SheetHeader className="sr-only">
            <SheetTitle>Navigation</SheetTitle>
            <SheetDescription>Primary workspace and settings navigation.</SheetDescription>
          </SheetHeader>
          <Sidebar leadsCount={leadsCount} creditsSlot={creditsSlot} />
        </SheetContent>
      </Sheet>
    </header>
  )
}
