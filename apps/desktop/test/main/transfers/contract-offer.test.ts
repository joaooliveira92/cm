import { mkdtempSync } from "node:fs";
import { rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { it } from "@effect/vitest";
import { deepStrictEqual, ok, strictEqual } from "node:assert";
import { SqliteClient } from "@effect/sql-sqlite-node";
import {
  POSITION_ROLES,
  transferValue,
  weeklyWage,
  wageFigureByProgress,
  type KnownFigure,
} from "@cm-clone/shared";
import { ContractOfferView, type PlayerId, type TransfersScreenView } from "@cm-clone/contracts";
import { Effect, SchemaAST } from "effect";
import { SqlClient } from "effect/unstable/sql/SqlClient";
import { afterEach, beforeEach } from "vitest";
import { createSave } from "../../seeded-save.js";
import { advanceThroughBoundary } from "../boundary-helpers.js";
import { getSquad } from "../../../src/main/club/index.js";
import { getPlayerProfile } from "../../../src/main/career/player.js";
import { loadGameDate } from "../../../src/main/season/currentSeason.js";
import {
  getContractOffer,
  getTransfersScreen,
  loadAllPlayersEcon,
} from "../../../src/main/transfers/index.js";

let savesDir: string;

beforeEach(() => {
  savesDir = mkdtempSync(path.join(os.tmpdir(), "cm-clone-offer-knowledge-test-"));
});

afterEach(() => rm(savesDir, { recursive: true, force: true }));

const withSave = <A, E>(saveId: string, effect: Effect.Effect<A, E, SqlClient>) =>
  effect.pipe(
    Effect.provide(SqliteClient.layer({ filename: path.join(savesDir, `${saveId}.sqlite`) })),
    Effect.scoped,
  );

/** The human club's Scouting Progress on a player, seeded so the offer read narrows. */
const setScoutingProgress = (saveId: string, clubId: string, playerId: PlayerId, progress: number) =>
  withSave(
    saveId,
    Effect.gen(function* () {
      const sql = yield* SqlClient;
      yield* sql`DELETE FROM scouting_progress WHERE club_id = ${clubId} AND player_id = ${playerId}`;
      yield* sql`INSERT INTO scouting_progress (club_id, player_id, progress) VALUES (${clubId}, ${playerId}, ${progress})`;
    }),
  );

/** Release one player from their club, so the offer read has a Free Agent to read. */
const release = (saveId: string, playerId: PlayerId) =>
  withSave(
    saveId,
    Effect.gen(function* () {
      const sql = yield* SqlClient;
      yield* sql`UPDATE players SET club_id = NULL WHERE id = ${playerId}`;
      yield* sql`DELETE FROM contracts WHERE player_id = ${playerId}`;
    }),
  );

/** The true figures behind the offer — recomputed from stored truth, the way the signing
 *  command reads them; never obtainable off the offer response below Fully Scouted. */
const trueFiguresOf = (saveId: string, playerId: PlayerId) =>
  withSave(
    saveId,
    Effect.gen(function* () {
      const players = yield* loadAllPlayersEcon(yield* loadGameDate);
      const player = players.find((p) => p.id === playerId);
      ok(player, "expected the player in the store");
      return {
        overallRating: player.overallRating,
        age: player.age,
        potentialAbility: player.potentialAbility,
      };
    }),
  );

const isRange = (figure: KnownFigure): figure is { _tag: "range"; low: number; high: number } =>
  figure._tag === "range";

/**
 * The field names on `ContractOfferView` whose value is a `KnownFigure` — the knowledge-gated ones.
 *
 * Derived from the wire schema rather than listed by hand, because the assertion this exists for is
 * about *every* gated figure: a hand-written list is a list that stops covering the schema the day
 * a fourth gated field is added, and the test would keep passing while proving less. Read off the
 * class's own `fields`, keeping the fields whose AST is the union of the two figure tags. A gated
 * field whose AST stops looking like that fails the oracle, which is the point.
 */
const knowledgeGatedFields = (): ReadonlyArray<string> =>
  Object.entries(
    (ContractOfferView as unknown as { fields: Record<string, { ast: SchemaAST.AST }> }).fields,
  )
    .filter(([, field]) => isFigureAst(field.ast))
    .map(([name]) => name);

/** The `_tag` a field's AST fixes, or `null` when it fixes none. */
const tagOf = (ast: SchemaAST.AST): string | null => {
  if (!SchemaAST.isObjects(ast)) return null;
  const tag = ast.propertySignatures.find((property) => property.name === "_tag");
  if (tag === undefined) return null;
  return SchemaAST.isLiteral(tag.type) ? String(tag.type.literal) : null;
};

/** Whether a field's AST is the `exact | range` union — the shape every gated figure takes. */
const isFigureAst = (ast: SchemaAST.AST): boolean => {
  if (!SchemaAST.isUnion(ast)) return false;
  const tags = ast.types.map(tagOf);
  return (
    tags.every((tag) => tag === "exact" || tag === "range") &&
    tags.includes("exact") &&
    tags.includes("range")
  );
};

/** Every figure the offer publishes, so "no exact figure below Fully Scouted" can be asserted
 *  over the whole response rather than over the fields a test remembered to check. */
const everyFigure = (offer: ContractOfferView): ReadonlyArray<readonly [string, KnownFigure]> => {
  const gated = knowledgeGatedFields();
  ok(gated.length > 0, "the offer publishes at least one knowledge-gated figure");
  return gated.map((field) => {
    const figure = (offer as unknown as Record<string, KnownFigure | undefined>)[field];
    ok(figure !== undefined, `${field} is a field on the offer`);
    return [field, figure] as const;
  });
};

it.effect(
  "a Free Agent's offer reads ranged below Fully Scouted and exact at it",
  () =>
    Effect.gen(function* () {
      const save = yield* createSave(savesDir, "Test Career");
      const screen = yield* getTransfersScreen(savesDir, save.id);
      const target = screen.marketPlayers[0];
      ok(target);
      yield* release(save.id, target.id);

      // AC1 (ranged half): a fresh save is entirely Unscouted, so the offer publishes a band.
      const unscouted = yield* getContractOffer(savesDir, save.id, target.id);
      // A change detector, not the oracle: the loop below iterates whatever the schema says, and
      // this line only fires so that adding a fourth gated field comes back as a question ("did the
      // read start ranging it?") rather than as a test that quietly covers less than it did.
      deepStrictEqual(knowledgeGatedFields(), ["overallRating", "transferValue", "wage"]);
      for (const [field, figure] of everyFigure(unscouted)) {
        ok(isRange(figure), `${field} should be a Range below Fully Scouted`);
      }

      // AC1 (exact half): the same player at Fully Scouted, and the figures are the true ones.
      yield* setScoutingProgress(save.id, screen.club.id, target.id, 100);
      const scouted = yield* getContractOffer(savesDir, save.id, target.id);
      const truth = yield* trueFiguresOf(save.id, target.id);
      for (const [field, figure] of everyFigure(scouted)) {
        strictEqual(figure._tag, "exact", `${field} should be exact at Fully Scouted`);
      }
      if (scouted.overallRating._tag === "exact") {
        strictEqual(scouted.overallRating.value, truth.overallRating);
      }
      if (scouted.transferValue._tag === "exact") {
        strictEqual(scouted.transferValue.value, transferValue(truth.overallRating, truth.age, truth.potentialAbility));
      }
      if (scouted.wage._tag === "exact") {
        strictEqual(scouted.wage.value, weeklyWage(truth.overallRating, truth.age, truth.potentialAbility));
      }
    }),
  20_000,
);

it.effect(
  "a club Player has no Contract Offer, and a Free Agent has no Profile: the two reads partition",
  () =>
    Effect.gen(function* () {
      const save = yield* createSave(savesDir, "Test Career");
      const screen = yield* getTransfersScreen(savesDir, save.id);
      const target = screen.marketPlayers[0];
      ok(target);

      // The offer read is about Free Agents. A rival is refused *by name* — not silently, and not
      // by an empty figure — so the caller learns the read does not apply rather than mistaking a
      // refusal for a player the manager knows nothing about.
      const refused = yield* Effect.flip(getContractOffer(savesDir, save.id, target.id));
      strictEqual(refused._tag, "PlayerNotFreeAgentError");

      // The Profile read is the one that serves club Players, and it still does, for the same player
      // the offer just refused: neither read was widened to paper over the other's gap.
      const profile = yield* getPlayerProfile(savesDir, save.id, target.id);
      strictEqual(profile.id, target.id);

      // And the partition runs the other way: a released Player is a Free Agent with an offer and
      // no Profile, which is why the agreement between the two reads is proven against the market
      // list below rather than against a Profile.
      yield* release(save.id, target.id);
      const offer = yield* getContractOffer(savesDir, save.id, target.id);
      strictEqual(offer.playerId, target.id);
      const noProfile = yield* Effect.flip(getPlayerProfile(savesDir, save.id, target.id));
      strictEqual(noProfile._tag, "PlayerNotFoundError");
    }),
  20_000,
);

it.effect(
  "the offer band is the Rating band priced through the formulas, and narrows with progress",
  () =>
    Effect.gen(function* () {
      const save = yield* createSave(savesDir, "Test Career");
      const screen = yield* getTransfersScreen(savesDir, save.id);
      const target = screen.marketPlayers[0];
      ok(target);
      yield* release(save.id, target.id);

      const wageAt = (progress: number) =>
        Effect.gen(function* () {
          yield* setScoutingProgress(save.id, screen.club.id, target.id, progress);
          return (yield* getContractOffer(savesDir, save.id, target.id)).wage;
        });

      const at0 = yield* wageAt(0);
      const at50 = yield* wageAt(50);
      const at100 = yield* wageAt(100);

      ok(isRange(at0) && isRange(at50), "progress 0 and 50 should publish a Range");
      strictEqual(at100._tag, "exact", "progress 100 should publish the exact wage");
      if (isRange(at0) && isRange(at50)) {
        ok(at50.high - at50.low < at0.high - at0.low, "the wage band must narrow with progress");
        ok(at50.low >= at0.low && at50.high <= at0.high, "the wage band must stay inside the wider one");
      }

      const truth = yield* trueFiguresOf(save.id, target.id);
      const trueWage = weeklyWage(truth.overallRating, truth.age, truth.potentialAbility);
      if (isRange(at0)) {
        ok(at0.low <= trueWage && trueWage <= at0.high, "the band must contain the true wage");
        deepStrictEqual(at0, wageFigureByProgress(truth.overallRating, truth.age, truth.potentialAbility, 0));
      }
    }),
  20_000,
);

it.effect("the offer response carries no exact figure for a player below Fully Scouted", () =>
  Effect.gen(function* () {
    const save = yield* createSave(savesDir, "Test Career");
    const screen = yield* getTransfersScreen(savesDir, save.id);
    const targets = [...screen.marketPlayers.slice(0, 2), ...screen.freeAgents.slice(0, 1)];
    ok(targets.length > 0);

    for (const target of targets) {
      // One player one short of Fully Scouted: the band has collapsed to the same number at both
      // ends and must still be published as a Range, because an exact tag is a disclosure.
      yield* release(save.id, target.id);
      yield* setScoutingProgress(save.id, screen.club.id, target.id, 99);

      const offer = yield* getContractOffer(savesDir, save.id, target.id);
      for (const [field, figure] of everyFigure(offer)) {
        ok(isRange(figure), `${field} leaked an exact figure at progress 99`);
        if (isRange(figure)) {
          strictEqual(figure.low, figure.high, "at 99 the band has collapsed but stays a Range");
        }
      }
    }
  }),
  20_000,
);

it.effect("the offer names only the Positions the player actually plays", () =>
  Effect.gen(function* () {
    const save = yield* createSave(savesDir, "Test Career");
    const screen = yield* getTransfersScreen(savesDir, save.id);
    const target = screen.marketPlayers[0];
    ok(target);
    yield* release(save.id, target.id);

    const offer = yield* getContractOffer(savesDir, save.id, target.id);
    ok(offer.positions.length > 0, "a player has at least one Position");
    const truth = yield* trueFiguresOf(save.id, target.id);
    const stored = yield* withSave(
      save.id,
      Effect.gen(function* () {
        const sql = yield* SqlClient;
        const rows = yield* sql<{ position: string; familiarity: string }>`
          SELECT position, familiarity FROM player_positions WHERE player_id = ${target.id}`;
        return rows;
      }),
    );
    ok(truth.overallRating > 0);
    deepStrictEqual(
      offer.positions.map((entry) => entry.position).slice().sort(),
      stored.map((row) => row.position).sort(),
    );
    // Every Position the offer names has a Role, so the terms form can always offer one.
    for (const entry of offer.positions) {
      ok(POSITION_ROLES[entry.position] !== undefined, `${entry.position} must carry a Role`);
    }
  }),
  20_000,
);

it.effect("the offer refuses a player who is not a Free Agent, and one who does not exist", () =>
  Effect.gen(function* () {
    const save = yield* createSave(savesDir, "Test Career");
    const screen = yield* getTransfersScreen(savesDir, save.id);
    const signed = screen.marketPlayers[0];
    ok(signed);

    const notFree = yield* Effect.exit(getContractOffer(savesDir, save.id, signed.id));
    ok(notFree._tag === "Failure");

    const missing = yield* Effect.exit(
      getContractOffer(savesDir, save.id, "p_does_not_exist" as PlayerId),
    );
    ok(missing._tag === "Failure");
  }),
  20_000,
);

it.effect("a player in the manager's own squad is never offered — there is no offer to read", () =>
  Effect.gen(function* () {
    const save = yield* createSave(savesDir, "Test Career");
    const squad = yield* getSquad(savesDir, save.id);
    const own = squad.players[0];
    ok(own);

    const result = yield* Effect.exit(
      getContractOffer(savesDir, save.id, own.id as unknown as PlayerId),
    );
    ok(result._tag === "Failure");
  }),
  20_000,
);

it.effect("the offer and the market read the same Free Agent at the same figures", () =>
  Effect.gen(function* () {
    const save = yield* createSave(savesDir, "Test Career");
    const screen = yield* getTransfersScreen(savesDir, save.id);
    const target = screen.marketPlayers[0];
    ok(target);
    yield* release(save.id, target.id);

    // Two RPCs, one player, one knowledge: the offer cannot publish a figure the market list the
    // manager read a moment earlier would have withheld, or a different one at the same progress.
    for (const progress of [0, 50, 100]) {
      yield* setScoutingProgress(save.id, screen.club.id, target.id, progress);
      const after: TransfersScreenView = yield* getTransfersScreen(savesDir, save.id);
      const onMarket: TransfersScreenView["freeAgents"][number] | undefined = after.freeAgents.find(
        (p) => p.id === target.id,
      );
      ok(onMarket, "the released player should be a Free Agent on the market read");
      const offer: ContractOfferView = yield* getContractOffer(savesDir, save.id, target.id);
      deepStrictEqual(offer.overallRating, onMarket.overallRating, `OVR must agree at ${progress}`);
      deepStrictEqual(offer.transferValue, onMarket.transferValue, `Value must agree at ${progress}`);
      // The wage is deliberately not compared here: `MarketPlayerView` publishes no wage — the
      // table has no Wage column — so the offer's wage band has no second reader to agree with. It
      // is proven against the shared rule instead ("the offer band is the Rating band priced through
      // the formulas") and against the command that accepts only a wage inside it.
      deepStrictEqual(offer.age, onMarket.age);
    }
  }),
  20_000,
);

it.effect("the offer is readable with the transfer window closed — a read is a read", () =>
  Effect.gen(function* () {
    const save = yield* createSave(savesDir, "Test Career");
    const screen = yield* getTransfersScreen(savesDir, save.id);
    ok(screen.windowOpen, "a fresh save opens its pre-season window");

    const target = screen.marketPlayers[0];
    ok(target);
    yield* release(save.id, target.id);
    yield* advanceThroughBoundary(savesDir, save.id); // closes the pre-season window

    const closed = yield* getTransfersScreen(savesDir, save.id);
    strictEqual(closed.windowOpen, false);
    // The manager can still read what an offer would cost; only the command needs the window.
    const offer = yield* getContractOffer(savesDir, save.id, target.id);
    ok(offer.playerId === target.id);
  }),
  20_000,
);
