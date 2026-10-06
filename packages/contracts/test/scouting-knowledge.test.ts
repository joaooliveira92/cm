import { Schema } from "effect";
import { describe, expect, it } from "vitest";
import { AppRpcs } from "../src/rpc.js";
import { KnowledgeClubView, KnowledgePlayerView, ScoutingKnowledgeView } from "../src/schemas/index.js";

const roundTrip = <A, I>(schema: Schema.ConstraintCodec<A, I>, wire: unknown): void => {
  const decoded = Schema.decodeUnknownSync(schema)(wire);
  const encoded = Schema.encodeSync(schema)(decoded);
  expect(encoded).toEqual(wire);
};

const club = (overrides: Record<string, unknown> = {}) => ({
  clubId: "club-7",
  clubName: "Northport Rovers",
  squadSize: 22,
  scoutedCount: 3,
  fullyScoutedCount: 1,
  coverage: 0.1,
  knowledgeConfidence: "low",
  ...overrides,
});

const player = (overrides: Record<string, unknown> = {}) => ({
  playerId: "p-9",
  firstName: "Nico",
  lastName: "Striker",
  clubId: "club-7",
  clubName: "Northport Rovers",
  progress: 35,
  ...overrides,
});

describe("Scouting Knowledge view (Screen 126)", () => {
  it.each(["low", "moderate", "high", "complete"] as const)(
    "KnowledgeClubView round-trips Knowledge Confidence %s",
    (knowledgeConfidence) => {
      roundTrip(KnowledgeClubView, club({ knowledgeConfidence }));
    },
  );

  it("KnowledgeClubView rejects a confidence outside the four bands, or a missing coverage", () => {
    expect(() => Schema.decodeUnknownSync(KnowledgeClubView)(club({ knowledgeConfidence: "certain" }))).toThrow();
    expect(() => Schema.decodeUnknownSync(KnowledgeClubView)(club({ coverage: undefined }))).toThrow();
    expect(() => Schema.decodeUnknownSync(KnowledgeClubView)(club({ scoutedCount: Number.NaN }))).toThrow();
  });

  it.each([1, 99, 100])("KnowledgePlayerView round-trips Scouting Progress %d", (progress) => {
    roundTrip(KnowledgePlayerView, player({ progress }));
  });

  it("KnowledgePlayerView round-trips a Free Agent with no Club", () => {
    roundTrip(KnowledgePlayerView, player({ clubId: null, clubName: null }));
  });

  it("KnowledgePlayerView rejects a missing Scouting Progress", () => {
    expect(() => Schema.decodeSync(KnowledgePlayerView)(player({ progress: undefined }))).toThrow();
    expect(() => Schema.decodeSync(KnowledgePlayerView)(player({ progress: "35" }))).toThrow();
  });

  it("carries no Attribute, Attribute Range, Overall Rating or Transfer Value", () => {
    const withFigures = {
      clubs: [club({ overallRating: 70 })],
      players: [player({ abilityLow: 50, abilityHigh: 70, transferValue: 1_000_000, passing: 14 })],
    };
    const encoded = Schema.encodeSync(ScoutingKnowledgeView)(
      Schema.decodeUnknownSync(ScoutingKnowledgeView)(withFigures),
    );
    expect(encoded).toEqual({ clubs: [club()], players: [player()] });
  });

  it("ScoutingKnowledgeView round-trips populated lists and the empty no-scouting result", () => {
    roundTrip(ScoutingKnowledgeView, {
      clubs: [club(), club({ clubId: "club-9", clubName: "Eastvale United", coverage: 1, knowledgeConfidence: "complete" })],
      players: [player(), player({ playerId: "p-10", progress: 100 })],
    });
    roundTrip(ScoutingKnowledgeView, { clubs: [], players: [] });
  });

  it("is the getScoutingKnowledge success schema", () => {
    expect(AppRpcs.getScoutingKnowledge.success).toBe(ScoutingKnowledgeView);
  });

  it("getScoutingKnowledge payload round-trips a saveId", () => {
    roundTrip(AppRpcs.getScoutingKnowledge.payload, { saveId: "s1" });
  });

  it("getScoutingKnowledge error schema round-trips SaveNotFoundError", () => {
    roundTrip(AppRpcs.getScoutingKnowledge.error, { _tag: "SaveNotFoundError", id: "s1" });
  });
});
