import { FetchiMark } from '@/components/brand'

type Props = {
  size?: number
  className?: string
}

export function FetchiAvatar({ size = 28, className = '' }: Props) {
  return (
    <span
      className={`inline-flex items-center justify-center rounded-[8px] border border-text/[0.06] bg-[var(--fetchi-overlay)] ${className}`}
      style={{
        width: size,
        height: size,
        lineHeight: 1,
      }}
      aria-hidden="true"
    >
      <FetchiMark tone="dark" size={size} />
    </span>
  )
}
