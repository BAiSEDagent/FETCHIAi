import * as React from "react"

import { cn } from "@/lib/utils"

const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.ComponentProps<"textarea">
>(({ className, ...props }, ref) => {
  return (
    <textarea
      className={cn(
        "flex min-h-[88px] w-full rounded-xl border border-brand-near-black/10 bg-brand-cream-muted px-3.5 py-3 text-[14px] leading-relaxed text-brand-near-black ring-offset-brand-parchment transition-colors placeholder:text-brand-near-black/40 focus-visible:outline-none focus-visible:border-brand-green focus-visible:ring-2 focus-visible:ring-brand-green/30 focus-visible:ring-offset-0 disabled:cursor-not-allowed disabled:opacity-50 resize-y",
        className
      )}
      ref={ref}
      {...props}
    />
  )
})
Textarea.displayName = "Textarea"

export { Textarea }
