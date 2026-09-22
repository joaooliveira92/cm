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

**Status:** ready-for-agent

- [ ] After a red card, "Formation in play" no longer lists the sent-off player
- [ ] Editing the club Tactic mid-match does not change the list
- [ ] `pnpm check:all` green, and e2e
