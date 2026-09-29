import type { ReactNode } from "react";
import { FOCUS_RING } from "../focus.js";

const PAGE_CLASS = `p-8 text-foreground ${FOCUS_RING.join(" ")}`;

/**
 * The labelled `<main>` every state of this screen shares. `data-focus-id` and `aria-label` ride on
 * the frame rather than on a per-state element; the element the focus coordinator focuses on arrival
 * must still be the one on screen once the read resolves.
 */
export const BoardConfidenceFrame = ({ children }: { readonly children: ReactNode }) => (
  <main tabIndex={-1} data-focus-id="boardConfidence" aria-label="Board Confidence" className={PAGE_CLASS}>
    <h1 className="text-title">Board Confidence</h1>
    {children}
  </main>
);