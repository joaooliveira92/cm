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

- [ ] The root cause is named — which state leaks between which tests, not "it's timing"
- [ ] Ten consecutive full desktop suite runs are green, or the fix is proved by a mutant that
      reliably reproduces the failure before it and not after
- [ ] No test is serialised or skipped to hide it; if serialisation is genuinely the right fix, say
      why the shared state cannot be isolated instead

**Blocked by:** None

**Status:** ready-for-agent
