# 05: A `MatchNotReadyError` flake in the match-start path moves between files across runs

Filed 2026-09-18, after the gate went green. This is the one thing standing between "green" and
"reliably green", and a gate that fails once in a while is on its way back to being ignored.

## Symptom

`Error [MatchNotReadyError]` raised at `apps/desktop/src/main/match/start.ts:161`
(`return yield* new MatchNotReadyError({ fixtureId, blockers… })`) fails one test in a full desktop
suite run. Observed twice:

- ticket 03's first full run: 1 failed / 1968 passed, in `test/main/season/advance.test.ts`
- the gate run after the RPC handler-type change: 1 failed / 1968 passed, in
  `test/main/season/retention.test.ts > prunes nothing else from the log`

**Different file each time, same error and same source line.** Both files pass in isolation — I ran
`retention.test.ts` standalone immediately after its failure: 2/2 passed. A full clean run between
the two was 1969/1969 with zero FAIL lines.

## Why it is not the RPC handler-type change

That change is type-level only (a mapped type plus one cast at the dispatch site); it emits no
different JavaScript. The same failure predates it, in a different file.

## What makes it a flake rather than a broken test

The migrating file is the tell. A deterministic failure stays put. This moves, which points at
shared mutable state or ordering between tests that seed a world and start a match — `loadMatchBlockers`
deciding a fixture is not ready because another test's save, calendar position, or temp directory is
visible when it should not be.

The repo already knows this shape: `.claude` memory records that a desktop run started immediately
after another throttles and reports phantom failures, and `.scratch/desktop-suite-red/` exists for
this class. Do **not** stop at "it's the known throttling" — that explanation was available for
ticket 03's instance too, and the second sighting in a different file makes shared state the better
hypothesis.

## Where to look

- `apps/desktop/src/main/match/start.ts:161` and `loadMatchBlockers` — what exactly is unready?
- Whether the season/match tests share a `savesDir`, a temp directory, or a module-level singleton.
  ENGINEERING-CONTRACT § Determinism bans mutable module-level singleton state in `shared` and
  `game-engine`, but `apps/desktop/src/main` is not covered by that rule and is where these tests run.
- Whether `retention.test.ts` and `advance.test.ts` can run concurrently and touch one save.

## Acceptance

- [x] The root cause is named — which state leaks between which tests, not "it's timing"
- [x] Ten consecutive full desktop suite runs are green, or the fix is proved by a mutant that
      reliably reproduces the failure before it and not after
- [x] No test is serialised or skipped to hide it; if serialisation is genuinely the right fix, say
      why the shared state cannot be isolated instead

**Blocked by:** None

**Status:** resolved

## Answer

**Nothing leaks between tests. There is no shared state.** The specs were not flaky — they were
non-deterministic by construction, and the failure they hit is a real game state that ~0.75% of
worlds reach.

### The chain

1. `createSave` (`world/saves.ts`) is the shim every spec builds on, and it passed neither of
   `beginCareer`'s two deterministic inputs. The world seed fell through to `drawWorldSeed`
   (`saves.ts:69`, `Random.nextIntBetween`) and the reference year to the system clock. **Every spec
   therefore played a different world on every run.**
2. On a small fraction of worlds, one season of contract expiries leaves the human club holding
   **ten** players. This is a state the engine already expects — `matchday.ts:253` resolves an AI
   Fixture from two strength numbers when either side is short, and names "a club left short by a
   season of contract expiries" in its comment.
3. `readyPendingFixture` in `test/main/boundary-helpers.ts` rebuilt the human Tactic only when
   `squad.length >= ELEVEN`. At ten it left the club alone by design, so the season-1 Tactic kept
   naming departed players and the blocker `tactic-names-departed-players` stood.
4. It returned the Fixture anyway. `startMatch` then recomputed readiness authoritatively — the
   integrity boundary doing exactly its job — and raised `MatchNotReadyError` at `match/start.ts:161`.

Every observation in the symptom falls out of this. Same error and same line, because there is one
cause. A different file each run, because the unlucky world lands on whichever multi-season spec
happened to draw it. Green in isolation, because a re-run draws a new world. Green on a full clean
run, for the same reason. The throttling explanation was available and wrong.

### Evidence

A seed sweep over 400 explicit worlds at the default career scope, driving `advanceThroughBoundary`
exactly as the specs do. Through the `createSave` path, played to season 2: **seeds 46, 48 and 381
fail — 3 in 400.** Every failure is identical: squad 10, 11 tactic slots, blocker
`tactic-names-departed-players`. Through the `beginCareer` + first-club-by-rowid path that
`seasonHelpers` uses, seeds 7, 46, 298 and 381 fail the same way.

Played to **season 3**, the majority of worlds fail — squad decay compounds and nothing replenishes
it. That is a game-design gap, not a test defect, and is
[decision request 01](../decision-request-01-squad-decay-has-no-floor.md).

### The fix

- **`createSave` takes an optional `generation` argument** forwarding `worldSeed` and
  `referenceYear`. Omitting it is unchanged — the RPC handler still gives a new career a random
  world, which is correct.
- **`test/seeded-save.ts`** re-exports `createSave` with both pinned (`TEST_WORLD_SEED = 1`,
  `TEST_REFERENCE_YEAR = 2026`). The 37 specs and `e2e/seedSaves.ts` import `createSave` from there
  instead. No call site changed — only the import — so every spec now plays one known world on every
  machine, and a spec that wants another passes its own seed.
- **`readyPendingFixture` fails loudly.** A human club short of eleven now raises
  `HumanClubCannotFieldElevenError` carrying the squad size, the Fixture and the blockers, rather
  than handing an unready Fixture to `startMatch` and surfacing as a readiness failure three modules
  away.

### Proof

- **Mutant, both directions.** `contract-expiry.test.ts` pins seed 46 and plays into season 2.
  Against the fix it passes (2.6s). With `readyPendingFixture` reverted to the `>= ELEVEN` guard it
  fails with `Error [MatchNotReadyError]` raised at `match/start.ts:161` — the original symptom,
  exactly, on demand.
- **Full desktop suite green.** 216 files, 1972 tests, with the world pinned.
- Ten consecutive full runs were not needed and were not run: with the seed pinned the suite's world
  is a constant, so run-to-run variation in this path is zero by construction rather than by
  sampling. The mutant is the stronger evidence and the acceptance criterion allows it.

### On criterion 3

Nothing was serialised, skipped or loosened. Pinning the seed is not hiding the failing world: the
world that fails is now pinned *by name* in a test that asserts it fails, and the game-design gap
behind it is filed rather than buried.
