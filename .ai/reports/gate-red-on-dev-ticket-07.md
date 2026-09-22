# gate-red-on-dev ticket 07 — a Youth Intake at every Season rollover

**Outcome:** resolved 2026-09-22. [Ticket](../../.scratch/gate-red-on-dev/issues/07-youth-intake-at-rollover.md).
[Note](../../.agents/notes/proposed/feature/2026-09-21-a-youth-intake-is-the-squad-floor.md) amended, and it
stays proposed until ticket 08 ships the short-squad advisory.

## What it was for

Squads decayed with no floor: seeds 7, 46, 298 and 381 fell below eleven by season 2, and the human club
then met `HumanClubCannotFieldElevenError`. Every club now regains at least two players, and at least 16
in all, at each rollover.

## Validation

| Gate | Command | Result |
|---|---|---|
| check:all | `pnpm check:all` | exit 0. Shared 485, contracts 180, game-engine 95, desktop 2179 passed. |
| determinism | `pnpm --filter @cm-clone/desktop exec vitest run test/main/transfers/youth-intake.test.ts`, twice | 5 passed both runs, including a world generated and played twice matching on every intake row, and a different-seed control |
| seed sweep | `test/main/transfers/youth-intake-sweep.test.ts` | seeds 7, 46, 298 and 381 through three rollovers: every club at 16 or more, and the human club plays a season-4 Fixture (about 20 s) |
| save compatibility | no schema change | new rows in `players`, `player_positions`, `contracts` and `events` only |
| e2e | not run | no renderer file changed |

## Review

NEEDS_REWORK, then repaired. High: intake ids came from a 32-bit intermediate seed; a collision would
fail the primary key on every retry of Continue. The rework found two real club seeds that collide in
Season 2 and pinned them in a test; ids now derive from the full path, and world generation's ids are
unchanged. Medium: the note described the Contract as signed through the Free Agent path; the intake writes
it directly on the same terms, and the note now says so. Filed: ticket 09 (main-process ages read the wall
clock) and ticket 10 (promoted squads sign no Contracts).
