import { mkdtempSync } from "node:fs";
import { rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { deepStrictEqual, strictEqual } from "node:assert";
import { it } from "@effect/vitest";
import { SqliteClient } from "@effect/sql-sqlite-node";
import { Tactic, type PlayerId, type SaveId } from "@cm-clone/contracts";
import { FORMATION_SLOTS, POSITION_ROLES, emptyBench } from "@cm-clone/shared";
import { Effect } from "effect";
import { SqlClient } from "effect/unstable/sql/SqlClient";
import { afterEach, beforeEach } from "vitest";
import { createSave } from "../../seeded-save.js";
import { loadMatchReadiness } from "../../../src/main/club/matchReadiness.js";
import { loadSquadPlayers, loadUserClub } from "../../../src/main/club/squad.js";
import { persistTactic } from "../../../src/main/club/tactics.js";

/**
 * group-g-match-day 39: main reads whether the human club's Tactic names a substitute, and the
 * pre-match boundary carries the empty-bench advisory beside (never among) its blockers.
 */

let savesDir: string;

beforeEach(() => {
  savesDir = mkdtempSync(path.join(os.tmpdir(), "cm-clone-match-readiness-test-"));
});

afterEach(() => rm(savesDir, { recursive: true, force: true }));

const inSave = <A, E>(saveId: SaveId, effect: Effect.Effect<A, E, SqlClient>) =>
  effect.pipe(
    Effect.provide(SqliteClient.layer({ filename: path.join(savesDir, `${saveId}.sqlite`) })),
    Effect.scoped,
  );

const tacticWithBench = (squadIds: ReadonlyArray<PlayerId>, bench: ReadonlyArray<PlayerId | null>) =>
  new Tactic({
    formation: "4-4-2",
    slots: FORMATION_SLOTS["4-4-2"].map((position, index) => ({
      position,
      role: POSITION_ROLES[position],
      playerId: squadIds[index]!,
    })),
    bench,
    mentality: "balanced",
    tempo: "normal",
    pressing: "medium",
  });

/** Persists a Tactic for the human club whose bench is `benchFor(squad)`, then reads readiness. */
const readinessWithBench = (
  benchFor: (squadIds: ReadonlyArray<PlayerId>) => ReadonlyArray<PlayerId | null>,
  afterPersist: (squadIds: ReadonlyArray<PlayerId>) => Effect.Effect<void, unknown, SqlClient> = () => Effect.void,
) =>
  Effect.gen(function* () {
    const save = yield* createSave(savesDir, "Bench Career");
    return yield* inSave(
      save.id,
      Effect.gen(function* () {
        const club = yield* loadUserClub;
        const squadIds = (yield* loadSquadPlayers(club.id)).map((player) => player.id);
        yield* persistTactic(club.id, tacticWithBench(squadIds, benchFor(squadIds)), 0);
        yield* afterPersist(squadIds);
        return yield* loadMatchReadiness(club.id);
      }),
    );
  });

const ids = (items: ReadonlyArray<{ readonly id: string }>) => items.map((item) => item.id);

it.effect("flags a Tactic whose bench names no substitute, without blocking the Fixture", () =>
  Effect.gen(function* () {
    const readiness = yield* readinessWithBench(() => emptyBench());
    deepStrictEqual(ids(readiness.blockers), []);
    deepStrictEqual(ids(readiness.advisories), ["no-substitutes-named"]);
    strictEqual(readiness.advisories[0]!.severity, "advisory");
    strictEqual(readiness.advisories[0]!.destination, "squad");
  }),
);

it.effect("says nothing once the bench names one substitute", () =>
  Effect.gen(function* () {
    const readiness = yield* readinessWithBench((squadIds) => [squadIds[11]!, ...emptyBench().slice(1)]);
    deepStrictEqual(ids(readiness.blockers), []);
    deepStrictEqual(ids(readiness.advisories), []);
  }),
);

it.effect("does not count a bench player who has since left the club", () =>
  Effect.gen(function* () {
    const readiness = yield* readinessWithBench(
      (squadIds) => [squadIds[11]!, ...emptyBench().slice(1)],
      (squadIds) =>
        Effect.gen(function* () {
          const sql = yield* SqlClient;
          yield* sql`UPDATE players SET club_id = (SELECT id FROM clubs WHERE is_user_club = 0 LIMIT 1) WHERE id = ${squadIds[11]!}`;
        }),
    );
    deepStrictEqual(ids(readiness.advisories), ["no-substitutes-named"]);
  }),
);

it.effect("leaves a club with no Tactic to its blocker, with no bench advisory beside it", () =>
  Effect.gen(function* () {
    const save = yield* createSave(savesDir, "No Tactic Career");
    const readiness = yield* inSave(
      save.id,
      Effect.gen(function* () {
        const club = yield* loadUserClub;
        return yield* loadMatchReadiness(club.id);
      }),
    );
    deepStrictEqual(ids(readiness.blockers), ["no-tactic"]);
    deepStrictEqual(ids(readiness.advisories), []);
  }),
);
