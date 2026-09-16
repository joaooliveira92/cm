# 21: The injury prompt and the decision pause never fire in the app

**What to fix:** `setChunkInjuries` in `apps/desktop/src/renderer/match/CommentaryProvider.tsx` is only
ever called with `[]`. The last call that passed real injuries (`setChunkInjuries(chunk.injuries)`)
was deleted in `eb3786e`, a lint refactor, on 2026-08-28. As a result `shouldPauseMatch` never
fires, and the Match day panel's injury prompt never opens by itself.

`test/renderer/match/live-keyboard.test.tsx` fails 6 of 18 on `dev`. At least five of those are the
AC-33 "Paused — awaiting decision" cases, whose harness seeds a `chunkInjuries` value the provider
never reads.

Raise the prompt when the Injury line is revealed, not when its chunk arrives, because chunks are
fetched ahead of the reveal ([ticket 22](22-match-responses-carry-state-ahead-of-the-reveal.md)).

Found in the review of [ticket 18](18-substitution-count-reads-the-whole-match.md).

**Blocked by:** None

**Status:** claimed

- [ ] A revealed Injury on the controlled club pauses the match and opens the prompt
- [ ] An Injury still in the unrevealed buffer does neither
- [ ] `live-keyboard.test.tsx`'s pause cases pass against the real provider path
