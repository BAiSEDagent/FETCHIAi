import { LoaderCircle } from 'lucide-react'
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
        'flex flex-col items-center justify-center gap-3 py-10 text-text/60',
        className,
      )}
    >
      <LoaderCircle className="h-5 w-5 animate-spin text-fetchiAccent motion-reduce:animate-none" aria-hidden />
      {label && <div className="text-[13px]">{label}</div>}
    </div>
  )
}
