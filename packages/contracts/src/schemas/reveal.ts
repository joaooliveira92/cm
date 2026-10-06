import { Schema } from "effect";

/**
 * The manager's revealed position in a match: how many Commentary Lines the reveal has reached, or
 * `null` for the whole match. A Commentary Line is generated from one Match Event, so the count is
 * also a count of Match Events — but it is a position, never a minute: first-half stoppage runs
 * past 45, half time is stamped 45 and the second half restarts at 46.
 *
 * Branded at the wire and at the main-reader seams, so a reader there cannot take a bare
 * `number | null`. The cut law is `revealedCut`/`revealedAt` in `@cm-clone/shared`; those take a
 * plain count, because `shared` sits below `contracts` and cannot import this brand. The renderer
 * constructs the value with `RevealedEvents.make(lines.length)` as it shows each line.
 */
export const RevealedEvents = Schema.Finite.pipe(Schema.brand("RevealedEvents"));
export type RevealedEvents = Schema.Schema.Type<typeof RevealedEvents>;
