import { Schema } from "effect";
import {
  GOALKEEPING_ATTRIBUTES,
  HIDDEN_ATTRIBUTES,
  OUTFIELD_ATTRIBUTES,
} from "@cm-clone/shared";
import { describe, expect, it } from "vitest";
import { AppRpcs } from "../src/rpc.js";
import { club, completeTactic } from "./tacticFixtures.js";
import {
  AdvancedOptionsPayload,
  AdvanceCalendarResult,
  AdvanceInProgressError,
  AttributesSchema,
  BidView,
  ClubSummary,
  InsufficientTransferBudgetError,
  MatchCommandPayload,
  NotYourPlayerError,
  NullableTrainingFocusSchema,
  PlayerDevelopedEvent,
  SaveArchivedError,
  SaveNotFoundError,
  SaveSummary,
  SquadPlayerView,
  SquadView,
  TacticsScreenView,
  TrainingFocusSetEvent,
  TrainingFocusView,
  TransfersScreenView,
} from "../src/schemas/index.js";

const roundTrip = <A, I>(schema: Schema.ConstraintCodec<A, I>, wire: unknown): void => {
  const decoded = Schema.decodeUnknownSync(schema)(wire);
  const encoded = Schema.encodeSync(schema)(decoded);
  expect(encoded).toEqual(wire);
};

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
  positionLabel: "S C",
  canPlay: ["F C"],
  positionOrder: 20,
  overallRating: 78,
  positionRatings: { ST: 80 },
  cellRatings: { "F C": 80 },
  suitability: { "F C": 19 },
  retrainingTarget: null,
  condition: 95,
  trainingFocus: null,
  nationality: "nation_eng_england",
  birthplace: "London",
  foreign: false,
  contractWage: 9000,
  contractExpiryDate: "2028-06-30",
  transferValue: 1200000,
};

