import { Effect } from "effect";
import { SqlClient } from "effect/unstable/sql/SqlClient";
import {
  ALL_ATTRIBUTES,
  HIDDEN_ATTRIBUTES,
  developPlayer,
  type Category,
  type PlayerAttributes,
} from "@cm-clone/shared";
import { appendStreamEvents, nextStreamSeq } from "./decider.js";
import type { ClubId, PlayerId } from "@cm-clone/contracts";

const CLUB_STREAM = "club";

const toSnakeCase = (attribute: string): string =>
  attribute.replace(/[A-Z]/g, (c) => `_${c.toLowerCase()}`);

/** Every attribute column (including hidden) that Player Development writes back. */
const ATTRIBUTE_COLUMNS = [...ALL_ATTRIBUTES, ...HIDDEN_ATTRIBUTES].map(toSnakeCase);

const ageFromDateOfBirth = (dateOfBirth: string): number => {
  const dob = new Date(dateOfBirth);
  const now = new Date();
  let age = now.getFullYear() - dob.getFullYear();
  const hasHadBirthdayThisYear =
    now.getMonth() > dob.getMonth() ||
    (now.getMonth() === dob.getMonth() && now.getDate() >= dob.getDate());
  if (!hasHadBirthdayThisYear) age -= 1;
  return age;
};

interface PlayerDevRow {
  readonly id: PlayerId;
  readonly dateOfBirth: string;
  readonly potentialAbility: number;
  readonly focus: Category | null;
  readonly [attribute: string]: unknown;
}

const selectList = [...ALL_ATTRIBUTES, ...HIDDEN_ATTRIBUTES]
  .map((attribute) => `${toSnakeCase(attribute)} as "${attribute}"`)
  .join(", ");

/** Develops every player on one club for the concluded Season and appends that club's
 * `PlayerDeveloped` event to its own Club stream — an in-process synchronous reactor to
 * `SeasonConcluded` (ADR-0007), like the other season-boundary reactions. Applies each player's
 * persisted Training Focus (a missing/`null` focus = the unmodified no-focus development); AI
 * clubs' players have no focus and so always develop unmodified. */
const developClubPlayers = (clubId: ClubId, seasonNumber: number) =>
  Effect.gen(function* () {
    const sql = yield* SqlClient;
    const rows = yield* sql.unsafe<PlayerDevRow>(
      `SELECT p.id, p.date_of_birth as "dateOfBirth", p.potential_ability as "potentialAbility",
              tf.focus as "focus", ${selectList}
       FROM players p LEFT JOIN training_focus tf ON tf.player_id = p.id
       WHERE p.club_id = ?`,
      [clubId],
    );
    if (rows.length === 0) return;

    const developed = rows.map((row) => {
      const attributes = Object.fromEntries(
        [...ALL_ATTRIBUTES, ...HIDDEN_ATTRIBUTES].map((attribute) => [attribute, row[attribute] ?? undefined]),
      ) as PlayerAttributes;
      const next = developPlayer(
        attributes,
        ageFromDateOfBirth(row.dateOfBirth),
        row.potentialAbility,
        row.focus ?? undefined,
      );
      return { playerId: row.id, attributes: next };
    });

    // Attribute-only UPDATE per player (raw column names via `sql.unsafe` — the dynamic list must
    // be SQL text, not a bound parameter). Only Attribute columns are written; the rest of the
    // `players` row (name, club, potential) is untouched, so ADR-0001's derived ratings stand.
    const setAssignments = ATTRIBUTE_COLUMNS.map((column) => `${column} = ?`).join(", ");
    for (const player of developed) {
      const values = [...ALL_ATTRIBUTES, ...HIDDEN_ATTRIBUTES].map(
        (attribute) => player.attributes[attribute] ?? null,
      );
      yield* sql.unsafe(`UPDATE players SET ${setAssignments} WHERE id = ?`, [
        ...values,
        player.playerId,
      ]);
    }

    const seq = yield* nextStreamSeq(CLUB_STREAM, clubId);
    yield* appendStreamEvents(CLUB_STREAM, clubId, seq, [
      {
        tag: "PlayerDeveloped",
        payload: { seasonNumber, clubId, players: developed },
      },
    ]);
  });

/** Develops every player on every club once for the concluded Season (per-`SeasonConcluded` Player
 * Development). Called from `advanceCalendar`'s season-complete branch as an in-process
 * synchronous reactor to `SeasonConcluded` (ADR-0007) — same pattern as the other season-boundary
 * reactions, in the same request as the rest of the concluded-Season work. */
export const developPlayersForSeason = (seasonNumber: number) =>
  Effect.gen(function* () {
    const sql = yield* SqlClient;
    const clubs = yield* sql<{ id: ClubId }>`SELECT id FROM clubs`;
    for (const club of clubs) {
      yield* developClubPlayers(club.id, seasonNumber);
    }
  });