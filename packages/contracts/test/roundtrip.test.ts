import { Schema } from "effect";
import {
  GOALKEEPING_ATTRIBUTES,
  HIDDEN_ATTRIBUTES,
  OUTFIELD_ATTRIBUTES,
} from "@cm-clone/shared";
import { describe, expect, it } from "vitest";
import { AppRpcs } from "../src/rpc.js";
import {
  AdvanceCalendarResult,
  AttributesSchema,
  BidView,
  ClubSummary,
  InjuryView,
  InvalidTacticError,
  InsufficientTransferBudgetError,
  MarketPlayerView,
  PlayerId,
  MatchCommandPayload,
  NotYourPlayerError,
  NullableTrainingFocusSchema,
  PlayerDevelopedEvent,
  SaveArchivedError,
  SaveNotFoundError,
  SaveSummary,
  SquadPlayerView,
  SquadView,
  Tactic,
  TacticsScreenView,
  TrainingFocusSetEvent,
  TrainingFocusView,
  TransfersScreenView,
} from "../src/schemas.js";

const roundTrip = <A, I>(schema: Schema.ConstraintCodec<A, I>, wire: unknown): void => {
  const decoded = Schema.decodeUnknownSync(schema)(wire);
  const encoded = Schema.encodeSync(schema)(decoded);
  expect(encoded).toEqual(wire);
};

const club = { id: "c1", name: "Castlemere United", statureTier: "big" };

const attributes = {
  ...Object.fromEntries(OUTFIELD_ATTRIBUTES.map((a) => [a, 12])),
  ...Object.fromEntries(GOALKEEPING_ATTRIBUTES.map((a) => [a, 14])),
  ...Object.fromEntries(HIDDEN_ATTRIBUTES.map((a) => [a, 5])),
};

const player = {
  id: "p1",
  firstName: "Alex",
  lastName: "Brown",
  dateOfBirth: "2000-05-15",
  age: 24,
  attributes,
  positions: [{ position: "ST", familiarity: "natural" }],
  overallRating: 78,
  positionRatings: { ST: 80 },
  condition: 95,
  trainingFocus: null,
};

describe("simple view classes", () => {
  it("SaveSummary round-trips", () => {
    roundTrip(SaveSummary, { id: "s1", name: "Test", createdAt: "2026-01-01", archivedCause: null });
  });

  it("SaveSummary round-trips each cause that archives a save", () => {
    for (const archivedCause of ["sacked", "retired"] as const) {
      roundTrip(SaveSummary, { id: "s1", name: "Test", createdAt: "2026-01-01", archivedCause });
    }
  });

  it("ClubSummary round-trips", () => {
    roundTrip(ClubSummary, club);
  });
});

describe("attributes", () => {
  it("requires every outfield attribute but allows omitting goalkeeping and hidden", () => {
    const outfieldOnly = Object.fromEntries(OUTFIELD_ATTRIBUTES.map((a) => [a, 12]));
    const decoded = Schema.decodeSync(AttributesSchema)(outfieldOnly);
    expect(decoded.passing).toBe(12);
    expect(decoded.gkHandling).toBeUndefined();
    expect(decoded.injuryProneness).toBeUndefined();
  });

  it("rejects a missing required outfield attribute", () => {
    const missingShooting = Object.fromEntries(
        OUTFIELD_ATTRIBUTES.filter((a) => a !== "shooting").map((a) => [a, 12]),
      );
    expect(() =>
      Schema.decodeSync(AttributesSchema)(missingShooting),
    ).toThrow();
  });
});

describe("nested composition", () => {
  it("SquadPlayerView round-trips nested PlayerPositionView + attributes", () => {
    roundTrip(SquadPlayerView, player);
  });

  it("SquadView round-trips club + players", () => {
    roundTrip(SquadView, { club, players: [player] });
  });
});

describe("literals and enums", () => {
  it("Tactic rejects an invalid formation", () => {
    expect(() =>
      Schema.decodeUnknownSync(Tactic)({
        formation: "4-2-3-1",
        slots: [],
        mentality: "balanced",
        tempo: "normal",
        pressing: "medium",
      }),
    ).toThrow();
  });

  it("InjuryView rejects an unknown trigger", () => {
    expect(() =>
      Schema.decodeUnknownSync(InjuryView)({
        minute: 30,
        teamClubId: "c1",
        playerId: "p1",
        trigger: "slide",
        severity: "light",
        tier: "orange",
        type: "strain",
      }),
    ).toThrow();
  });
});

