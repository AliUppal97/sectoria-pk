import { forwardRef, type InputHTMLAttributes, type LabelHTMLAttributes } from "react";
import { cn } from "../lib/utils";

/**
 * A visible field label. Per the UX rules, every field has a label above
 * it — placeholder text is never a substitute for a label.
 */
export const Label = forwardRef<
  HTMLLabelElement,
  LabelHTMLAttributes<HTMLLabelElement>
>(({ className, ...props }, ref) => (
  <label
    ref={ref}
    className={cn(
      "font-sans text-xs font-medium text-text-secondary",
      className,
    )}
    {...props}
  />
));
Label.displayName = "Label";

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  /** Mark the field invalid — switches the border to danger and sets aria-invalid. */
  invalid?: boolean;
  /** Use the monospace face + wider tracking for CNIC / NTN / serial inputs. */
  mono?: boolean;
}

/**
 * Text input per design spec §5.7. 38px tall (`h-9.5`), 8px radius, 1px
 * base border that turns navy on focus (a crisp ring, not a soft glow).
 * Set `mono` for CNIC/NTN/serial entry, `invalid` to show the error border.
 */
export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, invalid, mono, type, ...props }, ref) => (
    <input
      ref={ref}
      type={type ?? "text"}
      aria-invalid={invalid || undefined}
      className={cn(
        "h-9.5 w-full rounded-md border bg-surface-card px-3 font-sans text-sm text-text-primary",
        "placeholder:text-text-disabled",
        "transition-colors duration-150 ease-default",
        "focus-visible:outline-none focus-visible:border-border-focus focus-visible:ring-1 focus-visible:ring-border-focus",
        "disabled:opacity-45 disabled:cursor-not-allowed",
        invalid ? "border-danger" : "border-border-base",
        mono && "font-mono tracking-[0.05em]",
        className,
      )}
      {...props}
    />
  ),
);
Input.displayName = "Input";

export interface FieldErrorProps {
  children: React.ReactNode;
  id?: string;
}

/** Inline field error message — 12px danger text below the input (§5.7). */
export function FieldError({ children, id }: FieldErrorProps) {
  return (
    <p id={id} className="font-sans text-xs text-danger-text">
      {children}
    </p>
  );
}
