# 13: Scout Player from the Player Profile

Filed 2026-09-28. Ticket 04 shipped Scouting Assignment without a way to create a Player target,
because until [decision request 01](../decision-request-01-knowledge-limited-player-reads.md) was
answered no Player list outside the manager's club was knowledge-limited. Tickets 09-11 answered it,
so a Player target can now be created from the Player Profile, which reads by Scouting Progress.
The [v1 scope note](../../../.agents/notes/implemented/architecture/2026-09-15-group-i-v1-scope.md)
records the change.

Type: task

**Status:** resolved

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

- [x] The Player Profile's bar shows Scout Player for a Player outside the manager's squad
- [x] For the manager's own Player the verb is disabled, and the bar's reason line says why
- [x] With no Scouts on the staff the verb is disabled, and the reason says so
- [x] Choosing a Scout calls `assignScout` with that Scout and the Player, and the Scouting Assignment
      screen then shows the Scout watching that Player (invalidation, not a manual refetch)
- [x] An Archived Save's refusal shows `SaveArchivedError`'s sentence inline
- [x] Renderer test for the picker and the mutation call
- [ ] `pnpm check:all` green: every gate passes except `test`, where four main-process season tests time out (see Answer)

## Answer

Resolved 2026-09-28. Renderer-only, as scoped:

- `assignScoutMutation` in `apps/desktop/src/renderer/rpc/mutations.ts`, invalidating the scouting key
  only (`INVALIDATION_RULES.assignScout`, asserted in `seam.test.ts`).
- `ScoutPlayerDialog` (`apps/desktop/src/renderer/scouting/`) lists every Scout with `statusOf`, now
  exported from `AssignScoutPanel`. A Scout already on this Player reads "Watching this player" with
  no Assign button; a refusal shows inline and keeps the picker open; success closes it.
- `ScoutPlayerAction` (`apps/desktop/src/renderer/playerProfile/`) registers the verb with the career
  bar. It is held with a reason for the manager's own Player (club compared through the squad read),
  for a club with no Scouts, and when the scouting board fails to load.
- `scout-player.test.tsx` covers all five criteria above against a stubbed preload.

An Archived Save is not pre-checked: the command's `SaveArchivedError` is shown inline, as the ticket
asks. Scouting Assignment disables its controls up front instead, so the two surfaces differ there.

Gates: typecheck, lint, effect-lint, verify-md-links and verify-db-schema pass. `test` did not:
`retention-match-streams`, `retention-participation`, `rollover-closed-world` and `rollover-exchange`
under `apps/desktop/test/main/season/` hit the 900 s timeout twice. None of them loads renderer code.
Both runs shared the machine with other sessions' full suites, so it is not yet known whether this is
load or a regression from today's `1a72355d` (Contract end date) or `805e3a5c` (training schedule).
Ticket 10 must add Make Offer to this same registration: a screen has one bar slot, so a second
`useScreenBottomBarActions` call would replace this one.

## Comments
