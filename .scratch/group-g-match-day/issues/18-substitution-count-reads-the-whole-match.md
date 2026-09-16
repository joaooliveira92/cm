# 18: The live substitution count reads the whole re-simulated match, not the revealed minutes

**What to fix:** `buildResumeSimulationView` (`apps/desktop/src/main/match/view.ts`) computes
`homeSubs` and `awaySubs` with `computeSubstitutionStatus(clubId, events)` over every event in the
re-derived timeline, including events the player has not seen yet. A Severe injury at minute 80
forces a substitution from the bench (`forcePlayerOff` in
`packages/game-engine/src/match/simulate/teamState.ts`, `forcedByInjury: true`), and that
substitution already shows as "Substitutions used: 1/5" at minute 3. The screen reveals the future
and misstates the present.

A second defect follows from the first. `resolveCommandStatus` (`src/renderer/match/commandStatus.ts`)
reports a substitution as applied only if `after.used > before.used`. `submitMatchCommand`
re-simulates the rest of the match with the command, so a manager's substitution can change who is
later injured. When the new timeline drops a future forced substitution, the count stays the same
and a substitution the engine accepted reads "Rejected — The match did not take the substitution."

Found in desktop-suite-red ticket 11. Its implementator ran an engine probe over 1,500 seeds, with a
manager substitution at minute 3:

- 118 runs had already counted substitutions before the command.
- In 51, the count afterwards was not N+1.
- In 23, it did not rise, so an accepted substitution would read as Rejected.
- The engine rejected the command in 0.

In e2e, `journeys.spec.ts` Screen 97 fails about 1 run in 30.

Cut the counts at the revealed position, the way
[ticket 09](09-match-statistics-component.md) cuts live statistics and
[ticket 16](16-live-commands-stamped-by-revealed-minute.md) stamps commands. Confirm "applied" from
the command's own `Substitution` event, not from a count difference.

**Blocked by:** None (can start immediately)

**Status:** claimed

- [ ] Substitutions used and windows used count only events at or before the revealed position
- [ ] An accepted manager substitution reads as applied even when re-simulation removes a later forced substitution
- [ ] A test pins both with a seed where a forced injury substitution happens after the manager's command
