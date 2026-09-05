import { describe, expect, it } from "vitest";
import { MIGRATION_STATEMENTS } from "../../../src/main/db/migrations.generated.js";

// Drift between this generated DDL and `db/schema.ts` is checked by the `verify-db-schema` gate,
// not here: regenerating shells out to drizzle-kit, which is too heavy for a test worker.

describe("generated DDL", () => {
  it("creates every table the main process reads", () => {
    const created = MIGRATION_STATEMENTS.flatMap((statement) => {
      const match = /CREATE TABLE `([a-z_]+)`/.exec(statement);
      return match ? [match[1]] : [];
    });
    expect(created).toEqual(
      expect.arrayContaining([
        "save_meta",
        "generation_manifest",
        "manager_profile",
        "nations",
        "cities",
        "competitions",
        "competition_links",
        "competition_entrants",
        "competition_participants",
        "staff",
        "clubs",
        "players",
        "player_positions",
        "tactics",
        "tactic_slots",
        "events",
        "season",
        "fixtures",
        "board_objective",
        "manager_status",
        "club_budgets",
        "player_fitness",
        "contracts",
        "training_focus",
        "bids",
        "scouting_assignments",
        "scouting_progress",
      ]),
    );
  });

  it("keeps the domain CHECK constraints that SQLite is the last line of defence for", () => {
    const ddl = MIGRATION_STATEMENTS.join("\n");
    // Each of these encodes an invariant no query-side type restates.
    expect(ddl).toContain("tactical_acumen + influence + regimen + technical_coaching = 12");
    expect(ddl).toContain("potential_ability BETWEEN 1 AND 100");
    expect(ddl).toContain("passing BETWEEN 1 AND 20");
    expect(ddl).toContain("gk_handling IS NULL OR gk_handling BETWEEN 1 AND 20");
    expect(ddl).toContain("generation_seed BETWEEN 0 AND 4294967295");
    expect(ddl).toContain("condition BETWEEN 0 AND 100");
    expect(ddl).toContain(
      "CONSTRAINT \"cities_population_band\" CHECK(population_band IN ('major','large','mid','small'))",
    );
    expect(ddl).toContain(
      "CONSTRAINT \"competitions_depth\" CHECK(depth IN ('full','standard','results-only'))",
    );
    expect(ddl).toContain(
      "CONSTRAINT \"competitions_kind\" CHECK(kind IN ('league','cup','reserve','continental'))",
    );
    // Symmetry is the load-bearing property: one count read in two directions, so no rollover can
    // change a division's size. A zero-slot link would be a link that exchanges nothing.
    expect(ddl).toContain("CONSTRAINT \"competition_links_slots\" CHECK(slots >= 1)");
  });

  it("keeps the world catalogue thin — a nations row is its id and nothing else", () => {
    const ddl = MIGRATION_STATEMENTS.join("\n");
    // `nations` is a referent (player nationality may name a nation the selection never
    // activated), so it is one canonical id per member of `NATION_CODES` and nothing else: no
    // activation flag, no mirrored factual column, no Nation Profile prior, no generation seed.
    // This extracts the table's own block so `generation_seed` in other tables cannot mask one
    // here.
    const block = (table: string) => {
      const start = ddl.indexOf(`CREATE TABLE \`${table}\``);
      expect(start, `${table} table missing`).toBeGreaterThanOrEqual(0);
      return ddl.slice(start, ddl.indexOf(");", start) + 2);
    };
    const nationsBlock = block("nations");
    expect(nationsBlock).toMatch(/`nations` \(\n\t`id` text PRIMARY KEY NOT NULL\n\);/);
    expect(nationsBlock).not.toContain("generation_seed");

    const citiesBlock = block("cities");
    // A city row is canonical id, nation reference, name, and population band — exactly that. The
    // full-shape match means a future latitude/longitude/population column or a generation seed
    // fails here rather than passing under a per-column existence check.
    expect(citiesBlock).toMatch(
      /`cities` \(\n\t`id` text PRIMARY KEY NOT NULL,\n\t`nation_id` text NOT NULL,\n\t`name` text NOT NULL,\n\t`population_band` text NOT NULL,\n\tFOREIGN KEY \(`nation_id`\) REFERENCES `nations`\(`id`\) ON UPDATE no action ON DELETE no action,\n\tCONSTRAINT "cities_population_band" CHECK\(population_band IN \('major','large','mid','small'\)\)\n\);/,
    );
  });

  it("constrains a staff member to a role and a legal quality", () => {
    const ddl = MIGRATION_STATEMENTS.join("\n");
    expect(ddl).toContain("CONSTRAINT \"staff_role\" CHECK(role IN ('coach','scout'))");
    expect(ddl).toContain("CONSTRAINT \"staff_quality\" CHECK(quality BETWEEN 1 AND 20)");

    const block = ddl.slice(
      ddl.indexOf("CREATE TABLE `staff`"),
      ddl.indexOf(");", ddl.indexOf("CREATE TABLE `staff`")) + 2,
    );
    // No wage, no contract, no hiring path: staff are a property of the club, not a market.
    expect(block).not.toContain("wage");
    expect(block).not.toContain("contract");
    // And no Simulation Depth branch — a row exists for a human-managed club, at any depth.
    expect(block).not.toContain("depth");
  });

  it("puts membership and the frozen standing on one row, with no header above it", () => {
    const ddl = MIGRATION_STATEMENTS.join("\n");

    // Keyed on all three, so a club has one membership per competition per season and the
    // rollover has nowhere to write a second answer.
    expect(ddl).toContain(
      "PRIMARY KEY(`competition_id`, `season_number`, `club_id`)",
    );
    // The standings are nullable because they are frozen at season end, not kept live.
    const block = ddl.slice(
      ddl.indexOf("CREATE TABLE `competition_participants`"),
      ddl.indexOf(");", ddl.indexOf("CREATE TABLE `competition_participants`")) + 2,
    );
    for (const column of ["final_position", "points", "goal_difference", "goals_for"]) {
      expect(block).toContain(`\`${column}\` integer`);
      expect(block).not.toContain(`\`${column}\` integer NOT NULL`);
    }

    // No header table above the rows: every column one would carry derives from the rows
    // themselves, and rows existing for a (competition, season) already says it ran.
    expect(ddl).not.toContain("CREATE TABLE `competition_seasons`");
    expect(ddl).not.toContain("winner_club_id");
  });

  it("makes a fixture competition-scoped, dated, and able to record a shootout", () => {
    const ddl = MIGRATION_STATEMENTS.join("\n");
    const block = ddl.slice(
      ddl.indexOf("CREATE TABLE `fixtures`"),
      ddl.indexOf(");", ddl.indexOf("CREATE TABLE `fixtures`")) + 2,
    );

    // An integer key: nothing outside the save names a fixture, so the canonical-id rule that
    // governs clubs and players does not reach it.
    expect(block).toContain("`id` integer PRIMARY KEY NOT NULL");
    expect(block).toContain("`competition_id` text NOT NULL");
    expect(block).toContain("`scheduled_date` text NOT NULL");
    // A round is competition-local and has no upper bound — 38 is a property of one 20-club
    // league, and a 24-club one runs 46.
    expect(block).toContain('CONSTRAINT "fixtures_round" CHECK(round >= 1)');
    expect(block).not.toContain("round BETWEEN");
    // Neither club id is nullable: a fixture exists only once both participants are known.
    expect(block).toContain("`home_club_id` text NOT NULL");
    expect(block).toContain("`away_club_id` text NOT NULL");
    expect(block).toContain('CONSTRAINT "fixtures_played" CHECK(played IN (0,1))');

    // The paired-penalty invariant is a constraint rather than a writer's promise: it is a
    // single-row, two-column shape, which is the only kind a CHECK can see. Both NULL means the
    // tie never went to a shootout, which is every league fixture.
    expect(block).toContain(
      'CONSTRAINT "fixtures_penalties_paired" CHECK((home_penalties IS NULL) = (away_penalties IS NULL))',
    );

    // Goals plus penalties determine a winner, so no column stores one, and a single-leg tie is a
    // fixture rather than an entity above one.
    expect(block).not.toContain("winner");
    expect(ddl).not.toContain("CREATE TABLE `cup_ties`");
  });

  it("gives a club a place and a ground, and no name", () => {
    const ddl = MIGRATION_STATEMENTS.join("\n");
    const clubsBlock = ddl.slice(
      ddl.indexOf("CREATE TABLE `clubs`"),
      ddl.indexOf(");", ddl.indexOf("CREATE TABLE `clubs`")) + 2,
    );

    // The name is gone: a club's display name is the content pack's, resolved on read, so a name
    // written into the row is a name that save could never be re-read under a different pack.
    expect(clubsBlock).not.toMatch(/\n\t`name` text/);
    // Membership has one home — participant rows — so no competition column here either.
    expect(clubsBlock).not.toContain("competition_id");
    // A hometown and a ground, both non-null at every Simulation Depth: Depth governs what hangs
    // *beneath* a club, never the club row.
    expect(clubsBlock).toContain("`city_id` text NOT NULL");
    expect(clubsBlock).toContain("`stadium_name` text NOT NULL");
    expect(clubsBlock).toContain("`stadium_capacity` integer NOT NULL");
    // Nothing forbids two clubs sharing a city, which is the point.
    expect(clubsBlock).not.toMatch(/UNIQUE.*city_id/);
    // And no stadium entity: the columns are the whole model.
    expect(ddl).not.toContain("CREATE TABLE `stadiums`");
  });

  it("generation_manifest records provenance without growing a foreign key (ticket 03)", () => {
    const ddl = MIGRATION_STATEMENTS.join("\n");
    const block = (table: string) => {
      const start = ddl.indexOf(`CREATE TABLE \`${table}\``);
      expect(start, `${table} table missing`).toBeGreaterThanOrEqual(0);
      return ddl.slice(start, ddl.indexOf(");", start) + 2);
    };
    const manifestBlock = block("generation_manifest");

    // The catalogue fingerprint, the content pack id/version, and the snapshot id join the seed
    // and versions, and the single-row + seed-range CHECKs survive untouched.
    expect(manifestBlock).toContain("`catalogue_fingerprint` text NOT NULL");
    expect(manifestBlock).toContain("`content_pack_id` text NOT NULL");
    expect(manifestBlock).toContain("`content_pack_version` text NOT NULL");
    expect(manifestBlock).toContain("`snapshot_id` text NOT NULL");
    expect(manifestBlock).toContain('CONSTRAINT "generation_manifest_single_row" CHECK(id = 1)');
    expect(manifestBlock).toContain(
      'CONSTRAINT "generation_manifest_world_seed_range" CHECK(world_seed BETWEEN 0 AND 4294967295)',
    );

    // `snapshot_id` is a diagnostic pointer, explicitly not a foreign key (the snapshot file is
    // machine-local and will not exist beside a copied save).
    expect(manifestBlock).not.toContain("FOREIGN KEY");
  });

  it("makes the scout the key of an assignment, so the slot cap cannot be violated", () => {
    const ddl = MIGRATION_STATEMENTS.join("\n");
    const table = /CREATE TABLE `scouting_assignments`[^;]+/.exec(ddl)?.[0] ?? "";

    // Keyed on the scout: at most one assignment each, so "already at cap" is not a state.
    expect(table).toMatch(/`scout_id` text PRIMARY KEY/);
    // And unique on the player: at most one scout on a player at a time.
    expect(ddl).toMatch(/CREATE UNIQUE INDEX `scouting_assignments_player_id_unique`/);
    // A scout's club is their staff row's. Duplicating it here would be a second source for it.
    expect(table).not.toMatch(/club_id/);
  });

  it("keys progress on the club and the player, bounded but not forced to exist", () => {
    const ddl = MIGRATION_STATEMENTS.join("\n");
    const table = /CREATE TABLE `scouting_progress`[^;]+/.exec(ddl)?.[0] ?? "";

    expect(table).toMatch(/PRIMARY KEY\(`club_id`, `player_id`\)/);
    expect(table).toMatch(/CHECK\(progress BETWEEN 0 AND 100\)/);
  });

  it("stores no fogged value anywhere — every range is derived from progress", () => {
    const ddl = MIGRATION_STATEMENTS.join("\n");
    // Attribute Range, narrowed bounds, and the fogged Transfer Value are pure functions of
    // progress and the true stored value. A column for any of them would be a third copy of
    // something already held twice, free to drift from both.
    for (const forbidden of [/`[a-z_]*range[a-z_]*`/, /`[a-z_]*fog[a-z_]*`/, /`[a-z_]*_low`/, /`[a-z_]*_high`/]) {
      expect(ddl).not.toMatch(forbidden);
    }
  });
});