/**
 * Fails when the checked-in save DDL has drifted from the Drizzle schema that defines it.
 *
 * `apps/desktop/src/main/db/migrations.generated.ts` is a build artifact of
 * `apps/desktop/src/main/db/schema.ts`. If someone edits the schema and forgets `pnpm db:generate`,
 * saves are created with the *old* shape and the mismatch only surfaces as a runtime SQL error deep
 * in a career — so regenerate and diff.
 *
 * This is a gate rather than a vitest case on purpose: it shells out to drizzle-kit, which is far
 * too heavy to run inside a test worker (it starves the pool and times out unrelated SQLite tests).
 */
import { spawnSync } from "node:child_process"
import { readFileSync } from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

const repoRoot = path.join(path.dirname(fileURLToPath(import.meta.url)), "..")
const appRoot = path.join(repoRoot, "apps", "desktop")
const generated = path.join(appRoot, "src", "main", "db", "migrations.generated.ts")

const before = readFileSync(generated, "utf8")

const result = spawnSync("pnpm", ["run", "db:generate"], { cwd: appRoot, stdio: "pipe" })
if (result.status !== 0) {
  console.error("verify-db-schema: db:generate failed.")
  console.error(result.stderr?.toString() ?? "")
  process.exit(1)
}

const after = readFileSync(generated, "utf8")
if (after !== before) {
  console.error(
    "verify-db-schema: the generated DDL is out of date with db/schema.ts.\n" +
      "Run `pnpm --filter @cm-clone/desktop db:generate` and commit the result.",
  )
  process.exit(1)
}

console.log("verify-db-schema: generated DDL matches db/schema.ts.")
