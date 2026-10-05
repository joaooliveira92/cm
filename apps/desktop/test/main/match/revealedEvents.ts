import { RevealedEvents } from "@cm-clone/contracts";

/**
 * A raw revealed-event count as the named position (`RevealedEvents`) a reader takes; null is the
 * whole match. Tests build the brand the way the renderer does, so no reader is handed a bare
 * number.
 */
export const revealed = (count: number | null): RevealedEvents | null =>
  count === null ? null : RevealedEvents.make(count);
