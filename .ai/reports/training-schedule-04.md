# Validation Report: training-schedule-and-delegation 04

## Schedule moves Condition recovery

### What shipped

1. **`packages/shared/src/rules/trainingSchedule.ts`** — `scheduleRecoveryModifier`:
   a pure function from a schedule's sessions to a recovery multiplier (0.9–1.1,
   Balanced=1.0). Template modifiers pre-computed; custom schedules computed from
   per-session recovery weights with clamping.
2. **`apps/desktop/src/main/season/matchday.ts`** — `recoverClubFitness` now reads
   the club's training schedule sessions and applies the modifier. AI clubs (no
   schedule row) default to 1.0.
3. **`apps/desktop/src/main/club/trainingSchedule.ts`** — `readScheduleView`
   computes each player's projected Condition at the next Fixture using
   `conditionAfterDays` with the schedule's modifier.
4. **`packages/contracts/src/schemas/trainingSchedule.ts`** — `TrainingScheduleView`
   gains a `projectedConditions` field.
5. **`apps/desktop/src/renderer/training/TrainingScheduleScreen.tsx`** — shows
   projected Condition table and draft modifier when dirty.
6. **`CONTEXT.md`** — Regimen and Condition entries name the training schedule
   recovery modifier and its band.

### Tests

- `packages/shared/test/rules/trainingSchedule.test.ts` — 12 tests covering
  Balanced=1.0, Recovery>Heavy, band clamping, custom schedule clamping.
- `apps/desktop/test/main/club/training-schedule-recovery-simulation.test.ts` —
  integration test using `recoverClubFitness` directly with Recovery vs Heavy
  schedules from the same starting condition (50%), proving the modifier produces
  measurably different results.
- Existing training schedule tests — 13/13 passed (main), 7/7 passed (renderer).
- All season tests — 18 files, 77 tests passed.

### Validation

- Typecheck — clean
- `pnpm check:all` pre-existing failures (match seed flakiness) unchanged

### Commits

- `8b972c11` — core recovery modifier (shared + main-process integration)
- `9fe51e96` — CONTEXT.md update
- `be1a99db` — integration test
- `8419831d` — projected Condition RPC + screen display
- `2a8b3dea` — draft modifier shown on screen
- `e69971b9` — show draft modifier alongside projected Condition