import { Schema } from "effect";

/**
 * The manager's revealed position in a match: how many Commentary Lines the reveal has reached, or
 * `null` for the whole match. A Commentary Line is generated from one Match Event, so the count is
 * also a count of Match Events — but it is a position, never a minute: first-half stoppage runs
 * past 45, half time is stamped 45 and the second half restarts at 46.
 *
 * Branded so no reader accepts a bare `number | null`. The one cut law is `revealedAt` in
 * `@cm-clone/shared`; the renderer constructs the value with `RevealedEvents.make(lines.length)` as
 * it shows each line, and every main-side reader takes that named position to the law.
 */
export const RevealedEvents = Schema.Finite.pipe(Schema.brand("RevealedEvents"));
export type RevealedEvents = Schema.Schema.Type<typeof RevealedEvents>;
