import { sql } from "drizzle-orm";
import { check, integer, primaryKey, sqliteTable, text } from "drizzle-orm/sqlite-core";

/**
 * The save file's schema, defined once in Drizzle and nowhere else.
 *
 * This module is the **source of truth** for a save's shape. The DDL that actually runs lives in
 * `migrations.generated.ts`, produced from these definitions by `pnpm db:generate` — it is a build
 * artifact, never edited by hand, and `db-migrations-drift.test.ts` fails if it drifts from what
 * these tables describe.
 *
 * Queries elsewhere in the main process still go through the Effect `SqlClient` as raw SQL; Drizzle
 * owns the schema, not the query layer. The `CHECK` constraints below are therefore load-bearing:
 * they are the last enforcement of a domain invariant before a row lands on disk, and several
 * encode rules (a pillar distribution summing to 12, ability on a 1-20 scale) that no query-side
 * type can restate.
 */

/** SQLite has no native enum; a `CHECK ... IN` is how a column is constrained to a vocabulary. */
const oneOf = (column: string, values: readonly string[]): ReturnType<typeof sql> =>
  sql.raw(`${column} IN (${values.map((value) => `'${value}'`).join(",")})`);

const POSITIONS = ["GK", "DC", "DL", "DR", "DM", "MC", "ML", "MR", "AMC", "ST"] as const;
const FAMILIARITIES = ["natural", "competent", "unfamiliar"] as const;

/** An unsigned 32-bit seed, the range `deriveSeed` produces. */
const SEED_RANGE = "BETWEEN 0 AND 4294967295";

/** A 1-20 player Attribute. */
const attribute = (name: string) =>
  integer(name).notNull();

export const saveMeta = sqliteTable("save_meta", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  createdAt: text("created_at").notNull(),
});

/**
 * Generation provenance: what produced this save's world, single-row table.
 *
 * Written by `beginCareer` before any entity exists, and never modified. It is what makes a save
 * reproducible — `world_seed` plus the two versions determine every generated club, player, and
 * fixture, so the same triple regenerates the same world. `reference_year` is pinned here rather
 * than read from the clock at generation time, for the same reason. The Setup Catalogue
 * fingerprint, the content pack id/version, and the snapshot id record *which selection and which
 * names* produced the ids in this file — provenance, never inputs to generation or simulation.
 *
 * `generated_at` is recorded for operator diagnosis only. Nothing in generation or simulation may
 * read it: a world that varies with its creation timestamp is not reproducible.
 */
export const generationManifest = sqliteTable(
  "generation_manifest",
  {
    id: integer("id").primaryKey(),
    worldSeed: integer("world_seed").notNull(),
    generatorVersion: text("generator_version").notNull(),
    rulesetVersion: text("ruleset_version").notNull(),
    referenceYear: integer("reference_year").notNull(),
    generatedAt: text("generated_at").notNull(),
    /** The Setup Catalogue fingerprint this world was generated against (ticket 03). Together with
     *  the content pack record below, it lets a later reader say which catalogue and which pack
     *  produced the ids in this file — a catalogue that has since moved on is shown as provenance,
     *  never silently re-resolved. */
    catalogueFingerprint: text("catalogue_fingerprint").notNull(),
    /** The content pack (id + version) the save was generated against, recorded the same way — so
     *  reopening the same world under a pack whose ids no longer overlap is a reported condition
     *  rather than a screen full of raw identifiers. */
    contentPackId: text("content_pack_id").notNull(),
    contentPackVersion: text("content_pack_version").notNull(),
    /** The League Selection Snapshot this world was generated from. Diagnostic pointer, explicitly
     *  **not** a foreign key: the snapshot file is machine-local (`league-snapshots.json` in
     *  Electron userData) and will not exist beside a save copied to another machine, so nothing
     *  may join to it. The snapshot's intents are never persisted — re-resolution happens against
     *  the live catalogue at `beginCareer` time, and this id only says which selection asked. */
    snapshotId: text("snapshot_id").notNull(),
  },
  () => [
    check("generation_manifest_single_row", sql`id = 1`),
    check("generation_manifest_world_seed_range", sql.raw(`world_seed ${SEED_RANGE}`)),
  ],
);

