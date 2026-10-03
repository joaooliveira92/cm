/**
 * The career route surfaces, one responsibility per file under `career/`. This
 * module stays the path everything imports them through — the route tree in
 * `router/index.tsx` and the specs reach `router/career.js` — so the
 * decomposition did not move a single import.
 */
export * from "./career/index.js";