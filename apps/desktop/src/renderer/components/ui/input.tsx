import * as React from "react";

import { FOCUS_RING } from "../../focus.js";
import { cn } from "../../lib/utils.js";
import { FIELD_INPUT } from "../../theme.js";

interface InputProps extends React.ComponentProps<"input"> {
  ref?: React.Ref<HTMLInputElement> | undefined;
}

const Input = ({ className, type, ref, ...props }: InputProps) => (
  <input
    ref={ref}
    type={type}
    className={cn(
      FIELD_INPUT,
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