/** Manager Profile (ticket 03): immutable creation-time identity, single-row table. Written by
 * `commitCareer` and never modified. Four Manager Pillars on a 1-5 scale summing to exactly 12;
 * `archetype_origin` records which preset or Custom was chosen. */
export const managerProfile = sqliteTable(
  "manager_profile",
  {
    id: integer("id").primaryKey(),
    managerName: text("manager_name").notNull(),
    archetypeOrigin: text("archetype_origin").notNull(),
    tacticalAcumen: integer("tactical_acumen").notNull(),
    influence: integer("influence").notNull(),
    regimen: integer("regimen").notNull(),
    technicalCoaching: integer("technical_coaching").notNull(),
  },
  () => [
    check("manager_profile_single_row", sql`id = 1`),
    check("manager_profile_name_length", sql`length(trim(manager_name)) BETWEEN 1 AND 80`),
    check(
      "manager_profile_archetype_origin",
      oneOf("archetype_origin", ["professor", "motivator", "sergeant", "academy_head", "custom"]),
    ),
    check("manager_profile_tactical_acumen", sql`tactical_acumen BETWEEN 1 AND 5`),
    check("manager_profile_influence", sql`influence BETWEEN 1 AND 5`),
    check("manager_profile_regimen", sql`regimen BETWEEN 1 AND 5`),
    check("manager_profile_technical_coaching", sql`technical_coaching BETWEEN 1 AND 5`),
    check(
      "manager_profile_pillars_sum",
      sql`tactical_acumen + influence + regimen + technical_coaching = 12`,
    ),
  ],
);

/*
 * The world catalogue — `nations` and `cities` — copied **unconditionally** into every save,
 * whatever the selection scope and whatever Simulation Depth its competitions run at (spec rule 2:
 * the catalogue line runs on whether anything outside the loaded world points at a row).
 *
 * `nations` and `cities` are referents, not participants: a player's nationality and birthplace are
 * drawn from the whole catalogue, so a row may be pointed at by a nation the selection never
 * activated. `competitions` and `clubs`, by contrast, are activated-only — nothing outside the
 * loaded world points in. A `results-only` nation keeps its cities; Depth's footprint is exactly the
 * presence or absence of squad rows ([results-only geography] Agent Note).
 */

/**
 * Authoritative for the existence of a nation as a referent, and for nothing else.
 *
 * The row is deliberately thin: it carries its canonical id and nothing else. It does not mirror the
 * factual columns of `nations.ts` and it does not hold the 0-1 Nation Profile priors, because
 * nothing reads a profile after generation and `generation_manifest.ruleset_version` already pins
 * which `nations.ts` a save was generated against — a mirror would be identical data in every save
 * with no reader. No column stores whether a nation is activated: that answer is
 * `SELECT DISTINCT nation_id FROM competitions`. No `generation_seed`: nations are resolved, not
 * generated.
 *
 * **Reintroduction condition**: the first time a system reads a Nation Profile *during* a career
 * rather than at generation, the profile must be snapshotted into the save. Until then a ruleset
 * upgrade only changes how future worlds are generated.
 */
export const nations = sqliteTable("nations", {
  /** Canonical id in the one underscore convention (`nation_eng`), minted by
   *  `canonicalNationId` in `packages/shared`. */
  id: text("id").primaryKey(),
});

/**
 * Authoritative for a club's hometown and a player's birthplace.
 *
 * One row per curated city of every nation in `NATION_CODES`, in every save, whatever the selection
 * scope — unconditional, matching `nations`. The list is code (`CITIES_BY_NATION` in
 * `packages/shared`), copied straight into the save at generation; the code list is the catalogue
 * and the save records the resolved subset, here the whole of it. `name` is carried directly and
 * never resolved through a content pack: city names are factual, licence-free geography, the same
 * kind of claim a country name is. No coordinates (distance is not modelled) and no population
 * figure: `population_band` is an ordering for club-stature plausibility, never a claim that goes
 * stale. No `generation_seed`: cities are resolved, not generated.
 */
export const cities = sqliteTable(
  "cities",
  {
    /** Canonical id in the one underscore convention (`city_eng_london`), minted by
     *  `canonicalCityId` in `packages/shared`. */
    id: text("id").primaryKey(),
    nationId: text("nation_id")
      .notNull()
      .references(() => nations.id),
    name: text("name").notNull(),
    populationBand: text("population_band").notNull(),
  },
  () => [check("cities_population_band", oneOf("population_band", ["major", "large", "mid", "small"]))],
);

