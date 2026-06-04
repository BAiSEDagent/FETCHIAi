import { cn } from '@/lib/utils'
import { FetchiMark, type FetchiMarkTone } from './FetchiMark'

type FetchiWordmarkProps = {
  tone?: FetchiMarkTone
  markSize?: number
  className?: string
  showWordmark?: boolean
}

const TEXT_TONE: Record<FetchiMarkTone, string> = {
  dark: 'text-text',
  coral: 'text-[#1A0F0B]',
  mono: 'text-text',
  light: 'text-[#2D2B2A]',
}

export function FetchiWordmark({
  tone = 'dark',
  markSize = 28,
  className,
  showWordmark = true,
}: FetchiWordmarkProps) {
  return (
    <span
      className={cn('inline-flex min-w-0 items-center gap-2.5', className)}
      aria-label="Fetchi"
    >
      <FetchiMark tone={tone} size={markSize} className="flex-shrink-0" />
      {showWordmark ? (
        <span
          className={cn(
            'font-outfit text-[19px] font-extrabold leading-none tracking-normal lowercase',
            TEXT_TONE[tone],
          )}
        >
          fetchi
        </span>
      ) : null}
    </span>
  )
}
