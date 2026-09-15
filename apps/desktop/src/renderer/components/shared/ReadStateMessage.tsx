import type { ReactNode } from "react";
import { FOCUS_RING } from "../../focus.js";

const PAGE_CLASS = `bg-background p-8 text-foreground ${FOCUS_RING.join(" ")}`;

/**
 * A screen's non-`ready` state: a labelled `<main>` region carrying its title and one line, plus any
 * action that stays available in that state.
 */
export const ReadStateMessage = ({
  title,
  label,
  focusId,
  message,
  children,
}: {
  readonly title: string;
  readonly label: string;
  readonly focusId: string;
  readonly message: string;
  readonly children?: ReactNode;
}) => (
  <main className={PAGE_CLASS} tabIndex={-1} data-focus-id={focusId} aria-label={label}>
    <h1 className="text-2xl font-bold">{title}</h1>
    <p className="mt-4 text-text-secondary italic">{message}</p>
    {children}
  </main>
);