/*
 * The competition graph — the **resolved world**, activated-only.
 *
 * Unlike `nations` and `cities` above, these tables carry only what the player's Effective
 * Selection resolved to: nothing outside the loaded world points at a competition, and their volume
 * scales with the chosen scope. A competition resolved to `not_loaded` gets no row at all.
 *
 * Dependency (`requires`) edges are persisted **nowhere**. They are setup-time input to closure
 * resolution, and once the world exists the fact that a top division required its national cup
 * governs nothing a simulation reads. Promotion structure is the opposite case — read at every
 * season rollover for the life of the save — which is why it is a table.
 */

export const competitions = sqliteTable(
  "competitions",
  {
    /** The catalogue's own canonical id (`comp_eng_1`), so the save and the catalogue join. */
    id: text("id").primaryKey(),
    /** `NULL` for a cross-border tournament: the catalogue models confederations as Nation-shaped
     *  branches so its browser stays one uniform tree, but a branch is a container rather than a
     *  territory and has no `nations` row to point at. */
    nationId: text("nation_id").references(() => nations.id),
    kind: text("kind").notNull(),
    /** Pyramid tier, 1 = highest. `NULL` for a kind that does not sit on the ladder — and never a
     *  substitute for `competition_links`: with parallel regional divisions at one tier, no
     *  arithmetic on this number identifies which division sits above which. */
    tier: integer("tier"),
    /** Effective Simulation Depth. What each value implies on disk is a later ticket's; this is
     *  where the value itself lives. */
    depth: text("depth").notNull(),
    /** Authoritative, not derived from participant rows: it is what the symmetric-exchange
     *  invariant is checked *against*, and counting participants against participants would only
     *  prove last season equalled last season. `NULL` for a competition whose field is a function
     *  of its sources. */
    clubCount: integer("club_count"),
  },
  () => [
    check("competitions_kind", oneOf("kind", ["league", "cup", "reserve", "continental"])),
    check("competitions_depth", oneOf("depth", ["full", "standard", "results-only"])),
  ],
);

/**
 * Exchange Links — promotion and relegation as one symmetric fact.
 *
 * One row, read in two directions: `slots` clubs go up and `slots` clubs come down. A single count
 * governing both is what guarantees a division never changes size, which two independent counts
 * would silently break. Both endpoints always have rows in this save, which is what closes the
 * world at the edge of the chosen scope — the lowest loaded division never relegates anyone out of
 * the world, and the highest never promotes anyone out of it.
 */
export const competitionLinks = sqliteTable(
  "competition_links",
  {
    higherCompetitionId: text("higher_competition_id")
      .notNull()
      .references(() => competitions.id),
    lowerCompetitionId: text("lower_competition_id")
      .notNull()
      .references(() => competitions.id),
    slots: integer("slots").notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.higherCompetitionId, table.lowerCompetitionId] }),
    check("competition_links_slots", sql`slots >= 1`),
  ],
);

/**
 * Which competitions' clubs enter a given cup.
 *
 * Its own table rather than a `kind` discriminator on `competition_links`, because an entry edge
 * has no slot count: merging them would leave `slots` meaningless for half the rows, which is the
 * shape that invites a query to forget the discriminator. A continental tournament is a cup here —
 * the relation cares only that the competition owns no clubs and draws its field from elsewhere.
 */
export const competitionEntrants = sqliteTable(
  "competition_entrants",
  {
    cupCompetitionId: text("cup_competition_id")
      .notNull()
      .references(() => competitions.id),
    sourceCompetitionId: text("source_competition_id")
      .notNull()
      .references(() => competitions.id),
  },
  (table) => [primaryKey({ columns: [table.cupCompetitionId, table.sourceCompetitionId] })],
);

