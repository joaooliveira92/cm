import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { MIGRATION_STATEMENTS } from "../src/main/db/migrations.generated.js";

const appRoot = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const generatedFile = path.join(appRoot, "src", "main", "db", "migrations.generated.ts");

describe("generated DDL", () => {
  it("stays in step with the Drizzle schema", () => {
    // The checked-in DDL is a build artifact of `db/schema.ts`. If someone edits the schema and
    // forgets `pnpm db:generate`, saves are created with the *old* shape and the mismatch only
    // surfaces as a runtime SQL error deep in a career. Regenerating and diffing is the only
    // check that catches it at the seam.
    const before = readFileSync(generatedFile, "utf8");
    execFileSync("pnpm", ["db:generate"], { cwd: appRoot, stdio: "pipe" });
    const after = readFileSync(generatedFile, "utf8");
    expect(after).toBe(before);
  }, 60_000);

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
