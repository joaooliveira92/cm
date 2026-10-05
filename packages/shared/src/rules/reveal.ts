/**
 * The one revealed-position cut law, shared by every reader of a match's timeline.
 *
 * The manager's revealed position is a count of Commentary Lines, not a minute (minutes are not
 * monotonic). The name for it is `RevealedEvents` in `@cm-clone/contracts`; it is typed here as a
 * plain `number | null` because `shared` cannot depend on that package. `revealedCut` is the clamp
 * law and `revealedAt` applies it; both are generic over the item, so the Match Event timeline, the
 * Match Player Line fold and any other reader cut with the one law rather than each re-wrapping its
 * own slice.
 */

/**
 * How many of `items` a revealed position includes (null: all of them), never past its end. A
 * position, not a minute, clamped so an over-long reveal still names the last real item rather than
 * indexing past it.
 */
export const revealedCut = <T>(items: ReadonlyArray<T>, revealed: number | null): number =>
  revealed === null ? items.length : Math.min(items.length, Math.max(0, revealed));

/**
 * The items a revealed position includes: the one way to apply {@link revealedCut}. A reader takes
 * the named position and calls this, rather than slicing to its own cut.
 */
export const revealedAt = <T>(items: ReadonlyArray<T>, revealed: number | null): ReadonlyArray<T> =>
  items.slice(0, revealedCut(items, revealed));
