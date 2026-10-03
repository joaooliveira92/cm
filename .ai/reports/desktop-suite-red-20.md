# Validation Report: desktop-suite-red 20

## Staleness check for e2e build

### The problem

`pnpm exec playwright test` and `npx playwright test` skip the build entirely
(`pretest:e2e` fires for the script name, not the binary), testing whatever was
last built. A mutation never compiled passes green.

### What shipped

1. `e2e/globalSetup.ts` — `assertBuildFresh` compares the newest mtime under
   `apps/desktop/src/` against the oldest under `apps/desktop/dist/`, and throws
   with a message naming `pnpm --filter @cm-clone/desktop test:e2e` when the
   sources are newer. Runs before any test, so a stale bundle costs milliseconds
   rather than a false green.
2. `playwright.config.ts` — docstring naming the staleness trap and the correct
   command, where a reader of the config will find it first.
3. `test/e2e-build-staleness.test.ts` — 6 cases covering both branches: passes
   when dist is newer, same age, or both empty; fails when sources are newer or
   dist does not exist.

### Validation

- `pnpm --filter @cm-clone/desktop test e2e-build-staleness` — 6/6 passed
- Typecheck — clean (pre-existing suggestions only)
- No lint/effect-lint/verify-md-links/verify-db-schema failure from this change
- Pre-existing test failures (match seed flakiness, training UI fixture) unchanged

### Commit

`5bf2a2fc` — `fix(e2e): staleness check fails when dist is older than src`