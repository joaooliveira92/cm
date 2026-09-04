import { sql } from "drizzle-orm";
import { check, index, integer, primaryKey, sqliteTable, text } from "drizzle-orm/sqlite-core";

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
 *
 * ## Indexes
 *
 * The save carries **exactly two**, both measured against the scale probe rather than assumed:
 * `players(club_id)` and `fixtures(competition_id, season_number, played)`. Every other table is
 * unindexed, and each one says below why — a later reader should find a decision, not a gap. An
 * index is not free: it is written on every insert, and world generation writes hundreds of
 * thousands of rows.
 *
 * The probe measured a third, on `contracts(player_id)`. It does not ship: that column is already
 * the table's primary key, so SQLite's automatic index serves the same lookups and a second index
 * over the same column would be pure cost.
 *
 * ## Invariants upheld by a writer rather than by a constraint
 *
 * Every pairing invariant in this schema is assigned explicitly to one or the other, and the two
 * below are the writers' — not because a `CHECK` was passed over, but because neither is a
 * statement about the shape of a single row, which is the only thing a `CHECK` can see:
 *
 * - **A club never plays twice on one date.** Cross-row, and a unique index on either club column
 *  misses a club playing home in a league fixture and away in a cup tie on the same day. Upheld by
 *  the slot template — cups reserve their dates before leagues draw theirs — and covered by a test.
 * - **A scouting-progress row is never written at 0.** Absence means Unscouted, so this is a rule
 *  about which rows exist rather than about what a row contains; `CHECK progress BETWEEN 0 AND 100`
 *  admits the zero row a sparse table must never hold. Upheld by `scouting.ts`, covered by a test.
 *
 * The third pairing invariant — a fixture's two penalty columns are NULL together or set together —
 * belongs with the constraints, not with these. It is a single-row, two-column shape, which is
 * exactly what a `CHECK` expresses, and the shootout writer sets both columns in one statement, so
 * no legitimate write path is refused by it. See `fixtures` below.
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

/** No index: point lookups on its primary key. */
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
 *
 * No index: a single row.
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
 * `archetype_origin` records which preset or Custom was chosen.
 *
 * No index: a single row.
 */
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
 *
 * No index: a few hundred rows, read by id or wholesale.
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
 *
 * No index: a few hundred rows, read by id or wholesale.
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
 *
 * No index: tens of rows, read by id or wholesale.
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
 *
 * No index: read wholesale, once per rollover.
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
 *
 * No index: read wholesale, once per cup draw.
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
/**
 * One club's participation in one competition in one season — the only record of membership, and
 * the frozen final standing once the season ends.
 *
 * A club's **current** competition is its row for the current season; its **generated home** is its
 * row for season 1. Neither is a column on `clubs`, so promotion — the one moment membership
 * changes — cannot leave two answers on disk disagreeing with each other.
 *
 * There is deliberately **no `competition_seasons` header** above these rows. Every column such a
 * header would carry — the champion, a concluded flag, the participant list — derives from the rows
 * themselves, and the existence of rows for a `(competition, season)` already records that the
 * competition ran that season. A header whose every column is a derivation of its children is a
 * second source for facts that already have one. For the same reason there is no `winner_club_id`
 * anywhere: a champion is the participant whose `final_position` is 1.
 *
 * The four standings columns are NULL while a season runs and are frozen at `SeasonConcluded`.
 * Freezing them is what makes last season's table survive into this one: the League Table is
 * recomputed from resolved fixtures, and the next season's fixtures overwrite its inputs, so a
 * position that is only derivable-in-principle is a position that is gone.
 *
 * No index: the key's (competition, season) prefix serves every read.
 */
export const competitionParticipants = sqliteTable(
  "competition_participants",
  {
    competitionId: text("competition_id")
      .notNull()
      .references(() => competitions.id),
    seasonNumber: integer("season_number").notNull(),
    clubId: text("club_id")
      .notNull()
      .references(() => clubs.id),
    /** 1 = champion. NULL until the season concludes. */
    finalPosition: integer("final_position"),
    points: integer("points"),
    goalDifference: integer("goal_difference"),
    goalsFor: integer("goals_for"),
  },
  (table) => [
    primaryKey({
      columns: [table.competitionId, table.seasonNumber, table.clubId],
    }),
    check("competition_participants_season_number", sql`season_number >= 1`),
    check(
      "competition_participants_final_position",
      sql`final_position IS NULL OR final_position >= 1`,
    ),
  ],
);

