# 02 — Extract `@cm-clone/content` from `packages/shared`

Type: task
Status: ready-for-agent

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

## Acceptance criteria

- [ ] `packages/content` exists, is registered in `pnpm-workspace.yaml`, and has a row in
      `packages/README.md`.
- [ ] `packages/shared` no longer contains `src/content/`; it imports the catalogue from
      `@cm-clone/content`.
- [ ] `@cm-clone/shared` still re-exports the catalogue, so no consumer outside the two packages
      changes an import.
- [ ] Neither package imports Effect, `node:*`, or React.
- [ ] `pnpm -r typecheck`, `pnpm run effect-lint`, and `pnpm -r test` are green.

**Blocked by:** None.

## Answer

_(filled in on resolution)_
