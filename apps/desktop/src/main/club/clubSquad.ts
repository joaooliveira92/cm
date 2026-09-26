/**
 * Club Squad (Screen 35) — any club's squad for any club in the save, its Players read by the
 * human club's Scouting Progress.
 *
 * The club-scoped sibling of `getSquad`, which stays the manager's own lineup-manager read. The
 * knowledge limit (Agent Note 2026-09-19, tickets 09/10): a Player outside the manager's own club
 * carries an Attribute Range for every figure below Fully Scouted, and exact figures at it; the
 * manager's own club — if this club-scoped route is reached for it — reads exact, because
 * own-squad Players are always full-info and never carry Scouting Progress (CONTEXT.md). Which
 * progress a figure is read at comes from `scoutingProgress.ts`, the same module the market, the
 * Profile, the offer, the search, the comparison and the scout report resolve it through.
 *
 * One read answers the whole page, including whose club it is, so the screen can mark a foreign
 * club [Not your club] without a second read. Same shape as `getClubStaff`, deliberately.
 */
import {
  ClubNotFoundError,
  ClubSquadPlayerView,
  ClubSquadView,
  ClubSummary,
  type SquadPlayerView,
  type ClubId,
  type PlayerId,
  type SaveId,
} from "@cm-clone/contracts";
import {
  ALL_ATTRIBUTES,
  HIDDEN_ATTRIBUTES,
  figureByProgress,
  progressForReading,
  type StatureTier,
} from "@cm-clone/shared";
import { SqliteClient } from "@effect/sql-sqlite-node";
import { Effect } from "effect";
import { SqlClient } from "effect/unstable/sql/SqlClient";
import { withExistingSave } from "../season/decider.js";
import { displayNames } from "../world/displayNames.js";
import { loadProgressOnClubPlayers } from "./scoutingProgress.js";
import { loadSquadPlayers, loadUserClub } from "./squad.js";

export const getClubSquad = (savesDir: string, saveId: SaveId, clubId: ClubId) =>
  withExistingSave(savesDir, saveId, (filename) =>
    readClubSquad(clubId).pipe(
      Effect.provide(SqliteClient.layer({ filename, readonly: true })),
      Effect.scoped,
    ),
  );

const readClubSquad = (clubId: ClubId) =>
  Effect.gen(function* () {
    const sql = yield* SqlClient;
    const clubRows = yield* sql<{
      statureTier: StatureTier;
      isUserClub: number;
    }>`SELECT c.stature_tier as "statureTier", c.is_user_club as "isUserClub"
       FROM clubs c WHERE c.id = ${clubId}`;
    const clubRow = clubRows[0];
    if (clubRow === undefined) {
      return yield* new ClubNotFoundError({ id: clubId });
    }
    const isUserClub = clubRow.isUserClub === 1;

    // The human club for this read is `loadUserClub`, the same seam the market and the Player
    // screens use, and the progress comes from the shared loader, so a rival's Players are read at
    // the same progress here as in the market, the Profile, the search and the comparison — the
    // drift the Agent Note this ticket implements names. The manager's own club skips the query
    // entirely: `progressForReading` resolves its Players to Fully Scouted without a row, and it
    // never has one.
    const humanClub = yield* loadUserClub;
    const progressByPlayer = isUserClub
      ? new Map<PlayerId, number>()
      : yield* loadProgressOnClubPlayers(humanClub.id, clubId);

    const squad = yield* loadSquadPlayers(clubId);

    // Pure per-player mapping now that the progress rows are already loaded: every player's figure
    // set is a function of (true figures, progress), so there is no per-player IO to sequence.
    const players = squad.map((player) => {
      // Every player on this page is at `clubId` — `loadSquadPlayers` read them from there — so the
      // reading club and the player's club are the same pair on every row of this screen.
      const progress = progressForReading(clubId, humanClub.id, progressByPlayer.get(player.id) ?? 0);
      return clubSquadPlayerView(player, progress);
    });

    const nameOf = yield* displayNames;

    return new ClubSquadView({
      club: new ClubSummary({
        id: clubId,
        name: nameOf(clubId),
        statureTier: clubRow.statureTier,
      }),
      isUserClub,
      players,
    });
  });

/** One Squad player turned into the club-scoped view, every figure through the shared knowledge
 *  rule: exact at Fully Scouted, the Attribute Range on the 1-20 Attribute scale (and the 1-100
 *  Overall Rating scale) below it. A null row entry — an outfield player has no Goalkeeping figure
 *  (CONTEXT.md) — is omitted from the wire rather than ranged from a value that is not there. */
const clubSquadPlayerView = (player: SquadPlayerView, progress: number): ClubSquadPlayerView => {
  const attributes = Object.fromEntries(
    [...ALL_ATTRIBUTES, ...HIDDEN_ATTRIBUTES].flatMap((attribute) => {
      const trueValue = player.attributes[attribute];
      return typeof trueValue === "number"
        ? [[attribute, figureByProgress(trueValue, progress, [1, 20])]]
        : [];
    }),
  );
  return new ClubSquadPlayerView({
    id: player.id,
    firstName: player.firstName,
    lastName: player.lastName,
    age: player.age,
    attributes,
    positions: player.positions,
    overallRating: figureByProgress(player.overallRating, progress),
    nationality: player.nationality,
    birthplace: player.birthplace,
  });
};