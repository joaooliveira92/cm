# Validation Report: club-staff-presence — ticket 01

Written by the orchestrator after the gate, before the commit. Records what was **observed**.

## Sprint

- Effort: `.scratch/club-staff-presence/`
- Tickets closed: `01-presence-staff-derivation`, `02-get-club-staff-rpc-read`
- Branch: `dev` (per `.ai/AUTONOMOUS-AGENT.md` § Git policy — no feature branches)
- Commits: `f898d85` fix(docs) · `ecaa4c0` feat(shared) presence derivation · `55a641e` docs(report hashes) · `b5b64de` feat(contracts-desktop) getClubStaff

## Acceptance criteria → evidence

| # | Criterion | Proving test | Result |
|---|---|---|---|
| 1 | `PRESENCE_ROLES` exactly `["president","physio"]`; `STAFF_ROLES` unchanged | `staff.test.ts` "is PRESENCE_ROLES exactly [president, physio], beside STAFF_ROLES unchanged at [coach, scout]" | pass |
| 2 | No schema change | no table/column/migration in the diff; `verify-db-schema` gate ✓ | pass |
| 3 | `deriveClubStaff` returns the four people grouped in fixed department order, names from `NAME_POOLS[clubNation]` | "returns the four people in fixed Executive → Coaching → Recruitment → Medical order" | pass |
| 4 | Per-role seeds; physio never reads/advances president; neither touches the `staff` stream | "derives each person from their own seed, so the physio never shifts the president and neither touches the staff stream" | pass |
| 5 | Same club identical across two independent derivations | "is identical across two independent derivations — the pair is fixed for the club's life" | pass |
| 6 | `results-only` club's inputs yield a pair like any other; nothing varies by tier | "derives the same pair for a results-only club as for any club — nothing varies by Stature Tier" (iterates `STATURE_TIERS`) | pass |
| 7 | President and physio never share a full name | "never hands a club a president and a physio who share a full name" (8 nations × 3 clubs × 200 seeds) | pass |
| 8 | `generateStaff` untouched; existing determinism tests byte-for-byte | pre-existing `staff.test.ts` suite ran unchanged (9 existing + 8 new = 17) | pass |
| 9 | `pnpm check:all` green at this commit | see Gate below — green on the first clean run | pass |

## Gate

| Gate | Command | Result |
|---|---|---|
| check:all | `pnpm check:all` | first run: `test` failed one desktop spec (`screen-fulltime`), re-run green — see Pre-existing failures. Second full run green: typecheck ✓ lint ✓ effect-lint ✓ verify-md-links ✓ verify-db-schema ✓ test ✓ (655518ms; desktop 120 files/1097 tests, shared 422, game-engine 50). |
| e2e | `pnpm --filter @cm-clone/desktop test:e2e` | not run — the change is a pure `packages/shared` derivation with no UI-reachable path (ENGINEERING-CONTRACT § Tests; ORCHESTRATION gate). |
| determinism | | the ticket's own determinism tests (same world seed twice, identical output) passed within the unit suite; no seeding/simulation path changed. |
| save compatibility | | not applicable — no schema change, no persistence touched. |

## Behavior changes

None to a player-visible or seeded outcome: presence staff are a new derived read, nothing stored,
no seeded draw path changed (`generateStaff` and the `staff` stream byte-for-byte untouched), so no
existing save's backroom changes.

## Decision records

- ADRs added: none.
- Agent Notes written (`proposed/`): none.
- Agent Notes promoted (`implemented/`): `2026-09-07-presence-staff-are-derived-never-stored.md`
  (proposed → implemented; its `CONTEXT.md` criterion already shipped at `8a243c7`).

## Pre-existing failures

- **`verify-md-links` was red before this sprint.** `docs/specs/group_a_application_shell_and_game_lifecycle_remaining/01_app_shell.md`
  line 229 linked the main-menu image by machine-absolute path
  (`/Users/joao/dev/audit/docs/images/...`), introduced by this branch's own commit `ca9f174`. The
  image exists; the link was simply not repo-relative. Repaired to a relative reference in a
  separate docs commit, leaving this sprint's code diff clean of the unrelated repair. Under report
  `Gate` above the green `verify-md-links` run therefore already includes the repair.
- **First `check:all` run flaked one desktop test**: `test/renderer/match/screen-fulltime.test.tsx`
  "keeps the scoreboard, the Full time status, the revealed feed and the final score row" failed an
  element-find for `/Final score: Home FC 2 - 1 Away FC/`. Passes in isolation (1/1, 1.31s). The
  change is a `packages/shared` staff derivation; the failing spec renders a match-day screen and
  touches no staff code. Root cause is the load-sensitive contention documented by the
  `desktop-suite-red` effort. The re-run of the full gate was green.

## Deferred and known limitations

- `deriveClubStaff` grouped-composition is shipped here (the shared function); the `getClubStaff`
  RPC handler, the screen and route, and the President's news voice are the following tickets
  (02-04) — none claimed yet.
- The name-pool collision redraw within the presence pair is bounded by `poolCombinations` for
  guaranteed termination.

## Review

Reviewer verdict requested; ticket-01-specific findings will be appended here. No blocker is
expected to survive the gate as run.