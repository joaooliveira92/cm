import { afterEach, describe, expect, it } from "vitest";
import { cleanup, renderHook, waitFor } from "@testing-library/react";
import type { Tactic } from "@cm-clone/contracts";
import { useRegisteredScreenBottomBarActions } from "../../../src/renderer/chrome/bottom-bar/screen-bottom-bar-actions.js";
import {
  LINEUP_CONFLICT_MESSAGE,
  lineupSaveLine,
  useSquadBottomBar,
} from "../../../src/renderer/squad/squadBottomBar.js";

/** A Tactic whose eleven names `count` nobody: an empty id is a starter still to pick. */
const tacticMissing = (count: number): Tactic =>
  ({ assignments: Array.from({ length: 11 }, (_, index) => (index < count ? "" : `p${index}`)) }) as unknown as Tactic;

const FULL = tacticMissing(0);

describe("lineupSaveLine", () => {
  it("puts a conflict first, then what saving waits on, then the draft's status", () => {
    expect(lineupSaveLine({ conflicted: true, tactic: tacticMissing(3), status: "Saved." })).toBe(
      LINEUP_CONFLICT_MESSAGE,
    );
    expect(lineupSaveLine({ conflicted: false, tactic: tacticMissing(1), status: null })).toBe(
      "Not saved yet: pick 1 more starter.",
    );
    expect(lineupSaveLine({ conflicted: false, tactic: tacticMissing(4), status: null })).toBe(
      "Not saved yet: pick 4 more starters.",
    );
    expect(lineupSaveLine({ conflicted: false, tactic: FULL, status: "Saved." })).toBe("Saved.");
    expect(lineupSaveLine({ conflicted: false, tactic: FULL, status: null })).toBeNull();
  });
});

describe("useSquadBottomBar", () => {
  afterEach(cleanup);

  interface Props {
    readonly notice: string | null;
    readonly status: string | null;
    readonly conflicted: boolean;
  }

  const mount = (initialProps: Props) =>
    renderHook(
      ({ notice, status, conflicted }: Props) => {
        useSquadBottomBar(notice, { conflicted, tactic: FULL, status, refresh: () => undefined });
        return useRegisteredScreenBottomBarActions();
      },
      { initialProps },
    );

  it("shows whichever of the save state and the command notice changed last", async () => {
    const { result, rerender } = mount({ notice: null, status: "Saved.", conflicted: false });
    await waitFor(() => expect(result.current?.reason).toBe("Saved."));

    rerender({ notice: "Showing the Contract columns.", status: "Saved.", conflicted: false });
    await waitFor(() => expect(result.current?.reason).toBe("Showing the Contract columns."));

    rerender({ notice: "Showing the Contract columns.", status: "Saving…", conflicted: false });
    await waitFor(() => expect(result.current?.reason).toBe("Saving…"));
  });

  it("re-asserts a notice that clears and then returns unchanged", async () => {
    // The two replaced effects re-ran on every change of their value, so a notice that went null and
    // came back to the same string was acknowledged again. The save line is also live, so the
    // `latest` flag — not the null-coalescing fallback — decides which line shows; a render-adjust
    // that only records the new pair when a non-null value arrives would leave the save line up.
    const notice = "Showing the Contract columns.";
    const { result, rerender } = mount({ notice, status: "Saved.", conflicted: false });
    await waitFor(() => expect(result.current?.reason).toBe("Saved."));

    rerender({ notice: null, status: "Saved.", conflicted: false });
    await waitFor(() => expect(result.current?.reason).toBe("Saved."));

    rerender({ notice, status: "Saved.", conflicted: false });
    await waitFor(() => expect(result.current?.reason).toBe(notice));
  });

  it("lets a conflict outrank a newer notice, and offers Refresh", async () => {
    const { result } = mount({ notice: "Showing the Contract columns.", status: null, conflicted: true });
    await waitFor(() => expect(result.current?.reason).toBe(LINEUP_CONFLICT_MESSAGE));
    expect(result.current?.buttons.map((button) => button.label)).toEqual(["Refresh"]);
  });
});
