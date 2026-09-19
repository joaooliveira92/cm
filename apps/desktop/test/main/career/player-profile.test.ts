import { mkdtempSync } from "node:fs";
import { rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { ok, strictEqual } from "node:assert";
import { it } from "@effect/vitest";
import { AppRpcs, PlayerId } from "@cm-clone/contracts";
import { Effect, Schema } from "effect";
import { afterEach, beforeEach } from "vitest";
import { createSave } from "../../seeded-save.js";
import { getSquad } from "../../../src/main/club/index.js";
import { getPlayerContract, getPlayerProfile } from "../../../src/main/career/player.js";

let savesDir: string;

beforeEach(() => {
  savesDir = mkdtempSync(path.join(os.tmpdir(), "cm-clone-player-profile-test-"));
});

afterEach(() => rm(savesDir, { recursive: true, force: true }));

/** Encode through the RPC success schema and decode the JSON back, as the renderer receives it. */
const profileOverTheWire = (value: typeof AppRpcs.getPlayerProfile.success.Type) => {
  const schema = AppRpcs.getPlayerProfile.success;
  return Schema.decodeUnknownSync(schema)(JSON.parse(JSON.stringify(Schema.encodeSync(schema)(value))));
};

// Ticket 11: the profile and contract reads spliced playerId into SQL unquoted, so most ids failed
// to prepare and Player Profile / Player Development showed "unexpected response".
it.effect(
  "getPlayerProfile and getPlayerContract read every own-club player and survive the RPC contract",
  () =>
    Effect.gen(function* () {
      const save = yield* createSave(savesDir, "Player profile");
      const squad = yield* getSquad(savesDir, save.id);
      ok(squad.players.length > 1, "the manager's club has a squad");

      for (const player of squad.players) {
        const profile = profileOverTheWire(yield* getPlayerProfile(savesDir, save.id, player.id));
        strictEqual(profile.id, player.id);
        strictEqual(profile.firstName, player.firstName);

        const contract = yield* getPlayerContract(savesDir, save.id, player.id);
        strictEqual(contract.playerId, player.id);
      }
    }),
  120_000,
);

it.effect("a hostile player id is a bound value, not SQL: it reads as PlayerNotFoundError", () =>
  Effect.gen(function* () {
    const save = yield* createSave(savesDir, "Player profile");
    const hostile = PlayerId.make("x' OR '1'='1");

    const profileError = yield* Effect.flip(getPlayerProfile(savesDir, save.id, hostile));
    strictEqual(profileError._tag, "PlayerNotFoundError");

    const contractError = yield* Effect.flip(getPlayerContract(savesDir, save.id, hostile));
    strictEqual(contractError._tag, "PlayerNotFoundError");
  }),
  60_000,
);
