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
  });
});
