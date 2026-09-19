# 25: Substitution counts and command outcomes are wrong in edge cases

**What to fix:** smaller inaccuracies found in the review of
[ticket 18](18-substitution-count-reads-the-whole-match.md):

- **Goalkeeper stand-ins count as substitutions.** When an outfield player is pulled into goal
  (`teamState.ts` `emptySlot`, on a red-severity injury with no bench or cap left, or a ForceOff of
  the last goalkeeper), the engine emits `Substitution { forcedByInjury: true }` without spending a
  substitution. `used` can overcount, even past the cap.
- **Minute 45 and windows.** `windowsUsed` skips every minute-45 substitution. That misses a
  first-half-stoppage command clamped to 45, which does spend a window, and a forced substitution in
  regular minute 45.
- **Statistics disagree with the panel.** `getMatchStatistics` cuts manager substitutions purely by
  position, so its count can differ from the panel's.
- **False "applied".** `substitutionApplied` uses `events.some(...)`. Submitting the same pair twice
  in one minute is refused the second time, yet it still reads applied because the first event
  matches. Compare the number of matching events with the number of matching journaled `SubstitutionMade` entries.
- **Severe goalkeeper injury at the cap.** The renderer resolves a revealed Injury when a
  Substitution line follows it at the same minute (ticket 21). The goalkeeper stand-in emits one, so
  no "rearrange" pause fires, although the team is down to ten.
- **ForceOff outcome.** It is never confirmed, although `applyForcedOff` returns a boolean.

**Blocked by:** None

**Status:** resolved

- [x] Each case above has a test, and the count or outcome it pins is correct

## Answer

Resolved 2026-09-17. Substitution facts now come from a pure module,
`apps/desktop/src/main/match/substitutions.ts` (`substitutionLedger`, `classifySubstitutions`,
`substitutionStatus`, `substitutionApplied`). The resume read, command response, statistics and Match
Report all use it.

1. **Goalkeeper stand-ins** are not counted. `classifySubstitutions` walks each club's substitutions in
   timeline order with the engine's counters. A forced Substitution is a stand-in when:
   - it does not directly follow a same-minute red Injury of its outgoing player (a bring-off's drag);
   - the caps would refuse the bench path;
   - no one is left on the bench (the fold's `benchless`).

   It does not depend on the pitch fold, so it holds after a live tactics change.
2. **Windows** follow the engine's raw-minute rule. A halftime instruction neither opens a window nor
   moves the minute. A minute-45 substitution is a live command only while an unmatched journaled
   live-45 command of that pair remains and the caps allow it.
3. **Statistics** use the panel's counted substitutions.
4. **`substitutionApplied`** compares the number of matching non-forced events with the number of
   matching journaled commands, including the new one.
5. **`forceOffApplied: NullOr(Boolean)`** is on `SubmitMatchCommandView`, keyed by journal position.
   `resolveCommandStatus` reports applied, rejected "The player was not on the pitch.", or, for null,
   "The match did not confirm the bring-off."
6. **`InjuryView.replaced`** is true only for a red Injury whose next event is a same-minute forced
   Substitution that is not a stand-in. The renderer resolves an injury on a Substitution line only
   when it was replaced, so a severe goalkeeper injury at the cap pauses.

**Tests.**

- `test/main/match/substitutions.test.ts`: a pure table of 9 cases, including a forced substitution
  bringing the same player on twice, a cap-refused drag, live-45 plus halftime, and stoppage 48 vs
  second-half 47/48.
- `test/main/match/substitution-accuracy.test.ts`: seeds 26, 1292, 216 and 550, with properties
  re-verified.
- Contracts round trips, `command-status.test.ts`, and the `streaming-integration` pause at a
  stand-in.

**Review.** The first review returned NEEDS_REWORK. M1: stand-in detection via the pitch fold miscounted
after a live tactics change. Reworked test-first, together with L1 (`replaced` true for a knock), L4
(test file under the line ceiling), L5 (the table test) and the nits. Follow-ups:

- [29](29-substitution-windows-share-a-minute-across-halves.md): windows share a raw minute across
  halves.
- [30](30-match-report-lists-goalkeeper-stand-ins-as-substitutions.md): the Match Report lists
  stand-ins as substitutions.
- The `forceOffApplied` drift after a live tactics change is recorded on decision request 01.
