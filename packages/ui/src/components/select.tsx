import * as SelectPrimitive from "@radix-ui/react-select";
import { Check, ChevronDown } from "lucide-react";
import { forwardRef } from "react";
import { cn } from "../lib/utils";

/**
 * Select built on Radix UI (design spec §5.7 form styling, §9 keyboard
 * accessibility). Radix provides keyboard operability, typeahead, and
 * focus management for free. Styled to match `Input`: 38px trigger, 8px
 * radius, navy focus ring.
 */
export const Select = SelectPrimitive.Root;
export const SelectGroup = SelectPrimitive.Group;
export const SelectValue = SelectPrimitive.Value;

export const SelectTrigger = forwardRef<
  React.ComponentRef<typeof SelectPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Trigger>
>(({ className, children, ...props }, ref) => (
  <SelectPrimitive.Trigger
    ref={ref}
    className={cn(
      "flex h-11 min-h-[44px] w-full cursor-pointer touch-manipulation items-center justify-between gap-2 rounded-md border border-border-base bg-surface-card px-3",
      "font-sans text-sm text-text-primary",
      "data-[placeholder]:text-text-disabled",
      "transition-colors duration-150 ease-default",
      "focus-visible:outline-none focus-visible:border-border-focus focus-visible:ring-1 focus-visible:ring-border-focus",
      "disabled:opacity-45 disabled:cursor-not-allowed",
      className,
    )}
    {...props}
  >
    {children}
    <SelectPrimitive.Icon asChild>
      <ChevronDown aria-hidden="true" className="h-4 w-4 text-text-tertiary" />
    </SelectPrimitive.Icon>
  </SelectPrimitive.Trigger>
));
SelectTrigger.displayName = "SelectTrigger";

export const SelectContent = forwardRef<
  React.ComponentRef<typeof SelectPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Content>
>(({ className, children, position = "popper", ...props }, ref) => (
  <SelectPrimitive.Portal>
    <SelectPrimitive.Content
      ref={ref}
      position={position}
      className={cn(
        "z-[150] min-w-[8rem] overflow-hidden rounded-lg border border-border-base bg-surface-elevated shadow-lg",
        "p-1 touch-manipulation",
        position === "popper" && "translate-y-1",
        className,
      )}
      {...props}
    >
      <SelectPrimitive.Viewport className="w-full">
        {children}
      </SelectPrimitive.Viewport>
    </SelectPrimitive.Content>
  </SelectPrimitive.Portal>
));
SelectContent.displayName = "SelectContent";

export const SelectItem = forwardRef<
  React.ComponentRef<typeof SelectPrimitive.Item>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Item>
>(({ className, children, ...props }, ref) => (
  <SelectPrimitive.Item
    ref={ref}
    className={cn(
      "relative flex min-h-[44px] w-full cursor-pointer touch-manipulation select-none items-center rounded-sm py-2 pl-3 pr-8",
      "font-sans text-sm text-text-primary outline-none",
      "data-[highlighted]:bg-surface-subtle data-[highlighted]:outline-none",
      "data-[disabled]:opacity-45 data-[disabled]:pointer-events-none",
      className,
    )}
    {...props}
  >
    <span className="absolute right-2 flex items-center justify-center">
      <SelectPrimitive.ItemIndicator>
        <Check aria-hidden="true" className="h-4 w-4 text-text-accent" />
      </SelectPrimitive.ItemIndicator>
    </span>
    <SelectPrimitive.ItemText>{children}</SelectPrimitive.ItemText>
  </SelectPrimitive.Item>
));
SelectItem.displayName = "SelectItem";
