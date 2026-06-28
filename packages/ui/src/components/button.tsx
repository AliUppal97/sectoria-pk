import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { forwardRef, type ButtonHTMLAttributes } from "react";
import { cn } from "../lib/utils";

/**
 * Button variants per design spec §5.6. Variants encode intent, not
 * decoration: `success` is for confirming a money/escrow action, `danger`
 * for destructive actions. No gradients (design spec §10 hard ban).
 */
const buttonVariants = cva(
  cn(
    "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md font-sans font-semibold",
    "transition-all duration-150 ease-default",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-brand-navy-light",
    "active:scale-[0.98]",
    "disabled:opacity-45 disabled:cursor-not-allowed disabled:pointer-events-none",
  ),
  {
    variants: {
      variant: {
        primary: "bg-brand-navy text-text-inverse hover:bg-brand-navy-mid",
        success: "bg-brand-accent text-text-inverse hover:bg-brand-accent-dim",
        ghost:
          "bg-transparent text-text-secondary border border-border-base hover:bg-surface-subtle",
        destructive: "bg-danger text-text-inverse hover:opacity-90",
      },
      size: {
        // padding/size values use the 4px scale (value × 4px): 1.5=6px,
        // 2.25=9px, 3=12px, 4=16px, 5=20px — matching design spec §5.6.
        sm: "px-3 py-1.5 text-xs",
        default: "px-4 py-2.25 text-sm",
        lg: "px-5 py-3 text-base",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  /** Render as the child element (e.g. an `<a>`) instead of a `<button>`. */
  asChild?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, type, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        ref={ref}
        className={cn(buttonVariants({ variant, size }), className)}
        type={asChild ? undefined : (type ?? "button")}
        {...props}
      />
    );
  },
);
Button.displayName = "Button";

export { buttonVariants };
