import * as React from "react"

import { cn } from "@/lib/utils"

const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.ComponentProps<"textarea">
>(({ className, ...props }, ref) => {
  return (
    <textarea
      className={cn(
        "flex min-h-[88px] w-full rounded-xl border border-text/10 bg-raised px-3.5 py-3 text-[14px] leading-relaxed text-text ring-offset-background transition-colors placeholder:text-text/40 focus-visible:outline-none focus-visible:bg-white focus-visible:border-ok focus-visible:ring-2 focus-visible:ring-coral/30 focus-visible:ring-offset-0 disabled:cursor-not-allowed disabled:opacity-50 resize-y",
        className
      )}
      ref={ref}
      {...props}
    />
  )
})
Textarea.displayName = "Textarea"

export { Textarea }