/**
 * The human club's backroom — one coach and N scouts, and nothing else.
 *
 * **A row exists only for a club that is or has been human-managed**, at any Simulation Depth. AI
 * clubs have none, and the reason is not row cost (a handful per club is noise against 400k
 * players) but that neither binding reads one: AI clubs never scout, and AI players develop
 * unmodified. There is no depth branch anywhere in the staff model.
 *
 * Written by `commitCareer`, never by world generation, so staff cost generation nothing. The rows
 * are a deterministic function of the world seed and the club's canonical id, so taking the same
 * club at two points in one career yields identical rows; leaving the club deletes them, and
 * retaking it derives the same people again.
 *
 * One generic `quality` column rather than the reference material's coaching specialisms: one
 * binding per role means one number, and specialism columns would be dead. `name` is stored
 * directly and is not the identifier — the players' treatment, not the clubs' — because the
 * canonical-id rule exists for licensing and staff are generated fiction.
 *
 * No wage, no contract, no candidate pool: `Contract` and `Wage Budget` stay player-to-club
 * concepts, and a hiring market would reopen both bindings.
 *
 * No index: read by club, and a club's backroom is single digits.
 */
export const staff = sqliteTable(
  "staff",
  {
    id: text("id").primaryKey(),
    clubId: text("club_id")
      .notNull()
      .references(() => clubs.id),
    role: text("role").notNull(),
    /** Static, on the 1-20 player attribute scale. No staff development and no ageing curve: a
     *  second development curve buys nothing when the value it moves is read by one formula. */
    quality: integer("quality").notNull(),
    name: text("name").notNull(),
  },
  () => [
    check("staff_role", oneOf("role", ["coach", "scout"])),
    check("staff_quality", sql`quality BETWEEN 1 AND 20`),
  ],
);

