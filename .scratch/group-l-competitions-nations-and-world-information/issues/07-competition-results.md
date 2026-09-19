# 07: Screen 164 — Competition Results

**What to build:** any Competition's *played* fixtures, newest first — the results half of what
Screen 163 shows as a calendar.

Ticket 06 named the order and the effort closed without filing this: **164 first, then
[161](08-competition-overview.md)**, because 161 composes what 164 and 162 produce and cannot
sensibly precede them.

## Reuse the fixture read, do not add a third

Ticket 06 is explicit: **reuse `getCompetitionFixtures` rather than adding a third fixture read.** A
`FixtureView` already carries `played`, `homeGoals` and `awayGoals`, so a results list is that read
filtered and ordered, not a new query.

There are now three fixture reads and a fourth would be one too many —
`getFixtures` (the human's own calendar), `getCompetitionFixtures` (one Competition's card) and
`getClubFixtures` (one club's matches wherever they fall, added by group-c ticket 07). Each answers
a question the others cannot; "the played subset of a Competition's card" is not such a question.

If filtering on the renderer turns out to be wrong — a full pyramid's card is large — say so in the
answer rather than quietly adding the read, because that is the judgement ticket 06 made and it
deserves to be overturned explicitly if it was wrong.

## What it shows

Played fixtures with their score, newest first, for the named Competition. `competitionResults/` is
the placeholder to replace.

**Not attendance, not player-of-the-match, not tactical summary.** The import asks for those and
none has a model — the same three the [Group C ledger](../../../docs/specs/group_c_club_information/RECONCILIATION.md)
`deferred`s for Screen 41 Club Results. A screen showing an invented attendance is worse than the
placeholder it replaces.

## Acceptance

- [ ] Any Competition's played fixtures render, newest first, with scores
- [ ] No fourth fixture read — or an explicit, reasoned answer for why ticket 06's instruction is
      wrong
- [ ] A Competition with nothing played yet shows an empty state that is a sentence
- [ ] Nothing on the screen is sourced from a model the ledger says does not exist
- [ ] `competitionResults/` carries no `WIP` marker
- [ ] An e2e spec reaches it the way a player would
- [ ] `pnpm check:all` green and `pnpm --filter @cm-clone/desktop test:e2e` green

**Blocked by:** None

**Status:** ready-for-agent
