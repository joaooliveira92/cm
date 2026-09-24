import { configDefaults, defineConfig } from "vitest/config";

const setupFiles = ["./test/setup/nwsapi-recursion-guard.ts"];

// The motion guard touches `window` at import, so it belongs to the renderer project only.
const rendererSetupFiles = [...setupFiles, "./test/setup/animation-cancel-guard.ts"];

/**
 * The renderer/main environment split lives here, not in 100-odd per-file
 * environment pragmas. A renderer test gets a DOM because of where it sits on
 * disk; a main-process test does not.
 *
 * Vitest 4 inline projects do NOT inherit the root `test` block --
 * `resolveProjects` passes `configFile: false` unless a project sets `extends`.
 * So every project-level option (`include`, `setupFiles`, `environment`) is
 * restated in each project below. The options that are root-only by type
 * (`reporters`, `passWithNoTests`, and the rest of vitest's
 * `NonProjectOptions`) stay at the root and must not be moved into a project.
 *
 * The node project takes everything the renderer project does not, rather than
 * listing the directories it wants. Two allowlists plus `passWithNoTests` would
 * mean a new `test/<dir>/` belonged to no project and was collected by nobody,
 * with no error -- which is the same silent-non-execution failure this split
 * exists to remove. Setting `exclude` replaces vitest's defaults, so they are
 * spread back in; dropping them would pull `node_modules` into collection.
 */
export default defineConfig({
  test: {
    passWithNoTests: true,
    reporters: [process.env.VERBOSE ? "verbose" : "dot"],
    projects: [
      {
        test: {
          name: "renderer",
          environment: "happy-dom",
          include: ["test/renderer/**/*.test.{ts,tsx}"],
          setupFiles: rendererSetupFiles,
          pool: "forks",
          maxWorkers: process.env.CI ? 4 : undefined,
        },
      },
      {
        test: {
          name: "node",
          environment: "node",
          include: ["test/**/*.test.{ts,tsx}"],
          exclude: [...configDefaults.exclude, "test/renderer/**"],
          setupFiles,
        },
      },
    ],
  },
});
