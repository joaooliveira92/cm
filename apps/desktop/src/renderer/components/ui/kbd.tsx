import * as React from "react";

import { cn } from "../../lib/utils.js";

interface KbdProps extends React.HTMLAttributes<HTMLElement> {
  ref?: React.Ref<HTMLElement> | undefined;
}

const Kbd = ({ className, ref, ...props }: KbdProps) => (
  <kbd
    ref={ref}
    className={cn(
      "pointer-events-none inline-flex select-none items-center gap-1 rounded-control border border-border-subtle bg-surface-raised px-1 py-0.5 font-mono text-2xs font-semibold leading-none text-text-strong",
      className,
    )}
    {...props}
  />
);
Kbd.displayName = "Kbd";

export { Kbd };
