# 43: "Formation in play" lists the pitch the match reports

Split from the review of [40](40-a-live-change-tactics-changes-only-instructions.md), 2026-09-22, orchestrator.

**What to fix:** Match Tactics' "Formation in play" list (`MatchMatchTacticsScreen`, `TacticsForm`) renders
the renderer's `liveTactic ?? tacticsResult.value.tactic` (`useLiveMatchCommands.ts`). That tactic applies
the manager's substitutions but not red cards, injury-forced substitutions or bring-offs, so after a
dismissal it still lists the sent-off player. And before any live change is recorded it falls back to the
club's persisted Tactic, which the Squad screen can edit mid-match; since 40 the engine ignores such edits,
so the list can show an XI the match does not have. Render the players from the match response's
`MatchPitchView`, as the substitution pickers already do.

**Blocked by:** None

**Status:** resolved

- [x] After a red card, "Formation in play" no longer lists the sent-off player
- [x] Editing the club Tactic mid-match does not change the list
- [x] `pnpm check:all` green, and e2e

## Answer

Resolved 2026-09-22. "Formation in play" lists `snapshot.pitch.onPitch`, the match's `MatchPitchView`, by
the same data path the Match Substitutions screen uses. A sent-off or forced-off player is absent and a
goalkeeper stand-in shows in goal; editing the club Tactic mid-match changes nothing. No contract change.
Nothing displays the live tactic's slots any more.

Left (low): the "Formation: X" label still reads the draft tactic, so if the Squad screen changes the club's
formation mid-match before any live change, the label names the edited formation above the kickoff shape.
Fixing it means a kickoff formation on `MatchPitchView`. Reviewed inline by the orchestrator.
Report: [group-g-match-day](../../../.ai/reports/group-g-match-day.md).
