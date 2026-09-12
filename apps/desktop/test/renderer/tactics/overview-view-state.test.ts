import { describe, expect, it } from "vitest";
import type { TacticsOverviewView } from "@cm-clone/contracts";
import {
  admitSnapshot,
  overviewViewState,
} from "../../../src/renderer/tactics/overviewViewState.js";

const view = (revision: number): TacticsOverviewView =>
  ({
    club: { id: "club-1", name: "My Club", statureTier: "big" },
    revision,
    formation: null,
    instructions: null,
    assignments: [],
    familiarity: null,
    selection: { starters: [], substitutes: [] },
    setPieces: { status: "none" },
    issues: [],
  }) as unknown as TacticsOverviewView;

describe("admitSnapshot — responses are admitted by declared revision, never by arrival order", () => {
  it("adopts the first snapshot whatever its revision", () => {
    expect(admitSnapshot(null, view(5))).toEqual({ rendered: view(5), admitted: true });
  });

  it("discards a response older than the one already shown, leaving it untouched", () => {
    const shown = view(4);
    const admission = admitSnapshot(shown, view(3));
    expect(admission).toEqual({ rendered: shown, admitted: false });
  });

  it("holds a same-revision response without replacing the shown snapshot", () => {
    const shown = view(4);
    const admission = admitSnapshot(shown, view(4));
    expect(admission.rendered).toBe(shown);
    expect(admission.admitted).toBe(true);
  });

  it("holds a newer response as the conflicted candidate until the player adopts it", () => {
    const shown = view(4);
    const admission = admitSnapshot(shown, view(6));
    expect(admission.rendered).toBe(shown);
    expect(admission.admitted).toBe(true);
  });
});

describe("overviewViewState — five distinct states with a fixed precedence", () => {
  it("failed only when there is no rendered data to keep showing", () => {
    expect(overviewViewState({ rendered: null, latest: null, failed: true, archived: false })).toBe(
      "failed",
    );
    // A failed revalidation must never blank a valid snapshot.
    expect(overviewViewState({ rendered: view(2), latest: null, failed: true, archived: false })).toBe(
      "ready",
    );
  });

  it("loading while nothing has arrived and nothing has failed", () => {
    expect(overviewViewState({ rendered: null, latest: null, failed: false, archived: false })).toBe(
      "loading",
    );
  });

  it("archived maps the saved-state guard onto the read-only presentation", () => {
    expect(overviewViewState({ rendered: view(2), latest: view(2), failed: false, archived: true })).toBe(
      "permission-limited",
    );
  });

  it("conflicted when a newer revision is known but not yet adopted", () => {
    expect(
      overviewViewState({ rendered: view(2), latest: view(3), failed: false, archived: false }),
    ).toBe("conflicted");
  });

  it("ready with the shown snapshot at the newest known revision", () => {
    expect(
      overviewViewState({ rendered: view(3), latest: view(3), failed: false, archived: false }),
    ).toBe("ready");
    expect(
      overviewViewState({ rendered: view(3), latest: view(2), failed: false, archived: false }),
    ).toBe("ready");
    expect(overviewViewState({ rendered: view(3), latest: null, failed: false, archived: false })).toBe(
      "ready",
    );
  });
});