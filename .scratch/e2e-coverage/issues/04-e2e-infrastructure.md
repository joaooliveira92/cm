Type: task
Status: resolved

## Work

Build the shared e2e infrastructure that both the smoke and journeys suites depend on:

1. **`apps/desktop/playwright.config.ts`** — apply the reliability contract: `retries: 2` (CI only,
   via `process.env.CI`), per-test `timeout: 30_000`, `workers: 1`, `fullyParallel: false`. Keep the
   existing `testDir: "e2e"` and `reporter: "list"`.
2. **Seed-save helper** (new module, e.g. `apps/desktop/e2e/seedSaves.ts`) — a generator that reuses
   the app's own in-process Effect layers (`createSave`, `advanceCalendar` from
   `../src/main/saves.js` / `../src/main/season.js`) to write a `.sqlite` into a target saves dir.
   Provide one function per seed scenario: `fresh`, `before-matchday`, `before-season-end`,
   `concluded`. Each writes the save and returns its saveId; set a fixed `save_meta.name`
   (e.g. "Seed: concluded") so a test selects it by name. Follow the pattern proven in the
   prototype at commit `99c5d2e` on branch `e2e-coverage/prototype-seed-save`
   (`apps/desktop/test/seed-save.prototype.test.ts`).
3. **Launch/app helper** — factor the `launchApp` + temp-`--user-data-dir` + `beforeEach/afterEach`
   setup currently duplicated in `apps/desktop/e2e/app.spec.ts` into a shared helper module so both
   suites reuse it without duplication.

Reference: canonical spec at `.scratch/e2e-coverage/spec.md` ("Seed-save helper" section). The
existing unit tests in `apps/desktop/test/*.test.ts` already drive `createSave`/`advanceCalendar`
in-process — mirror that.

Verify: `pnpm typecheck` and the seed helper's own unit test (add `apps/desktop/test/seed-saves.test.ts`
reusing the prototype's vitest pattern) pass before handing off.