import { describe, expect, it } from "vitest";
import { ClubId, SaveId, type ClubSelectionRow } from "@cm-clone/contracts";
import { formatCredits } from "../src/renderer/format.js";
import { selectedClubOf } from "../src/renderer/create/clubSelection.js";
import type { GenerationState } from "../src/renderer/create/generation.js";
import {
  expectationProse,
  filledSegments,
  leagueSummaryOf,
  rollClub,
} from "../src/renderer/clubSelection/model.js";
import { strongestPosition, summarizeSquad, type SquadReadoutPlayer } from "../src/main/career/index.js";

/**
 * The pure readings behind the Club Selection workspace: the world-binding on the selection
 * record, the panel's derived copy, the assist's exclusion rule, and the squad readout the read
 * query computes. Deterministic fixtures — no clock, no database, no rendering.
 */

const club = (id: string, over: Partial<ClubSelectionRow> = {}): ClubSelectionRow =>
  ({
    clubId: ClubId.make(id),
    clubName: id,
    statureTier: "mid",
    boardObjectiveMin: 7,
    boardObjectiveMax: 14,
    squadQualityBand: "Competitive",
    transferBudget: 1_000_000,
    wageBudget: 500_000,
    detail: { squadSize: 25, averageAge: 25.4, topPlayers: [] },
    ...over,
  }) as ClubSelectionRow;

const ready = (id: string): GenerationState => ({ _tag: "Ready", provisionalId: SaveId.make(id) });

describe("the selection is bound to the world it was picked from", () => {
  const selection = {
    clubId: ClubId.make("c1"),
    clubName: "Castlemere United",
    provisionalId: SaveId.make("world-1"),
  };

  it("reads back the pick while the world it was made against is still current", () => {
    expect(selectedClubOf({ clubSelection: selection, generation: ready("world-1") })).toEqual(
      selection,
    );
  });

  it("reads as no selection once the world is replaced, without clearing the record", () => {
    const session = { clubSelection: selection, generation: ready("world-2") };

    expect(selectedClubOf(session)).toBeNull();
    // The stale record is retained rather than written back to null: the helper is the read path,
    // so nothing needs an effect whose only job is to make a derived value agree with itself.
    expect(session.clubSelection).toEqual(selection);
  });

  it("reads as no selection while generation is not ready, so a stale id cannot reach the commit", () => {
    expect(
      selectedClubOf({ clubSelection: selection, generation: { _tag: "Running" } }),
    ).toBeNull();
  });

  it("reads as no selection on first paint", () => {
    expect(selectedClubOf({ clubSelection: null, generation: ready("world-1") })).toBeNull();
  });
});

describe("the panel's derived copy", () => {
  it("states a top-of-table band as prose, never a raw min–max pair", () => {
    expect(expectationProse({ boardObjectiveMin: 1, boardObjectiveMax: 6 }, 20)).toBe(
      "The board expects a top-six finish.",
    );
  });

  it("states a bottom band against the league's own size", () => {
    expect(expectationProse({ boardObjectiveMin: 15, boardObjectiveMax: 20 }, 20)).toBe(
      "The board expects 15th or below.",
    );
  });

  it("states a mid band as a range", () => {
    expect(expectationProse({ boardObjectiveMin: 7, boardObjectiveMax: 14 }, 20)).toBe(
      "The board expects a finish between 7th and 14th.",
    );
  });

  it("summarizes the league from the club list itself, with no league field on the wire", () => {
    const summary = leagueSummaryOf([
      club("a", { statureTier: "big" }),
      club("b", { statureTier: "mid" }),
      club("c", { statureTier: "mid" }),
    ]);

    expect(summary.clubCount).toBe(3);
    expect(summary.tiers).toEqual([
      { tier: "big", count: 1 },
      { tier: "mid", count: 2 },
      { tier: "small", count: 0 },
    ]);
  });

  it("fills the quality meter by the band's ordinal position, so it retunes with the bands", () => {
    expect(filledSegments("Very Weak")).toBe(1);
    expect(filledSegments("Elite")).toBe(6);
  });

  it("renders money as Credits, the game's one currency unit", () => {
    expect(formatCredits(1_250_000)).toBe(`${(1_250_000).toLocaleString()} Cr`);
  });
});

describe("`Pick a team for me` rolls over the loaded list, excluding the current pick", () => {
  const clubs = [club("a"), club("b"), club("c")];

  it("never returns the club already selected", () => {
    for (let roll = 0; roll < 100; roll += 1) {
      const picked = rollClub(clubs, ClubId.make("b"), Math.random);
      expect(picked?.clubId).not.toBe("b");
      expect(picked).not.toBeNull();
    }
  });

  it("draws from every loaded club when nothing is selected", () => {
    expect(rollClub(clubs, null, () => 0)?.clubId).toBe("a");
    expect(rollClub(clubs, null, () => 0.999)?.clubId).toBe("c");
  });

  it("has nothing to pick over an empty list, or a single club already picked", () => {
    expect(rollClub([], null, Math.random)).toBeNull();
    expect(rollClub([club("a")], ClubId.make("a"), Math.random)).toBeNull();
  });
});

describe("the squad readout the read query ships with every club", () => {
  const player = (
    name: string,
    overallRating: number,
    age: number,
    positions: ReadonlyArray<string>,
  ): SquadReadoutPlayer => ({
    firstName: name,
    lastName: `Of${name}`,
    age,
    overallRating,
    positions: positions.map((position) => ({ position: position as never })),
    positionRatings: { GK: 10, DC: 40, ST: 70, MC: 55 },
  });

  it("takes the five highest-rated players, by name and their strongest held Position", () => {
    const squad = [
      player("A", 90, 30, ["ST"]),
      player("B", 80, 20, ["DC"]),
      player("C", 70, 22, ["MC", "DC"]),
      player("D", 60, 24, ["GK"]),
      player("E", 50, 26, ["ST"]),
      player("F", 40, 28, ["DC"]),
    ];

    const detail = summarizeSquad(squad);

    expect(detail.topPlayers.map((p) => p.name)).toEqual([
      "A OfA",
      "B OfB",
      "C OfC",
      "D OfD",
      "E OfE",
    ]);
    // C plays MC and DC; MC rates higher, and ST — which they do not play — is never named.
    expect(detail.topPlayers[2]!.position).toBe("MC");
  });

  it("keeps squad size and average age as subordinate figures", () => {
    const detail = summarizeSquad([player("A", 90, 30, ["ST"]), player("B", 80, 21, ["DC"])]);

    expect(detail.squadSize).toBe(2);
    expect(detail.averageAge).toBe(25.5);
  });

  it("never names a Position the player does not hold", () => {
    expect(strongestPosition(player("A", 90, 30, ["GK"]))).toBe("GK");
  });
});
