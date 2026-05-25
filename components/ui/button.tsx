import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-semibold ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        // v2.1 — coral primary CTA. coralDeep on hover AND active/pressed
        // so the touch feedback matches the brand pressed-state spec.
        default:
          "bg-coral text-white hover:bg-coralDeep active:bg-coralDeep active:scale-[0.98]",
        destructive:
          "bg-bad text-white hover:bg-bad/90 active:bg-bad/90 active:scale-[0.98]",
        outline:
          "border border-text/15 bg-transparent text-text hover:bg-text/5 active:bg-text/10",
        secondary:
          "bg-surface text-text border border-text/10 hover:bg-raised active:bg-raised",
        ghost:
          "text-text hover:bg-text/5 active:bg-text/10",
        link:
          "text-blue underline-offset-4 hover:underline",
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
