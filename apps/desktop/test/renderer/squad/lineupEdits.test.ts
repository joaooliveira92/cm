import { describe, expect, it } from "vitest";
import { PlayerId, Tactic } from "@cm-clone/contracts";
import { BUILT_IN_TEMPLATES, slotLabel, type BenchCandidate, type CellRatingsLike } from "@cm-clone/shared";
import {
  assistantLineupOf,
  clearLineupSlot,
  dropOnLineupSlot,
  lineupSlotsOf,
  orderOfPlayer,
  playerAt,
  swapLineupSlots,
  unselectedPlayerIds,
} from "../../../src/renderer/squad/lineupEdits.js";

const pid = (s: string) => PlayerId.make(s);

const NO_PLAYER = pid("");
const fourFourTwoTemplate = BUILT_IN_TEMPLATES.find((t) => t.name === "4-4-2")!;
const fourFourTwoCells = fourFourTwoTemplate.slots.map((s) => s.cell);

const baseTactic = (): Tactic =>
  new Tactic({
    sourceTemplate: "4-4-2",
    slots: fourFourTwoCells.map((cell) => ({
      cell,
      run: null,
      subRow: 0.5,
      subCol: 0.5,
      instructions: {
        passing: "team" as const,
        closingDown: "team" as const,
        tackling: "team" as const,
        marking: "team" as const,
        mentality: "team" as const,
        distribution: "default" as const,
        crossFrom: "default" as const,
        crossAim: "default" as const,
        crossBall: "normal" as const,
        longShots: "normal" as const,
        forwardRuns: "normal" as const,
        runWithBall: "normal" as const,
        tryThroughBalls: "normal" as const,
        freeRole: "normal" as const,
        holdUpBall: "normal" as const,
      },
      setPieceRoles: {
        defendFreeKick: "default" as const,
        attackFreeKick: "default" as const,
        defendCorner: "default" as const,
        attackCorner: "default" as const,
        attackingThrowInLeft: "default" as const,
        attackingThrowInRight: "default" as const,
      },
    })),
    team: {
      passing: "mixed" as const,
      focusPassing: "mixed" as const,
      tackling: "normal" as const,
      closingDown: "default" as const,
      mentality: "normal" as const,
      offsideTrap: false,
      zonalMarking: true,
      counterAttack: false,
      menBehindTheBall: false,
    },
    teamSetPieces: {
      cornersLeft: "default" as const,
      cornersRight: "default" as const,
      freeKicksLeft: "default" as const,
      freeKicksRight: "default" as const,
      throwInsLeft: "default" as const,
      throwInsRight: "default" as const,
    },
    assignments: fourFourTwoCells.map((_, index) => (index < 3 ? pid(`p${index}`) : NO_PLAYER)),
    bench: Array.from({ length: 7 }, (_, i) => (i < 2 ? pid(`b${i}`) : null)),
    takers: {
      captain: [],
      penalties: [],
      freeKicksLeft: [],
      freeKicksRight: [],
      cornersLeft: [],
      cornersRight: [],
      throwInsLeft: [],
      throwInsRight: [],
    },
  });

describe("the lineup bar's slot geometry", () => {
  it("renders the eleven starters in formation order and the seven bench slots after them", () => {
    const slots = lineupSlotsOf(baseTactic());
    expect(slots).toHaveLength(18);
    expect(slots.slice(0, 11).map((slot) => slot.label)).toEqual(fourFourTwoCells.map((cell) => slotLabel(cell)));
    expect(slots.slice(11).map((slot) => slot.label)).toEqual([
      "SB1", "SB2", "SB3", "SB4", "SB5", "SB6", "SB7",
    ]);
  });

  it("labels each starter by the slot's own cell, so a custom shape reads as moved", () => {
    const base = baseTactic();
    const custom = new Tactic({
      ...base,
      slots: [
        ...base.slots.slice(0, 5),
        { ...base.slots[5]!, cell: { row: "D" as const, column: "C" as const } },
        ...base.slots.slice(6),
      ],
    });
    expect(lineupSlotsOf(custom)[5]!.label).toBe("D C");
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
    expect(String(next.assignments[0])).toBe("");
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
  const player = (id: string, cellLabel: string, rating: number, keeper = false) => ({
    id: pid(id),
    positions: keeper ? [{ position: "GK" as const, familiarity: "natural" as const }] : [{ position: "DC" as const, familiarity: "natural" as const }],
    positionRatings: keeper ? { GK: rating } : { DC: rating, GK: 1 },
    cellRatings: {} as Readonly<Record<string, number>>,
  }) as BenchCandidate<PlayerId> & CellRatingsLike<PlayerId>;
  const squad = [
    player("gk1", "GK", 80, true),
    player("gk2", "GK", 70, true),
    ...fourFourTwoCells.slice(1).map((_cell, index) => player(`s${index}`, "DC", 90 - index)),
    ...Array.from({ length: 8 }, (_, index) => player(`r${index}`, "DC", 40 - index)),
  ];

  it("fills every starter slot and the bench in the Tactic's own Formation, keeping its instructions", () => {
    const next = assistantLineupOf(baseTactic(), squad)!;
    expect(next.sourceTemplate).toBe("4-4-2");
    expect(next.team.mentality).toBe("normal");
    expect(playerAt(next, 0)).toEqual(pid("gk1"));
  });

  it("fills a custom shape by the slots' own cells, not the Formation's template", () => {
    const base = baseTactic();
    const custom = new Tactic({
      ...base,
      slots: [
        ...base.slots.slice(0, 5),
        { ...base.slots[5]!, cell: { row: "D" as const, column: "C" as const } },
        ...base.slots.slice(6),
      ],
    });
    const next = assistantLineupOf(custom, squad)!;
    expect(String(next.assignments[5])).toBe("s0");
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