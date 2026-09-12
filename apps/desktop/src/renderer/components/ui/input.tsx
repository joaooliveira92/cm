import * as React from "react";

import { FOCUS_RING } from "../../focus.js";
import { cn } from "../../lib/utils.js";

interface InputProps extends React.ComponentProps<"input"> {
  ref?: React.Ref<HTMLInputElement> | undefined;
}

const Input = ({ className, type, ref, ...props }: InputProps) => (
  <input
    ref={ref}
    type={type}
    className={cn(
      // Fields are opaque on purpose: typed characters must read against an
      // unwashed surface, not through a semi-transparent panel.
      "flex h-7 w-full rounded-control border border-border-subtle bg-field-bg px-2 py-1 text-xs transition-colors",
      "placeholder:text-text-muted",
      "disabled:cursor-not-allowed disabled:opacity-50",
      ...FOCUS_RING,
      className,
    )}
    {...props}
  />
);
Input.displayName = "Input";

export { Input };
