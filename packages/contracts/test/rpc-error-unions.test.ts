import { Schema } from "effect";
import { describe, expect, it } from "vitest";
import { AppRpcs } from "../src/rpc.js";

/**
 * An RPC's `error` union is the only thing that keeps a failure typed as it crosses the boundary:
 * `handleRpc` encodes the raised error with it, and an error the union omits falls through to the
 * raw re-raise, which structured clone flattens to name/message and the renderer cannot describe.
 *
 * The handler map is typed `Effect<unknown, unknown>`, so typecheck cannot see the omission. These
 * cases pin the unions that a shipped handler was observed to under-declare, one wire sample per
 * error, so the omission fails here instead of at runtime.
 */
const roundTrip = <A, I>(schema: Schema.ConstraintCodec<A, I>, wire: unknown): void => {
  const decoded = Schema.decodeUnknownSync(schema)(wire);
  const encoded = Schema.encodeSync(schema)(decoded);
  expect(encoded).toEqual(wire);
};

const pendingFixtureIntegrity = {
  _tag: "PendingFixtureIntegrityError",
  fixtureId: 1,
  reason: "awaiting fixture is not in the current season",
};

const saveNotFound = { _tag: "SaveNotFoundError", id: "s1" };

const clubNotFound = { _tag: "ClubNotFoundError", id: "c7" };

describe("RPC error unions declare what their handler can raise", () => {
  // `loadSave` refuses a save made under another save schema before it reads anything.
  describe("loadSave", () => {
    it("round-trips a missing save", () => {
      roundTrip(AppRpcs.loadSave.error, saveNotFound);
    });

    it("round-trips a save made under another schema", () => {
      roundTrip(AppRpcs.loadSave.error, { _tag: "SaveSchemaMismatchError", id: "s1" });
    });
  });

  // `getCompetitionTable` folds `toSeasonView` exactly as its sibling `getLeagueTable` does.
  describe("getCompetitionTable", () => {
    it("round-trips a missing save", () => {
      roundTrip(AppRpcs.getCompetitionTable.error, saveNotFound);
    });

    it("round-trips a pending-fixture integrity failure", () => {
      roundTrip(AppRpcs.getCompetitionTable.error, pendingFixtureIntegrity);
    });
  });

  // The club-scoped reads share one error union: a missing save, or a club id that names nothing
  // in that save. Only the save or the club id can fail, so those are the only two arms.
  describe("getClubSquad (screen 35)", () => {
    it("round-trips a missing save", () => {
      roundTrip(AppRpcs.getClubSquad.error, saveNotFound);
    });

    it("round-trips a club the save does not hold", () => {
      roundTrip(AppRpcs.getClubSquad.error, clubNotFound);
    });
  });

  // Both manager-profile reads raise `ManagerProfileNotFoundError` when the save carries no
  // `manager_profile` row.
  describe("manager profile reads", () => {
    const managerProfileNotFound = { _tag: "ManagerProfileNotFoundError" };

    it("getManagerProfile round-trips a missing profile", () => {
      roundTrip(AppRpcs.getManagerProfile.error, managerProfileNotFound);
    });

    it("getManagerProfileScreen round-trips a missing profile", () => {
      roundTrip(AppRpcs.getManagerProfileScreen.error, managerProfileNotFound);
    });
  });

  // Every transfer command returns `TransfersScreenView`, whose read folds `toSeasonView` — the
  // same fold that makes `getTransfersScreen` declare `PendingFixtureIntegrityError`.
  describe("transfer commands that return the Transfers screen", () => {
    const playerNotFound = { _tag: "PlayerNotFoundError", playerId: "p1" };

    it("respondToBid round-trips a pending-fixture integrity failure", () => {
      roundTrip(AppRpcs.respondToBid.error, pendingFixtureIntegrity);
    });

    it("respondToBid round-trips a missing player", () => {
      roundTrip(AppRpcs.respondToBid.error, playerNotFound);
    });

    it("respondAsBidder round-trips a pending-fixture integrity failure", () => {
      roundTrip(AppRpcs.respondAsBidder.error, pendingFixtureIntegrity);
    });

    it("respondAsBidder round-trips a missing player", () => {
      roundTrip(AppRpcs.respondAsBidder.error, playerNotFound);
    });

    it("signFreeAgent round-trips a pending-fixture integrity failure", () => {
      roundTrip(AppRpcs.signFreeAgent.error, pendingFixtureIntegrity);
    });

    it("renewContract round-trips a pending-fixture integrity failure", () => {
      roundTrip(AppRpcs.renewContract.error, pendingFixtureIntegrity);
    });

    it("renewContract round-trips a renewal-not-due failure", () => {
      roundTrip(AppRpcs.renewContract.error, {
        _tag: "ContractRenewalNotDueError",
        playerId: "p1",
        yearsRemaining: 3,
      });
    });
  });
});