/**
 * A club: an identifier plus attributes, and no name.
 *
 * There is no `name` column. A club's display name is the content pack's, resolved on read in the
 * main process, so the same generated world can run under fictional, licensed, or localized names;
 * a name written into the row at generation time is a name that save could never be re-read under a
 * different pack.
 *
 * There is no competition column either. A club's membership is its participant row for the current
 * season, and its generated home is that row for season 1 — exactly and permanently. A copy here
 * would be a second home for one fact, drifting at the rollover, which is the only moment
 * membership changes. Note that a club's *id* names the competition it was generated in and keeps
 * naming it after promotion: an id is an identity, not a description.
 *
 * No column here is Simulation Depth-conditional. Depth's whole footprint on disk is the presence
 * or absence of the rows that hang *beneath* a club — squads, contracts, fitness, tactics — so a
 * `results-only` club still has a hometown and a ground.
 */
export const clubs = sqliteTable(
  "clubs",
  {
    /** Canonical id, minted from the club's competition and its ordinal within it
     *  (`club_eng_1_07`), by `canonicalClubId` in `packages/shared`. */
    id: text("id").primaryKey(),
    statureTier: text("stature_tier").notNull(),
    isUserClub: integer("is_user_club").notNull().default(0),
    /** The child seed this club was generated from. Kept per-row so a single club can be
     *  regenerated in place without replaying the whole world (see `generationManifest`). */
    generationSeed: integer("generation_seed").notNull(),
    /** The club's home town. Two clubs may share one — no constraint forbids it, because two clubs
     *  in one large city is what real football looks like rather than a defect. */
    cityId: text("city_id")
      .notNull()
      .references(() => cities.id),
    /** The ground, generated. There is no stadium entity: a table would buy ground-sharing and a
     *  city parent distinct from the club's own, and nothing in MVP reads either. It stays cheap to
     *  add later precisely because nothing joins to it yet. */
    stadiumName: text("stadium_name").notNull(),
    /** Display only in MVP — no system reads it as a constraint on anything. */
    stadiumCapacity: integer("stadium_capacity").notNull(),
  },
  () => [
    check("clubs_stature_tier", oneOf("stature_tier", ["big", "mid", "small"])),
    check("clubs_is_user_club", sql`is_user_club IN (0,1)`),
    check("clubs_generation_seed_range", sql.raw(`generation_seed ${SEED_RANGE}`)),
  ],
);

export const players = sqliteTable(
  "players",
  {
    id: text("id").primaryKey(),
    clubId: text("club_id").references(() => clubs.id),
    firstName: text("first_name").notNull(),
    lastName: text("last_name").notNull(),
    dateOfBirth: text("date_of_birth").notNull(),
    potentialAbility: integer("potential_ability").notNull(),

    passing: attribute("passing"),
    shooting: attribute("shooting"),
    tackling: attribute("tackling"),
    dribbling: attribute("dribbling"),
    heading: attribute("heading"),
    crossing: attribute("crossing"),
    finishing: attribute("finishing"),
    firstTouch: attribute("first_touch"),

    positioning: attribute("positioning"),
    decisions: attribute("decisions"),
    composure: attribute("composure"),
    determination: attribute("determination"),
    teamwork: attribute("teamwork"),
    flair: attribute("flair"),
    bravery: attribute("bravery"),
    aggression: attribute("aggression"),

    pace: attribute("pace"),
    acceleration: attribute("acceleration"),
    stamina: attribute("stamina"),
    strength: attribute("strength"),
    agility: attribute("agility"),
    naturalFitness: attribute("natural_fitness"),
    injuryProneness: attribute("injury_proneness"),

    /** Goalkeeping Attributes are absent (NULL), not zero, for an outfield player. */
    gkHandling: integer("gk_handling"),
    gkReflexes: integer("gk_reflexes"),
    gkAerialReach: integer("gk_aerial_reach"),
    gkCommandOfArea: integer("gk_command_of_area"),
    gkKicking: integer("gk_kicking"),

    /** Provenance: the squad slot this player fills and the child seed that produced them. */
    squadSlot: integer("squad_slot").notNull(),
    generationSeed: integer("generation_seed").notNull(),
  },
  () => [
    check("players_potential_ability", sql`potential_ability BETWEEN 1 AND 100`),
    ...[
      "passing", "shooting", "tackling", "dribbling", "heading", "crossing", "finishing",
      "first_touch", "positioning", "decisions", "composure", "determination", "teamwork",
      "flair", "bravery", "aggression", "pace", "acceleration", "stamina", "strength",
      "agility", "natural_fitness", "injury_proneness",
    ].map((column) => check(`players_${column}`, sql.raw(`${column} BETWEEN 1 AND 20`))),
    ...["gk_handling", "gk_reflexes", "gk_aerial_reach", "gk_command_of_area", "gk_kicking"].map(
      (column) => check(`players_${column}`, sql.raw(`${column} IS NULL OR ${column} BETWEEN 1 AND 20`)),
    ),
    check("players_squad_slot", sql`squad_slot >= 0`),
    check("players_generation_seed_range", sql.raw(`generation_seed ${SEED_RANGE}`)),
  ],
);

