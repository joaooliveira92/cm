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
});
