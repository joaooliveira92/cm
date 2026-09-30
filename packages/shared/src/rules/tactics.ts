/** How many starters every shape fields: the GK in slot 0, then ten outfield slots. */
export const STARTER_COUNT = 11;

/** How many named substitutes the match-day squad rule concedes (11 starters + this = 18). The
 *  competition rule is one knob until a league models its own; the Squad lineup bar and the
 *  Tactic's bench both key off it. */
export const BENCH_SIZE = 7;
export const MATCH_DAY_SQUAD_SIZE = STARTER_COUNT + BENCH_SIZE;

/** A bench with every slot empty — the default a fresh Tactic starts with. */
export const emptyBench = (): ReadonlyArray<null> => Array<null>(BENCH_SIZE).fill(null);
