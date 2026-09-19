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

**Status:** resolved

- [x] Substitutions used and windows used count only events at or before the revealed position
- [x] An accepted manager substitution reads as applied even when re-simulation removes a later forced substitution
- [x] A test pins both with a seed where a forced injury substitution happens after the manager's command

## Answer

Resolved 2026-09-16. Code landed in `d8170df`. The review and close-out follow in the next commit.

- **Revealed position.** `resumeSimulation` and `submitMatchCommand` payloads carry
  `revealedEvents: NullOr(Finite)`, the number of revealed Commentary Lines (null means the whole
  match), reusing ticket 09's mechanism.
- **Counts.** `buildResumeSimulationView` counts forced substitutions only below that position.
  Manager substitutions count once journaled: the engine applies a command at the start of its
  minute, so a position cut would drop a second command in the same minute. The exemption can run
  ahead of the reveal on two paths filed as [23](23-match-day-remount-replays-from-kickoff.md) and
  [24](24-match-day-panel-halftime-toggle-is-ungated.md).
- **Applied.** `submitMatchCommand` returns `SubmitMatchCommandView` with
  `substitutionApplied: NullOr(Boolean)`. It is read from the re-derived timeline's own non-forced
  Substitution event for that pair and minute, not from a count difference.
  `resolveCommandStatus` uses it.
- **Tests.** `test/main/match/revealed-substitutions.test.ts` uses
  `FORCED_SUB_AFTER_COMMAND_SEED = 550` on world 20260906. The human club's only substitution is
  forced at minute 84, and a minute-3 manager substitution re-simulates it away. The test re-checks
  that property, so seed drift fails loudly. `packages/contracts/test/match-command-outcome.test.ts`
  covers the round trips.

Review: APPROVE. The doc comments that claimed manager substitutions are never ahead of the reveal
are corrected. Follow-ups filed: [20](20-a-command-rewrites-play-already-seen.md),
[21](21-injury-prompt-and-decision-pause-never-fire.md),
[22](22-match-responses-carry-state-ahead-of-the-reveal.md), 23, 24,
[25](25-substitution-count-and-outcome-accuracy.md).
