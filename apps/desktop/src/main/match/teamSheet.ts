import { SqliteClient } from "@effect/sql-sqlite-node";
import {
  MatchNotFoundError,
  TeamSheetView,
  TeamSheetClubView,
  TeamSheetPlayerView,
  type MatchId,
  type SaveId,
} from "@cm-clone/contracts";
import { Effect } from "effect";
import { SqlClient } from "effect/unstable/sql/SqlClient";
import { loadStreamEvents, withExistingSave } from "../season/decider.js";
import { displayNames } from "../world/displayNames.js";
import { MATCH_STREAM_TYPE, type PersistedMatchStarted } from "./stream.js";

interface NameRow {
  readonly id: string;
  readonly first_name: string;
  readonly last_name: string;
}

const loadPlayerNames = (ids: ReadonlyArray<string>) =>
  Effect.gen(function* () {
    const sql = yield* SqlClient;
    if (ids.length === 0) return new Map<string, { firstName: string; lastName: string }>();
    const rows = yield* sql.unsafe<NameRow>(
      `SELECT id, first_name as "first_name", last_name as "last_name" FROM players WHERE id IN (${ids.map(() => "?").join(",")})`,
      ids,
    );
    const map = new Map<string, { firstName: string; lastName: string }>();
    for (const row of rows) {
      map.set(row.id, { firstName: row.first_name, lastName: row.last_name });
    }
    return map;
  });

export const getTeamSheet = (savesDir: string, saveId: SaveId, matchId: MatchId) =>
  withExistingSave(savesDir, saveId, (filename) =>
    Effect.gen(function* () {
      const stream = yield* loadStreamEvents(MATCH_STREAM_TYPE, matchId);
      if (stream.length === 0) {
        return yield* new MatchNotFoundError({ matchId });
      }

      const started = stream[0]!.payload as PersistedMatchStarted;

      const nameOf = yield* displayNames;
      const homeName = nameOf(started.homeClubId);
      const awayName = nameOf(started.awayClubId);

      const allPlayerIds = new Set<string>();
      for (const slot of started.homeSetup.tactic.slots) allPlayerIds.add(slot.playerId);
      for (const slot of started.awaySetup.tactic.slots) allPlayerIds.add(slot.playerId);
      for (const pid of started.homeSetup.tactic.bench) if (pid !== null) allPlayerIds.add(pid);
      for (const pid of started.awaySetup.tactic.bench) if (pid !== null) allPlayerIds.add(pid);

      const names = yield* loadPlayerNames([...allPlayerIds]);

      const buildClub = (setup: typeof started.homeSetup, clubName: string, clubId: typeof started.homeClubId) => {
        const starters = setup.tactic.slots.map((slot) => {
          const pn = names.get(slot.playerId);
          return new TeamSheetPlayerView({
            playerId: slot.playerId,
            firstName: pn?.firstName ?? "Unknown",
            lastName: pn?.lastName ?? "Player",
            position: slot.position,
            role: slot.role,
          });
        });

        const bench = setup.tactic.bench.map((pid) => {
          if (pid === null) return null;
          const pn = names.get(pid);
          return pn ? `${pn.firstName} ${pn.lastName}` : null;
        });

        return new TeamSheetClubView({
          clubId,
          clubName,
          formation: setup.tactic.formation,
          starters,
          bench,
        });
      };

      return new TeamSheetView({
        home: buildClub(started.homeSetup, homeName, started.homeClubId),
        away: buildClub(started.awaySetup, awayName, started.awayClubId),
      });
    }).pipe(Effect.provide(SqliteClient.layer({ filename, readonly: true })), Effect.scoped),
  );