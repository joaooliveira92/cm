/**
 * Writing a player's Match Player Line at resolution (match-screen ticket 18).
 *
 * Every squad-bearing fixture — the human's, folded from its stored timeline, and every AI fixture,
 * folded from the events its simulation produced — gets one row per matchday-squad member in the
 * same transaction as its result. The counting rules live once, in `@cm-clone/shared`
 * (`foldMatchPlayerLineCounts`), so this module only joins the fold onto the kickoff squads and the
 * fixture facts and writes the rows. See
 * `.agents/notes/proposed/architecture/2026-10-03-player-match-lines-are-written-at-resolution.md`.
 *
 * Counts only, never a rating or Condition: the Match Rating is recomputed on read.
 */
import type { ClubId, PlayerId } from "@cm-clone/contracts";
import {
  EMPTY_MATCH_PLAYER_LINE_COUNTS,
  foldMatchPlayerLineCounts,
  slotLabel,
  type MatchPlayerLineCounts,
  type Slot,
} from "@cm-clone/shared";
import type { MatchEvent, MatchTeamSetup } from "@cm-clone/game-engine";
import { Effect } from "effect";
import { SqlClient } from "effect/unstable/sql/SqlClient";

/** The fixture facts every line on it shares, read from the fixture row. */
export interface PlayerMatchLineFixture {
  readonly fixtureId: number;
  readonly seasonNumber: number;
  readonly competitionId: string;
  readonly date: string;
  readonly homeClubId: ClubId;
  readonly awayClubId: ClubId;
  readonly homeGoals: number;
  readonly awayGoals: number;
  readonly homePenalties: number | null;
  readonly awayPenalties: number | null;
}

/** A matchday-squad member in draw order: the kickoff slots in slot order, then the named bench. */
interface SquadMember {
  readonly playerId: PlayerId;
  readonly number: string;
  readonly starter: boolean;
  readonly position: Slot | null;
}

const squadMembers = (setup: MatchTeamSetup): ReadonlyArray<SquadMember> => {
  const inSquad = new Set(setup.squad.map((player) => player.id));
  const starters = setup.tactic.slots.map((slot, index) => ({
    playerId: slot.playerId,
    number: String(index + 1),
    starter: true,
    position: slot.cell,
  }));
  const substitutes = setup.tactic.bench
    .filter((id): id is PlayerId => id !== null && inSquad.has(id))
    .map((playerId, index) => ({ playerId, number: `SB${index + 1}`, starter: false, position: null }));
  return [...starters, ...substitutes];
};

/** `win` / `draw` / `loss` for one club, penalties settling a level cup tie. */
const resultOf = (
  goalsFor: number,
  goalsAgainst: number,
  penaltiesFor: number | null,
  penaltiesAgainst: number | null,
): "win" | "draw" | "loss" => {
  if (goalsFor > goalsAgainst) return "win";
  if (goalsFor < goalsAgainst) return "loss";
  if (penaltiesFor !== null && penaltiesAgainst !== null) {
    if (penaltiesFor > penaltiesAgainst) return "win";
    if (penaltiesFor < penaltiesAgainst) return "loss";
  }
  return "draw";
};

/**
 * The slot a substitute last held: the cell of the player he replaced. Processed in event order so
 * a substitute replacing a substitute follows the chain. Unused substitutes hold no position.
 */
const positionsByPlayer = (members: ReadonlyArray<SquadMember>, events: ReadonlyArray<MatchEvent>) => {
  const positions = new Map<string, Slot | null>(members.map((member) => [member.playerId, member.position]));
  const starters = new Set(members.filter((member) => member.starter).map((member) => member.playerId));
  for (const event of events) {
    if (event._tag !== "Substitution") continue;
    const { inPlayerId, outPlayerId } = event;
    if (starters.has(inPlayerId)) continue; // a stand-in was already on the pitch
    positions.set(inPlayerId, positions.get(outPlayerId) ?? null);
  }
  return positions;
};

