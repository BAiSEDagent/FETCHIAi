import type * as React from 'react'

export type FetchiMarkTone = 'dark' | 'coral' | 'mono' | 'light'

type FetchiMarkProps = Omit<
  React.SVGProps<SVGSVGElement>,
  'children' | 'height' | 'viewBox' | 'width'
> & {
  tone?: FetchiMarkTone
  size?: number
  title?: string
}

const TONE_FILLS: Record<
  FetchiMarkTone,
  { top: string; middle: string; bottom: string }
> = {
  dark: {
    top: '#FF8A5B',
    middle: '#F45B3B',
    bottom: '#F45B3B',
  },
  coral: {
    top: '#1A0F0B',
    middle: '#1A0F0B',
    bottom: '#1A0F0B',
  },
  mono: {
    top: '#C9BFA8',
    middle: '#F7F3E8',
    bottom: '#F7F3E8',
  },
  light: {
    top: '#F45B3B',
    middle: '#F45B3B',
    bottom: '#F45B3B',
  },
}

export function FetchiMark({
  tone = 'dark',
  size = 28,
  title,
  'aria-label': ariaLabel,
  ...props
}: FetchiMarkProps) {
  const fills = TONE_FILLS[tone]
  const accessibleName = ariaLabel ?? title

  return (
    <svg
      viewBox="0 0 100 100"
      width={size}
      height={size}
      role={accessibleName ? 'img' : undefined}
      aria-label={accessibleName}
      aria-hidden={accessibleName ? undefined : true}
      focusable="false"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      {title ? <title>{title}</title> : null}
      <rect x="30" y="26" width="46" height="14" rx="3.5" fill={fills.top} />
      <rect x="30" y="44" width="34" height="14" rx="3.5" fill={fills.middle} />
      <rect x="30" y="62" width="18" height="14" rx="3.5" fill={fills.bottom} />
    </svg>
  )
}
