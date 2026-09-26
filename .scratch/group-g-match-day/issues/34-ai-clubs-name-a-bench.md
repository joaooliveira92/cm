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

**Status:** resolved

- [x] Every AI Tactic assigned at Season start names up to `BENCH_SIZE` substitutes, none of them in the XI
- [x] The bench carries a spare goalkeeper whenever the squad has one
- [x] The selection is deterministic and independent of squad row order; a seeded test pins it
- [x] `pnpm check:all` green

## Answer

Resolved 2026-09-21. `selectBench(squad, xi)` in `packages/shared/src/rules/bestXi.ts` names the AI bench;
`pickBestFormationTactic` (`aiClubs.ts`) calls it, and `validateTactic` still runs before persist. A spare
goalkeeper is a player **Natural at GK** (Familiarity Tier), not whoever's GK rating is highest: the
first cut used ratings and missed a real keeper in about 2% of generated squads, caught in review. The
rest rank by highest Position Rating, ties by code-unit id order.

Eligibility is the XI's: any player on the club's books. Nothing models injury or suspension between
matches yet, so a bench of unavailable players cannot occur today.

Test side effect: `boundary-helpers.ts` builds the human club's Tactic with `pickBestFormationTactic`, so
human test clubs now name a bench too. Nothing reads the bench in the engine until
[26](26-forced-substitution-picks-any-squad-player.md), so no seeded match moved. The review's locale
finding on the XI's own tie-break is [38](38-pure-packages-sort-without-locale.md).
Report: [group-g-match-day](../../../.ai/reports/group-g-match-day.md).
