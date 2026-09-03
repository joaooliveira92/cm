import { describe, expect, it } from "vitest";
import { MIGRATION_STATEMENTS } from "../src/main/db/migrations.generated.js";

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
});