describe("discriminated union command payload", () => {
  const tactic = {
    formation: "4-4-2",
    slots: [{ position: "ST", role: "Poacher", playerId: PlayerId.make("p1") }],
    mentality: "balanced",
    tempo: "normal",
    pressing: "medium",
  } satisfies Tactic;

  it("round-trips ChangeTacticsCommandPayload and selects it by _tag", () => {
    const payload = { _tag: "ChangeTactics", clubId: "c1", tactic };
    const decoded = Schema.decodeUnknownSync(MatchCommandPayload)(payload);
    expect(decoded._tag).toBe("ChangeTactics");
    expect(Schema.encodeSync(MatchCommandPayload)(decoded)).toEqual(payload);
  });

  it("round-trips MakeSubstitutionCommandPayload", () => {
    roundTrip(MatchCommandPayload, {
      _tag: "MakeSubstitution",
      clubId: "c1",
      outPlayerId: "p1",
      inPlayerId: "p2",
    });
  });

  it("round-trips ForceOffCommandPayload", () => {
    roundTrip(MatchCommandPayload, { _tag: "ForceOff", clubId: "c1", playerId: "p1" });
  });

  it("rejects an unregistered _tag", () => {
    expect(() =>
      Schema.decodeUnknownSync(MatchCommandPayload)({
        _tag: "NotACommand",
        clubId: "c1",
      }),
    ).toThrow();
  });
});

describe("tagged errors", () => {
  it("SaveNotFoundError round-trips and keeps _tag", () => {
    const err = { _tag: "SaveNotFoundError", id: "s1" };
    const decoded = Schema.decodeUnknownSync(SaveNotFoundError)(err);
    expect(decoded._tag).toBe("SaveNotFoundError");
    expect(Schema.encodeSync(SaveNotFoundError)(decoded)).toEqual(err);
  });

  it("loadSave's missing-save typed failure round-trips through the method error schema (AC-12)", () => {
    roundTrip(AppRpcs.loadSave.error, { _tag: "SaveNotFoundError", id: "s1" });
  });

  it("SaveArchivedError round-trips the cause the renderer words its copy from", () => {
    for (const cause of ["sacked", "retired"] as const) {
      roundTrip(SaveArchivedError, { _tag: "SaveArchivedError", saveId: "s1", cause });
    }
  });

  it("InvalidTacticError round-trips its reason", () => {
    roundTrip(InvalidTacticError, { _tag: "InvalidTacticError", reason: "bad slot" });
  });

  it("InsufficientTransferBudgetError round-trips all numeric fields", () => {
    roundTrip(InsufficientTransferBudgetError, {
      _tag: "InsufficientTransferBudgetError",
      clubId: "c1",
      amount: 100,
      remaining: 50,
    });
  });
});

describe("optional and nullable fields", () => {
  it("AdvanceCalendarResult round-trips nulls and the verdict literal", () => {
    roundTrip(AdvanceCalendarResult, {
      season: { seasonNumber: 1, currentMatchday: 38, phase: "season_complete" },
      resolvedMatchday: 38,
      transferWindowClosed: null,
      transferWindowOpened: null,
      seasonConcluded: true,
      boardObjectiveVerdict: "met",
      managerOutcome: "sacked",
    });
  });

  it("TacticsScreenView round-trips a null tactic", () => {
    roundTrip(TacticsScreenView, {
      club,
      squad: [player],
      tactic: null,
    });
  });
});

describe("RPC screen views", () => {
  it("TransfersScreenView round-trips empty bid lists", () => {
    roundTrip(TransfersScreenView, {
      club,
      season: { seasonNumber: 1, currentMatchday: 1, phase: "pre_season" },
      windowOpen: true,
      transferBudgetRemaining: 8000000,
      wageBudget: 20000,
      wageBudgetUsed: 12000,
      incomingBids: [],
      outgoingBids: [],
      freeAgents: [],
      marketPlayers: [],
    });
  });

  it("MarketPlayerView round-trips null club for a free agent", () => {
    roundTrip(MarketPlayerView, {
      id: "p1",
      firstName: "Alex",
      lastName: "Brown",
      age: 24,
      clubId: null,
      clubName: null,
      overallRating: 78,
      transferValue: 500000,
      positions: [{ position: "ST", familiarity: "natural" }],
    });
  });

  it("BidView round-trips a countered bid", () => {
    roundTrip(BidView, {
      id: "b1",
      playerId: "p1",
      playerName: "Alex Brown",
      sellingClubId: "c1",
      sellingClubName: "Castlemere United",
      biddingClubId: "c2",
      biddingClubName: "Northgate Athletic",
      amount: 1000,
      counterAmount: 1200,
      status: "countered",
    });
  });
});

