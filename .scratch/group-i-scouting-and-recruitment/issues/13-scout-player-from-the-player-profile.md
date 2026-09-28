# 13: Scout Player from the Player Profile

Filed 2026-09-28. Ticket 04 shipped Scouting Assignment without a way to create a Player target,
because until [decision request 01](../decision-request-01-knowledge-limited-player-reads.md) was
answered no Player list outside the manager's club was knowledge-limited. Tickets 09-11 answered it,
so a Player target can now be created from the Player Profile, which reads by Scouting Progress.
The [v1 scope note](../../../.agents/notes/implemented/architecture/2026-09-15-group-i-v1-scope.md)
records the change.

Type: task

**Status:** ready-for-agent

**Blocked by:** none.

**What to build:** a **Scout Player** verb on the Player Profile (`PlayerProfileScreen`) that points
one of the club's Scouts at the Player on screen. This is renderer work only. The command already
exists end to end: `assignScout({ saveId, scoutId, playerId })` in
`packages/contracts/src/rpc-scouting.ts`, served by `assignScout` in
`apps/desktop/src/main/club/scouting.ts`. It returns the updated `ScoutingView`. The renderer has no
mutation for it yet; `assignScoutToClubMutation` in `apps/desktop/src/renderer/rpc/mutations.ts` is
the pattern to copy.

- The verb is registered with the career bar through `useScreenBottomBarActions`, the same way
  Tactics and Player Search do it. It is a secondary: the career bar's primary slot belongs to
  Continue (`describeCareerBottomBar`).
- Pressing it opens a Scout picker listing every Scout from `getScouting` with quality and current
  target, so the manager knowingly chooses whom to redirect. `statusOf` in
  `apps/desktop/src/renderer/scouting/AssignScoutPanel.tsx` already phrases that line. Reassigning a
  busy Scout is allowed; the command's doc says so.
- On success the scouting read is invalidated, the same key `assignScoutToClub` invalidates. The
  profile's figures do not change on assignment, since progress accrues as the Calendar advances,
  so there is no need to refresh the profile read.
- Typed errors (`UnknownScoutError`, `PlayerNotFoundError`, `SaveArchivedError`,
  `SaveNotFoundError`) show inline through `describeRpcError`, as `AssignScoutPanel` does.

**Not in this ticket:** assignment duration, cadence or priority (out of scope in the map), a
shortlist (124 stays deferred), and Scout Player on any other screen.

**Parallel work:** Group J ticket 10 adds Make Offer to the same Profile bar. Whichever lands second
adds its button next to the first one; neither owns the bar.

- [ ] The Player Profile's bar shows Scout Player for a Player outside the manager's squad
- [ ] For the manager's own Player the verb is disabled, and the bar's reason line says why
- [ ] With no Scouts on the staff the verb is disabled, and the reason says so
- [ ] Choosing a Scout calls `assignScout` with that Scout and the Player, and the Scouting Assignment
      screen then shows the Scout watching that Player (invalidation, not a manual refetch)
- [ ] An Archived Save's refusal shows `SaveArchivedError`'s sentence inline
- [ ] Renderer test for the picker and the mutation call; `pnpm check:all` green

## Comments
