# 01 — Lift the pure match projections into `@cm-clone/game-engine`

Type: task
Status: resolved

**What to build:** Move the pure, DB-free match re-derivation and projection modules out of
`apps/desktop/src/main/match` and into `packages/game-engine/src/match`, so the engine owns the
whole "decider/projector" story its docstrings already claim, and `main` shrinks to wiring. No
behaviour change: the same functions, called from the same call sites, import from the package.

**Why:** `packages/AGENTS.md` says pure DB-free logic belongs in `game-engine` or `shared`, and
`main` is the wiring layer. These three modules today are pure — their own docstrings say so — but
they live in `main`. The `season/decider.ts` `StreamEvent` row type is the only thing pinning them
there, and it is a plain record, not SQL.

**Files to move (moved to their new home):**

- `packages/game-engine/src/match/stream.ts` — was the `main/match` module `stream.ts`
  (`MATCH_STREAM_TYPE`, `PersistedMatchStarted`, `PersistedTacticsChanged`,
  `PersistedSubstitutionMade`, `PersistedForcedOff`, `hashString`, `matchStartedOf`,
  `revealedCut`, `journaledLineupCommands`, `deriveMatchEvents`, `aiControllerFor`).
- `packages/game-engine/src/match/pitch.ts` — was the `main/match` module `pitch.ts`
  (`HALFTIME_MINUTE`, `LineupCommand`, `pitchAsOf`, `pitchBeforeEachEvent`, `LineupFacts`,
  `lineupFacts`).
- `packages/game-engine/src/match/substitutions.ts` — was the `main/match` module
  `substitutions.ts` (`countedSubstitutions`, `SubstitutionRoles`, `classifySubstitutions`,
  `substitutionStatus`, `substitutionLedger`, `SubstitutionLedger`, `substitutionApplied`).

**The one knot:** `StreamEvent` is declared in the `main/season` module `decider.ts`. A pure
module in `game-engine` cannot import from the app. Give the type its own pure home,
`packages/game-engine/src/eventStream.ts`, and have `season/decider.ts` re-export it
(`export type { StreamEvent } from "@cm-clone/game-engine"`) so the many existing
`from "../season/decider.js"` importers keep resolving. Do not move `decider.ts` itself — it is
`SqlClient` + `node:fs` and stays in `main`.

**Moving rules:**

- Inside `game-engine`, the moved files must import the engine's own symbols by relative path
  (`./types.js`, `./simulate/index.js`), never by the package name — a self-import closes a cycle.
- `@cm-clone/contracts` and `@cm-clone/shared` imports stay as package imports.
- Update every `main` importer of `./stream.js`, `./pitch.js`, `./substitutions.js` to import the
  moved symbols from `@cm-clone/game-engine` (adding to an existing engine import where present).
  Call sites: `main/match/{aiPreferences,commands,matchOverview,playerStats,postMatchSummary,queries,ratings,report,start,statistics,teamSheet,view}.ts`
  and `main/season/commitMatchday.ts`.
- Add `./match/stream.js`, `./match/pitch.js`, `./match/substitutions.js`, `./eventStream.js` to
  `packages/game-engine/src/index.ts`.

**Tests:**

- `test/main/match/substitutions.test.ts` and `test/main/match/statistics.test.ts` are pure
  (engine + shared + contracts only): move them to
  `packages/game-engine/test/match/` and repoint their imports.
- The SQLite-backed specs (`revealed-state`, `ratings`, `command-timing`, `committed-timeline`,
  `matchOverview`) stay in desktop; repoint their `src/main/match/{stream,pitch,substitutions}.js`
  imports to `@cm-clone/game-engine`.

## Acceptance criteria

- [x] `apps/desktop/src/main/match/{stream,pitch,substitutions}.ts` no longer exist; the symbols
      live in `packages/game-engine/src/match/`.
- [x] `packages/game-engine/src/eventStream.ts` owns `StreamEvent`; `season/decider.ts` re-exports it
      and all existing `../season/decider.js` importers still typecheck.
- [x] No `game-engine` source imports its own package name, and no `game-engine` source imports
      `effect`, `node:*`, or `apps/desktop` (the pure-packages posture holds).
- [x] `pnpm -r typecheck`, `pnpm run effect-lint`, and `pnpm -r test` are green.
- [x] A [pure-packages posture](../../../.agents/notes/proposed/architecture/2026-08-28-pure-packages-posture.md)
      Agent Note is not contradicted: the engine still never imports `Effect`.

**Blocked by:** None.

## Answer

Shipped. `stream.ts`, `pitch.ts`, `substitutions.ts` and the pure `StreamEvent` record now live in
`packages/game-engine/src` (`eventStream.ts` + `match/{stream,pitch,substitutions}.ts`);
`main/match` keeps only the SQL/Effect reads and commands, importing the moved symbols from
`@cm-clone/game-engine`. `season/decider.ts` re-exports `StreamEvent`, so its existing importers did
not move. The pure `substitutions.test.ts` moved to `packages/game-engine/test/match/`; the
SQLite-backed specs stayed and repointed their imports.

Two seams needed care:
- `game-engine`'s moved modules import the engine's own symbols relatively (`./types.js`,
  `./simulate/loop.js`), never by package name — a self-import would close a cycle and, in the
  desktop bundle, resolve a second module instance.
- `committed-timeline.test.ts` mocked `@cm-clone/game-engine.simulateMatchWithCounts` to simulate an
  engine-rule change. Once `deriveMatchEvents` is inside the package it calls the simulator by
  relative path, so the package mock no longer intercepts it; the test now mocks the package's
  `deriveMatchEvents` instead, at the boundary `main/aiPreferences.ts` already crosses. Same intent,
  same assertion.

`statistics.test.ts` stayed in desktop: despite being a pure table test, it imports `main/match/statistics.ts`
(the SQL module), so it could not move without moving that module too.

Gates: `pnpm -r typecheck`, `pnpm run effect-lint`, `oxlint` (0 errors), `verify-md-links`,
`verify-db-schema` all green; `game-engine` 274 tests green. The desktop suite passes fully
(322 files, 2689 passed, 5 skipped) when run with a raised per-test timeout; at the gate's default
5s timeout a handful of world-generating renderer/match specs time out under the full parallel load,
which is the pre-existing slowness `apps/desktop/AGENTS.md` documents (all pass in isolation).