export const playerPositions = sqliteTable(
  "player_positions",
  {
    playerId: text("player_id")
      .notNull()
      .references(() => players.id),
    position: text("position").notNull(),
    familiarity: text("familiarity").notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.playerId, table.position] }),
    check("player_positions_position", oneOf("position", POSITIONS)),
    check("player_positions_familiarity", oneOf("familiarity", FAMILIARITIES)),
  ],
);

export const tactics = sqliteTable(
  "tactics",
  {
    clubId: text("club_id")
      .primaryKey()
      .references(() => clubs.id),
    formation: text("formation").notNull(),
    mentality: text("mentality").notNull(),
    tempo: text("tempo").notNull(),
    pressing: text("pressing").notNull(),
  },
  () => [
    check("tactics_formation", oneOf("formation", ["4-4-2", "4-3-3", "4-5-1", "3-5-2", "5-3-2"])),
    check("tactics_mentality", oneOf("mentality", ["defensive", "balanced", "attacking"])),
    check("tactics_tempo", oneOf("tempo", ["slow", "normal", "fast"])),
    check("tactics_pressing", oneOf("pressing", ["low", "medium", "high"])),
  ],
);

export const tacticSlots = sqliteTable(
  "tactic_slots",
  {
    clubId: text("club_id")
      .notNull()
      .references(() => tactics.clubId),
    slotIndex: integer("slot_index").notNull(),
    position: text("position").notNull(),
    role: text("role").notNull(),
    playerId: text("player_id")
      .notNull()
      .references(() => players.id),
  },
  (table) => [
    primaryKey({ columns: [table.clubId, table.slotIndex] }),
    check("tactic_slots_position", oneOf("position", POSITIONS)),
  ],
);

/** Generic append-only event log (ADR-0007 domain-bounded streams: `stream_type` e.g.
 * "match"/"season", `stream_id` the Fixture/save id) — Deciders append here and read models are
 * projected from it. */
export const events = sqliteTable(
  "events",
  {
    streamType: text("stream_type").notNull(),
    streamId: text("stream_id").notNull(),
    seq: integer("seq").notNull(),
    tag: text("tag").notNull(),
    payload: text("payload").notNull(),
    createdAt: text("created_at")
      .notNull()
      .default(sql`(datetime('now'))`),
  },
  (table) => [primaryKey({ columns: [table.streamType, table.streamId, table.seq] })],
);

/** Season/Calendar Decider's read model (ticket 15) — a single row per Season, projected from the
 * "season" event stream (streamId = save id, ADR-0007). `current_matchday` is the last Matchday
 * whose Fixtures have been resolved (0 before Matchday 1). */
export const season = sqliteTable(
  "season",
  {
    seasonNumber: integer("season_number").primaryKey(),
    currentMatchday: integer("current_matchday").notNull().default(0),
    phase: text("phase").notNull(),
  },
  () => [
    check("season_current_matchday", sql`current_matchday BETWEEN 0 AND 38`),
    check(
      "season_phase",
      oneOf("phase", ["pre_season", "in_season", "mid_window_open", "season_complete"]),
    ),
  ],
);

/** The Season's full fixture list, generated once at Season start (double round-robin, ticket 15)
 * and filled in as `AdvanceCalendar` resolves each Matchday. Not a Decider — projected from
 * Match/Season stream events, per ADR-0007 ("League Table is a projection"). */
export const fixtures = sqliteTable(
  "fixtures",
  {
    id: text("id").primaryKey(),
    seasonNumber: integer("season_number")
      .notNull()
      .references(() => season.seasonNumber),
    matchday: integer("matchday").notNull(),
    homeClubId: text("home_club_id")
      .notNull()
      .references(() => clubs.id),
    awayClubId: text("away_club_id")
      .notNull()
      .references(() => clubs.id),
    homeGoals: integer("home_goals"),
    awayGoals: integer("away_goals"),
    played: integer("played").notNull().default(0),
  },
  () => [
    check("fixtures_matchday", sql`matchday BETWEEN 1 AND 38`),
    check("fixtures_played", sql`played IN (0,1)`),
  ],
);

