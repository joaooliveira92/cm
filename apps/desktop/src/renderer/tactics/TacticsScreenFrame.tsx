import type { ReactNode } from "react";
import { FOCUS_RING } from "../focus.js";

/** The screen's `<main>` shell. Message states share the plain frame; the workspace adds the
 *  full-height flex layout. */
export const TacticsScreenFrame = ({
  children,
  variant,
}: {
  readonly children: ReactNode;
  readonly variant: "message" | "workspace";
}) => (
  <main
    tabIndex={-1}
    data-focus-id="tactics"
    aria-label="Tactics"
    className={
      variant === "workspace"
        ? `flex min-h-0 flex-1 flex-col gap-0 p-3 text-foreground ${FOCUS_RING.join(" ")}`
        : `p-8 text-foreground ${FOCUS_RING.join(" ")}`
    }
  >
    {children}
  </main>
);
