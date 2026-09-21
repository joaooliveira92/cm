# 34: AI clubs name a match-day bench

Split from [26](26-forced-substitution-picks-any-squad-player.md), 2026-09-21, orchestrator.

**What to build:** `pickBestFormationTactic` (`apps/desktop/src/main/club/aiClubs.ts`) builds every AI
Tactic with `bench: emptyBench()`, so no AI club has a named substitute. Decision request 04 (Option
A) makes the named bench the only source of substitutes, forced ones included, so an AI club would
never make a forced substitution and every severe injury would leave it with 10. Fill the AI bench from
the players outside the chosen XI: one spare goalkeeper first if the squad has one, then the
highest-rated remaining players by the same rating the best-XI selection uses, ties broken by player
id, up to `BENCH_SIZE`. A squad too small to fill it leaves the trailing entries `null`.

**Decisions:** [decision request 04](../decision-request-04-who-may-come-on-as-a-substitute.md), Option A,
and [the team sheet is the Tactic](../../../.agents/notes/proposed/architecture/2026-09-13-the-team-sheet-is-the-tactic.md):
substitutes are the players named on the active Tactic's bench. Bench composition (spare keeper first,
then by rating) is an orchestrator call, recorded here; it is not a balance constant.

AI Tactics are assigned once at Season start (`assignAiTactics`), so a save already mid-season keeps
empty AI benches until the next Season. Saves are disposable during development; no backfill.

**Blocked by:** None

**Status:** ready-for-agent

- [ ] Every AI Tactic assigned at Season start names up to `BENCH_SIZE` substitutes, none of them in the XI
- [ ] The bench carries a spare goalkeeper whenever the squad has one
- [ ] The selection is deterministic and independent of squad row order; a seeded test pins it
- [ ] `pnpm check:all` green
