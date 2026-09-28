import { describe, expect, it } from "vitest";
import { PlayerId, Tactic } from "@cm-clone/contracts";
import { FORMATION_SLOTS, POSITION_ROLES, type BenchCandidate, type Position } from "@cm-clone/shared";
import {
  assistantLineupOf,
  clearLineupSlot,
  dropOnLineupSlot,
  lineupSlotsOf,
  orderOfPlayer,
  playerAt,
  starterCountOf,
  swapLineupSlots,
  unselectedPlayerIds,
} from "../../../src/renderer/squad/lineupEdits.js";

const pid = (s: string) => PlayerId.make(s);

const baseTactic = (): Tactic =>
  new Tactic({
    formation: "4-4-2",
    slots: FORMATION_SLOTS["4-4-2"].map((position, index) => ({
      position,
      role: POSITION_ROLES[position],
      playerId: index < 3 ? pid(`p${index}`) : pid(""),
    })),
    bench: Array.from({ length: 7 }, (_, i) => (i < 2 ? pid(`b${i}`) : null)),
    mentality: "balanced",
    tempo: "normal",
    pressing: "medium",
  });

describe("the lineup bar's slot geometry", () => {
  it("renders the eleven starters in formation order and the seven bench slots after them", () => {
    const slots = lineupSlotsOf(baseTactic());
    expect(starterCountOf("4-4-2")).toBe(11);
    expect(slots).toHaveLength(18);
    expect(slots.slice(0, 11).map((slot) => slot.label)).toEqual(FORMATION_SLOTS["4-4-2"]);
    expect(slots.slice(11).map((slot) => slot.label)).toEqual([
      "SB1", "SB2", "SB3", "SB4", "SB5", "SB6", "SB7",
    ]);
  });

  it("reads the empty starter sentinel (empty player id) as an empty slot", () => {
    const slots = lineupSlotsOf(baseTactic());
    expect(slots[0]!.playerId).toEqual(pid("p0"));
    expect(slots[3]!.playerId).toBeNull();
    expect(slots[11]!.playerId).toEqual(pid("b0"));
    expect(slots[13]!.playerId).toBeNull();
  });
});

describe("dropOnLineupSlot", () => {
  it("assigns a pool player to an empty slot", () => {
    const next = dropOnLineupSlot(baseTactic(), 5, pid("p7"));
    expect(playerAt(next, 5)).toEqual(pid("p7"));
    expect(orderOfPlayer(next, "p0")).toBe(0);
    expect(orderOfPlayer(next, "b0")).toBe(11);
  });

  it("replaces the occupant of an occupied slot, and the occupant leaves the lineup", () => {
    const next = dropOnLineupSlot(baseTactic(), 0, pid("p7"));
    expect(playerAt(next, 0)).toEqual(pid("p7"));
    expect(orderOfPlayer(next, "p0")).toBeNull();
    expect(playerAt(next, 5)).toBeNull();
    expect(playerAt(next, 11)).toEqual(pid("b0"));
  });

  it("drops onto a bench slot", () => {
    const next = dropOnLineupSlot(baseTactic(), 12, pid("p7"));
    expect(playerAt(next, 12)).toEqual(pid("p7"));
    expect(next.bench[1]).toEqual(pid("p7"));
  });

  it("moves a player between two slots, emptying the source", () => {
    const from = dropOnLineupSlot(baseTactic(), 5, pid("p7"));
    const moved = dropOnLineupSlot(from, 0, pid("p7"));
    expect(playerAt(moved, 0)).toEqual(pid("p7"));
    expect(playerAt(moved, 5)).toBeNull();
    expect(orderOfPlayer(moved, "p0")).toBeNull();
  });

  it("unassigns the same player everywhere before assigning, keeping the lineup unique", () => {
    const ontoStarter = dropOnLineupSlot(baseTactic(), 0, pid("b1"));
    expect(playerAt(ontoStarter, 0)).toEqual(pid("b1"));
    expect(playerAt(ontoStarter, 12)).toBeNull();
    const next = dropOnLineupSlot(ontoStarter, 11, pid("b1"));
    expect(playerAt(next, 11)).toEqual(pid("b1"));
    expect(playerAt(next, 0)).toBeNull();
    expect(orderOfPlayer(next, "b1")).toBe(11);
  });
});

