import { Schema } from "effect";
import { builtInTemplate, describeTacticProblem, validateTactic } from "@cm-clone/shared";
import { describe, expect, it } from "vitest";
import { AppRpcs } from "../src/rpc.js";
import { ChangeTacticsPayload, InvalidTacticError, Tactic, TacticsOverviewView } from "../src/schemas/index.js";
import { club, completeTactic } from "./tacticFixtures.js";

const roundTrip = <A, I>(schema: Schema.ConstraintCodec<A, I>, wire: unknown): void => {
  const decoded = Schema.decodeUnknownSync(schema)(wire);
  const encoded = Schema.encodeSync(schema)(decoded);
  expect(encoded).toEqual(wire);
};

describe("literals and enums", () => {
  it("Tactic round-trips every field of the complete model", () => {
    roundTrip(Tactic, completeTactic());
  });

  it("Tactic rejects a value outside a closed set, a bad cell and an unknown taker list", () => {
    const withTeam = (team: unknown) => ({ ...completeTactic(), team });
    expect(() => Schema.decodeUnknownSync(Tactic)(withTeam({ ...completeTactic().team, passing: "wild" }))).toThrow();
    const badCell = completeTactic();
    badCell.slots[3].cell = { row: "GK", column: "L" };
    expect(() => Schema.decodeUnknownSync(Tactic)(badCell)).toThrow();
    const badRun = completeTactic();
    badRun.slots[3].run = { row: "XX", column: "C" };
    expect(() => Schema.decodeUnknownSync(Tactic)(badRun)).toThrow();
  });

  it("Tactic no longer carries a formation, Role, Tempo or Pressing", () => {
    const wire = completeTactic();
    expect(Object.keys(wire).sort()).toEqual(
      ["assignments", "bench", "slots", "sourceTemplate", "takers", "team", "teamSetPieces"].sort(),
    );
    expect(Object.keys(wire.slots[0]).sort()).toEqual(["cell", "instructions", "run", "setPieceRoles", "subCol", "subRow"]);
    expect(Object.keys(wire.team)).not.toContain("tempo");
    expect(Object.keys(wire.team)).not.toContain("pressing");
  });
});

describe("the changeTactics command", () => {
  it("InvalidTacticError round-trips the rules' named problems", () => {
    const tactic = completeTactic();
    const broken = { ...tactic, bench: tactic.bench.slice(0, 2), assignments: [...tactic.assignments.slice(0, 10), tactic.assignments[0]] };
    const problems = validateTactic(broken);
    expect(problems.length).toBeGreaterThan(1);
    roundTrip(InvalidTacticError, {
      _tag: "InvalidTacticError",
      reason: problems.map(describeTacticProblem).join("; "),
      problems,
    });
    roundTrip(InvalidTacticError, {
      _tag: "InvalidTacticError",
      reason: "team: \"wild\" is not a value of passing",
      problems: [{ _tag: "InvalidValue", where: "team", field: "passing", value: "wild" }],
    });
  });

  it("changeTactics' error union carries the invalid Tactic beside the revision conflict", () => {
    roundTrip(AppRpcs.changeTactics.error, {
      _tag: "InvalidTacticError",
      reason: "slot 4 repeats cell D C",
      problems: [{ _tag: "DuplicateCell", slot: 4, cell: "D C" }],
    });
  });

  it("changeTactics payload round-trips expectedRevision and requestId", () => {
    roundTrip(ChangeTacticsPayload, {
      saveId: "s1",
      tactic: completeTactic(),
      expectedRevision: 2,
      requestId: "req-1234",
    });
  });

});

describe("tactics overview snapshot (Screen 80)", () => {
  const fourFourTwoSlots = builtInTemplate("4-4-2")!.slots.map((slot) => ({ cell: slot.cell, run: slot.run, subRow: slot.subRow, subCol: slot.subCol }));

  const snapshot = {
    club,
    revision: 4,
    formation: { template: "4-4-2", modified: true, shape: "4-4-2", slots: fourFourTwoSlots },
    instructions: builtInTemplate("4-4-2")!.team,
    assignments: [
      {
        playerId: "p1",
        firstName: "Alex",
        lastName: "Brown",
        cell: { row: "F", column: "RC" },
        positionRating: 81,
        familiarity: "natural",
      },
    ],
    familiarity: { natural: 7, competent: 3, unfamiliar: 1 },
    selection: {
      starters: [{ id: "p1", firstName: "Alex", lastName: "Brown" }],
      substitutes: [{ id: "p2", firstName: "Sam", lastName: "Smith" }],
    },
    setPieces: { status: "none" },
    issues: [
      {
        id: "bids-awaiting-response",
        severity: "advisory",
        title: "Bids awaiting your response",
        detail: "A club has bid for your players. Advancing lets it lapse.",
        destination: "transfers",
      },
    ],
  } as const;

  it("round-trips a fully populated snapshot", () => {
    roundTrip(TacticsOverviewView, snapshot);
  });

  it("round-trips the no-tactic state — null formation, instructions, familiarity, empty assignments", () => {
    roundTrip(TacticsOverviewView, {
      club,
      revision: 0,
      formation: null,
      instructions: null,
      assignments: [],
      familiarity: null,
      selection: { starters: [], substitutes: [] },
      setPieces: { status: "none" },
      issues: [],
    });
  });

  it("round-trips a departed-player assignment — nulls where the player has left", () => {
    roundTrip(TacticsOverviewView, {
      ...snapshot,
      assignments: [
        {
          playerId: "gone",
          firstName: null,
          lastName: null,
          cell: { row: "F", column: "RC" },
          positionRating: null,
          familiarity: null,
        },
      ],
    });
  });

  it("rejects a setPiece status other than none", () => {
    expect(() =>
      Schema.decodeUnknownSync(TacticsOverviewView)({ ...snapshot, setPieces: { status: "few" } }),
    ).toThrow();
  });

  it("getTacticsOverview's success schema is the snapshot", () => {
    expect(TacticsOverviewView).toBe(AppRpcs.getTacticsOverview.success);
  });
});

