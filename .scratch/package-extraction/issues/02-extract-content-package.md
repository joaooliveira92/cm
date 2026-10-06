# 02 — Extract `@cm-clone/content` from `packages/shared`

Type: task
Status: resolved

**What to build:** Split the game's static data catalogue out of `packages/shared` into its own
data-only package, `@cm-clone/content`: the league packs (`brazilSeriesA`, `englishPremierLeague`,
`germanBundesliga`, `portuguesePrimeiraLiga`, `spanishLaLiga`), `clubs`, `cities`, `nations`,
`namePools`, `clubColours`, `canonicalId`, `contentPack`, `contentPackRegistry`,
`leagueSetupCatalogue`. `shared` keeps the math, rules and season logic and depends on `content`.

**Why:** `shared` today does two jobs — pure functions and a bulk data catalogue. "One home per
meaning": data with a different change cadence and no logic is a package of its own. Both stay pure
(data-only, no Effect/Node/React), so the pure-packages posture is preserved.

**Layering:** `content` depends on nothing (or only `shared`'s plain types if any are needed — prefer
no dependency at all). `shared` depends on `content`. Keep `shared/src/index.ts` re-exporting the
content surface so external importers (`@cm-clone/shared`) are unchanged; the churn is internal to
`shared`.

**Constraint found while triaging (2026-10-03):** `content` and `setup` currently import each other,
so the move is not a straight folder lift:

- `content/leagueSetupCatalogue.ts` imports the row types (`CompetitionNode`, `CupEntrant`,
  `ExchangeLink`, `LeagueSetupIndex`) from `setup/leagueSetup.ts`.
- `content/contentPack.ts` imports `compareCodeUnits` from `shared/order.ts`.
- `setup/leagueSetup.ts` (and other setup/rules files) import `content/nations.ts`.

Break it by giving `content` the row *types* rather than reaching up: move the type/constant half of
`setup/leagueSetup.ts` (lines ~22–166: `CompetitionNode`, `LeagueScopeOption`, `NationNode`,
`ExchangeLink`, `CupEntrant`, `RegionNode`, `LeagueSetupIndex`, `SimulationMode`,
`NationSelectionState`, `CompetitionKind`) and `order.ts` into `content`, leaving the index-builders
(`allCompetitions`, `competitionIndex`, `nationIndex`, `scopeOptionIndex`) in `shared` importing the
types from `@cm-clone/content`. Re-export both from `shared/src/index.ts` so nothing outside the two
packages moves an import. ~44 `content` imports, ~12 `leagueSetup.js` imports and ~10 `order.js`
imports inside `shared` are the mechanical churn; do not leave a re-export shim *and* the original
type in place.

> **Superseded on implementation:** the split below was not needed. `leagueSetup.ts` moved whole into
> `content` (with `order.ts`), so `content` depends on nothing and no `shared` file imports a
> `leagueSetup.js` shim. See the Answer.

## Acceptance criteria

- [x] `packages/content` exists, is registered in `pnpm-workspace.yaml`, and has a row in
      `packages/README.md`.
- [x] `packages/shared` no longer contains `src/content/`; it imports the catalogue from
      `@cm-clone/content`.
- [x] `@cm-clone/shared` still re-exports the catalogue, so no consumer outside the two packages
      changes an import.
- [x] Neither package imports Effect, `node:*`, or React.
- [x] `pnpm -r typecheck`, `pnpm run effect-lint`, and `pnpm -r test` are green.

**Blocked by:** None.

## Answer

Shipped. `packages/content` (`@cm-clone/content`) now owns the catalogue: all fifteen
`shared/src/content/*` files, plus `order.ts` and `leagueSetup.ts`, moved to `packages/content/src`
and wildcard-exported from its `src/index.ts`.

The planned type/logic split of `leagueSetup.ts` was dropped as unnecessary. `contentPack.ts`
already carries functions, so `content` was never purely data; moving `leagueSetup.ts` whole
(types, constants and the four index accessors) keeps the catalogue's read API with its data and
avoids a fragile split. Its only outward import was `nations`, now `./nations.js`.

The cycle is gone: `content` depends on nothing (verified — no Effect, `node:*`, React or
`@cm-clone/shared` in `packages/content/src`), and `shared` depends on `@cm-clone/content`. Shared's
`src/index.ts` re-exports the whole content surface, so every consumer outside the two packages
keeps importing `@cm-clone/shared` unchanged (no direct content imports existed outside `shared`).
Inside `shared`, ~14 files had their `../content/*`, `order.js` and `leagueSetup.js` imports
rewritten to `@cm-clone/content`, merged where a file had several.

Tests: the nine pure catalogue specs and `order.test.ts` moved to `packages/content/test`;
`namePools.test.ts` and `nations.test.ts` stayed in `shared` (they exercise shared generation and
the setup index-builders, not just the data) with their content imports repointed. Doc/ledger
references in `.ai/TRACEABILITY.md` and `docs/research/group-q-season-transitions.md` were updated.

Gates: `pnpm -r typecheck`, `oxlint` (0 errors), `effect-lint` (0 violations), `verify-md-links`,
`verify-db-schema` all green. Tests: content 68, shared 650, contracts 246, game-engine 274; desktop
2689 passed / 5 skipped at a raised per-test timeout (the gate's 5s default flakes under full-suite
load, as documented in `apps/desktop/AGENTS.md`).
