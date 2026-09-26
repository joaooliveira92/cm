import { defineConfig } from "drizzle-kit";

/**
 * Save files are created fresh per career rather than migrated in place, so drizzle-kit is used
 * here purely as a DDL generator: it turns `src/main/db/schema.ts` into SQL, which
 * `scripts/generate-migrations.ts` compiles into a TypeScript module the main process imports.
 * There is no database URL to point at — nothing connects at generate time.
 */
export default defineConfig({
  dialect: "sqlite",
  schema: "./src/main/db/schema.ts",
  out: "./drizzle",
});
