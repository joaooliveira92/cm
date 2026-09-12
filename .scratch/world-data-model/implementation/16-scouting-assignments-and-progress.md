# 16: Scouting — assignments keyed on the scout, progress kept sparse

**What to build:** the manager assigns a named scout to a player and the club's knowledge of that
player improves over time. A better scout reaches Fully Scouted faster and a poor scout gets there
eventually, so quality is felt without any assignment being futile. Scouting a player nobody has ever
looked at costs nothing on disk, so the size of the world does not pay for attention the player never
spent. Scouting belongs to the club rather than to the manager: taking a new job starts a new club's
observation rather than importing the last one's. AI clubs have no scouting state at all.

A player in a `results-only` nation cannot be scouted, because nobody there exists as a row — which
means Depth hides a transfer market as well as a simulation. No scouting code branches on Depth to
achieve that; the scoutable set is simply the players who have rows.

Two shapes carry it. Assignments are keyed on the scout, so the N-slot cap is the row count of a
table rather than a rule code can violate: "already at cap" and "duplicate assignment" become
unreachable states rather than errors. Progress is keyed on the club and the player and is sparse —
absence means Unscouted, and no code path ever writes a progress-0 row. Nothing stores an Attribute
Range, a narrowed bound, or a fogged transfer value; all of those are pure functions of progress and
the true stored value.

Telling the manager that a scouted player has vanished is out of scope: when relegation deletes a
player, the assignment goes with them and the slot silently reopens.

The slice's edge promise: assigning a scout is an effect whose only observable failures are ones the
shape cannot make unreachable — an unknown scout, an unknown player. Cap and duplicate errors do not
exist in the error channel because they cannot occur.

**Decisions:**

- Two tables — `scouting_assignments` keyed on the scout, and a sparse `scouting_progress` keyed on
  (club, player) — with the scoutable set defined by which players have rows at all, so
  `results-only` hides a transfer market as well as a simulation. See
  [Agent Note](../../../.agents/notes/proposed/architecture/2026-09-02-scouting-persistence.md).

**Blocked by:** 15.

**Status:** resolved

**Files:** `apps/desktop/src/main/db/schema.ts` and the regenerated DDL, a new scouting module in
`apps/desktop/src/main`, `apps/desktop/src/main/rpcServer.ts`, `packages/contracts/src/rpc.ts` and
`schemas.ts`, `apps/desktop/src/main/season.ts` (the per-advance accrual hook),
`apps/desktop/src/main/managerStatus.ts`, `apps/desktop/test/db-schema.test.ts` and new scouting
tests.

- [x] `scouting_assignments` has the scout id as its primary key and a `UNIQUE` player id, and
      carries no club column; a scout's club is read from the staff row.
- [x] `scouting_progress` is keyed on the club and the player with a progress column constrained by
      `CHECK progress BETWEEN 0 AND 100`, and a test asserts no code path writes a row at 0.
- [x] Accrual is strictly positive across the whole 1-20 scout-quality domain, so Fully Scouted is
      reachable for every scout, and progress never decreases.
- [x] No player in a `results-only` competition appears in any scoutable set, and no scouting code
      branches on Simulation Depth to achieve it.
- [x] Deleting a player deletes their assignment and their progress rows; a manager leaving a club
      deletes that club's assignments and progress.
- [x] No table stores an Attribute Range, a narrowed bound, or a fogged transfer value.
- [ ] `pnpm check:all` is green at this commit. **Not met, and not by this ticket's doing** — see
      ticket 11's note. HEAD is red from the Base UI Select migration: 23 renderer failures across
      `active-leagues-*`, `league-selection-screen`, `club-selection-screen`, `table-*`,
      `level1-a11y`, `matchday-live-keyboard`, and `tactics-keyboard-reachability`. Typecheck, lint,
      effect-lint, verify-md-links and verify-db-schema are green, as is every test suite this
      ticket touches.
