# 12: Live control panel commands the controlled club when it plays away

**What to build:** The Match day live control panel (`MatchControlPanel.tsx`) passes
`match.homeClubId` to `useMatchControl`, which then sends every `ChangeTactics` / `MakeSubstitution` /
`ForceOff` with that club, and reads home substitution counts, head-count and injuries. When the
manager's club is the away side, the panel commands the opponent. Pick the club from
`MatchSummary.isHome`, as the standalone screens' `useLiveMatchCommands` already does.

Found in review of [ticket 07](07-tactics-substitutions-ui.md).

**Blocked by:** None (can start immediately)

**Status:** claimed

- [ ] Panel commands carry the controlled club's id when it plays away
- [ ] Substitution counts, head-count and injury prompts read the controlled club's side
- [ ] A panel test mounts an away match and asserts the submitted `clubId`
- [ ] The panel writes the shared live tactic (`recordLiveTactic`) only after a command resolves
      without failure: today `onApplyTactics` records before the call, and the substitution records
      its optimistic line-up even when `runSubmission` swallowed a failure
- [ ] A panel substitution builds its recorded tactic from the last recorded tactic, not from
      unapplied Mentality/Tempo/Pressing edits in the draft

Since ticket 07 the panel and the standalone screens share one live tactic in `match/session.ts`, so
both the wrong-club commands and the early writes now reach the standalone screens too.