/** Board Objective (ticket 18 / ADR-0006) — one row per Season for the player's club only (AI
 * clubs are never judged). The band is set at Season start from the fixed Stature Tier -> band
 * table in `@cm-clone/shared`; `final_position`/`verdict` stay NULL until `SeasonConcluded`
 * triggers `BoardObjectiveJudged`. */
export const boardObjective = sqliteTable(
  "board_objective",
  {
    seasonNumber: integer("season_number")
      .primaryKey()
      .references(() => season.seasonNumber),
    clubId: text("club_id")
      .notNull()
      .references(() => clubs.id),
    minPosition: integer("min_position").notNull(),
    maxPosition: integer("max_position").notNull(),
    finalPosition: integer("final_position"),
    verdict: text("verdict"),
  },
  () => [
    check(
      "board_objective_verdict",
      sql`verdict IS NULL OR verdict IN ('exceeded','met','missed')`,
    ),
  ],
);

/** Manager Status (ticket 18 / ADR-0006) — a single row scoped to the save (mirrors `season`),
 * projected from the "season" stream's `ManagerWarned`/`ManagerSacked`/`ManagerRetired` events.
 * The Consecutive-Miss Counter persists across the whole save (not per-Season) so it survives a
 * Season rollover once one exists; `archived_cause` is checked by every mutating command to
 * enforce the read-only archive, and its two values are the two causes of an Archived Save.
 *
 * The table name is a technical artifact, not a domain term: it tracks manager *outcome* state
 * (`ManagerOutcome`), never manager identity, which lives in `manager_profile`. "Manager Status"
 * is retired as player-facing vocabulary — the screen is called Manager Profile. */
export const managerStatus = sqliteTable(
  "manager_status",
  {
    id: integer("id").primaryKey(),
    consecutiveMisses: integer("consecutive_misses").notNull().default(0),
    archivedCause: text("archived_cause"),
    lastOutcome: text("last_outcome").notNull().default("none"),
  },
  () => [
    check("manager_status_single_row", sql`id = 1`),
    check(
      "manager_status_archived_cause",
      sql`archived_cause IS NULL OR archived_cause IN ('sacked','retired')`,
    ),
    check("manager_status_last_outcome", oneOf("last_outcome", ["none", "warned", "sacked"])),
  ],
);

/** Transfer/Wage economy read model (ticket 16 / ADR-0005) — one row per club, seeded at Season
 * start from the club's fixed Stature Tier. `transfer_budget_remaining` spends down within a
 * Season with no replenishment between the two Transfer Windows; `wage_budget` is a running cap
 * checked against the sum of `contracts.wage` for that club, not itself spent down. */
export const clubBudgets = sqliteTable("club_budgets", {
  clubId: text("club_id")
    .primaryKey()
    .references(() => clubs.id),
  seasonNumber: integer("season_number").notNull(),
  transferBudgetRemaining: integer("transfer_budget_remaining").notNull(),
  wageBudget: integer("wage_budget").notNull(),
});

/** Per-player, per-Season fitness ledger (ticket 10) — one row per player, seeded at 100 at Season
 * start. `resolveMatchday` writes each on-pitch player's full-time Condition back here and records
 * the most recent injury's Severity; the Condition then recovers toward 100% between Fixtures
 * keyed to Natural Fitness and `last_injury_severity` (a knock recovers faster than a severe).
 * Feeds a not-fully-recovered player's `startingCondition` at kickoff and the squad view's
 * Condition. */
export const playerFitness = sqliteTable(
  "player_fitness",
  {
    playerId: text("player_id")
      .primaryKey()
      .references(() => players.id),
    seasonNumber: integer("season_number")
      .notNull()
      .references(() => season.seasonNumber),
    condition: integer("condition").notNull().default(100),
    lastInjurySeverity: text("last_injury_severity").notNull().default("none"),
  },
  () => [
    check("player_fitness_condition", sql`condition BETWEEN 0 AND 100`),
    check(
      "player_fitness_last_injury_severity",
      oneOf("last_injury_severity", ["none", "light", "medium", "severe"]),
    ),
  ],
);

