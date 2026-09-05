import { describe, expect, it } from "vitest";
import { Effect, Layer, Logger, References } from "effect";
import { handleRpc } from "../src/main/rpcServer.js";
import { withWideEvent, type WideEvent } from "../src/main/logging.js";

/** A capturing logger that records each structured wide event instead of writing
 *  to stdout, so tests assert on the emitted payload without touching real IO. */
const captureLayer = (events: Array<WideEvent>): Layer.Layer<never> =>
  Layer.merge(
    Logger.layer([
      // `Logger.layer` composes `Logger<unknown, unknown>`: a logger has to accept whatever the
      // runtime hands it, and `Effect.logInfo(event)` is variadic, so `message` arrives as the
      // array of logged arguments. Narrow to the wide events here rather than declaring a
      // `Logger<WideEvent, ...>` the runtime would never satisfy.
      Logger.make<unknown, void>(({ message }) => {
        for (const event of Array.isArray(message) ? message : [message]) {
          if (event && typeof event === "object" && "request_id" in event) {
            events.push(event as WideEvent);
          }
        }
      }),
    ]),
    Layer.succeed(References.MinimumLogLevel, "Debug"),
  );

const runLogged = async (
  effect: Effect.Effect<unknown, never>,
): Promise<Array<WideEvent>> => {
  const events: Array<WideEvent> = [];
  await Effect.runPromise(Effect.provide(effect, captureLayer(events)));
  return events;
};

const ctx = { savesDir: "/tmp/cm-test-saves", userDataDir: "/tmp/cm-test-data" };

describe("main-process RPC wide events", () => {
  it("emits exactly one success wide event through handleRpc for a successful handler", async () => {
    const events = await runLogged(handleRpc("ping", undefined, ctx));
    expect(events).toHaveLength(1);
    const event = events[0]!;
    expect(event.method).toBe("ping");
    expect(event.outcome).toBe("success");
    expect(event.request_id).toBeTruthy();
    expect(event.saveId).toBeNull();
    expect(event.errorTag).toBeNull();
    expect(event.errorMessage).toBeNull();
    expect(event.duration_ms).toBeGreaterThanOrEqual(0);
  });

  it("carries the saveId when a save-scoped method is wrapped", async () => {
    const events = await runLogged(
      withWideEvent(Effect.succeed("ok"), { method: "getSquad", saveId: "s1" }),
    );
    expect(events).toHaveLength(1);
    expect(events[0]!.saveId).toBe("s1");
    expect(events[0]!.method).toBe("getSquad");
  });

  it("emits exactly one error wide event tagging a failed handler", async () => {
    class SomeError extends Error {
      readonly _tag = "SomeError";
    }
    const failing = withWideEvent(Effect.fail(new SomeError("boom")), {
      method: "fakeMethod",
      saveId: "s1",
    });
    const events: Array<WideEvent> = [];
    await Effect.runPromise(Effect.provide(Effect.result(failing), captureLayer(events)));
    expect(events).toHaveLength(1);
    expect(events[0]!.method).toBe("fakeMethod");
    expect(events[0]!.outcome).toBe("error");
    expect(events[0]!.errorTag).toBe("SomeError");
    expect(events[0]!.errorMessage).toBe("boom");
  });

  it("logs the specific SQLite message behind a raw SqlError so a commit failure is diagnosable", async () => {
    class SqlError {
      readonly _tag = "SqlError";
      readonly reason: unknown;
      constructor(reason: unknown) {
        this.reason = reason;
      }
    }
    const sqlError = new SqlError({
      _tag: "ConstraintError",
      message: "Failed to execute statement",
      cause: { code: "ERR_SQLITE_ERROR", errstr: "UNIQUE constraint failed: manager_profile.id" },
    });
    const failing = withWideEvent(Effect.fail(sqlError), {
      method: "commitCareer",
      saveId: null,
    });
    const events: Array<WideEvent> = [];
    await Effect.runPromise(Effect.provide(Effect.result(failing), captureLayer(events)));
    expect(events[0]!.outcome).toBe("error");
    expect(events[0]!.errorTag).toBe("SqlError");
    // The dig prefers the specific SQLite `errstr` over the generic wrapper message.
    expect(events[0]!.errorMessage).toBe("UNIQUE constraint failed: manager_profile.id");
  });
});
