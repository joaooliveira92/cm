import { Effect } from "effect";
import { SqlClient } from "effect/unstable/sql/SqlClient";

/** DDL for a freshly created save's SQLite file. Run once, inside the same transaction as generation. */
export const createSchema = Effect.gen(function* () {
  const sql = yield* SqlClient;

  yield* sql`CREATE TABLE save_meta (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    created_at TEXT NOT NULL
  )`;

  yield* sql`CREATE TABLE clubs (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    stature_tier TEXT NOT NULL CHECK (stature_tier IN ('big','mid','small')),
    is_user_club INTEGER NOT NULL DEFAULT 0 CHECK (is_user_club IN (0,1))
  )`;

  yield* sql`CREATE TABLE players (
    id TEXT PRIMARY KEY,
    club_id TEXT NOT NULL REFERENCES clubs(id),
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    date_of_birth TEXT NOT NULL,
    potential_ability INTEGER NOT NULL CHECK (potential_ability BETWEEN 1 AND 100),

    passing INTEGER NOT NULL CHECK (passing BETWEEN 1 AND 20),
    shooting INTEGER NOT NULL CHECK (shooting BETWEEN 1 AND 20),
    tackling INTEGER NOT NULL CHECK (tackling BETWEEN 1 AND 20),
    dribbling INTEGER NOT NULL CHECK (dribbling BETWEEN 1 AND 20),
    heading INTEGER NOT NULL CHECK (heading BETWEEN 1 AND 20),
    crossing INTEGER NOT NULL CHECK (crossing BETWEEN 1 AND 20),
    finishing INTEGER NOT NULL CHECK (finishing BETWEEN 1 AND 20),
    first_touch INTEGER NOT NULL CHECK (first_touch BETWEEN 1 AND 20),

    positioning INTEGER NOT NULL CHECK (positioning BETWEEN 1 AND 20),
    decisions INTEGER NOT NULL CHECK (decisions BETWEEN 1 AND 20),
    composure INTEGER NOT NULL CHECK (composure BETWEEN 1 AND 20),
    determination INTEGER NOT NULL CHECK (determination BETWEEN 1 AND 20),
    teamwork INTEGER NOT NULL CHECK (teamwork BETWEEN 1 AND 20),
    flair INTEGER NOT NULL CHECK (flair BETWEEN 1 AND 20),

    pace INTEGER NOT NULL CHECK (pace BETWEEN 1 AND 20),
    acceleration INTEGER NOT NULL CHECK (acceleration BETWEEN 1 AND 20),
    stamina INTEGER NOT NULL CHECK (stamina BETWEEN 1 AND 20),
    strength INTEGER NOT NULL CHECK (strength BETWEEN 1 AND 20),
    agility INTEGER NOT NULL CHECK (agility BETWEEN 1 AND 20),

    gk_handling INTEGER CHECK (gk_handling IS NULL OR gk_handling BETWEEN 1 AND 20),
    gk_reflexes INTEGER CHECK (gk_reflexes IS NULL OR gk_reflexes BETWEEN 1 AND 20),
    gk_aerial_reach INTEGER CHECK (gk_aerial_reach IS NULL OR gk_aerial_reach BETWEEN 1 AND 20),
    gk_command_of_area INTEGER CHECK (gk_command_of_area IS NULL OR gk_command_of_area BETWEEN 1 AND 20),
    gk_kicking INTEGER CHECK (gk_kicking IS NULL OR gk_kicking BETWEEN 1 AND 20)
  )`;

  yield* sql`CREATE TABLE player_positions (
    player_id TEXT NOT NULL REFERENCES players(id),
    position TEXT NOT NULL CHECK (position IN ('GK','DC','DL','DR','DM','MC','ML','MR','AMC','ST')),
    familiarity TEXT NOT NULL CHECK (familiarity IN ('natural','competent','unfamiliar')),
    PRIMARY KEY (player_id, position)
  )`;

  yield* sql`CREATE TABLE tactics (
    club_id TEXT PRIMARY KEY REFERENCES clubs(id),
    formation TEXT NOT NULL CHECK (formation IN ('4-4-2','4-3-3','4-5-1','3-5-2','5-3-2')),
    mentality TEXT NOT NULL CHECK (mentality IN ('defensive','balanced','attacking')),
    tempo TEXT NOT NULL CHECK (tempo IN ('slow','normal','fast')),
    pressing TEXT NOT NULL CHECK (pressing IN ('low','medium','high'))
  )`;

  yield* sql`CREATE TABLE tactic_slots (
    club_id TEXT NOT NULL REFERENCES tactics(club_id),
    slot_index INTEGER NOT NULL,
    position TEXT NOT NULL CHECK (position IN ('GK','DC','DL','DR','DM','MC','ML','MR','AMC','ST')),
    role TEXT NOT NULL,
    player_id TEXT NOT NULL REFERENCES players(id),
    PRIMARY KEY (club_id, slot_index)
  )`;

  /** Generic append-only event log (ADR-0007 domain-bounded streams: `stream_type` e.g. "match"/"season",
   * `stream_id` the Fixture/save id) — Deciders append here and read models are projected from it. */
  yield* sql`CREATE TABLE events (
    stream_type TEXT NOT NULL,
    stream_id TEXT NOT NULL,
    seq INTEGER NOT NULL,
    tag TEXT NOT NULL,
    payload TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    PRIMARY KEY (stream_type, stream_id, seq)
  )`;

  /** Season/Calendar Decider's read model (ticket 15) — a single row per Season, projected from the
   * "season" event stream (streamId = save id, ADR-0007). `current_matchday` is the last Matchday
   * whose Fixtures have been resolved (0 before Matchday 1). */
  yield* sql`CREATE TABLE season (
    season_number INTEGER PRIMARY KEY,
    current_matchday INTEGER NOT NULL DEFAULT 0 CHECK (current_matchday BETWEEN 0 AND 38),
    phase TEXT NOT NULL CHECK (phase IN ('pre_season','in_season','mid_window_open','season_complete'))
  )`;

  /** The Season's full fixture list, generated once at Season start (double round-robin, ticket 15) and
   * filled in as `AdvanceCalendar` resolves each Matchday. Not a Decider — projected from Match/Season
   * stream events, per ADR-0007 ("League Table is a projection"). */
  yield* sql`CREATE TABLE fixtures (
    id TEXT PRIMARY KEY,
    season_number INTEGER NOT NULL REFERENCES season(season_number),
    matchday INTEGER NOT NULL CHECK (matchday BETWEEN 1 AND 38),
    home_club_id TEXT NOT NULL REFERENCES clubs(id),
    away_club_id TEXT NOT NULL REFERENCES clubs(id),
    home_goals INTEGER,
    away_goals INTEGER,
    played INTEGER NOT NULL DEFAULT 0 CHECK (played IN (0,1))
  )`;

  /** Board Objective (ticket 18 / ADR-0006) — one row per Season for the player's club only (AI
   * clubs are never judged). The band is set at Season start from the fixed Stature Tier -> band
   * table in `@cm-clone/shared`; `final_position`/`verdict` stay NULL until `SeasonConcluded`
   * triggers `BoardObjectiveJudged`. */
  yield* sql`CREATE TABLE board_objective (
    season_number INTEGER PRIMARY KEY REFERENCES season(season_number),
    club_id TEXT NOT NULL REFERENCES clubs(id),
    min_position INTEGER NOT NULL,
    max_position INTEGER NOT NULL,
    final_position INTEGER,
    verdict TEXT CHECK (verdict IS NULL OR verdict IN ('exceeded','met','missed'))
  )`;

  /** Manager Status (ticket 18 / ADR-0006) — a single row scoped to the save (mirrors `season`),
   * projected from the "season" stream's `ManagerWarned`/`ManagerSacked` events. The Consecutive-Miss
   * Counter persists across the whole save (not per-Season) so it survives a Season rollover once one
   * exists; `sacked` is checked by every mutating command to enforce the read-only archive. */
  yield* sql`CREATE TABLE manager_status (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    consecutive_misses INTEGER NOT NULL DEFAULT 0,
    sacked INTEGER NOT NULL DEFAULT 0 CHECK (sacked IN (0,1)),
    last_outcome TEXT NOT NULL DEFAULT 'none' CHECK (last_outcome IN ('none','warned','sacked'))
  )`;
});
