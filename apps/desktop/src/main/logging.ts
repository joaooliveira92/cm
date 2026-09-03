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
}

const errorTagOf = (value: unknown): string | null => {
  if (value === null || typeof value !== "object") return null;
  const candidate = (value as { _tag?: unknown })["_tag"];
  return typeof candidate === "string" ? candidate : null;
};

const errorTagOfExit = <A, E>(exit: Exit.Exit<A, E>): string | null => {
  const failure = Exit.findErrorOption(exit);
  return Option.isSome(failure) ? errorTagOf(failure.value) : null;
};

const wideEvent = (
  requestId: string,
  meta: { readonly method: string; readonly saveId: string | null },
  outcome: "success" | "error",
  durationMs: number,
  errorTag: string | null,
): WideEvent => ({
  request_id: requestId,
  method: meta.method,
  saveId: meta.saveId,
  outcome,
  duration_ms: durationMs,
  errorTag,
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
          ? Effect.logInfo(wideEvent(requestId, meta, "success", durationMs, null))
          : Effect.logError(
              wideEvent(requestId, meta, "error", durationMs, errorTagOfExit(exit)),
            );
      }),
    );
  });
