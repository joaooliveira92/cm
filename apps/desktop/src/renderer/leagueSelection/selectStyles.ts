import { FOCUS_RING } from "../focus.js";

/*
 * These sizing/paint tokens are shared by every Base UI Select trigger on this
 * screen. The primitive (`components/ui/select.tsx`) supplies the popup listbox;
 * `aria-label`s on the triggers carry the accessible names.
 */
export const SELECT_CLASS = `mt-1 rounded-control border border-border-subtle bg-field-bg px-2 py-1 text-sm ${FOCUS_RING.join(" ")}`;
export const SELECT_CLASS_COMPACT = `rounded-control border border-border-subtle bg-field-bg px-1 py-0.5 text-text-primary ${FOCUS_RING.join(" ")}`;