describe("swapLineupSlots", () => {
  it("swaps two occupied slots", () => {
    const next = swapLineupSlots(baseTactic(), 0, 11);
    expect(playerAt(next, 0)).toEqual(pid("b0"));
    expect(playerAt(next, 11)).toEqual(pid("p0"));
  });

  it("moves into an empty slot, emptying the source", () => {
    const next = swapLineupSlots(baseTactic(), 0, 5);
    expect(playerAt(next, 5)).toEqual(pid("p0"));
    expect(playerAt(next, 0)).toBeNull();
  });

  it("is a no-op for identical or empty-source arguments", () => {
    const tactic = baseTactic();
    expect(swapLineupSlots(tactic, 3, 3)).toBe(tactic);
    expect(swapLineupSlots(tactic, 3, 0)).toBe(tactic);
  });
});

describe("clearLineupSlot", () => {
  it("empties a starter slot back to its sentinel", () => {
    const next = clearLineupSlot(baseTactic(), 0);
    expect(playerAt(next, 0)).toBeNull();
    expect(String(next.slots[0]!.playerId)).toBe("");
  });

  it("empties a bench slot back to null", () => {
    const next = clearLineupSlot(baseTactic(), 11);
    expect(playerAt(next, 11)).toBeNull();
    expect(next.bench[0]).toBeNull();
  });
});

describe("unselectedPlayerIds", () => {
  it("names exactly the squad members not on the lineup, leaving the lineup alone", () => {
    const squad = ["p0", "p1", "p2", "p3", "p4", "p5", "b0", "b1"];
    const pool = unselectedPlayerIds(baseTactic(), squad);
    const expected = squad.filter((id) => !["p0", "p1", "p2", "b0", "b1"].includes(id));
    expect(pool).toEqual(expected);
  });

  it("treats the empty starter sentinel and empty bench nulls as not selected", () => {
    expect(orderOfPlayer(baseTactic(), "")).toBeNull();
    const squad = Array.from({ length: 30 }, (_, i) => `p${i}`);
    const pool = unselectedPlayerIds(baseTactic(), squad);
    expect(pool).toContain("p29");
  });
});
describe("assistantLineupOf", () => {
  // A keeper, a spare keeper, and outfielders rated best at their own Position, falling with index.
  const player = (id: string, position: Position, rating: number, keeper = false): BenchCandidate<PlayerId> => ({
    id: pid(id),
    positions: [{ position, familiarity: "natural" }],
    positionRatings: keeper ? { GK: rating } : { [position]: rating, GK: 1 },
  });
  const squad = [
    player("gk1", "GK", 80, true),
    player("gk2", "GK", 70, true),
    ...FORMATION_SLOTS["4-4-2"].slice(1).map((position, index) => player(`s${index}`, position, 90 - index)),
    ...Array.from({ length: 8 }, (_, index) => player(`r${index}`, "ST", 40 - index)),
  ];

  it("fills every starter slot and the bench in the Tactic's own Formation, keeping its instructions", () => {
    const next = assistantLineupOf(baseTactic(), squad)!;
    expect(next.formation).toBe("4-4-2");
    expect(next.mentality).toBe("balanced");
    expect(next.slots.map((slot) => slot.role)).toEqual(baseTactic().slots.map((slot) => slot.role));
    expect(playerAt(next, 0)).toEqual(pid("gk1"));
    expect(next.slots.slice(1).map((slot) => String(slot.playerId))).toEqual(
      Array.from({ length: 10 }, (_, index) => `s${index}`),
    );
  });

  it("puts the spare keeper first on the bench, then the best of the rest", () => {
    const next = assistantLineupOf(baseTactic(), squad)!;
    expect(next.bench.map(String)).toEqual(["gk2", "r0", "r1", "r2", "r3", "r4", "r5"]);
  });

  it("replaces whatever the lineup held before", () => {
    const next = assistantLineupOf(baseTactic(), squad)!;
    expect(orderOfPlayer(next, "p0")).toBeNull();
    expect(orderOfPlayer(next, "b0")).toBeNull();
  });

  it("returns null when the squad cannot field the Formation", () => {
    expect(assistantLineupOf(baseTactic(), squad.slice(0, 10))).toBeNull();
  });
});
