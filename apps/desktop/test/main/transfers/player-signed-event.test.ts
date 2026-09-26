import { mkdtempSync } from "node:fs";
import { rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { it } from "@effect/vitest";
import { deepStrictEqual, ok, strictEqual } from "node:assert";
import { SqliteClient } from "@effect/sql-sqlite-node";
import { POSITION_ROLES } from "@cm-clone/shared";
import type { PlayerId, SaveId } from "@cm-clone/contracts";
import { Effect } from "effect";
import { SqlClient } from "effect/unstable/sql/SqlClient";
import { afterEach, beforeEach } from "vitest";
import { createSave } from "../../seeded-save.js";
import { loadStreamEvents } from "../../../src/main/season/decider.js";
import {
  aiSignFreeAgent,
  getTransfersScreen,
  signFreeAgent,
} from "../../../src/main/transfers/index.js";
import { offerTermsFor } from "./offerTerms.js";

/**
 * Both producers of `PlayerSigned` (group-j ticket 09, review finding 5).
 *
 * The manager signs through `signFreeAgent`, the AI clubs through `aiSignFreeAgent`, and both write
 * the same event tag to the same club stream. Before this they spelled the payload out separately,
 * and the AI's line carried no Role, so the club's own story said what was signed without saying
 * what for. One shape, asserted here by both producers' own keys rather than by a hand-written
 * list: the point is that the two agree, so the oracle is the pair.
 */

let savesDir: string;

beforeEach(() => {
  savesDir = mkdtempSync(path.join(os.tmpdir(), "cm-clone-player-signed-test-"));
});

afterEach(() => rm(savesDir, { recursive: true, force: true }));

const withSave = <A, E>(saveId: SaveId | string, effect: Effect.Effect<A, E, SqlClient>) =>
  effect.pipe(
    Effect.provide(SqliteClient.layer({ filename: path.join(savesDir, `${saveId}.sqlite`) })),
    Effect.scoped,
  );

/** Detach a rival from their Club: with no Club they are a Free Agent, and a Free Agent is who both
 *  signing commands are about. The stale contract row goes with them. */
const release = (saveId: SaveId, playerId: PlayerId) =>
  withSave(
    saveId,
    Effect.gen(function* () {
      const sql = yield* SqlClient;
      yield* sql`UPDATE players SET club_id = NULL WHERE id = ${playerId}`;
      yield* sql`DELETE FROM contracts WHERE player_id = ${playerId}`;
    }),
  );

/** Release a rival so there is a Free Agent to sign, and return their id. */
const freeSomePlayer = (saveId: SaveId) =>
  Effect.gen(function* () {
    const target = (yield* getTransfersScreen(savesDir, saveId)).marketPlayers[0];
    ok(target, "a fresh save has rival players");
    yield* release(saveId, target.id);
    return target.id;
  });

/** The `PlayerSigned` payload for one specific signing. A club stream carries every signing the
 *  club has made, so the payload is picked by the player it is about rather than by position. */
const playerSignedPayload = (saveId: SaveId, clubId: string, playerId: PlayerId) =>
  withSave(
    saveId,
    Effect.gen(function* () {
      const events = yield* loadStreamEvents("club", clubId);
      const signed = events.find(
        (event) =>
          event.tag === "PlayerSigned" &&
          (event.payload as { playerId?: string }).playerId === String(playerId),
      );
      ok(signed, `a PlayerSigned event exists for ${playerId}`);
      return signed.payload as Record<string, unknown>;
    }),
  );

const keysOf = (payload: Record<string, unknown>) => Object.keys(payload).sort();

it.effect(
  "the manager's signing and an AI club's signing write the same event shape",
  () =>
    Effect.gen(function* () {
      const save = yield* createSave(savesDir, "Test Career");
      const { club, season } = yield* getTransfersScreen(savesDir, save.id);

      // The manager's own signing, on a Free Agent the command is for.
      const managerPlayer = yield* freeSomePlayer(save.id);
      const terms = yield* offerTermsFor(savesDir, save.id, managerPlayer, 2);
      yield* signFreeAgent(savesDir, save.id, managerPlayer, terms);
      const fromManager = yield* playerSignedPayload(save.id, club.id, managerPlayer);

      // The AI producer, run for the human club: `appendHumanClubEvents` writes a club stream only
      // for the club the manager runs, so this is the same production the AI makes, observed.
      const aiPlayer = yield* freeSomePlayer(save.id);
      yield* withSave(
        save.id,
        aiSignFreeAgent(club.id, aiPlayer, season.seasonNumber, season.currentDate),
      );
      const fromAi = yield* playerSignedPayload(save.id, club.id, aiPlayer);

      // Same keys, from both producers: nothing the manager's log line carries and the AI's lacks.
      deepStrictEqual(keysOf(fromAi), keysOf(fromManager));
      deepStrictEqual(keysOf(fromManager), ["playerId", "role", "wage", "years"]);

      // The AI's line is about the AI's signing, and names all four of the same things.
      strictEqual(typeof fromAi.role, "string");
      strictEqual(typeof fromAi.wage, "number");
    }),
  30_000,
);

it.effect("an AI signing names the Role its player's primary Position carries", () =>
  Effect.gen(function* () {
    const save = yield* createSave(savesDir, "Test Career");
    const { club, season } = yield* getTransfersScreen(savesDir, save.id);
    const screen = yield* getTransfersScreen(savesDir, save.id);
    const target = screen.marketPlayers.find((player) =>
      player.positions.some((entry) => entry.familiarity === "natural"),
    );
    ok(target, "a fresh save has a rival with a natural Position");
    yield* release(save.id, target.id);

    yield* withSave(
      save.id,
      aiSignFreeAgent(club.id, target.id, season.seasonNumber, season.currentDate),
    );
    const payload = yield* playerSignedPayload(save.id, club.id, target.id);

    strictEqual(payload.role, POSITION_ROLES[target.positions[0]!.position]);
    strictEqual(payload.years, 3);
    ok(typeof payload.wage === "number" && payload.wage > 0, "a real wage is recorded");
  }),
  30_000,
);
