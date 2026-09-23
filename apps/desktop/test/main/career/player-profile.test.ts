import { mkdtempSync } from "node:fs";
import { rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { ok, strictEqual } from "node:assert";
import { it } from "@effect/vitest";
import { SqliteClient } from "@effect/sql-sqlite-node";
import { AppRpcs, PlayerId, type SaveId } from "@cm-clone/contracts";
import { type KnownFigure } from "@cm-clone/shared";
import { Effect, Schema } from "effect";
import { SqlClient } from "effect/unstable/sql/SqlClient";
import { afterEach, beforeEach } from "vitest";
import { createSave } from "../../seeded-save.js";
import { getSquad } from "../../../src/main/club/index.js";
import { getPlayerContract, getPlayerProfile } from "../../../src/main/career/player.js";
import { getTransfersScreen } from "../../../src/main/transfers/index.js";

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

/** A scouting row for the human club on one player, set directly on the save the market reads. */
const setScoutingProgress = (saveId: string, clubId: string, playerId: PlayerId, progress: number) =>
  Effect.gen(function* () {
    const sql = yield* SqlClient;
    yield* sql`DELETE FROM scouting_progress WHERE club_id = ${clubId} AND player_id = ${playerId}`;
    yield* sql`INSERT INTO scouting_progress (club_id, player_id, progress) VALUES (${clubId}, ${playerId}, ${progress})`;
  }).pipe(
    Effect.provide(SqliteClient.layer({ filename: path.join(savesDir, `${saveId}.sqlite`) })),
    Effect.scoped,
  );

const isRange = (figure: KnownFigure): figure is { _tag: "range"; low: number; high: number } =>
  figure._tag === "range";

/** A rival on the fresh market list — Unscouted until this test seeds a progress row. */
const firstRival = (save: { id: SaveId }) =>
  Effect.gen(function* () {
    const screen = yield* getTransfersScreen(savesDir, save.id);
    const rival = screen.marketPlayers[0];
    ok(rival, "expected at least one rival on the market list");
    return { rival, clubId: screen.club.id };
  });

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

        // AC2: the manager's own players read exact figures — no Range of themselves.
        strictEqual(profile.overallRating._tag, "exact", "own OVR should read exact");
        strictEqual(profile.overallRating.value, player.overallRating);
        strictEqual(profile.transferValue._tag, "exact", "own Value should read exact");
        for (const [attribute, figure] of Object.entries(profile.attributes)) {
          if (figure === undefined) continue;
          strictEqual(figure._tag, "exact", `own ${attribute} should read exact`);
        }

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

it.effect("a Fully Scouted rival reads the same exact figures the market publishes", () =>
  Effect.gen(function* () {
    const save = yield* createSave(savesDir, "Player profile");
    const { rival, clubId } = yield* firstRival(save);

    yield* setScoutingProgress(save.id, clubId, rival.id, 100);
    const profile = profileOverTheWire(yield* getPlayerProfile(savesDir, save.id, rival.id));
    const market = yield* getTransfersScreen(savesDir, save.id);
    const view = market.marketPlayers.find((p) => p.id === rival.id);
    ok(view, "the Fully Scouted rival stays on the market list");

    // AC1 (Fully Scouted half): the profile and the market share one knowledge rule — identical
    // exact figures at full knowledge.
    strictEqual(profile.overallRating._tag, "exact");
    strictEqual(profile.transferValue._tag, "exact");
    strictEqual(view.overallRating._tag, "exact");
    strictEqual(view.transferValue._tag, "exact");
    if (
      profile.overallRating._tag === "exact" &&
      profile.transferValue._tag === "exact" &&
      view.overallRating._tag === "exact" &&
      view.transferValue._tag === "exact"
    ) {
      strictEqual(profile.overallRating.value, view.overallRating.value);
      strictEqual(profile.transferValue.value, view.transferValue.value);
    }
    for (const [attribute, figure] of Object.entries(profile.attributes)) {
      if (figure === undefined) continue;
      strictEqual(figure._tag, "exact", `Fully Scouted ${attribute} should read exact`);
    }
  }),
  60_000,
);

it.effect("an Unscouted rival reads every figure as a Range and the wire leaks no exact figure", () =>
  Effect.gen(function* () {
    const save = yield* createSave(savesDir, "Player profile");
    const { rival, clubId } = yield* firstRival(save);
    // No scouting row anywhere in the save: the profile read is as Unscouted as it gets.

    const raw = yield* getPlayerProfile(savesDir, save.id, rival.id);
    // AC3: the wire itself carries no exact figure while the rival is below Fully Scouted.
    const wire = JSON.stringify(yield* Schema.encodeEffect(AppRpcs.getPlayerProfile.success)(raw));
    ok(!wire.includes('"_tag":"exact"'), "an Unscouted rival leaked an exact figure onto the wire");
    ok(wire.includes('"_tag":"range"'), "an Unscouted rival's read carried no Range");

    // AC1 (profile half): OVR, Value and every Attribute read as a Range — the same bands the
    // market publishes, since both reads flow from the one knowledge rule. The hidden Attribute
    // rides the wire as a Range too: no exact figure below Fully Scouted, hidden or not.
    const profile = profileOverTheWire(raw);
    ok(isRange(profile.overallRating), "an Unscouted rival's OVR should be a Range");
    ok(isRange(profile.transferValue), "an Unscouted rival's Value should be a Range");
    for (const [attribute, figure] of Object.entries(profile.attributes)) {
      if (figure === undefined) continue; // a Goalkeeping/hidden Attribute absent from the wire
      ok(isRange(figure), `${attribute} should read as a Range for an Unscouted rival`);
    }
    strictEqual(
      profile.attributes.injuryProneness?._tag,
      "range",
      "an Unscouted rival's hidden Attribute should read as a Range",
    );

    // The boundary just below Fully Scouted: 99 is still Ranged everywhere — exactness starts at
    // 100 and nowhere below it.
    yield* setScoutingProgress(save.id, clubId, rival.id, 99);
    const near = yield* getPlayerProfile(savesDir, save.id, rival.id);
    const nearWire = JSON.stringify(yield* Schema.encodeEffect(AppRpcs.getPlayerProfile.success)(near));
    ok(!nearWire.includes('"_tag":"exact"'), "a rival at progress 99 leaked an exact figure");
    strictEqual(profileOverTheWire(near).attributes.injuryProneness?._tag, "range");
  }),
  60_000,
);
