import { describe, expect, it } from "vitest";
import {
  CLUB_STAFF_VIEW_STATES,
  clubStaffViewState,
  isOwnClub,
} from "../../../src/renderer/clubStaff/clubStaffViewState.js";

const clubStaff = (clubId = "club-7") => ({
  club: { id: clubId },
});

const squad = (clubId: string | null) =>
  clubId === null
    ? ({ _tag: "Initial" } as const)
    : ({ _tag: "Success", value: { club: { id: clubId } } } as const);

const staff = (tag: "Initial" | "Failure" | "Success", clubId = "club-7") => {
  switch (tag) {
    case "Initial":
      return { _tag: "Initial" } as const;
    case "Failure":
      return { _tag: "Failure" } as const;
    default:
      return { _tag: "Success", value: clubStaff(clubId) } as const;
  }
};

describe("ticket 04 — exactly three view states, none left as a hook", () => {
  it("the state space is exactly loading, ready, error", () => {
    expect([...CLUB_STAFF_VIEW_STATES]).toEqual(["loading", "ready", "error"]);
  });

  it("maps the club staff read directly: Initial → loading, Failure → error, Success → ready", () => {
    expect(clubStaffViewState({ staff: staff("Initial"), squad: squad("club-7") })).toBe("loading");
    expect(clubStaffViewState({ staff: staff("Failure"), squad: squad("club-7") })).toBe("error");
    expect(clubStaffViewState({ staff: staff("Success"), squad: squad("club-7") })).toBe("ready");
  });

  it("stays loading until the own-club identity read has answered, so the marker can never flash " +
      "in after the header", () => {
    expect(clubStaffViewState({ staff: staff("Success"), squad: squad(null) })).toBe("loading");
  });

  it("treats a failed own-club read as an error — the same save told the screen two lies", () => {
    expect(clubStaffViewState({ staff: staff("Success"), squad: { _tag: "Failure" } })).toBe("error");
  });

  it("isOwnClub compares canonical ids, not names", () => {
    expect(isOwnClub(clubStaff("club-7"), squad("club-7"))).toBe(true);
    expect(isOwnClub(clubStaff("club-8"), squad("club-7"))).toBe(false);
    // Unknown identity answers "not your club", but no rendered state asks: `ready` is reached
    // only once the squad read has settled, so this is the guard, not a visible default.
    expect(isOwnClub(clubStaff("club-8"), squad(null))).toBe(false);
  });
});