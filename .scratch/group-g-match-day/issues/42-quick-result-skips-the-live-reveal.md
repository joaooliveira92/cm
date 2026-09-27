# 42: Quick result skips the live reveal, as the glossary says

Split from the review of [37](37-match-day-resumes-a-started-match-after-a-restart.md), 2026-09-21, orchestrator.

**What to fix:** CONTEXT.md's **Quick result** "skips only the live reveal", and the `startMatch` contract
comment says `quick` "runs straight to full time without a live reveal". The renderer sends the mode, main
ignores it (`_mode`, correctly, since the mode is presentation), and then the renderer's
`startMatch("quick")` enters the same paced live reveal as Play. Make a Quick result go straight to full
time in the renderer.

**Open question, to settle before building:** a quick-started match left unaccepted across an app restart is
restored by 37 as a live replay, because the mode is persisted nowhere. Either persist the mode with the
match (a schema change) or accept a live replay after a restart. Raise it as a decision request if it is not
routine.

**Blocked by:** None

**Status:** resolved

- [x] Quick result reaches full time with no paced reveal; Play is unchanged
- [x] The restart case follows whatever the open question settles
- [x] `pnpm check:all` green, and e2e

## Answer

Triaged 2026-09-27 and settled in place. The open question was routine and did not need a decision
request: **a quick-started match read back after an app restart replays live from kickoff.** The mode
stays unpersisted. `startMatch`'s contract already says the mode changes nothing that is persisted,
and ticket 37's restore, with ticket 33's "restarted from kickoff" notice, already covers the replay.
Persisting the mode would need a schema change for a case that only arises when the app is closed
in the few milliseconds a Quick result takes to read. This is easy to reverse if it ever matters.

The fix is renderer-only. `MatchState.quick` is set when `startMatch("quick")` succeeds, recorded
in the renderer session so a same-process return keeps it, and cleared by the restart restore.
When it is set, `useMatchStreaming` reads each chunk as soon as the previous one is revealed rather
than on the poll interval. It reveals every buffered line as the chunk lands and moves to full time
after the last chunk. It never pauses for an injury decision, because a Quick result's command
journal is empty. Play's paced reveal is unchanged.

Tests: `test/renderer/match/quick-result-skips-live-reveal.test.tsx` checks that Quick result
reaches full time before any reveal tick, past an injury after the substitution cap, and that Play
still paces and pauses on that injury. The e2e journey
`a Quick result goes straight to full time, without the live reveal (group-g 42)` covers the
shipped app.
