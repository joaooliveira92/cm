/**
 * The tunable prefix timeout (global-key-map note AC-07: "~800ms, tuning
 * parameter"). Isolated so the prefix lifecycle and the live binding share one
 * knob and tests can model elapsed time without a real timer.
 */
let timeout = 800;

/** Read the current prefix timeout in milliseconds. */
export const prefixTimeoutMs = (): number => timeout;

/** Override for tests (and future per-destination tuning). Returns the prior value. */
export const setPrefixTimeoutMs = (ms: number): number => {
  const prior = timeout;
  timeout = ms;
  return prior;
};
