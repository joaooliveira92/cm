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

  /** Manager Profile (ticket 03): immutable creation-time identity, single-row table. Written by
   * `commitCareer` and never modified. Four Manager Pillars on a 1-5 scale summing to exactly 12;
   * `archetype_origin` records which preset or Custom was chosen. */
  yield* sql`CREATE TABLE manager_profile (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    manager_name TEXT NOT NULL CHECK (length(trim(manager_name)) BETWEEN 1 AND 80),
    archetype_origin TEXT NOT NULL CHECK (
      archetype_origin IN ('professor','motivator','sergeant','academy_head','custom')
    ),
    tactical_acumen INTEGER NOT NULL CHECK (tactical_acumen BETWEEN 1 AND 5),
    influence INTEGER NOT NULL CHECK (influence BETWEEN 1 AND 5),
    regimen INTEGER NOT NULL CHECK (regimen BETWEEN 1 AND 5),
    technical_coaching INTEGER NOT NULL CHECK (technical_coaching BETWEEN 1 AND 5),
    CHECK (tactical_acumen + influence + regimen + technical_coaching = 12)
  )`;

  yield* sql`CREATE TABLE clubs (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    stature_tier TEXT NOT NULL CHECK (stature_tier IN ('big','mid','small')),
    is_user_club INTEGER NOT NULL DEFAULT 0 CHECK (is_user_club IN (0,1))
  )`;

  yield* sql`CREATE TABLE players (
    id TEXT PRIMARY KEY,
    club_id TEXT REFERENCES clubs(id),
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
    bravery INTEGER NOT NULL CHECK (bravery BETWEEN 1 AND 20),
    aggression INTEGER NOT NULL CHECK (aggression BETWEEN 1 AND 20),

    pace INTEGER NOT NULL CHECK (pace BETWEEN 1 AND 20),
    acceleration INTEGER NOT NULL CHECK (acceleration BETWEEN 1 AND 20),
    stamina INTEGER NOT NULL CHECK (stamina BETWEEN 1 AND 20),
    strength INTEGER NOT NULL CHECK (strength BETWEEN 1 AND 20),
    agility INTEGER NOT NULL CHECK (agility BETWEEN 1 AND 20),
    natural_fitness INTEGER NOT NULL CHECK (natural_fitness BETWEEN 1 AND 20),
    injury_proneness INTEGER NOT NULL CHECK (injury_proneness BETWEEN 1 AND 20),

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
   * projected from the "season" stream's `ManagerWarned`/`ManagerSacked`/`ManagerRetired` events. The
   * Consecutive-Miss Counter persists across the whole save (not per-Season) so it survives a Season
   * rollover once one exists; `archived_cause` is checked by every mutating command to enforce the
   * read-only archive, and its two values are the two causes of an Archived Save.
   *
   * The table name is a technical artifact, not a domain term: it tracks manager *outcome* state
   * (`ManagerOutcome`), never manager identity, which lives in `manager_profile`. "Manager Status"
   * is retired as player-facing vocabulary — the screen is called Manager Profile. */
  yield* sql`CREATE TABLE manager_status (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    consecutive_misses INTEGER NOT NULL DEFAULT 0,
    archived_cause TEXT CHECK (archived_cause IS NULL OR archived_cause IN ('sacked','retired')),
    last_outcome TEXT NOT NULL DEFAULT 'none' CHECK (last_outcome IN ('none','warned','sacked'))
  )`;

  /** Transfer/Wage economy read model (ticket 16 / ADR-0005) — one row per club, seeded at Season
   * start from the club's fixed Stature Tier. `transfer_budget_remaining` spends down within a
   * Season with no replenishment between the two Transfer Windows; `wage_budget` is a running cap
   * checked against the sum of `contracts.wage` for that club, not itself spent down. */
  yield* sql`CREATE TABLE club_budgets (
    club_id TEXT PRIMARY KEY REFERENCES clubs(id),
    season_number INTEGER NOT NULL,
    transfer_budget_remaining INTEGER NOT NULL,
    wage_budget INTEGER NOT NULL
  )`;

  /** Per-player, per-Season fitness ledger (ticket 10) — one row per player, seeded at 100 at Season
   * start. `resolveMatchday` writes each on-pitch player's full-time Condition back here and records
   * the most recent injury's Severity; the Condition then recovers toward 100% between Fixtures keyed
   * to Natural Fitness and `last_injury_severity` (a knock recovers faster than a severe). Feeds a
   * not-fully-recovered player's `startingCondition` at kickoff and the squad view's Condition. */
  yield* sql`CREATE TABLE player_fitness (
    player_id TEXT PRIMARY KEY REFERENCES players(id),
    season_number INTEGER NOT NULL REFERENCES season(season_number),
    condition INTEGER NOT NULL DEFAULT 100 CHECK (condition BETWEEN 0 AND 100),
    last_injury_severity TEXT NOT NULL DEFAULT 'none' CHECK (last_injury_severity IN ('none','light','medium','severe'))
  )`;

  /** A player's active Contract (ticket 16 / ADR-0005) — 1-5 years, formula-derived wage, no
   * negotiation UI. A player with no row here (and `players.club_id IS NULL`) is a Free Agent,
   * signable for Credits 0 via the normal signing flow. `years_remaining` is allowed to reach 0
   * transiently mid-expiry-sweep (`transfers.ts`'s `expireContractsForSeason` decrements every row
   * before deleting the ones that hit 0) — every row a Sign/Renew command writes is still 1-5. */
  yield* sql`CREATE TABLE contracts (
    player_id TEXT PRIMARY KEY REFERENCES players(id),
    wage INTEGER NOT NULL CHECK (wage >= 0),
    years_remaining INTEGER NOT NULL CHECK (years_remaining BETWEEN 0 AND 5),
    signed_season INTEGER NOT NULL
  )`;

  /** Per-player Training Focus (spec: `.scratch/training/spec.md`) — the one Category a manager is
   * concentrating on, or `NULL` for the no-focus default. A missing row also reads as no-focus
   * (no migration/backfill for existing or freshly generated players); a row is written only when
   * a manager sets a focus. AI clubs' players never have a focus row. */
  yield* sql`CREATE TABLE training_focus (
    player_id TEXT PRIMARY KEY REFERENCES players(id),
    focus TEXT CHECK (focus IS NULL OR focus IN ('technical','mental','physical','goalkeeping'))
  )`;

  /** In-flight Bid state (ticket 16 / ADR-0005) — any player is biddable regardless of a Listed
   * flag (not modeled, per ticket 05). Single-round: the selling club accepts/rejects/counters
   * exactly once (`countered`), then the bidding club accepts/withdraws. */
  yield* sql`CREATE TABLE bids (
    id TEXT PRIMARY KEY,
    player_id TEXT NOT NULL REFERENCES players(id),
    selling_club_id TEXT NOT NULL REFERENCES clubs(id),
    bidding_club_id TEXT NOT NULL REFERENCES clubs(id),
    amount INTEGER NOT NULL CHECK (amount >= 0),
    counter_amount INTEGER,
    status TEXT NOT NULL CHECK (status IN ('pending','countered','accepted','rejected','withdrawn')),
    season_number INTEGER NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  )`;
});
