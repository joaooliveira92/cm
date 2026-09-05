import { describe, expect, it } from "vitest";
import { SaveId } from "@cm-clone/contracts";
import {
  abandon,
  announcement,
  blockedReason,
  canStartGeneration,
  commit,
  generationFailed,
  generationSucceeded,
  initialGeneration,
  isSelectionReady,
  provisionalIdOf,
  reenter,
  startGeneration,
  type GenerationState,
} from "../../../src/renderer/create/generation.js";

const id = (value: string) => SaveId.make(value);

const pending = initialGeneration;
const running = startGeneration(initialGeneration).state;
const ready = generationSucceeded(running, id("provisional-1")).state;

describe("generation lifecycle — duplicate jobs", () => {
  it("starts from the initial state", () => {
    expect(canStartGeneration(initialGeneration)).toBe(true);
    expect(startGeneration(initialGeneration).state).toEqual({ _tag: "Running" });
  });

  it("refuses a second job while one is in flight", () => {
    expect(canStartGeneration(running)).toBe(false);
    expect(startGeneration(running).state).toBe(running);
  });

  it("refuses a second job once a world is ready", () => {
    expect(canStartGeneration(ready)).toBe(false);
    expect(startGeneration(ready).state).toBe(ready);
  });

  it("allows a retry after a failure", () => {
    const failed = generationFailed(running, "disk unavailable").state;
    expect(canStartGeneration(failed)).toBe(true);
    expect(startGeneration(failed).state).toEqual({ _tag: "Running" });
  });
});

describe("generation lifecycle — the cancel race", () => {
  it("discards a world that arrives after the player left", () => {
    const abandoned = abandon(running);
    expect(abandoned.state._tag).toBe("Abandoned");
    // Nothing to discard yet: the id does not exist at the moment of cancelling.
    expect(abandoned.discard).toBeNull();

    const late = generationSucceeded(abandoned.state, id("provisional-2"));
    expect(late.discard).toBe(id("provisional-2"));
    expect(late.state._tag).toBe("Abandoned");
  });

  it("discards a world that already exists when the player leaves", () => {
    const abandoned = abandon(ready);
    expect(abandoned.discard).toBe(id("provisional-1"));
    expect(abandoned.state._tag).toBe("Abandoned");
  });

  it("re-arms a re-entered flow, so a remount can generate again", () => {
    // A development double-invocation runs teardown between two mounts of the same component.
    // Without re-arming, the flow comes back permanently unable to generate.
    const abandoned = abandon(pending).state;
    expect(canStartGeneration(abandoned)).toBe(false);

    const rearmed = reenter(abandoned);
    expect(rearmed.state._tag).toBe("Pending");
    expect(rearmed.discard).toBeNull();
    expect(canStartGeneration(rearmed.state)).toBe(true);
  });

  it("re-arming never resurrects a world the abandonment already discarded", () => {
    const abandoned = abandon(ready);
    expect(abandoned.discard).toBe(id("provisional-1"));
    // The re-arm carries no id, so the discarded world cannot come back as selectable.
    const rearmed = reenter(abandoned.state);
    expect(rearmed.discard).toBeNull();
    expect(provisionalIdOf(rearmed.state)).toBeNull();
  });

  it("re-arming is the identity on every state that is not abandoned", () => {
    for (const state of [pending, running, ready, commit(ready).state]) {
      expect(reenter(state).state).toBe(state);
      expect(reenter(state).discard).toBeNull();
    }
  });

  it("abandons idempotently — the second call has nothing left to discard", () => {
    const once = abandon(ready);
    const twice = abandon(once.state);
    expect(twice.discard).toBeNull();
    expect(twice.state._tag).toBe("Abandoned");
  });

  it("never shows a failure to a player who already left", () => {
    const abandoned = abandon(running).state;
    expect(generationFailed(abandoned, "disk unavailable").state).toBe(abandoned);
  });

  it("never discards a committed career", () => {
    const committed = commit(ready).state;
    expect(committed._tag).toBe("Committed");
    expect(abandon(committed)).toEqual({ state: committed, discard: null });
  });

  it("leaves a non-ready state uncommitted", () => {
    expect(commit(running).state).toBe(running);
  });
});

describe("generation lifecycle — what the screen reads", () => {
  it("exposes the provisional id only while the flow owns it", () => {
    expect(provisionalIdOf(initialGeneration)).toBeNull();
    expect(provisionalIdOf(running)).toBeNull();
    expect(provisionalIdOf(ready)).toBe(id("provisional-1"));
    expect(provisionalIdOf(abandon(ready).state)).toBeNull();
    expect(provisionalIdOf(commit(ready).state)).toBeNull();
  });

  it("opens club selection only on a complete comparison set", () => {
    expect(isSelectionReady(initialGeneration)).toBe(false);
    expect(isSelectionReady(running)).toBe(false);
    expect(isSelectionReady(generationFailed(running, "boom").state)).toBe(false);
    expect(isSelectionReady(ready)).toBe(true);
  });

  it("states why the transition is blocked whenever it blocks", () => {
    const blocking: ReadonlyArray<GenerationState> = [initialGeneration, running];
    for (const state of blocking) {
      expect(blockedReason(state)).toBe("Building the league first…");
    }
    // Failure speaks through Retry instead, and a ready world blocks nothing.
    expect(blockedReason(generationFailed(running, "boom").state)).toBeNull();
    expect(blockedReason(ready)).toBeNull();
  });

  it("announces state changes, not progress ticks", () => {
    expect(announcement(initialGeneration)).toBeNull();
    expect(announcement(running)).toBe("Building the league.");
    expect(announcement(ready)).toBe("The league is ready. Choose a club.");
    expect(announcement(generationFailed(running, "disk unavailable").state)).toBe(
      "Building the league failed. disk unavailable",
    );
  });
});
