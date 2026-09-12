import { Schema } from "effect";
import { describe, expect, it } from "vitest";
import { AppRpcs } from "../src/rpc.js";
import {
  ClubNotFoundError,
  ClubNotScoutedError,
  SaveNotFoundError,
  TeamScoutReportView,
} from "../src/schemas/index.js";

const roundTrip = <A, I>(schema: Schema.ConstraintCodec<A, I>, wire: unknown): void => {
  const decoded = Schema.decodeUnknownSync(schema)(wire);
  const encoded = Schema.encodeSync(schema)(decoded);
  expect(encoded).toEqual(wire);
};

const report = {
  reportId: "c2:2026-03-14",
  targetClubId: "c2",
  targetClubName: "Northbridge Rovers",
  scout: { scoutId: "st1", scoutName: "Marta Reyes" },
  observedAt: "2026-03-14",
  knowledgeConfidence: "moderate",
  freshness: "recent",
  predictedFormation: { formation: "4-4-2", confidence: "low" },
  recentForm: [
    {
      date: "2026-03-07",
      opponentClubName: "Castlemere United",
      isHome: false,
      goalsFor: 1,
      goalsAgainst: 2,
    },
  ],
  strengths: [{ area: "attack", note: "Dangerous from wide areas.", confidence: "high" }],
  weaknesses: [{ area: "defense", note: "Concedes from crosses.", confidence: "moderate" }],
  keyPlayers: [
    {
      playerId: "p9",
      firstName: "Ivo",
      lastName: "Sandvik",
      position: "ST",
      progress: 60,
      abilityLow: 66,
      abilityHigh: 82,
    },
  ],
  setPieceFindings: [{ area: "setPieces", note: "Short corners.", confidence: "low" }],
};

describe("TeamScoutReportView", () => {
  it("round-trips a full report", () => {
    roundTrip(TeamScoutReportView, report);
  });

  it("round-trips a report with no scout and no predicted formation", () => {
    roundTrip(TeamScoutReportView, { ...report, scout: null, predictedFormation: null });
  });

  it("round-trips every knowledge confidence and freshness band", () => {
    for (const knowledgeConfidence of ["low", "moderate", "high", "complete"] as const) {
      roundTrip(TeamScoutReportView, { ...report, knowledgeConfidence });
    }
    for (const freshness of ["current", "recent", "aging", "stale"] as const) {
      roundTrip(TeamScoutReportView, { ...report, freshness });
    }
  });

  it("is the getTeamScoutReport success schema", () => {
    expect(TeamScoutReportView).toBe(AppRpcs.getTeamScoutReport.success);
  });

  it("rejects a confidence band the derivation cannot produce", () => {
    expect(() =>
      Schema.decodeUnknownSync(TeamScoutReportView)({ ...report, knowledgeConfidence: "certain" }),
    ).toThrow();
  });

  it("rejects a finding area outside the closed set", () => {
    expect(() =>
      Schema.decodeUnknownSync(TeamScoutReportView)({
        ...report,
        strengths: [{ area: "morale", note: "Buoyant.", confidence: "high" }],
      }),
    ).toThrow();
  });

  /** The shape carries no exact-ability field at all, so there is nowhere for a hidden value to sit:
   *  a Fully Scouted player expresses an exact reading as a range whose bounds coincide. */
  it("carries ability only as a range, with Fully Scouted collapsing the bounds", () => {
    const [fullyScouted] = report.keyPlayers;
    const decoded = Schema.decodeUnknownSync(TeamScoutReportView)({
      ...report,
      keyPlayers: [{ ...fullyScouted, progress: 100, abilityLow: 74, abilityHigh: 74 }],
    });
    const [summary] = decoded.keyPlayers;
    expect(summary).toBeDefined();
    expect(Object.keys(summary as object)).not.toContain("ability");
    expect(summary?.abilityLow).toBe(summary?.abilityHigh);
  });
});

describe("the report's failure channel", () => {
  it("round-trips ClubNotScoutedError", () => {
    roundTrip(ClubNotScoutedError, { _tag: "ClubNotScoutedError", clubId: "c2" });
  });

  /**
   * Three, not the four the ticket listed. `SaveArchivedError` is deliberately absent: an Archived
   * Save is read-only rather than unreadable, so every pure read in this codebase omits it and only
   * mutating commands carry the guard. A report on a finished career is a legitimate read.
   */
  it("is a closed union of save-not-found, club-not-found, and not-scouted", () => {
    expect(AppRpcs.getTeamScoutReport.error.members).toEqual([
      SaveNotFoundError,
      ClubNotFoundError,
      ClubNotScoutedError,
    ]);
  });
});
