import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-semibold ring-offset-brand-parchment transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-green/40 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default:
          "bg-brand-near-black text-white hover:bg-brand-green active:bg-brand-green active:scale-[0.98]",
        destructive:
          "bg-brand-coral text-white hover:bg-brand-coral/90 active:bg-brand-coral/90 active:scale-[0.98]",
        outline:
          "border border-brand-near-black/15 bg-transparent text-brand-near-black hover:bg-brand-cream active:bg-brand-cream-muted",
        secondary:
          "bg-brand-cream text-brand-near-black border border-brand-near-black/10 hover:bg-brand-cream-muted active:bg-brand-cream-muted",
        ghost:
          "text-brand-near-black hover:bg-brand-near-black/5 active:bg-brand-near-black/10",
        link:
          "text-brand-green underline-offset-4 hover:underline",
      },
      size: {
        default: "h-11 px-5 py-2",
        sm: "h-10 rounded-xl px-4 text-[13px]",
        lg: "h-12 rounded-xl px-7 text-[15px]",
        icon: "h-11 w-11 rounded-xl",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
