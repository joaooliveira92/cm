import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ClubId, PlayerId } from "@cm-clone/contracts";
import { bindRouter } from "../../../src/renderer/navigation/adapter.js";
import { RegistryProvider } from "../../../src/renderer/rpc.js";
import { ScoutingScreen } from "../../../src/renderer/scouting/ScoutingScreen.js";
import { NOT_FOUND, saveId } from "./reportFixtures.js";

/**
 * Scouting Centre (Screen 118, group-i ticket 06): the Scout roster from `getScouting`, the coverage
 * summary from `getScoutingKnowledge`, links to Scouting Assignment and Scouting Knowledge, and the two
 * separate empty states (no Scouts; nothing scouted).
 */

const SCOUTS = [
  {
    scoutId: "scout-1",
    scoutName: "Sam Seeker",
    quality: 12,
    playerId: null,
    playerName: null,
    targetClubId: ClubId.make("club-7"),
    targetClubName: "Northport Rovers",
    progress: null,
  },
  {
    scoutId: "scout-2",
    scoutName: "Pat Finder",
    quality: 8,
    playerId: PlayerId.make("p-9"),
    playerName: "Nico Striker",
    targetClubId: null,
    targetClubName: null,
    progress: 35.5,
  },
];

const KNOWLEDGE = {
  clubs: [
    {
      clubId: "club-7",
      clubName: "Northport Rovers",
      squadSize: 22,
      scoutedCount: 2,
      fullyScoutedCount: 1,
      coverage: 0.0681,
      knowledgeConfidence: "low",
    },
  ],
  players: [
    { playerId: "p-9", firstName: "Nico", lastName: "Striker", clubId: "club-7", clubName: "Northport Rovers", progress: 35.5 },
    { playerId: "p-4", firstName: "Ada", lastName: "Keeper", clubId: "club-7", clubName: "Northport Rovers", progress: 100 },
  ],
};

let answers: Record<string, unknown>;
let navigateSpy: ReturnType<typeof vi.fn>;

beforeEach(() => {
  answers = {
    getScouting: { _tag: "Success", value: { scouts: SCOUTS } },
    getScoutingKnowledge: { _tag: "Success", value: KNOWLEDGE },
  };
  (window as unknown as { cmClone: { call: unknown } }).cmClone = {
    call: async (method: string) => answers[method] ?? NOT_FOUND,
  };
  navigateSpy = vi.fn();
  bindRouter({
    navigate: navigateSpy,
    history: { back: vi.fn(), forward: vi.fn(), canGoBack: () => false },
  } as never);
});

afterEach(() => cleanup());

const mount = () =>
  render(
    <RegistryProvider>
      <ScoutingScreen saveId={saveId} />
    </RegistryProvider>,
  );

describe("group-i ticket 06 — Scouting Centre screen", () => {
  it("renders the Scout roster and the coverage summary from the existing reads", async () => {
    mount();
    expect(screen.getByRole("heading", { name: "Scouting Centre", level: 1 })).toBeTruthy();
    const list = await screen.findByRole("list", { name: "Scouts" });
    const sam = within(list).getByRole("listitem", { name: "Sam Seeker" });
    expect(sam.textContent).toContain("Quality 12");
    expect(sam.textContent).toContain("Club: Northport Rovers");
    const pat = within(list).getByRole("listitem", { name: "Pat Finder" });
    expect(pat.textContent).toContain("Player: Nico Striker");
    expect(pat.textContent).toContain("35%");
    // The Centre is read-only: the roster rows carry no actions.
    expect(within(list).queryAllByRole("button")).toHaveLength(0);

    const summary = await screen.findByRole("region", { name: "Scouting coverage" });
    expect(summary.textContent).toContain("Clubs with scouted Players1");
    expect(summary.textContent).toContain("Players scouted2");
    expect(summary.textContent).toContain("Fully Scouted1");
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("links to Scouting Assignment and Scouting Knowledge", async () => {
    mount();
    fireEvent.click(await screen.findByRole("button", { name: "Scouting Assignment" }), { detail: 1 });
    expect(navigateSpy).toHaveBeenLastCalledWith({ to: "/career/$saveId/scouting-assignment", params: { saveId } });
    fireEvent.click(screen.getByRole("button", { name: "Scouting Knowledge" }), { detail: 1 });
    expect(navigateSpy).toHaveBeenLastCalledWith({ to: "/career/$saveId/scouting-knowledge", params: { saveId } });
  });

  it("shows a club with no Scouts as its own empty state, beside a coverage summary", async () => {
    answers["getScouting"] = { _tag: "Success", value: { scouts: [] } };
    mount();
    expect(await screen.findByText("Your club has no Scouts.")).toBeTruthy();
    expect(screen.queryByRole("list", { name: "Scouts" })).toBeNull();
    const summary = await screen.findByRole("region", { name: "Scouting coverage" });
    expect(summary.textContent).toContain("Players scouted2");
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("shows nothing scouted yet as its own empty state while the club still has Scouts", async () => {
    answers["getScoutingKnowledge"] = { _tag: "Success", value: { clubs: [], players: [] } };
    mount();
    const summary = await screen.findByRole("region", { name: "Scouting coverage" });
    expect(summary.textContent).toContain("Nothing scouted yet.");
    expect(await screen.findByRole("list", { name: "Scouts" })).toBeTruthy();
    expect(screen.queryByText("Your club has no Scouts.")).toBeNull();
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("shows each read's own failure and keeps the links", async () => {
    answers = {};
    mount();
    const alerts = await vi.waitFor(() => {
      const found = screen.getAllByRole("alert");
      expect(found).toHaveLength(2);
      return found;
    });
    for (const alert of alerts) expect(alert.textContent).toMatch(/save/i);
    expect(screen.queryByRole("list", { name: "Scouts" })).toBeNull();
    expect(screen.queryByRole("region", { name: "Scouting coverage" })).toBeNull();
    expect(screen.getByRole("button", { name: "Scouting Assignment" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Scouting Knowledge" })).toBeTruthy();
  });
});
