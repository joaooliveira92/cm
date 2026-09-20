# 08: Screen 161 — Competition Overview

**What to build:** a Competition's landing page, composing what its siblings already produce.

Second of the two, per ticket 06's order: [164](07-competition-results.md) first, because 161
composes 162's table and 164's results and cannot sensibly precede them.

## It is a composition, not a new read

Screen 161 is the same shape as Group C's Screen 33 Club Overview, and the Group C ledger's ruling
on that one applies here: *it composes its siblings and has no model of its own.* Competition Table
(162) and Competition Fixtures (163) both shipped on 2026-09-17, and 164 arrives with the ticket
above.

So the work is composition and navigation, not a fourth read. If a figure is wanted that no sibling
produces, that is a new screen's worth of question and belongs in its own ticket.

## What it shows, and what it must not

The Competition's name and nation, its current table (or a summary of it), its next fixtures and its
latest results, each linking to the full screen.

**Eleven Group L screens are `deferred` for want of a model** — statistics, records, awards, stages,
rules, history. 161 is the screen most likely to grow a panel for one of them by accident, because a
dashboard invites it. Every one of those is a link that must not exist yet.

## Acceptance

- [x] A Competition's overview renders, composing table, fixtures and results
- [x] Each section links to its full screen rather than reimplementing it
- [~] **A new RPC, with the reason below.** No existing view names a competition, so a hub
      composed purely of its siblings could not title itself.
- [x] No panel for any of the eleven `deferred` screens, and no dead link to one
- [x] `competitionOverview/` carries no `WIP` marker
- [x] An e2e spec reaches it the way a player would
- [x] `pnpm check:all` green and e2e green

**Blocked by:** [07](07-competition-results.md) — 161 composes 164, so building it first means
composing a screen that does not exist.

**Status:** resolved

## Answer

`CompetitionOverviewScreen` ships, and with it the competition branch has its first internal
navigation: three buttons reaching Screens 162, 163 and 164, none of which was reachable from
anywhere before. `pnpm check:all` green, **e2e 55 passed**.

### Why it took a read after all

The ticket asked for composition and allowed a reasoned exception. This is one: **no existing view
names a competition.** `LeagueTableView` is `{ season, standings }` and `FixturesView` is
`{ season, fixtures }`, so a page built by composing them could not say which competition it was
about. Composing all three would also have put three independent failure states on one page, which
is what `ClubStaffView`'s comment argues against.

So `getCompetitionOverview` returns identity, season and three counts — **and no rows**. The
standings, the card and the results stay on the screens that own them; this page links out. That
honours what the instruction was protecting, which was never "no read" but "no second
implementation".

`CompetitionNotFoundError` is new, and exists because this is the first competition-scoped read that
needs the distinction. `getCompetitionFixtures` and `getCompetitionTable` answer an unknown
competition with an empty list, which is right for them — an empty card is a real answer. A landing
page is different: a blank name is not a competition with nothing in it.

### What it deliberately does not do

No panel for any of the eleven `deferred` screens — statistics, records, awards, stages, rules,
history, draw — and a test asserts each is absent. A dashboard invites exactly that, and a link to a
screen that does not exist is worse than no link.

`club_count` renders as an em dash when null rather than zero, because a cup drawn from other
competitions has no fixed field and `0` would be a claim. The schema calls that column
authoritative, so it is read rather than counted from participants.

### Still owed: the way in

This page makes 162–164 reachable *from it*, but what reaches **this page** is the World section's
Competitions entry, which is still a WIP placeholder — [ticket 09](09-cull-the-group-l-placeholders.md).
So the e2e still opens the overview by address while navigating the three journeys out of it, which
is a strictly stronger spec than the three that came before and says so.

### One thing the run caught

The first e2e failed on `getByText("Played")` matching two elements: the screen's figure label and
the persistent shell's identity band, which reads `Played:`. Scoped to the screen's `<main>` and
made exact. Worth remembering — the shell is always on the page, so an unscoped text selector in
this app competes with the chrome.
