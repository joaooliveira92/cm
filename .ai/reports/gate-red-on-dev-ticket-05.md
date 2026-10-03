# gate-red-on-dev ticket 05 — the `MatchNotReadyError` flake

**Outcome:** resolved. It was not a flake, and nothing leaked between tests.

## What the ticket believed

That a `MatchNotReadyError` raised at `apps/desktop/src/main/match/start.ts:161` failed one test per
full desktop suite run, in a different file each time, because of shared mutable state or ordering
between specs that seed a world and start a match. The ticket was explicit that the known throttling
explanation was not good enough, and it was right to be.

## What it was

`createSave` (`apps/desktop/src/main/world/saves.ts`) is the shim nearly every spec builds a world
on, and it forwarded neither of `beginCareer`'s deterministic inputs. The world seed fell through to
`drawWorldSeed` — `Random.nextIntBetween` — and the reference year to the system clock. Every spec
played a different world on every run.

On a small fraction of worlds, one season of contract expiries leaves the human club holding ten
players. The engine already expects this state: `matchday.ts:253` resolves an AI Fixture from two
strength numbers when either side is short, naming "a club left short by a season of contract
expiries" in its comment. But `readyPendingFixture` in `test/main/boundary-helpers.ts` rebuilt the
human Tactic only when `squad.length >= ELEVEN`, so at ten it left the club alone and returned the
Fixture anyway. `startMatch` then recomputed readiness authoritatively — the integrity boundary doing
its job — and rejected it.

Every symptom follows. One cause, so one error and one line. A different file each run, because the
unlucky world lands on whichever multi-season spec drew it. Green in isolation and green on a clean
full run, because both draw a new world.

## Evidence

A seed sweep over 400 explicit worlds at the default career scope, driving `advanceThroughBoundary`
exactly as the specs do.

| Path | Played to | Failing worlds |
|---|---|---|
| `createSave` | season 2 | 46, 48, 381 — 3 of 400 |
| `beginCareer` + first club by rowid (`seasonHelpers`) | season 2 | 7, 46, 298, 381 |
| `createSave` | season 3 | the majority |

Every failure identical: squad 10, 11 tactic slots, blocker `tactic-names-departed-players`.

## Changes

- **`createSave` takes an optional `generation` argument** forwarding `worldSeed` and
  `referenceYear`. Omitted is unchanged, and the RPC handler omits it — a new career should get a
  world nobody chose.
- **`apps/desktop/test/seeded-save.ts`** re-exports `createSave` with both pinned. 36 specs and
  `e2e/seedSaves.ts` changed their import line; no call site changed.
- **`readyPendingFixture` raises `HumanClubCannotFieldElevenError`** carrying the squad size, the
  Fixture and the blockers, instead of handing an unready Fixture on.
- **`contract-expiry.test.ts`** pins seed 46 and asserts the state is named where it arises.

## Validation

- **Mutant, both directions.** With the fix, the new test passes in 2.6s. With `readyPendingFixture`
  reverted to the `>= ELEVEN` guard, it fails with `Error [MatchNotReadyError]` raised at
  `match/start.ts:161` — the original symptom, reproduced on demand.
- **Full desktop suite green** with the world pinned: 216 files, 1972 tests, 676s.
- `pnpm check:all` green.

Ten consecutive full runs were not run. With the seed pinned the suite's world is a constant, so
run-to-run variation in this path is zero by construction rather than by sampling; the ticket's
acceptance criterion offers the mutant as the alternative and the mutant is the stronger evidence.

## Raised, not fixed

Played to season 3, most worlds leave the human club unable to field eleven. Contract expiry removes
players every season and nothing replenishes them, so a career ends to attrition the player was never
shown. Filed as
[decision request 01](../../.scratch/gate-red-on-dev/decision-request-01-squad-decay-has-no-floor.md),
recommending youth intake as the floor and the human's own transfer activity after it.
