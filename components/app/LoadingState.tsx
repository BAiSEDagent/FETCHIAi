import { cn } from '@/lib/utils'

export function LoadingState({
  label,
  className,
}: {
  label?: string
  className?: string
}) {
  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        'flex flex-col items-center justify-center gap-3 py-10 text-brand-near-black/60',
        className,
      )}
    >
      <div className="flex gap-1.5" aria-hidden>
        <span className="w-2 h-2 rounded-full bg-brand-green animate-bounce" />
        <span
          className="w-2 h-2 rounded-full bg-brand-green animate-bounce"
          style={{ animationDelay: '120ms' }}
        />
        <span
          className="w-2 h-2 rounded-full bg-brand-green animate-bounce"
          style={{ animationDelay: '240ms' }}
        />
      </div>
      {label && <div className="text-[13px]">{label}</div>}
    </div>
  )
}
