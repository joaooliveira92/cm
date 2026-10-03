/**
 * One row of a domain-bounded event stream (ADR-0007) before/after JSON (de)serialization.
 *
 * The pure record the deciders project over. It lives in the engine, not in `main`, because
 * `deriveMatchEvents` and the pitch/substitution folds are pure functions of a stream's contents;
 * the SQL that reads and writes rows of this shape stays in `apps/desktop/src/main/season/decider.ts`.
 */
export interface StreamEvent {
  readonly seq: number;
  readonly tag: string;
  readonly payload: unknown;
}
