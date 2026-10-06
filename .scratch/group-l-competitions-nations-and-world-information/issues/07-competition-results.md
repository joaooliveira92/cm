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

- [x] Any Competition's played fixtures render, newest first, with scores
- [x] No fourth fixture read — or an explicit, reasoned answer for why ticket 06's instruction is
      wrong
- [x] A Competition with nothing played yet shows an empty state that is a sentence
- [x] Nothing on the screen is sourced from a model the ledger says does not exist
- [x] `competitionResults/` carries no `WIP` marker
- [~] An e2e spec reaches it **by address**, because nothing in the app links to it — and
      nothing links to Screens 162 or 163 either. See below.
- [x] `pnpm check:all` green and `pnpm --filter @cm-clone/desktop test:e2e` green

**Blocked by:** None

**Status:** resolved

## Answer

`CompetitionResultsScreen` reads `getCompetitionFixtures` — **no fourth fixture read** — and filters
to `played`, reversed. Ticket 06's instruction held: a `FixtureView` already carries `played`,
`homeGoals` and `awayGoals`, so the results list is the card's played subset and nothing more.
`pnpm check:all` green, **e2e 54 passed**.

Screens 163 and 164 now share `CompetitionFixtureTable`, extracted rather than copied. They differ
in which fixtures they pass and in what order, not in how a fixture reads.

### Two findings, neither of which is this screen's fault

**The whole competition branch is unreachable.** Screen 164 has no entry point — and neither do
Screens 162 and 163, which shipped on 2026-09-17 in the same condition. The World section's
Competitions entry is itself still a WIP placeholder, so there is no route into the branch at all.
This is the same shape as the Club → Staff defect group-c ticket 02 fixed: a real screen one route
away from a nav entry showing a stub. It belongs to [ticket 08](08-competition-overview.md), which
builds the competition's landing page, and to [ticket 09](09-cull-the-group-l-placeholders.md),
which rules on `competitions/`.

The e2e spec therefore addresses the route directly, the precedent `performance-report.spec.ts` and
`router.spec.ts` both set. It says so in its own docblock, and it is a weaker spec for it: it cannot
notice an entry point breaking, because there is none.

**Competition Results shows the current Season only.** It inherits `getCompetitionFixtures`' season
scope, so the moment a save rolls over, a full season of results vanishes from it. Found the hard
way: `seedConcluded` looked like the obvious fixture and is worse than useless here, because it
lands in **Season 2 pre-season** where the card is unplayed and the screen correctly shows nothing.

Whether that is right is a real question — Screen 172 Competition History is `deferred`, so there is
currently *nowhere* to see a past season's results — but it is not this ticket's to answer, and
Screen 163 has had the same property since it shipped. Recorded rather than fixed.

### On the e2e seed

`seedBeforeSeasonEnd`, deliberately. Pressing Continue repeatedly does not work: the Calendar stops
*before* the human's own Fixture and the control is **replaced** there rather than disabled, so the
loop times out on a button that no longer exists. That is the pre-match boundary working as
designed, and it is worth knowing before writing the next e2e that wants played football.

### Not built, and deliberately

Attendance, player-of-the-match and tactical summary. The import asks for all three; none has a
model, and they are the same three the Group C ledger `deferred`s for Screen 41 Club Results.
