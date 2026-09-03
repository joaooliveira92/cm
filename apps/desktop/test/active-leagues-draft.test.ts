import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { AdvancedOptionsPayload } from "@cm-clone/contracts";
import { defaultAdvancedOptions } from "@cm-clone/shared";
import { createDraftSaver, type DraftPayload } from "../src/renderer/activeLeagues/draft.js";
import {
  begin,
  fail,
  failureMessage,
  idleOperation,
  isPending,
  succeed,
} from "../src/renderer/activeLeagues/operation.js";

/**
 * The two lifecycles behind the Active Leagues screen, tested where they live rather than through
 * a React tree: debouncing, superseding, and disposal are timing behaviour, and asserting them
 * through rendered output would make the test about the render schedule instead.
 *
 * What is asserted here is external: how many writes reached the boundary, which payload the
 * saver reports as the latest one that landed, and whether a second submission can start.
 */

const options: AdvancedOptionsPayload = defaultAdvancedOptions() as AdvancedOptionsPayload;

const payload = (nationId: string): DraftPayload => ({
  intents: [{ nationId, mode: "playable", source: "user" }] as never,
  advancedOptions: options,
});

describe("the draft saver", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("folds a burst of edits into one write, carrying the newest payload", async () => {
    const written: DraftPayload[] = [];
    const saver = createDraftSaver({
      delayMs: 50,
      save: async (draft) => {
        written.push(draft);
        return null;
      },
    });

    saver.schedule(payload("nation-eng"));
    saver.schedule(payload("nation-esp"));
    saver.schedule(payload("nation-ita"));
    expect(written).toHaveLength(0);

    await vi.advanceTimersByTimeAsync(50);

    expect(written).toHaveLength(1);
    expect(written[0]?.intents[0]?.nationId).toBe("nation-ita");
  });

  it("reports the latest write that actually landed, not the newest one attempted", async () => {
    const saver = createDraftSaver({
      delayMs: 10,
      save: async () => null,
    });

    saver.schedule(payload("nation-eng"));
    await vi.advanceTimersByTimeAsync(10);

    const state = saver.state();
    expect(state._tag).toBe("Success");
    expect(state._tag === "Success" ? state.payload.intents[0]?.nationId : null).toBe("nation-eng");
  });

  it("discards a superseded write's outcome instead of publishing it as the saved state", async () => {
    let resolveFirst: ((value: string | null) => void) | null = null;
    let call = 0;
    const saver = createDraftSaver({
      delayMs: 10,
      save: (draft) => {
        call += 1;
        if (call === 1) {
          return new Promise<string | null>((resolve) => {
            resolveFirst = resolve;
          });
        }
        return Promise.resolve(null).then(() => {
          void draft;
          return null;
        });
      },
    });

    saver.schedule(payload("nation-eng"));
    await vi.advanceTimersByTimeAsync(10);
    expect(saver.state()._tag).toBe("Pending");

    // A newer edit starts and lands while the first write is still out.
    saver.schedule(payload("nation-esp"));
    await vi.advanceTimersByTimeAsync(10);

    // The stale write now fails. Its outcome must not become the state — the current draft is
    // the one that landed, not the one nobody is asking about any more.
    resolveFirst?.("disk full");
    await vi.advanceTimersByTimeAsync(0);

    const state = saver.state();
    expect(state._tag).toBe("Success");
    expect(state._tag === "Success" ? state.payload.intents[0]?.nationId : null).toBe("nation-esp");
  });

  it("surfaces a write failure as a readable message, not a throw", async () => {
    const saver = createDraftSaver({
      delayMs: 10,
      save: async () => "The draft could not be written.",
    });

    saver.schedule(payload("nation-eng"));
    await vi.advanceTimersByTimeAsync(10);

    const state = saver.state();
    expect(state._tag).toBe("Failure");
    expect(state._tag === "Failure" ? state.message : "").toBe("The draft could not be written.");
  });

  it("flushes work still inside the debounce window when the screen is disposed of", async () => {
    const written: DraftPayload[] = [];
    const saver = createDraftSaver({
      delayMs: 10_000,
      save: async (draft) => {
        written.push(draft);
        return null;
      },
    });

    saver.schedule(payload("nation-eng"));
    await saver.dispose();

    expect(written).toHaveLength(1);
    expect(written[0]?.intents[0]?.nationId).toBe("nation-eng");
  });

  it("refuses further work once disposed", async () => {
    const written: DraftPayload[] = [];
    const saver = createDraftSaver({
      delayMs: 10,
      save: async (draft) => {
        written.push(draft);
        return null;
      },
    });

    await saver.dispose();
    saver.schedule(payload("nation-eng"));
    await vi.advanceTimersByTimeAsync(100);

    expect(written).toHaveLength(0);
  });
});

describe("the submission lifecycle", () => {
  it("refuses a second start while one is in flight", () => {
    const started = begin(idleOperation<string>());
    expect(started).not.toBeNull();
    expect(isPending(started!)).toBe(true);
    // The guard is the model's, so a keyboard repeat that outruns a re-render still cannot
    // produce a second submission.
    expect(begin(started!)).toBeNull();
  });

  it("allows a retry after a failure and reports the message", () => {
    const failed = fail<string>("That selection is no longer valid.");
    expect(failureMessage(failed)).toBe("That selection is no longer valid.");
    expect(begin(failed)).not.toBeNull();
  });

  it("carries the value on success and has nothing to report", () => {
    const done = succeed("snapshot-1");
    expect(done).toEqual({ _tag: "Success", value: "snapshot-1" });
    expect(failureMessage(done)).toBeNull();
  });
});
