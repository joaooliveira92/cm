/**
 * The one fact career creation publishes across the router boundary (ticket 22).
 *
 * `QuitGuard` is mounted outside `<RouterProvider>` and cannot read `CreateSessionContext`, so this
 * store is the seam between them. It is small enough to be obvious and load-bearing enough that a
 * silent regression here would restore exactly the bug the ticket describes: a generic quit dialog
 * shown over a world nobody mentioned.
 */
import { strictEqual } from "node:assert";
import { afterEach, describe, expect, it, vi } from "vitest";
import { SaveId } from "@cm-clone/contracts";
import {
  getProvisionalCareer,
  resetProvisionalCareer,
  setProvisionalCareer,
  subscribeProvisionalCareer,
} from "../../../src/renderer/create/provisionalCareer.js";

afterEach(() => {
  resetProvisionalCareer();
});

describe("provisionalCareer", () => {
  it("starts with nothing to lose", () => {
    const value = getProvisionalCareer();
    strictEqual(value.present, false);
    strictEqual(value.id, null);
  });

  it("publishes a world and notifies subscribers", () => {
    const listener = vi.fn();
    subscribeProvisionalCareer(listener);

    setProvisionalCareer({ present: true, id: SaveId.make("provisional-1") });

    expect(listener).toHaveBeenCalledTimes(1);
    strictEqual(getProvisionalCareer().id, "provisional-1");
  });

  /**
   * A world being built warns without naming an id: `beginCareer` has not returned one. The two
   * fields are not redundant, and collapsing them would mean either warning about nothing or
   * staying silent through the wait the player is actually sitting in.
   */
  it("carries a present world with no id, for one still being built", () => {
    setProvisionalCareer({ present: true, id: null });
    const value = getProvisionalCareer();
    strictEqual(value.present, true);
    strictEqual(value.id, null);
  });

  /**
   * The creation flow republishes from an effect that runs on every session change, and most of
   * those are a typed character in the save name. Without this the quit guard would re-render at
   * typing speed.
   */
  it("drops an unchanged value instead of waking subscribers", () => {
    setProvisionalCareer({ present: true, id: SaveId.make("provisional-1") });
    const listener = vi.fn();
    subscribeProvisionalCareer(listener);

    setProvisionalCareer({ present: true, id: SaveId.make("provisional-1") });

    expect(listener).not.toHaveBeenCalled();
  });

  it("returns the same object across reads, as useSyncExternalStore requires", () => {
    setProvisionalCareer({ present: true, id: SaveId.make("provisional-1") });
    strictEqual(getProvisionalCareer(), getProvisionalCareer());
  });

  it("clears with null, so leaving creation leaves nothing to discard", () => {
    setProvisionalCareer({ present: true, id: SaveId.make("provisional-1") });
    const listener = vi.fn();
    subscribeProvisionalCareer(listener);

    setProvisionalCareer(null);

    expect(listener).toHaveBeenCalledTimes(1);
    strictEqual(getProvisionalCareer().present, false);
  });

  it("stops notifying an unsubscribed listener", () => {
    const listener = vi.fn();
    const unsubscribe = subscribeProvisionalCareer(listener);
    unsubscribe();

    setProvisionalCareer({ present: true, id: SaveId.make("provisional-1") });

    expect(listener).not.toHaveBeenCalled();
  });
});
