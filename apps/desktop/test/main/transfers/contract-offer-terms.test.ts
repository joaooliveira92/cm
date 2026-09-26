import { mkdtempSync } from "node:fs";
import { rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { it } from "@effect/vitest";
import { ok, strictEqual } from "node:assert";
import { SqliteClient } from "@effect/sql-sqlite-node";
import { POSITION_ROLES } from "@cm-clone/shared";
import type { Position } from "@cm-clone/shared";
import type { PlayerId, SaveId } from "@cm-clone/contracts";
import { Effect } from "effect";
import { SqlClient } from "effect/unstable/sql/SqlClient";
import { afterEach, beforeEach } from "vitest";
import { createSave } from "../../seeded-save.js";
import { getSquad } from "../../../src/main/club/index.js";
import { loadStreamEvents } from "../../../src/main/season/decider.js";
import {
  getContractOffer,
  getTransfersScreen,
  signFreeAgent,
} from "../../../src/main/transfers/index.js";
import { offerTermsFor } from "./offerTerms.js";

let savesDir: string;

beforeEach(() => {
  savesDir = mkdtempSync(path.join(os.tmpdir(), "cm-clone-offer-terms-test-"));
});

afterEach(() => rm(savesDir, { recursive: true, force: true }));

const withSave = <A, E>(saveId: string, effect: Effect.Effect<A, E, SqlClient>) =>
  effect.pipe(
    Effect.provide(SqliteClient.layer({ filename: path.join(savesDir, `${saveId}.sqlite`) })),
    Effect.scoped,
  );

/** Detach a rival from their Club — with no Club they are a Free Agent, and a Free Agent is who
 *  `signFreeAgent` and `getContractOffer` are about. The stale contract row goes with them. */
const release = (saveId: SaveId, playerId: PlayerId) =>
  withSave(
    saveId,
    Effect.gen(function* () {
      const sql = yield* SqlClient;
      yield* sql`UPDATE players SET club_id = NULL WHERE id = ${playerId}`;
      yield* sql`DELETE FROM contracts WHERE player_id = ${playerId}`;
    }),
  );

/** Release one rival so there is a Free Agent to offer terms to, and return their id. */
const freeSomePlayer = (saveId: SaveId) =>
  Effect.gen(function* () {
    const target = (yield* getTransfersScreen(savesDir, saveId)).marketPlayers[0];
    ok(target, "a fresh save has rival players");
    yield* release(saveId, target.id);
    return target.id;
  });

/** Release a rival who actually plays `position`, so an offer may name the Role it maps to. */
const freePlayerAt = (saveId: SaveId, position: Position) =>
  Effect.gen(function* () {
    const target = (yield* getTransfersScreen(savesDir, saveId)).marketPlayers.find((player) =>
      player.positions.some((entry) => entry.position === position),
    );
    ok(target, `a fresh save has a rival who plays ${position}`);
    yield* release(saveId, target.id);
    return target.id;
  });

const setScoutingProgress = (saveId: string, clubId: string, playerId: PlayerId, progress: number) =>
  withSave(
    saveId,
    Effect.gen(function* () {
      const sql = yield* SqlClient;
      yield* sql`DELETE FROM scouting_progress WHERE club_id = ${clubId} AND player_id = ${playerId}`;
      yield* sql`INSERT INTO scouting_progress (club_id, player_id, progress) VALUES (${clubId}, ${playerId}, ${progress})`;
    }),
  );

const contractRowOf = (saveId: string, playerId: PlayerId) =>
  withSave(
    saveId,
    Effect.gen(function* () {
      const sql = yield* SqlClient;
      const rows = yield* sql<{ wage: number; yearsRemaining: number }>`
        SELECT wage, years_remaining as "yearsRemaining" FROM contracts WHERE player_id = ${playerId}`;
      return rows[0] ?? null;
    }),
  );

/** The tag `signFreeAgent` raises for terms its knowledge does not support. Asserting the tag
 *  rather than "it failed" is what proves *which* guard refused: a wage outside the band and a
 *  Role the player does not hold are different mistakes. */
const INVALID_TERMS = "InvalidContractOfferTermsError";

it.effect("the terms the offer supports are the terms that sign, and the player lands in the squad", () =>
  Effect.gen(function* () {
    const save = yield* createSave(savesDir, "Test Career");
    const playerId = yield* freeSomePlayer(save.id);
    const terms = yield* offerTermsFor(savesDir, save.id, playerId, 2);
    strictEqual(terms.years, 2);

    const after = yield* signFreeAgent(savesDir, save.id, playerId, terms);

    // AC3: signed, gone from the Free Agents list, and in the squad.
    ok(!after.freeAgents.some((p) => p.id === playerId), "a signed player is no longer a Free Agent");
    const squad = yield* getSquad(savesDir, save.id);
    ok(squad.players.some((player) => player.id === playerId), "the signed player is in the squad");

    // The terms offered are the terms stored: the wage the manager named, not a recomputed one.
    const contract = yield* contractRowOf(save.id, playerId);
    ok(contract, "a signed player has a Contract");
    strictEqual(contract.wage, terms.wage);
    strictEqual(contract.yearsRemaining, 2);

    // The signing event carries all three terms, so the club's stream records what was offered.
    const events = yield* withSave(save.id, loadStreamEvents("club", squad.club.id));
    const signed = events.find((event) => event.tag === "PlayerSigned");
    ok(signed, "signing appends a PlayerSigned event");
    const payload = signed.payload as { role: string; wage: number; years: number };
    strictEqual(payload.role, terms.role);
    strictEqual(payload.wage, terms.wage);
    strictEqual(payload.years, 2);
  }),
  20_000,
);

it.effect("a Fully Scouted player's offer names one wage, and only that one signs", () =>
  Effect.gen(function* () {
    const save = yield* createSave(savesDir, "Test Career");
    const screen = yield* getTransfersScreen(savesDir, save.id);
    const playerId = yield* freeSomePlayer(save.id);
    yield* setScoutingProgress(save.id, screen.club.id, playerId, 100);

    const offer = yield* getContractOffer(savesDir, save.id, playerId);
    strictEqual(offer.wage._tag, "exact", "a Fully Scouted offer supports one exact wage");
    if (offer.wage._tag !== "exact") return;
    const role = POSITION_ROLES[offer.positions[0]!.position];

    // Exact knowledge means exactly one number: a Credit either side of it is not a term this
    // player's knowledge supports, and the band a month ago would have allowed is now closed.
    for (const wage of [offer.wage.value - 1, offer.wage.value + 1]) {
      const exit = yield* Effect.flip(
        signFreeAgent(savesDir, save.id, playerId, { role, years: 3, wage }),
      );
      ok((exit as { _tag: string })._tag === INVALID_TERMS, `a wage of ${wage} must be refused once Fully Scouted`);
    }

    yield* signFreeAgent(savesDir, save.id, playerId, { role, years: 3, wage: offer.wage.value });
    strictEqual((yield* contractRowOf(save.id, playerId))?.wage, offer.wage.value);
  }),
  20_000,
);

it.effect("a wage outside the published band is refused, and nothing is signed", () =>
  Effect.gen(function* () {
    const save = yield* createSave(savesDir, "Test Career");
    const playerId = yield* freeSomePlayer(save.id);
    const offer = yield* getContractOffer(savesDir, save.id, playerId);
    ok(offer.wage._tag === "range", "an unscouted offer supports a band, not one number");
    const base = {
      role: POSITION_ROLES[offer.positions[0]!.position],
      years: 3,
    };

    for (const wage of [offer.wage.low - 1, offer.wage.high + 1, 0, -1, 1_000.5]) {
      const exit = yield* Effect.flip(signFreeAgent(savesDir, save.id, playerId, { ...base, wage }));
      ok((exit as { _tag: string })._tag === INVALID_TERMS, `a wage of ${wage} must be refused`);
    }

    // Refused means refused: still a Free Agent, still no Contract, still out of the squad.
    const squad = yield* getSquad(savesDir, save.id);
    ok(!squad.players.some((player) => player.id === playerId));
    ok((yield* contractRowOf(save.id, playerId)) === null);
  }),
  20_000,
);

it.effect("a wage inside the band signs, so an unscouted manager offers from his own knowledge", () =>
  Effect.gen(function* () {
    const save = yield* createSave(savesDir, "Test Career");
    const playerId = yield* freeSomePlayer(save.id);
    const offer = yield* getContractOffer(savesDir, save.id, playerId);
    ok(offer.wage._tag === "range");

    // The band's own ends are signable, which is what makes the band a bound rather than a hint.
    for (const wage of [offer.wage.low, offer.wage.high]) {
      const fresh = yield* createSave(savesDir, `Career ${wage}`);
      const freshId = yield* freeSomePlayer(fresh.id);
      const freshOffer = yield* getContractOffer(savesDir, fresh.id, freshId);
      ok(freshOffer.wage._tag === "range");
      yield* signFreeAgent(savesDir, fresh.id, freshId, {
        role: POSITION_ROLES[offer.positions[0]!.position],
        years: 1,
        wage,
      });
      const contract = yield* contractRowOf(fresh.id, freshId);
      ok(contract, "a wage on the band edge is signable");
      strictEqual(contract.wage, wage);
    }
  }),
  20_000,
);

it.effect("a Role the player does not hold is refused", () =>
  Effect.gen(function* () {
    const save = yield* createSave(savesDir, "Test Career");
    const playerId = yield* freeSomePlayer(save.id);
    const offer = yield* getContractOffer(savesDir, save.id, playerId);
    const held = new Set(offer.positions.map((entry) => POSITION_ROLES[entry.position]));
    const unheld = (Object.keys(POSITION_ROLES) as Array<keyof typeof POSITION_ROLES>).find(
      (position) => !held.has(POSITION_ROLES[position]),
    );
    ok(unheld, "some Role exists that this player does not hold");

    const exit = yield* Effect.flip(
      signFreeAgent(savesDir, save.id, playerId, {
        role: POSITION_ROLES[unheld],
        years: 3,
        wage: 500,
      }),
    );
    ok((exit as { _tag: string })._tag === INVALID_TERMS, "a Role the player does not hold must be refused");
  }),
  20_000,
);

it.effect("a Contract length outside 1-5 years is refused rather than silently clamped", () =>
  Effect.gen(function* () {
    const save = yield* createSave(savesDir, "Test Career");
    const playerId = yield* freeSomePlayer(save.id);
    const terms = yield* offerTermsFor(savesDir, save.id, playerId, 3);

    for (const years of [0, -1, 6, 2.5, Number.NaN]) {
      const exit = yield* Effect.flip(signFreeAgent(savesDir, save.id, playerId, { ...terms, years }));
      ok((exit as { _tag: string })._tag === INVALID_TERMS, `a ${years}-year Contract must be refused`);
    }

    // The bounds themselves sign, so the rule is the domain's and not an off-by-one.
    for (const years of [1, 5]) {
      const fresh = yield* createSave(savesDir, `Years ${years}`);
      const freshId = yield* freeSomePlayer(fresh.id);
      const freshTerms = yield* offerTermsFor(savesDir, fresh.id, freshId, years);
      yield* signFreeAgent(savesDir, fresh.id, freshId, freshTerms);
      strictEqual((yield* contractRowOf(fresh.id, freshId))?.yearsRemaining, years);
    }
  }),
  20_000,
);

it.effect("every Role the offer names is accepted, so the form's choices all work", () =>
  Effect.gen(function* () {
    // The Roles on offer are the Roles of the player's own Positions, and a signing consumes its
    // Free Agent — so each Role is proven on a fresh save, against a player who really does hold the
    // Position it comes from. That is the sweep the form performs: for every Position the read
    // publishes, the Role `POSITION_ROLES` gives it is one `signFreeAgent` accepts at the wage that
    // same read published.
    const save = yield* createSave(savesDir, "Test Career");
    const playerId = yield* freeSomePlayer(save.id);
    const offer = yield* getContractOffer(savesDir, save.id, playerId);
    const positions = offer.positions.map((entry) => entry.position);
    ok(positions.length > 0, "a Free Agent plays at least one Position");

    for (const position of positions) {
      const fresh = yield* createSave(savesDir, `Role ${position}`);
      const freshId = yield* freePlayerAt(fresh.id, position);
      const terms = yield* offerTermsFor(savesDir, fresh.id, freshId, 2);
      yield* signFreeAgent(savesDir, fresh.id, freshId, {
        ...terms,
        role: POSITION_ROLES[position],
      });
      const contract = yield* contractRowOf(fresh.id, freshId);
      ok(contract, `${position} should be signable`);
      strictEqual(contract.wage, terms.wage);
    }
  }),
  40_000,
);
