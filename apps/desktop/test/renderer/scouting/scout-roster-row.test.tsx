import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { ClubId, PlayerId, ScoutingTargetView } from "@cm-clone/contracts";
import { ScoutRosterRow } from "../../../src/renderer/scouting/ScoutRosterRow.js";

/**
 * Ticket 04: the Scout roster row is props-only, so Screen 118 can render it with no router, no
 * atoms, and no RPC. These tests mount it bare to prove exactly that.
 */

afterEach(() => cleanup());

const scout = (overrides: Partial<ConstructorParameters<typeof ScoutingTargetView>[0]> = {}) =>
  new ScoutingTargetView({
    scoutId: "scout-1",
    scoutName: "Sam Seeker",
    quality: 14,
    playerId: null,
    playerName: null,
    targetClubId: null,
    targetClubName: null,
    progress: null,
    ...overrides,
  });

const mount = (view: ScoutingTargetView, children?: React.ReactNode) =>
  render(
    <ul>
      <ScoutRosterRow scout={view}>{children}</ScoutRosterRow>
    </ul>,
  );

describe("ticket 04 — Scout roster row", () => {
  it("shows a free Scout's quality and no assignment, with nothing progressing", () => {
    mount(scout());
    const row = screen.getByRole("listitem", { name: "Sam Seeker" });
    expect(within(row).getByText("Quality 14")).toBeTruthy();
    expect(within(row).getByText("No assignment")).toBeTruthy();
    expect(row.textContent).toContain("Scouting Progress: Not observing");
    expect(within(row).queryByRole("progressbar")).toBeNull();
  });

  it("shows a Club target, whose progress lives on its Players rather than on the Club", () => {
    mount(scout({ targetClubId: ClubId.make("club-7"), targetClubName: "Northport Rovers" }));
    const row = screen.getByRole("listitem", { name: "Sam Seeker" });
    expect(within(row).getByText("Club: Northport Rovers")).toBeTruthy();
    expect(row.textContent).toContain("Scouting Progress: Tracked per Player");
    expect(within(row).queryByRole("progressbar")).toBeNull();
  });

  it("shows a Player target with its Scouting Progress, floored", () => {
    mount(scout({ playerId: PlayerId.make("p-9"), playerName: "Nico Striker", progress: 42.7 }));
    const row = screen.getByRole("listitem", { name: "Sam Seeker" });
    expect(within(row).getByText("Player: Nico Striker")).toBeTruthy();
    expect(row.textContent).toContain("Scouting Progress: 42%");
    expect(within(row).getByRole("progressbar", { name: "Sam Seeker Scouting Progress" })).toBeTruthy();
  });

  it("reads an absent progress row as Unscouted and 100 as Fully Scouted", () => {
    mount(scout({ playerId: PlayerId.make("p-9"), playerName: "Nico Striker", progress: null }));
    expect(screen.getByRole("listitem").textContent).toContain("Scouting Progress: Unscouted");
    cleanup();
    mount(scout({ playerId: PlayerId.make("p-9"), playerName: "Nico Striker", progress: 100 }));
    expect(screen.getByRole("listitem").textContent).toContain("Scouting Progress: Fully Scouted");
  });

  it("renders the actions it is given, and none when given none", () => {
    mount(scout(), <button type="button">Act</button>);
    expect(within(screen.getByRole("listitem")).getByRole("button", { name: "Act" })).toBeTruthy();
    cleanup();
    mount(scout());
    expect(screen.queryByRole("button")).toBeNull();
  });
});
