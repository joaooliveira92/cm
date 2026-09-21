# 26: A forced injury substitution can bring back a dismissed or already-used player

**What to fix:** `forcePlayerOff` (`packages/game-engine/src/match/simulate/teamState.ts`) chooses the
replacement with `[...team.playersById.keys()].find(id => not on the pitch)`. `playersById` follows
`setup.squad`, and `loadSquadPlayers(clubId)` has no `ORDER BY` and returns the whole club squad. The
replacement is simply the first squad player not on the pitch. That can be someone already sent off,
injured off or substituted, or someone outside the match-day squad. The commentary can then say a
sent-off player replaced an injured one.

Nothing in CONTEXT.md or Screen 97 spec §17 lets a dismissed player return, so this is a defect. The
wider question of whether a manager's substitution may use a non-bench player is
[decision request 04](../decision-request-04-who-may-come-on-as-a-substitute.md). Choose the forced
replacement consistently with its answer, and never from players who have already been on.

A related engine gap: a red card to the only goalkeeper leaves no goalkeeper (`resolveCards` removes
the slot without `emptySlot`'s stand-in). The `applyForcedOff` doc comment wrongly says it "reuses the
red path's `emptySlot`". Fix the comment here. Whether a red-carded goalkeeper should drag a stand-in
changes game behaviour, so it moved to
[decision request 06](../decision-request-06-red-carded-goalkeeper-stand-in.md) (2026-09-17, orchestrator).

Fixing this changes seeded match results for existing saves that hit the branch. State that in the
change. Found in review of [ticket 19](19-substitution-picker-lists-the-tactic-not-the-pitch.md).

**Blocked by:** [34](34-ai-clubs-name-a-bench.md) — AI clubs name a bench (added 2026-09-21; see Comments).
Previously [31](31-committed-matches-store-their-timeline.md), now resolved — committed matches store their
timeline. Decision request 07 is **answered** (2026-09-19, Option B), so this is no longer blocked on a
question. It is blocked on the backfill: this fix makes almost every saved match with a severe-injury
substitution replay differently, and landing it before 31 destroys those matches' original timelines.
The patch stays held until 31 ships.

**Status:** ready-for-agent

- [ ] A forced substitution never brings on a player who has already been on the pitch
- [ ] The replacement's selection is deterministic and independent of squad row order
- [ ] The `applyForcedOff` comment matches the code; the red-carded goalkeeper rule itself is [decision request 06](../decision-request-06-red-carded-goalkeeper-stand-in.md)
- [ ] A seeded test pins each, and the change note says which saved matches replay differently

## Comments

2026-09-17, orchestrator: implemented and **not committed**. The work is kept as
[patches/26-forced-substitution-never-re-enters.patch](../patches/26-forced-substitution-never-re-enters.patch),
which applies to `719ffcc`. It covers:

- engine `beenOn` tracking, with replacements chosen by lowest player id among never-on squad players;
- a corrected `applyForcedOff` comment;
- `pitch.ts` `benchless` aligned with the engine;
- `forced-substitution.test.ts` (6 tests, including squad-order independence and exhaustion);
- the minute-45 seed re-pinned from 1292 to 2023.

Recorded results: game-engine 56 passed; desktop match tests 7 failed (post-match-summary, already
failing) / 187 passed; typecheck and effect-lint clean; e2e journeys and app 12 passed.

Blocked because nearly every saved match with a severe-injury substitution re-derives a different
timeline, and Match Report and statistics re-derive on every read, so they would contradict persisted
results. See [decision request 07](../decision-request-07-engine-rule-changes-and-saved-matches.md).
The replacement rule (never-on, lowest id first) should also be re-checked against decision request 04's answer.

- 2026-09-21: unblocked. [31](31-committed-matches-store-their-timeline.md) shipped: committed matches keep their stored timeline, so an engine-rule change no longer rewrites them. No backfill exists or is needed (saves are disposable during development). The change note still says which *live* and pre-31 matches replay differently.

- 2026-09-21, orchestrator: re-blocked on [34](34-ai-clubs-name-a-bench.md). Decision request 04 (Option A)
  makes the named bench the only source of substitutes, so the forced replacement is the first bench
  entry, in bench order, that is in the squad and has never been on; with none, the team plays with 10.
  But every AI Tactic is built with `emptyBench()` (`aiClubs.ts` `pickBestFormationTactic`), so under
  that rule no AI club would ever make a forced substitution. 34 gives AI clubs a bench first. The held
  patch's `beenOn` tracking and `applyForcedOff` comment fix still stand; its lowest-id replacement rule
  does not. The engine test fixtures (`test/match/fixtures.ts`) are benchless too and need a named bench
  for the forced-substitution tests. DR-04's manager half is [35](35-manager-substitutions-come-from-the-bench.md);
  DR-06's rule is [36](36-a-red-carded-keeper-drags-a-stand-in.md).
