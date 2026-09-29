import { afterEach, describe, expect, it } from "vitest";
import { cleanup, renderHook, waitFor } from "@testing-library/react";
import type { Tactic } from "@cm-clone/contracts";
import { useRegisteredScreenBottomBarActions } from "../../../src/renderer/chrome/bottom-bar/screen-bottom-bar-actions.js";
import {
  LINEUP_CONFLICT_MESSAGE,
  lineupSaveLine,
  useSquadBottomBar,
} from "../../../src/renderer/squad/squadBottomBar.js";

const tacticMissing = (count: number): Tactic =>
  ({ slots: Array.from({ length: count }, () => ({ playerId: null })) }) as unknown as Tactic;

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

  it("lets a conflict outrank a newer notice, and offers Refresh", async () => {
    const { result } = mount({ notice: "Showing the Contract columns.", status: null, conflicted: true });
    await waitFor(() => expect(result.current?.reason).toBe(LINEUP_CONFLICT_MESSAGE));
    expect(result.current?.buttons.map((button) => button.label)).toEqual(["Refresh"]);
  });
});
