type Props = {
  size?: number
  className?: string
}

export function FetchiAvatar({ size = 28, className = '' }: Props) {
  return (
    <span
      className={`fetchi-avatar ${className}`}
      style={{ width: size, height: size, fontSize: Math.round(size * 0.5), lineHeight: 1 }}
      aria-hidden="true"
    >
      ツ
    </span>
  )
}
