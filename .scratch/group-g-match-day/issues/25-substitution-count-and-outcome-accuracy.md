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

**Status:** ready-for-agent

- [ ] Each case above has a test, and the count or outcome it pins is correct