/** A player's active Contract (ticket 16 / ADR-0005) — 1-5 years, formula-derived wage, no
 * negotiation UI. A player with no row here (and `players.club_id IS NULL`) is a Free Agent,
 * signable for Credits 0 via the normal signing flow. `years_remaining` is allowed to reach 0
 * transiently mid-expiry-sweep (`transfers.ts`'s `expireContractsForSeason` decrements every row
 * before deleting the ones that hit 0) — every row a Sign/Renew command writes is still 1-5. */
export const contracts = sqliteTable(
  "contracts",
  {
    playerId: text("player_id")
      .primaryKey()
      .references(() => players.id),
    wage: integer("wage").notNull(),
    yearsRemaining: integer("years_remaining").notNull(),
    signedSeason: integer("signed_season").notNull(),
  },
  () => [
    check("contracts_wage", sql`wage >= 0`),
    check("contracts_years_remaining", sql`years_remaining BETWEEN 0 AND 5`),
  ],
);

/** Per-player Training Focus (spec: `.scratch/training/spec.md`) — the one Category a manager is
 * concentrating on, or `NULL` for the no-focus default. A missing row also reads as no-focus (no
 * migration/backfill for existing or freshly generated players); a row is written only when a
 * manager sets a focus. AI clubs' players never have a focus row. */
export const trainingFocus = sqliteTable(
  "training_focus",
  {
    playerId: text("player_id")
      .primaryKey()
      .references(() => players.id),
    focus: text("focus"),
  },
  () => [
    check(
      "training_focus_focus",
      sql`focus IS NULL OR focus IN ('technical','mental','physical','goalkeeping')`,
    ),
  ],
);

/** In-flight Bid state (ticket 16 / ADR-0005) — any player is biddable regardless of a Listed
 * flag (not modeled, per ticket 05). Single-round: the selling club accepts/rejects/counters
 * exactly once (`countered`), then the bidding club accepts/withdraws. */
export const bids = sqliteTable(
  "bids",
  {
    id: text("id").primaryKey(),
    playerId: text("player_id")
      .notNull()
      .references(() => players.id),
    sellingClubId: text("selling_club_id")
      .notNull()
      .references(() => clubs.id),
    biddingClubId: text("bidding_club_id")
      .notNull()
      .references(() => clubs.id),
    amount: integer("amount").notNull(),
    counterAmount: integer("counter_amount"),
    status: text("status").notNull(),
    seasonNumber: integer("season_number").notNull(),
    createdAt: text("created_at")
      .notNull()
      .default(sql`(datetime('now'))`),
  },
  () => [
    check("bids_amount", sql`amount >= 0`),
    check(
      "bids_status",
      oneOf("status", ["pending", "countered", "accepted", "rejected", "withdrawn"]),
    ),
  ],
);

/**
 * The News Inbox's only writable state.
 *
 * A news message is a projection over the `events` log (see `newsProjection.ts` in
 * `@cm-clone/shared`), so the message itself is never stored — storing it would give one fact two
 * sources that can disagree. What the log cannot answer is whether the manager has read, archived,
 * or flagged a message, and that is user state rather than simulation state.
 *
 * The primary key is the event's own coordinates, which is what makes a row here unable to name a
 * message that does not exist. The table is empty in a fresh save and gains a row only when the
 * manager first acts on a message, so an inbox that is only ever read costs nothing on disk.
 */
export const newsMessageState = sqliteTable(
  "news_message_state",
  {
    streamType: text("stream_type").notNull(),
    streamId: text("stream_id").notNull(),
    seq: integer("seq").notNull(),
    read: integer("read").notNull().default(0),
    archived: integer("archived").notNull().default(0),
    flagged: integer("flagged").notNull().default(0),
    updatedAt: text("updated_at")
      .notNull()
      .default(sql`(datetime('now'))`),
  },
  (table) => [
    primaryKey({ columns: [table.streamType, table.streamId, table.seq] }),
    check("news_message_state_read", sql`read IN (0,1)`),
    check("news_message_state_archived", sql`archived IN (0,1)`),
    check("news_message_state_flagged", sql`flagged IN (0,1)`),
  ],
);
