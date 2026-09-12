import { cva, type VariantProps } from "class-variance-authority";
import * as React from "react";

import { FOCUS_RING } from "../../focus.js";
import { cn } from "../../lib/utils.js";

const buttonVariants = cva(
  [
    "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-control font-medium",
    "transition-colors cursor-pointer",
    "disabled:cursor-not-allowed disabled:pointer-events-none disabled:opacity-50",
    "[&_svg]:pointer-events-none [&_svg]:size-3.5 [&_svg]:shrink-0",
    ...FOCUS_RING,
  ].join(" "),
  {
    variants: {
      variant: {
        /* The primary verb: gradient chrome, inverted when pressed. One per
           screen region — a second primary is a design bug. */
        default:
          "chrome-gradient border-2 border-panel-border-dark text-text-primary shadow-chrome hover:brightness-110 active:chrome-gradient-inverted",
        /* Everything else: Cancel, Retry, inline actions. Flat, no shadow. */
        secondary: "bg-surface-raised text-text-primary hover:bg-surface",
        outline: "border border-panel-border bg-panel-bg text-text-primary hover:bg-surface-raised",
        ghost: "text-text-body hover:bg-surface-raised hover:text-text-primary",
        destructive:
          "border border-destructive/40 bg-destructive/15 text-destructive hover:bg-destructive/25",
        link: "text-text-highlight underline-offset-4 hover:underline",
      },
      /* Sizes follow the compact density tier, not shadcn's 36px default. */
      size: {
        default: "h-7 px-3 py-1 text-xs",
        sm: "h-6 px-2 text-2xs",
        lg: "h-8 px-4 text-sm",
        icon: "h-7 w-7",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends React.ComponentPropsWithoutRef<"button">, VariantProps<typeof buttonVariants> {
  ref?: React.Ref<HTMLButtonElement> | undefined;
}

/*
 * A native `<button>`, not `@base-ui/react`'s Button. Base UI writes an explicit
 * `tabindex="0"` onto the element, and the keyboard spine's level-1 contract is
 * that every control is *natively* focusable with no tabindex override — a
 * roving-tabindex composite is then the only thing in the renderer that sets
 * one, which is what makes an errant tab stop findable. Base UI's Button adds
 * nothing else here (it exists for non-`<button>` render targets), so the
 * spine's invariant wins. The variants below are the whole point of this file.
 */
const Button = ({ className, variant, size, ref, ...props }: ButtonProps) => {
  return (
    <button className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />
  );
};
Button.displayName = "Button";

export { Button, buttonVariants };
