import {
  ClubNotFoundError,
  ClubSummary,
  StaffHistorySpellView,
  StaffNotFoundError,
  StaffProfileView,
  StaffRankedPlayerView,
  StaffRankingView,
  StaffRankingsView,
  StaffTacticsView,
  type ClubId,
  type SaveId,
} from "@cm-clone/contracts";
import {
  POSITIONS,
  ageOn,
  canonicalNationId,
  compareCodeUnits,
  createSeededRng,
  derivePresenceStaff,
  deriveSeed,
  deriveStaffProfile,
  generateStaff,
  nationCodeFromId,
  nationName,
  parseStaffKey,
  seasonStartDate,
  staffKey,
  staffOpinion,
  type ClubPersonRole,
  type StatureTier,
} from "@cm-clone/shared";
import { SqliteClient } from "@effect/sql-sqlite-node";
import { Effect } from "effect";
import { SqlClient } from "effect/unstable/sql/SqlClient";
import { loadSquadPlayers } from "../club/squad.js";
import { loadGameDate } from "../season/currentSeason.js";
import { withExistingSave } from "../season/decider.js";
import { displayNames } from "../world/displayNames.js";
import { readGenerationManifest } from "../world/worldGeneration.js";
import { loadClubIdentity } from "./staff.js";

/** The roles whose profile ranks the squad: the two who would pick a team. */
const RANKING_ROLES: ReadonlySet<ClubPersonRole> = new Set(["coach", "assistant"]);

/**
 * Staff Profile: one person in any club's backroom, addressed by `(clubId, StaffKey)`.
 *
 * Everything is derived on read — the person from the same streams `getClubStaff` uses, the profile
 * from its own `"staff-profile"` stream — so a rival's Assistant Manager answers exactly like the
 * manager's own Coach and nothing is written. The Bound Staff member's quality is re-derived rather
 * than read from `staff`, for the reason `getClubStaff` gives: the rows are that derivation,
 * materialised, and agree with it by construction.
 */
export const getStaffProfile = (savesDir: string, saveId: SaveId, clubId: ClubId, key: string) =>
  withExistingSave(savesDir, saveId, (filename) =>
    readStaffProfile(clubId, key).pipe(
      Effect.provide(SqliteClient.layer({ filename, readonly: true })),
      Effect.scoped,
    ),
  );

const readStaffProfile = (clubId: ClubId, key: string) =>
  Effect.gen(function* () {
    const club = yield* loadClubIdentity(clubId);
    if (club === null) {
      return yield* new ClubNotFoundError({ id: clubId });
    }
    const nationCode = club.nationId === null ? null : nationCodeFromId(club.nationId);
    if (nationCode === null) {
      return yield* Effect.die(new Error(`club ${clubId} has no nation to draw staff from`));
    }

    const address = parseStaffKey(key);
    if (address === null) {
      return yield* new StaffNotFoundError({ clubId, key });
    }

    const { worldSeed, referenceYear } = yield* readGenerationManifest;
    const bound = generateStaff({
      statureTier: club.statureTier,
      clubNation: nationCode,
      random: createSeededRng(deriveSeed(worldSeed, "staff", clubId)),
    });
    const presence = derivePresenceStaff({ clubId, clubNation: nationCode, worldSeed });
    const person = [...bound, ...presence].filter((candidate) => candidate.role === address.role)[
      address.ordinal
    ];
    if (person === undefined) {
      return yield* new StaffNotFoundError({ clubId, key });
    }
    const quality = "quality" in person ? person.quality : null;

    const sql = yield* SqlClient;
    // Compatriot clubs, by the same Season 1 competition nation the backroom's name pool comes from.
    const compatriots = yield* sql<{ id: ClubId; statureTier: StatureTier }>`
      SELECT c.id, c.stature_tier as "statureTier"
      FROM clubs c
      JOIN competition_participants p ON p.club_id = c.id AND p.season_number = 1
      JOIN competitions comp ON comp.id = p.competition_id
      WHERE comp.nation_id = ${club.nationId}`;

    const profile = deriveStaffProfile({
      worldSeed,
      clubId,
      role: address.role,
      ordinal: address.ordinal,
      clubNation: nationCode,
      statureTier: club.statureTier,
      quality,
      careerStart: seasonStartDate(referenceYear, 1),
      otherClubs: compatriots.map((row) => row.id),
    });

    const nameOf = yield* displayNames;
    const tierOf = new Map(compatriots.map((row) => [row.id, row.statureTier]));
    const summary = (id: ClubId, statureTier: StatureTier) =>
      new ClubSummary({ id, name: nameOf(id), statureTier });

    const isUserClub = club.isUserClub === 1;
    const gameDate = yield* loadGameDate;

    // A rival's squad is read through Scouting Progress, so only the manager's own is ranked.
    const judge = profile.mental?.judgingPlayerAbility;
    const rankings =
      isUserClub && RANKING_ROLES.has(address.role) && judge !== undefined
        ? yield* rankSquad(clubId, staffKey(address.role, address.ordinal), judge, worldSeed)
        : null;

    return new StaffProfileView({
      club: summary(clubId, club.statureTier),
      isUserClub,
      key: staffKey(address.role, address.ordinal),
      role: address.role,
      firstName: person.firstName,
      lastName: person.lastName,
      dateOfBirth: profile.dateOfBirth,
      age: ageOn(profile.dateOfBirth, gameDate),
      nationality: nationName(canonicalNationId(profile.nationality)),
      languages: profile.languages,
      quality,
      coaching: profile.coaching,
      mental: profile.mental,
      tactics: profile.tactics === null ? null : new StaffTacticsView(profile.tactics),
      joined: profile.joined,
      history: profile.history.map(
        (spell) =>
          new StaffHistorySpellView({
            fromYear: spell.fromYear,
            toYear: spell.toYear,
            club: summary(spell.clubId as ClubId, tierOf.get(spell.clubId as ClubId) ?? "mid"),
            role: spell.role,
          }),
      ),
      rankings,
    });
  });

/**
 * The squad at every Position, best first, as this person sees it: each player's Position Rating
 * blurred by the rater's Judging Player Ability (`staffOpinion`). Ties break on player id so the
 * order never depends on the row order SQLite returns.
 */
const rankSquad = (clubId: ClubId, key: string, judgingPlayerAbility: number, worldSeed: number) =>
  Effect.gen(function* () {
    const players = yield* loadSquadPlayers(clubId);
    const byPosition = POSITIONS.map((position) => {
      const opinions = players.map((player) => ({
        id: player.id,
        opinion: staffOpinion({
          positionRating: player.positionRatings[position] ?? 0,
          judgingPlayerAbility,
          seed: deriveSeed(worldSeed, "staff-opinion", clubId, key, player.id, position),
        }),
      }));
      opinions.sort((a, b) => b.opinion - a.opinion || compareCodeUnits(a.id, b.id));
      return new StaffRankingView({ position, playerIds: opinions.map((entry) => entry.id) });
    });
    return new StaffRankingsView({
      players: players.map(
        (player) =>
          new StaffRankedPlayerView({
            id: player.id,
            firstName: player.firstName,
            lastName: player.lastName,
            positions: player.positions.map((entry) => entry.position),
            age: player.age,
            condition: player.condition,
          }),
      ),
      byPosition,
    });
  });