/** No index: point lookups on the primary key, or the whole (small) set. */
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
    /**
     * The player's single nationality.
     *
     * **Exactly one**, and no `player_nationalities` table. Dual nationality is real football, but
     * nothing in MVP reads a second one: work permits do not exist, national teams are not in
     * scope, and `MIGRATION_LINKS` drives *where a player is drawn from* rather than eligibility —
     * so a second column would be stored data with no reader.
     *
     * **Reintroduction condition**, stated so it is not rediscovered by argument: the moment work
     * permits or national teams ship, this reopens. The migration is purely additive — a second
     * nullable column or a join table beside this one — and existing saves are backfillable,
     * because generation is reproducible from the world seed.
     */
    nationality: text("nationality")
      .notNull()
      .references(() => nations.id),
    /** Where the player was born. NULL means "born outside the loaded world" — reachable only for a
     *  catalogue nation whose geography has not been curated, since `cities` is unconditional. No
     *  free-text city name: that would be a display name used as data. */
    birthCityId: text("birth_city_id").references(() => cities.id),
    squadSlot: integer("squad_slot").notNull(),
    generationSeed: integer("generation_seed").notNull(),
  },
  (table) => [
    /**
     * The save's first index, and one of only two. Measured rather than assumed: opening a squad
     * goes from 127 ms to 0.9 ms at 400,000 players — faster than the same query on an unindexed
     * 20,000-player save, because the scan it replaces is proportional to the whole world rather
     * than to the eighteen rows it wants. See `db/prototype-scale-probe/RESULTS.md`.
     */
    index("players_club_id_idx").on(table.clubId),
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

/** No index: read by the player_id prefix of its own key. */
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

/** No index: a point lookup on the club. */
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

/** No index: read by the club prefix of its own key. */
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
 * projected from it.
 *
 * No index: the three-column primary key already serves both access paths the code has.
 */
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

/**
 * The save's position in time — one row, projected from the "season" event stream.
 *
 * `game_date` is where the calendar stands: every fixture in the world dated on or before it has
 * been resolved. It replaces the retired `current_matchday`, which counted a round number that only
 * identified a moment while the world held exactly one 38-round league. Round 12 of a league and
 * round 3 of a cup are not the same instant, and nothing ordered them against each other.
 *
 * The column is **not** named `current_date`, which is what the decision record proposed, because
 * `CURRENT_DATE` is a SQLite keyword: `SELECT current_date FROM season` returns the machine's wall
 * clock rather than the column, silently and without an error. Every query in this repo is raw SQL,
 * so one unquoted read anywhere would hand the simulation the real-world date — the precise failure
 * `generation_manifest.generated_at` is fenced off to prevent. `game_date` is the word the project
 * already uses for an in-world date on a row, so the vocabulary is unchanged and only the hazard is
 * gone.
 *
 * One row per season, not the per-save singleton this table was first described as. Three tables key
 * onto `season_number` — `fixtures`, `board_objective`, and `player_fitness` — so a singleton whose
 * number advanced at the rollover could only work by deleting every child row of the season just
 * finished. Keeping any history at all therefore requires a row per season; what is *worth* keeping
 * is a retention question ticket 18 owns, and this shape leaves that decision open rather than
 * making it by deletion.
 *
 * Readers still want one row: the current season is the highest `season_number`. Per-competition
 * progress — "this cup has reached round 4", "this league has concluded" — is derived from that
 * competition's own fixture rows and is stored nowhere.
 *
 * No index: one row per season, and a career holds a handful.
 */
export const season = sqliteTable(
  "season",
  {
    seasonNumber: integer("season_number").primaryKey(),
    /** ISO `YYYY-MM-DD`. No upper bound to check: a date is not a count of rounds. */
    gameDate: text("game_date").notNull(),
    phase: text("phase").notNull(),
  },
  () => [
    check(
      "season_phase",
      oneOf("phase", ["pre_season", "in_season", "mid_window_open", "season_complete"]),
    ),
  ],
);

/**
 * Every fixture in the world, league and cup alike.
 *
 * A fixture is competition-scoped and dated. `scheduled_date` orders it against every other fixture
 * anywhere — it is what the calendar advance sweeps — while `round` is a label local to its own
 * competition and means nothing across competitions: round 3 of a cup and round 3 of a league are
 * unrelated. Round is stored rather than derived from date ordering because a knockout round is a
 * bracket depth that ordering cannot reconstruct, and because a league table wants "played 12 of 38"
 * without counting rows. Its `CHECK` has no upper bound: 38 is a property of one 20-club league, not
 * of the schema.
 *
 * One table serves both kinds. There is no `cup_ties` table — under single-leg ties a tie *is* a
 * fixture, so a tie table would hold one row per fixture row — and no `winner_club_id`, because
 * goals plus penalties already determine a winner and a column would give that fact a second source
 * that can disagree.
 *
 * `home_penalties` and `away_penalties` are **NULL together or set together**: NULL in both means
 * the tie did not go to a shootout, which is every league fixture and most cup ties. That pairing is
 * a `CHECK` rather than a writer's promise — see the module docstring for why it lands on this side
 * of that line, and the other two invariants that do not.
 *
 * The primary key is an integer. A canonical composite id would cost roughly 60 bytes across the
 * ~300k rows a 16,000-club world generates each season and would restate four columns that are
 * already columns; the canonical-id rule governs entities a content pack names, and nothing outside
 * the save ever names a fixture. Generation order is deterministic, so integer ids reproduce, and no
 * seed keys on a fixture id — the draw and match seeds hash canonical ids — which is the only thing
 * that would have made a stable fixture id load-bearing.
 */
export const fixtures = sqliteTable(
  "fixtures",
  {
    id: integer("id").primaryKey(),
    seasonNumber: integer("season_number")
      .notNull()
      .references(() => season.seasonNumber),
    competitionId: text("competition_id")
      .notNull()
      .references(() => competitions.id),
    /** Competition-local, 1-based. No upper bound: a 24-club league runs 46 of these. */
    round: integer("round").notNull(),
    /** ISO `YYYY-MM-DD`, matching `players.date_of_birth`. Text sorts lexicographically, so the
     *  advance's `WHERE scheduled_date <= ?` sweep needs no conversion. */
    scheduledDate: text("scheduled_date").notNull(),
    homeClubId: text("home_club_id")
      .notNull()
      .references(() => clubs.id),
    awayClubId: text("away_club_id")
      .notNull()
      .references(() => clubs.id),
    homeGoals: integer("home_goals"),
    awayGoals: integer("away_goals"),
    homePenalties: integer("home_penalties"),
    awayPenalties: integer("away_penalties"),
    played: integer("played").notNull().default(0),
  },
  (table) => [
    /**
     * The save's second index. It only pays because the standings query names the competition it is
     * rendering: an unindexed scan cost 302 ms at 400,000 players precisely because it read every
     * played fixture in the save rather than one competition's. The predicate came first; this
     * makes it cheap.
     */
    index("fixtures_competition_season_played_idx").on(
      table.competitionId,
      table.seasonNumber,
      table.played,
    ),
    check("fixtures_round", sql`round >= 1`),
    check("fixtures_played", sql`played IN (0,1)`),
    check(
      "fixtures_penalties_paired",
      sql`(home_penalties IS NULL) = (away_penalties IS NULL)`,
    ),
  ],
);

/**
 * Board Objective — one row per Season for the player's club only, since AI clubs are never judged.
 *
 * The band is set at Season start from the fixed Stature Tier -> band table in `@cm-clone/shared`;
 * `final_position`/`verdict` stay NULL until `SeasonConcluded` triggers `BoardObjectiveJudged`.
 *
 * `competition_id` names **which competition the verdict was about**, rather than leaving it to be
 * inferred from there having once been only one. A save now holds several tables at once, and the
 * human's own division changes at a promotion, so "the league" is no longer a thing a reader can
 * resolve on its own. Its final position is read from the frozen participant row for this
 * competition and season rather than recomputed, so a verdict cannot disagree with the table it was
 * judged against.
 *
 * A cup run is unjudged: no objective row ever names a cup.
 *
 * No index: a point lookup on the season number, which is its key.
 */
export const boardObjective = sqliteTable(
  "board_objective",
  {
    seasonNumber: integer("season_number")
      .primaryKey()
      .references(() => season.seasonNumber),
    clubId: text("club_id")
      .notNull()
      .references(() => clubs.id),
    competitionId: text("competition_id").references(() => competitions.id),
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
 * is retired as player-facing vocabulary — the screen is called Manager Profile.
 *
 * No index: a single row.
 */
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
 * checked against the sum of `contracts.wage` for that club, not itself spent down.
 *
 * No index: a point lookup on the club, which is its key.
 */
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
 * Condition.
 *
 * No index: a point lookup on the player, which is its key.
 */
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
 * before deleting the ones that hit 0) — every row a Sign/Renew command writes is still 1-5.
 *
 * No index: player_id is the primary key, so the automatic index already serves it — which is why
 * the probe's third measured index does not ship.
 */
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
 * manager sets a focus. AI clubs' players never have a focus row.
 *
 * No index: a point lookup on the player.
 */
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
 * exactly once (`countered`), then the bidding club accepts/withdraws.
 *
 * No index: a save's open bids are tens of rows, read wholesale.
 */
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
      oneOf("status", ["pending", "countered", "accepted", "rejected", "withdrawn", "expired"]),
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
 *
 * No index: a point lookup on the message id.
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

/**
 * Which scout is watching which player. One row per active assignment.
 *
 * Keyed on the **scout**, so a scout has at most one assignment by the shape of the table rather
 * than by a rule code could violate. The club has exactly N scout rows, so the N-slot cap is the row
 * count of this table: "already at cap" and "duplicate assignment" are unreachable states rather
 * than errors anyone has to raise. `UNIQUE(player_id)` carries "at most one scout on a player at a
 * time", which is exactly right because scout rows exist only for the club the human manages.
 *
 * There is deliberately **no `club_id`**. A scout's club is `staff.club_id`; duplicating it here
 * would be the same column the competition graph already refused to put on `clubs`.
 *
 * No index: point lookups on the key, with the unique player constraint itself answering "is this
 * player already watched".
 */
export const scoutingAssignments = sqliteTable("scouting_assignments", {
  scoutId: text("scout_id")
    .primaryKey()
    .references(() => staff.id),
  playerId: text("player_id")
    .notNull()
    .unique()
    .references(() => players.id),
});

/**
 * What a club knows about a player, as a single 0-100 number.
 *
 * **Sparse: a row exists only for a player who has actually been scouted.** Absence means Unscouted,
 * so no code path ever writes a progress-0 row — that is a writer-upheld invariant, and it is one
 * because it is a rule about which rows *exist* rather than about what a row contains, which is
 * something no `CHECK` can say. `CHECK progress BETWEEN 0 AND 100` admits the very row the rule
 * forbids; see this module's header.
 *
 * A dense row per (club, scoutable player) was rejected on measured cost: ~180 MB of zeroes at
 * 400,000 players, to record a default that absence already expresses.
 *
 * Progress belongs to the **club**, not the manager. A career move starts the new club Unscouted on
 * everyone, and the old club's rows are deleted when the manager leaves — the observation was done
 * by that club's scouts, who do not follow anyone. Nothing here stores an Attribute Range, a
 * narrowed bound, or a fogged Transfer Value: all of those are pure functions of this number and the
 * true stored value.
 *
 * No index: read by the club prefix of its own key, or as a full-key point lookup.
 */
export const scoutingProgress = sqliteTable(
  "scouting_progress",
  {
    clubId: text("club_id")
      .notNull()
      .references(() => clubs.id),
    playerId: text("player_id")
      .notNull()
      .references(() => players.id),
    progress: integer("progress").notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.clubId, table.playerId] }),
    check("scouting_progress_range", sql`progress BETWEEN 0 AND 100`),
  ],
);