describe("simple view classes", () => {
  it("SaveSummary round-trips", () => {
    roundTrip(SaveSummary, {
      id: "s1", name: "Test", createdAt: "2026-01-01T00:00:00.000Z",
      archivedCause: null, managerName: "Joe", userClubName: "FC",
      seasonNumber: 1, gameDate: "2026-08-15", lastModifiedAt: "2026-01-10T12:00:00.000Z",
    });
  });

  it("SaveSummary round-trips each cause that archives a save", () => {
    for (const archivedCause of ["sacked", "retired"] as const) {
      roundTrip(SaveSummary, {
        id: "s1", name: "Test", createdAt: "2026-01-01T00:00:00.000Z",
        archivedCause, managerName: "Joe", userClubName: "FC",
        seasonNumber: 1, gameDate: "2026-08-15", lastModifiedAt: "2026-01-10T12:00:00.000Z",
      });
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

describe("discriminated union command payload", () => {
  const tactic = completeTactic();

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

  it("beginCareer's payload round-trips a SnapshotId (ticket 03)", () => {
    roundTrip(AppRpcs.beginCareer.payload, { snapshotId: "snap-1" });
  });

  it("beginCareer's stale-snapshot failure round-trips through the method error schema (ticket 03)", () => {
    roundTrip(AppRpcs.beginCareer.error, {
      _tag: "PresetFingerprintMismatchError",
      expected: "real-geography@1.0.0",
      found: "some-other-database@9.9.9",
    });
  });

  it("commitCareer's manager identity payload round-trips every personal-details field", () => {
    const pillars = { tacticalAcumen: 3, influence: 3, regimen: 3, technicalCoaching: 3 };
    const identity = {
      id: "s1", name: "My Career", selectedClubId: "club_eng_01",
      firstName: "Ada", lastName: "Lovelace", nationalityId: "nation_eng", dateOfBirth: "1980-01-01",
      preferredFormation: "4-3-3",
      avatarPortraitKey: "avatar_01", avatarPrimaryColor: "#1f2937", avatarSecondaryColor: "#f8fafc",
      archetypeOrigin: "professor", pillars,
    } as const;

    roundTrip(AppRpcs.commitCareer.payload, { ...identity, favoriteClubId: "club_eng_02" });
    roundTrip(AppRpcs.commitCareer.payload, {
      ...identity, favoriteClubId: null, avatarPortraitKey: null,
    });
  });

  it("commitCareer's unknown-club failure round-trips through the method error schema", () => {
    roundTrip(AppRpcs.commitCareer.error, {
      _tag: "ClubNotFoundError",
      id: "club_eng_01",
    });
  });

  it("SaveArchivedError round-trips the cause the renderer words its copy from", () => {
    for (const cause of ["sacked", "retired"] as const) {
      roundTrip(SaveArchivedError, { _tag: "SaveArchivedError", saveId: "s1", cause });
    }
  });

  it("TacticRevisionConflictError round-trips through the changeTactics error union", () => {
    roundTrip(AppRpcs.changeTactics.error, {
      _tag: "TacticRevisionConflictError",
      saveId: "s1",
      currentRevision: 4,
    });
  });

  it("InsufficientTransferBudgetError round-trips all numeric fields", () => {
    roundTrip(AdvanceInProgressError, {
      _tag: "AdvanceInProgressError",
      saveId: "s1",
    });
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
      season: { seasonNumber: 1, awaitingFixture: null, currentDate: "2027-05-26", phase: "season_complete" },
      resolvedDate: "2027-05-26",
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
      revision: 3,
    });
  });
});

describe("RPC screen views", () => {
  it("TransfersScreenView round-trips empty bid lists", () => {
    roundTrip(TransfersScreenView, {
      club,
      season: { seasonNumber: 1, awaitingFixture: null, currentDate: "2026-08-01", phase: "pre_season" },
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
  it("PlayerDevelopedEvent round-trips an outcome with and without a previous baseline", () => {
    roundTrip(PlayerDevelopedEvent, {
      seasonNumber: 1, clubId: "c1",
      players: [{ playerId: "p1", attributes }],
    });
    roundTrip(PlayerDevelopedEvent, {
      seasonNumber: 2, clubId: "c1",
      players: [{ playerId: "p1", previousAttributes: attributes, attributes }],
    });
  });

  it("TrainingFocusSetEvent round-trips a Category focus and a null (clear) focus", () => {
    roundTrip(TrainingFocusSetEvent, { seasonNumber: 1, playerId: "p1", focus: "physical" });
    roundTrip(TrainingFocusSetEvent, { seasonNumber: 1, playerId: "p1", focus: null });
  });

  it("TrainingFocusView round-trips its focus", () => {
    roundTrip(TrainingFocusView, { playerId: "p1", focus: "technical" });
  });

  it("SquadPlayerView round-trips a player with no active Contract", () => {
    roundTrip(SquadPlayerView, { ...player, contractWage: null, contractExpiryDate: null });
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

describe("the commentary file", () => {
  it("round-trips a status, with and without problems and new sections, for every method", () => {
    const clean = { files: ["events.cfg", "events_fr.cfg"], active: "events.cfg", problems: [], newSections: [] };
    const older = {
      ...clean,
      problems: ["line 12: skipped, {player2} isn't available in [Foul]"],
      newSections: ["KeyPass:solo", "Phrases"],
    };
    for (const method of [
      "getCommentaryFileStatus",
      "openCommentaryFile",
      "resetCommentaryFile",
      "chooseCommentaryFile",
      "updateCommentaryFile",
    ] as const) {
      roundTrip(AppRpcs[method].success, clean);
      roundTrip(AppRpcs[method].success, older);
    }
  });

  it("round-trips the payloads and the error", () => {
    roundTrip(AppRpcs.openCommentaryFile.payload, { target: "folder" });
    roundTrip(AppRpcs.chooseCommentaryFile.payload, { name: "events_fr.cfg" });
    roundTrip(AppRpcs.updateCommentaryFile.payload, { addNewSections: true });
    roundTrip(AppRpcs.resetCommentaryFile.error, { _tag: "CommentaryFileError", action: "reset", reason: "EACCES" });
  });

  it("carries no filesystem path to the renderer", () => {
    const fields = Object.keys(AppRpcs.getCommentaryFileStatus.success.fields);
    expect(fields.sort()).toEqual(["active", "files", "newSections", "problems"]);
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

describe("advanced options payload route", () => {
  it("AdvancedOptionsPayload round-trips the shipped default", () => {
    roundTrip(AdvancedOptionsPayload, {
      version: 1,
      matchSimulationDetail: "standard",
      transferMarketActivity: "standard",
      rosterGenerationDetail: "standard",
      informationVisibility: "exact",
    });
  });

  it("AdvancedOptionsPayload round-trips every legal value set", () => {
    roundTrip(AdvancedOptionsPayload, {
      version: 1,
      matchSimulationDetail: "full",
      transferMarketActivity: "active",
      rosterGenerationDetail: "first_team",
      informationVisibility: "ranged",
    });
  });

  it("AdvancedOptionsPayload rejects an unsupported option value", () => {
    expect(() =>
      Schema.decodeUnknownSync(AdvancedOptionsPayload)({
        version: 1,
        matchSimulationDetail: "turbo",
        transferMarketActivity: "standard",
        rosterGenerationDetail: "standard",
        informationVisibility: "exact",
      }),
    ).toThrow();
  });

  it("AdvancedOptionsPayload rejects a future version", () => {
    expect(() =>
      Schema.decodeUnknownSync(AdvancedOptionsPayload)({
        version: 2,
        matchSimulationDetail: "standard",
        transferMarketActivity: "standard",
        rosterGenerationDetail: "standard",
        informationVisibility: "exact",
      }),
    ).toThrow();
  });
});