const rowsForSide = (
  setup: MatchTeamSetup,
  isHome: boolean,
  fixture: PlayerMatchLineFixture,
  events: ReadonlyArray<MatchEvent>,
  counts: ReadonlyMap<string, MatchPlayerLineCounts>,
  recordedDefending: boolean,
): ReadonlyArray<Record<string, unknown>> => {
  const members = squadMembers(setup);
  const positions = positionsByPlayer(members, events);
  const goalsFor = isHome ? fixture.homeGoals : fixture.awayGoals;
  const goalsAgainst = isHome ? fixture.awayGoals : fixture.homeGoals;
  const penaltiesFor = isHome ? fixture.homePenalties : fixture.awayPenalties;
  const penaltiesAgainst = isHome ? fixture.awayPenalties : fixture.homePenalties;
  const result = resultOf(goalsFor, goalsAgainst, penaltiesFor, penaltiesAgainst);
  const opponentClubId = isHome ? fixture.awayClubId : fixture.homeClubId;

  return members.map((member) => {
    const line = counts.get(member.playerId) ?? EMPTY_MATCH_PLAYER_LINE_COUNTS;
    const played = member.starter || counts.has(member.playerId);
    const position = positions.get(member.playerId) ?? null;
    return {
      fixture_id: fixture.fixtureId,
      player_id: member.playerId,
      club_id: setup.clubId,
      season_number: fixture.seasonNumber,
      competition_id: fixture.competitionId,
      date: fixture.date,
      opponent_club_id: opponentClubId,
      is_home: isHome ? 1 : 0,
      position: position === null ? null : slotLabel(position),
      started: member.starter ? 1 : 0,
      on_minute: member.starter ? null : line.cameOnMinute,
      off_minute: line.wentOffMinute,
      // A sent-off player is off the pitch at full time; a substituted-off player likewise.
      on_at_end: played && line.redCards === 0 && line.wentOffMinute === null ? 1 : 0,
      squad_number: member.number,
      result,
      goals: line.goals,
      assists: line.assists,
      key_passes: line.keyPasses,
      shots: line.shots,
      shots_on_target: line.shotsOnTarget,
      saves: line.saves,
      offsides: line.offsides,
      fouls: line.fouls,
      yellow_cards: line.yellowCards,
      red_cards: line.redCards,
      runs: line.runs,
      tackles_won: recordedDefending ? line.tacklesWon : null,
      interceptions: recordedDefending ? line.interceptions : null,
      headers: recordedDefending ? line.headers : null,
      headers_won: recordedDefending ? line.headersWon : null,
      fouls_suffered: recordedDefending ? line.foulsSuffered : null,
    };
  });
};

/**
 * Folds both squads' lines and inserts them. Assumes a `SqlClient` in context and the caller's
 * transaction, like `recordMatchdayConditions` beside it: a write failure aborts the whole Matchday,
 * leaving neither results nor lines.
 */
export const recordPlayerMatchLines = (
  fixture: PlayerMatchLineFixture,
  home: MatchTeamSetup,
  away: MatchTeamSetup,
  events: ReadonlyArray<MatchEvent>,
) =>
  Effect.gen(function* () {
    const sql = yield* SqlClient;
    const starters = new Set<string>([
      ...home.tactic.slots.map((slot) => String(slot.playerId)),
      ...away.tactic.slots.map((slot) => String(slot.playerId)),
    ]);
    const counts = foldMatchPlayerLineCounts(starters, events, null);
    const recordedDefending = events.some((event) => event._tag === "PossessionTally");
    const rows = [
      ...rowsForSide(home, true, fixture, events, counts, recordedDefending),
      ...rowsForSide(away, false, fixture, events, counts, recordedDefending),
    ];
    if (rows.length === 0) return;
    yield* sql`INSERT INTO player_match_lines ${sql.insert(rows)}`;
  });
