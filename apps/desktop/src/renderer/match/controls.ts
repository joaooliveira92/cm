import { FOCUS_RING } from "../focus.js";

/** Native `<select>` paint. See the note in `table/TablePanel.tsx`. */
export const SELECT_CLASS = `rounded-control border border-border-subtle bg-field-bg px-2 py-1 ${FOCUS_RING.join(" ")}`;