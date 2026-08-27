import { readdir } from "node:fs/promises";
import path from "node:path";
import { SqliteClient } from "@effect/sql-sqlite-node";
import {
  InvalidTacticError,
  SaveNotFoundError,
  Tactic,
  TacticsScreenView,
} from "@cm-clone/contracts";
import { FORMATION_SLOTS, POSITION_ROLES } from "@cm-clone/shared";
import { Effect, Schema } from "effect";
import { SqlClient } from "effect/unstable/sql/SqlClient";
import { loadSquadPlayers, loadUserClub } from "./squad.js";

/** The club's persisted Tactic, if `ChangeTactics` has ever been issued — assumes a `SqlClient` in
 * context. Exported for season.ts (ticket 15, synthesizes a default for AI clubs without one) and
 * match.ts (ticket 13, needs the opponent club's Tactic too). */
export const loadPersistedTactic = (clubId: string) =>
  Effect.gen(function* () {
    const sql = yield* SqlClient;

    const tacticRows = yield* sql<{
      formation: string;
      mentality: string;
      tempo: string;
      pressing: string;
    }>`SELECT formation, mentality, tempo, pressing FROM tactics WHERE club_id = ${clubId}`;
    if (tacticRows.length === 0) return null;

    const slotRows = yield* sql<{
      position: string;
      role: string;
      playerId: string;
    }>`SELECT position, role, player_id as "playerId" FROM tactic_slots WHERE club_id = ${clubId} ORDER BY slot_index`;

    return yield* Schema.decodeUnknownEffect(Tactic)({
      ...tacticRows[0],
      slots: slotRows,
    });
  });

const withExistingSave = <A, E>(
  savesDir: string,
  saveId: string,
  onFound: (filename: string) => Effect.Effect<A, E>,
) =>
  Effect.gen(function* () {
    const filename = path.join(savesDir, `${saveId}.sqlite`);
    const exists = yield* Effect.promise(() =>
      readdir(savesDir).then((entries) => entries.includes(`${saveId}.sqlite`)),
    );
    if (!exists) {
      return yield* new SaveNotFoundError({ id: saveId });
    }
    return yield* onFound(filename);
  });

export const getTactics = (savesDir: string, saveId: string) =>
  withExistingSave(savesDir, saveId, (filename) =>
    Effect.gen(function* () {
      const club = yield* loadUserClub;
      const squad = yield* loadSquadPlayers(club.id);
      const tactic = yield* loadPersistedTactic(club.id);
      return new TacticsScreenView({ club, squad, tactic });
    }).pipe(Effect.provide(SqliteClient.layer({ filename, readonly: true })), Effect.scoped),
  );

/** Writes a Tactic's `tactics`/`tactic_slots` rows for one club — shared by `changeTactics` (the
 * user's own club, after `validateTactic` below) and `aiClubs.ts`'s Season-start AI Tactic
 * assignment (ticket 17), which calls this directly in-process rather than through the RpcGroup.
 * Assumes a `SqlClient` in context. */
export const persistTactic = (clubId: string, tactic: Tactic) =>
  Effect.gen(function* () {
    const sql = yield* SqlClient;
    yield* sql`DELETE FROM tactic_slots WHERE club_id = ${clubId}`;
    yield* sql`DELETE FROM tactics WHERE club_id = ${clubId}`;
    yield* sql`INSERT INTO tactics (club_id, formation, mentality, tempo, pressing) VALUES (${clubId}, ${tactic.formation}, ${tactic.mentality}, ${tactic.tempo}, ${tactic.pressing})`;
    for (const [index, slot] of tactic.slots.entries()) {
      yield* sql`INSERT INTO tactic_slots (club_id, slot_index, position, role, player_id) VALUES (${clubId}, ${index}, ${slot.position}, ${slot.role}, ${slot.playerId})`;
    }
  });

/** Exported for `aiClubs.ts`'s Season-start AI Tactic assignment (ticket 17), which validates the
 * synthesized Tactic against the same rules the human Tactics screen enforces before persisting. */
export const validateTactic = (tactic: Tactic, squadPlayerIds: ReadonlySet<string>) =>
  Effect.gen(function* () {
    const expectedPositions = FORMATION_SLOTS[tactic.formation];
    if (tactic.slots.length !== expectedPositions.length) {
      return yield* new InvalidTacticError({
        reason: `${tactic.formation} needs ${expectedPositions.length} slots, got ${tactic.slots.length}`,
      });
    }

    const seenPlayers = new Set<string>();
    for (const [index, slot] of tactic.slots.entries()) {
      if (slot.position !== expectedPositions[index]) {
        return yield* new InvalidTacticError({
          reason: `slot ${index} must be ${expectedPositions[index]} in ${tactic.formation}, got ${slot.position}`,
        });
      }
      if (slot.role !== POSITION_ROLES[slot.position]) {
        return yield* new InvalidTacticError({
          reason: `slot ${index} (${slot.position}) must use Role ${POSITION_ROLES[slot.position]}, got ${slot.role}`,
        });
      }
      if (!squadPlayerIds.has(slot.playerId)) {
        return yield* new InvalidTacticError({
          reason: `player ${slot.playerId} is not in the squad`,
        });
      }
      if (seenPlayers.has(slot.playerId)) {
        return yield* new InvalidTacticError({
          reason: `player ${slot.playerId} is assigned to more than one slot`,
        });
      }
      seenPlayers.add(slot.playerId);
    }
  });

export const changeTactics = (savesDir: string, saveId: string, tactic: Tactic) =>
  withExistingSave(savesDir, saveId, (filename) =>
    Effect.gen(function* () {
      const club = yield* loadUserClub;
      const squad = yield* loadSquadPlayers(club.id);
      yield* validateTactic(tactic, new Set(squad.map((player) => player.id)));
      yield* persistTactic(club.id, tactic);

      return new TacticsScreenView({ club, squad, tactic });
    }).pipe(Effect.provide(SqliteClient.layer({ filename })), Effect.scoped),
  );
