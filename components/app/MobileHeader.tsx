'use client'

import { Menu } from 'lucide-react'
import { FetchiWordmark } from '@/components/brand'
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
    <header className="lg:hidden sticky top-0 z-40 bg-[var(--fetchi-bg-elevated)]/95 backdrop-blur-xl border-b border-text/[0.06] px-3 h-12 flex items-center justify-between">
      <FetchiWordmark markSize={26} className="min-w-0" />
      <Sheet>
        <SheetTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="fetchi-focus-ring min-h-[44px] min-w-[44px] h-11 w-11 rounded-lg text-text hover:bg-[var(--fetchi-overlay-hover)]"
            aria-label="Open menu"
          >
            <Menu className="h-5 w-5" />
          </Button>
        </SheetTrigger>
        <SheetContent
          side="left"
          data-fetchi-theme-root
          data-fetchi-brand-system="v5"
          data-fetchi-reduced-motion-sheet
          className="fetchi-app theme-dark w-[224px] p-0 bg-[var(--fetchi-bg-elevated)] text-text border-0"
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
