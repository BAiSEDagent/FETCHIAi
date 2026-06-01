type Props = {
  size?: number
  className?: string
}

export function FetchiAvatar({ size = 28, className = '' }: Props) {
  return (
    <span
      className={`inline-flex items-center justify-center rounded-[8px] bg-coral font-outfit font-extrabold ${className}`}
      style={{
        width: size,
        height: size,
        fontSize: size * 0.62,
        lineHeight: 1,
        letterSpacing: -0.5,
        color: '#1A0F0B',
      }}
      aria-hidden="true"
    >
      f
    </span>
  )
}
