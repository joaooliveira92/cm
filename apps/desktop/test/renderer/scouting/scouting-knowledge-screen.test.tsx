import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { bindRouter } from "../../../src/renderer/navigation/adapter.js";
import { RegistryProvider } from "../../../src/renderer/rpc.js";
import { ScoutingKnowledgeScreen } from "../../../src/renderer/scouting/ScoutingKnowledgeScreen.js";
import { NOT_FOUND, saveId } from "./reportFixtures.js";

/**
 * Scouting Knowledge (Screen 126, group-i ticket 05): the Club view and Player view of
 * `getScoutingKnowledge`, the coverage summary above them, and the empty and failed states.
 */

let answer: unknown;

const KNOWLEDGE = {
  clubs: [
    {
      clubId: "club-9",
      clubName: "Eastvale United",
      squadSize: 20,
      scoutedCount: 20,
      fullyScoutedCount: 18,
      coverage: 0.9,
      knowledgeConfidence: "complete",
    },
    {
      clubId: "club-7",
      clubName: "Northport Rovers",
      squadSize: 22,
      scoutedCount: 2,
      fullyScoutedCount: 0,
      coverage: 0.0681,
      knowledgeConfidence: "low",
    },
  ],
  players: [
    { playerId: "p-9", firstName: "Nico", lastName: "Striker", clubId: "club-7", clubName: "Northport Rovers", progress: 35.5 },
    { playerId: "p-4", firstName: "Ada", lastName: "Keeper", clubId: "club-9", clubName: "Eastvale United", progress: 100 },
    { playerId: "p-2", firstName: "Rui", lastName: "Loose", clubId: null, clubName: null, progress: 12 },
  ],
};

beforeEach(() => {
  answer = { _tag: "Success", value: KNOWLEDGE };
  (window as unknown as { cmClone: { call: unknown } }).cmClone = {
    call: async (method: string) => (method === "getScoutingKnowledge" ? answer : NOT_FOUND),
  };
  bindRouter({
    navigate: () => {},
    history: { back: () => {}, forward: () => {}, canGoBack: () => false },
  } as never);
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

const mount = () =>
  render(
    <RegistryProvider>
      <ScoutingKnowledgeScreen saveId={saveId} />
    </RegistryProvider>,
  );

describe("group-i ticket 05 — Scouting Knowledge screen", () => {
  it("shows the coverage summary and each scouted Club's count, coverage and Knowledge Confidence", async () => {
    mount();
    await screen.findByRole("heading", { name: "Scouting Knowledge", level: 1 });
    const summary = screen.getByRole("region", { name: "Scouting coverage" });
    expect(summary.textContent).toContain("Clubs with scouted Players2");
    expect(summary.textContent).toContain("Players scouted3");

    const table = screen.getByRole("table", { name: "Scouted Clubs" });
    const rovers = within(table).getByRole("row", { name: "Northport Rovers" });
    const cells = within(rovers).getAllByRole("cell").map((cell) => cell.textContent);
    expect(cells).toEqual(["Northport Rovers", "2 of 22", "0", "6%", "Low"]);
    const eastvale = within(table).getByRole("row", { name: "Eastvale United" });
    expect(within(eastvale).getAllByRole("cell").map((cell) => cell.textContent)).toEqual([
      "Eastvale United",
      "20 of 20",
      "18",
      "90%",
      "Complete",
    ]);
  });

  it("shows each scouted Player's Club and Scouting Progress in the Player view, and no figures", async () => {
    mount();
    fireEvent.click(await screen.findByRole("tab", { name: "Players" }));
    const table = await screen.findByRole("table", { name: "Scouted Players" });
    const cellsOf = (name: string) =>
      within(within(table).getByRole("row", { name })).getAllByRole("cell").map((cell) => cell.textContent);
    expect(cellsOf("Nico Striker")).toEqual(["Nico Striker", "Northport Rovers", "35%"]);
    expect(cellsOf("Ada Keeper")).toEqual(["Ada Keeper", "Eastvale United", "Fully Scouted"]);
    expect(cellsOf("Rui Loose")).toEqual(["Rui Loose", "Free Agent", "12%"]);
    const headers = within(table).getAllByRole("columnheader").map((header) => header.textContent);
    expect(headers).toEqual(["Player", "Club", "Scouting Progress"]);
  });

  it("reads a save with no scouting as an empty state, not an error", async () => {
    answer = { _tag: "Success", value: { clubs: [], players: [] } };
    mount();
    const summary = await screen.findByRole("region", { name: "Scouting coverage" });
    expect(summary.textContent).toContain("Every Player outside your squad is Unscouted.");
    expect(screen.getByText("No Club has a scouted Player yet.")).toBeTruthy();
    expect(screen.queryByRole("table")).toBeNull();
    expect(screen.queryByRole("alert")).toBeNull();
    fireEvent.click(screen.getByRole("tab", { name: "Players" }));
    expect(await screen.findByText("No Player has been scouted yet.")).toBeTruthy();
  });

  it("shows the RPC's own sentence when the read fails", async () => {
    answer = NOT_FOUND;
    mount();
    const main = await screen.findByRole("main", { name: "Scouting Knowledge" });
    await vi.waitFor(() => expect(main.textContent).not.toContain("Loading"));
    expect(within(main).queryByRole("table")).toBeNull();
    expect(main.textContent).toMatch(/save/i);
  });
});
