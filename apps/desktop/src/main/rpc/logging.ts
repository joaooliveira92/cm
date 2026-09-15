import { Effect, Exit, Layer, Logger, Option, References, type LogLevel } from "effect";

const VALID_LEVELS: ReadonlySet<string> = new Set([
  "All",
  "Fatal",
  "Error",
  "Warn",
  "Info",
  "Debug",
  "Trace",
  "None",
]);

const minimumLogLevel = (): LogLevel.LogLevel => {
  const raw = process.env["CMC_LOG_LEVEL"];
  return raw && VALID_LEVELS.has(raw) ? (raw as LogLevel.LogLevel) : "Debug";
};

/** Installs the single JSON logger (wide events to stdout) with the startup
 *  minimum level (default Debug; override via CMC_LOG_LEVEL). One logger,
 *  provided at the run edge and imported everywhere, per the repo's wide-event
 *  logging convention. */
export const LoggerLayer: Layer.Layer<never> = Layer.merge(
  Logger.layer([Logger.consoleJson]),
  Layer.succeed(References.MinimumLogLevel, minimumLogLevel()),
);

/** The structured wide event emitted once per RPC request at completion. */
export interface WideEvent {
  readonly request_id: string;
  readonly method: string;
  readonly saveId: string | null;
  readonly outcome: "success" | "error";
  readonly duration_ms: number;
  readonly errorTag: string | null;
  /** A human-readable extract of the failure, when one exists — e.g. the SQLite
   *  message behind a `SqlError` — so a handler failure is diagnosable from the
   *  log instead of collapsing to an opaque "unexpected response" at the edge. */
  readonly errorMessage: string | null;
}

const errorTagOf = (value: unknown): string | null => {
  if (value === null || typeof value !== "object") return null;
  const candidate = (value as { _tag?: unknown })["_tag"];
  return typeof candidate === "string" ? candidate : null;
};

/**
 * Picks the most specific human-readable message from a thrown failure. SQL
 * errors nest the meaningful text (`SqlError` -> `reason` -> `cause` -> `errstr`,
 * or `operation`) under a generic top-level `message`, so this digs down rather
 * than returning "Failed to execute statement" for every one.
 */
const errorMessageOf = (value: unknown): string | null => {
  const dig = (v: unknown, depth: number): string | null => {
    if (v === null || typeof v !== "object" || depth > 6) return null;
    const c = v as { message?: unknown; reason?: unknown; cause?: unknown; errstr?: unknown; operation?: unknown };
    if (typeof c.errstr === "string" && c.errstr.length > 0) return c.errstr;
    if (c.reason !== undefined) {
      const nested = dig(c.reason, depth + 1);
      if (nested !== null) return nested;
    }
    if (c.cause !== undefined) {
      const nested = dig(c.cause, depth + 1);
      if (nested !== null) return nested;
    }
    if (typeof c.operation === "string" && c.operation.length > 0) return c.operation;
    if (typeof c.message === "string" && c.message.length > 0) return c.message;
    return null;
  };
  return dig(value, 0);
};

const errorTagOfExit = <A, E>(exit: Exit.Exit<A, E>): { readonly tag: string | null; readonly message: string | null } => {
  const failure = Exit.findErrorOption(exit);
  if (Option.isNone(failure)) return { tag: null, message: null };
  return { tag: errorTagOf(failure.value), message: errorMessageOf(failure.value) };
};

const wideEvent = (
  requestId: string,
  meta: { readonly method: string; readonly saveId: string | null },
  outcome: "success" | "error",
  durationMs: number,
  error: { readonly tag: string | null; readonly message: string | null },
): WideEvent => ({
  request_id: requestId,
  method: meta.method,
  saveId: meta.saveId,
  outcome,
  duration_ms: durationMs,
  errorTag: error.tag,
  errorMessage: outcome === "error" ? error.message : null,
});

/**
 * Wraps a handler effect so it emits exactly one wide event at completion: a
 * single `info` line on success, a single `error` line on failure, both carrying
 * the request identity, outcome, and duration. Handlers stay untouched — this is
 * the middleware-style boundary. `onExit` runs once, uninterruptibly, on the full
 * `Exit`, so the wide event is emitted exactly once per request.
 */
export const withWideEvent = <A, E, R>(
  effect: Effect.Effect<A, E, R>,
  meta: { readonly method: string; readonly saveId: string | null },
): Effect.Effect<A, E, R> =>
  Effect.suspend(() => {
    const start = Date.now();
    const requestId = crypto.randomUUID();
    return effect.pipe(
      Effect.onExit((exit) => {
        const durationMs = Math.max(0, Date.now() - start);
        return Exit.isSuccess(exit)
          ? Effect.logInfo(wideEvent(requestId, meta, "success", durationMs, { tag: null, message: null }))
          : Effect.logError(
              wideEvent(requestId, meta, "error", durationMs, errorTagOfExit(exit)),
            );
      }),
    );
  });
