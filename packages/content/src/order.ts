/**
 * Code-unit string order: the sort tie-break the pure packages use for ids and ISO dates.
 *
 * `localeCompare` reads the host's locale when it is given none, so the same seed could order the
 * same ids differently on another machine — "B" sorts after "a" in most locales and before it in
 * code-unit order, and "_" sorts before digits in ICU collation and after them here. The engineering
 * contract keeps the system locale out of `packages/shared` and `packages/game-engine`, and
 * `effect-lint` bans `localeCompare` there. Text shown to the manager is sorted at the renderer
 * edge, where the locale belongs.
 */
export const compareCodeUnits = (a: string, b: string): number => (a < b ? -1 : a > b ? 1 : 0);
