import { FOCUS_RING } from "../focus.js";

/** Native `<select>` paint: the field surface, `text-data` and the single
 *  `FOCUS_RING` that `SelectTrigger` carries, so a native and a Base UI select
 *  read the same. */
export const SELECT_CLASS = `rounded-control border border-border-subtle bg-field-bg px-2 py-1 text-data ${FOCUS_RING.join(" ")}`;