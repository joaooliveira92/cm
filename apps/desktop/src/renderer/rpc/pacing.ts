/**
 * MatchDay hand-rolled pacing (ADR-0007 — the reveal pace and the fetch pace
 * are deliberately independent). These stay tuned constants, never SWR or
 * `Atom.stream`: converting the fetch to a managed refetch would couple the
 * fetch rate to the reveal rate.
 */

/** How often a new Commentary Line is revealed from the paced local queue. */
export const REVEAL_INTERVAL_MS = 350;

/** How often we poll `resumeSimulation` for the next chunk once the buffer runs low. */
export const POLL_INTERVAL_MS = 800;

/** Keep fetching ahead of the reveal pace once the buffer drops below this many lines. */
export const REFETCH_THRESHOLD = 5;