describe("Player Development & Training Focus schemas", () => {
  it("PlayerDevelopedEvent round-trips a club's player Attribute set", () => {
    roundTrip(PlayerDevelopedEvent, {
      seasonNumber: 1,
      clubId: "c1",
      players: [{ playerId: "p1", attributes }],
    });
  });

  it("TrainingFocusSetEvent round-trips a Category focus and a null (clear) focus", () => {
    roundTrip(TrainingFocusSetEvent, { seasonNumber: 1, playerId: "p1", focus: "physical" });
    roundTrip(TrainingFocusSetEvent, { seasonNumber: 1, playerId: "p1", focus: null });
  });

  it("TrainingFocusView round-trips its focus", () => {
    roundTrip(TrainingFocusView, { playerId: "p1", focus: "technical" });
  });

  it("SquadPlayerView round-trips a non-null trainingFocus", () => {
    roundTrip(SquadPlayerView, { ...player, trainingFocus: "mental" });
  });

  it("rejects an unknown Category for a focus", () => {
    expect(() =>
      Schema.decodeUnknownSync(NullableTrainingFocusSchema)("conditioning"),
    ).toThrow();
  });

  it("NotYourPlayerError round-trips", () => {
    roundTrip(NotYourPlayerError, { _tag: "NotYourPlayerError", playerId: "p1" });
  });

  it("SetTrainingFocus command payload round-trips a Category focus and a null (clear) focus", () => {
    const payload = AppRpcs.setTrainingFocus.payload;
    expect(
      Schema.decodeSync(payload)({
        saveId: "s1",
        playerId: "p1",
        focus: "goalkeeping",
      }),
    ).toEqual({ saveId: "s1", playerId: "p1", focus: "goalkeeping" });
    expect(
      Schema.decodeSync(payload)({ saveId: "s1", playerId: "p1", focus: null }),
    ).toEqual({ saveId: "s1", playerId: "p1", focus: null });
  });
});

describe("key binding overrides — the four Stage 6 procedures (AC-34)", () => {
  it("getKeyBindingOverrides round-trips an empty and a populated override map", () => {
    roundTrip(AppRpcs.getKeyBindingOverrides.success, {});
    roundTrip(AppRpcs.getKeyBindingOverrides.success, {
      "focus-bid": "v",
      "go-to-squad": "g q",
    });
  });

  it("setKeyBindingOverride payload round-trips actionId + binding", () => {
    roundTrip(AppRpcs.setKeyBindingOverride.payload, { actionId: "go-to-squad", binding: "g q" });
  });

  it("setKeyBindingOverride success round-trips the updated map", () => {
    roundTrip(AppRpcs.setKeyBindingOverride.success, { "go-to-squad": "g q" });
  });

  it("each rejected-write failure round-trips through the method error union (AC-35)", () => {
    roundTrip(AppRpcs.setKeyBindingOverride.error, {
      _tag: "LockedKeyOverrideError",
      actionId: "open-palette",
      binding: "Primary+K",
    });
    roundTrip(AppRpcs.setKeyBindingOverride.error, {
      _tag: "CollidingOverrideError",
      actionId: "focus-bid",
      binding: "b",
      conflictingActionId: "place-bid",
    });
    roundTrip(AppRpcs.setKeyBindingOverride.error, {
      _tag: "InvalidBindingShapeError",
      actionId: "focus-bid",
      binding: "ArrowDown",
    });
  });

  it("resetKeyBinding payload round-trips an actionId", () => {
    roundTrip(AppRpcs.resetKeyBinding.payload, { actionId: "focus-bid" });
  });

  it("resetAllKeyBindings success round-trips the empty map", () => {
    roundTrip(AppRpcs.resetAllKeyBindings.success, {});
  });
});