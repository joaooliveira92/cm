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

**Status:** resolved

- [x] A revealed Injury on the controlled club opens the prompt, and pauses the match when the club's substitution cap was reached as it was revealed
- [x] An Injury still in the unrevealed buffer does neither
- [x] `live-keyboard.test.tsx`'s pause cases pass against the real provider path

## Answer

Resolved 2026-09-16. The first criterion was reworded to match the design in `e3cba7a`: the prompt
opens on any controlled-club Injury, and the match pauses only at the substitution cap.

There were two causes. `eb3786e` deleted `setChunkInjuries(chunk.injuries)`. `305a204` added a sticky
paused branch in `useMatchStreaming`, so a pause could never end, and it stopped restoring the session
fields the tests seeded.

Changes in `CommentaryProvider.tsx`, `streaming.ts`, `useMatchControl.ts` and `MatchControlPanel.tsx`:

- **Revealed, not fetched.** An Injury enters `revealedInjuries` when its line is revealed. It is
  paired with the chunk's Nth `view.injuries` entry, since there is one line per event, in order. An
  injury still in the unrevealed buffer does nothing.
- **Pause decided on reveal.** Each record stores `capReachedWhenRevealed`. The pause considers only
  records revealed at the cap, so a cap reached later never pauses for an old injury.
- **Resolved by the forced substitution.** A `Substitution` line revealed immediately after an
  `Injury` line at the same minute resolves that injury. This relies on engine ordering, because
  `forcePlayerOff` emits the forced substitution as the very next event, and it avoids a contract
  change for `outPlayerId`. Known edge case: a severe goalkeeper injury at the cap is resolved by the
  outfield stand-in's line, so no "rearrange" pause fires for it (added to ticket 25).
- **Commands.** A command response clears only the injuries revealed when the command was sent, so
  an injury revealed while the command is in flight survives. Play on clears all injuries.
- **No sticky pause.** A match restored as paused with no pausing injury returns to live.
- **Prompt.** The panel reopens when the controlled club's injury count rises. "No subs left —
  rearrange…" shows only at the cap.
- **e2e.** A new `openLivePanel` helper opens the panel only if it is closed, so an injury auto-open
  cannot be toggled shut.

Tests, all failing first: `streaming-integration.test.tsx` (buffered vs revealed; opponent; subs
left; in-flight command; forced substitution resolves; later cap never pauses; restored paused
resumes) and `live-keyboard.test.tsx` (all six AC-33 and cap cases on the real provider path; red
alert text with and without the cap; a second injury reopens a closed panel).

Review: APPROVE. M1–M3, L2 and M4 were fixed test-first in a rework pass, and L3's dead session
fields were removed from fixtures.
