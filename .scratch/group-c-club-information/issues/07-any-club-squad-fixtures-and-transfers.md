# 07: Screens 40 and 42 — the any-club views of two read-only screens

**What to build:** nothing new, twice over. Fixtures and Transfer History both ship for the
manager's own club and are genuinely read-only — zero `onClick`, zero `button` in either. Each
import screen is `renamed` in the ledger because the concept exists; what is missing is the
**any-club** view, which under
[the club-scoped rule](../../../.agents/notes/proposed/architecture/2026-09-19-a-club-screen-is-club-scoped-unless-only-your-club-has-one.md)
is the same screen reached with a club in hand, plus an own-club resolver for the nav entry.

| Screen | Ships as | Placeholder to absorb |
|---|---|---|
| 40 Club Fixtures | `fixtures/` (113 lines, read-only) | `clubFixturesDetail/` at `club/$clubId/fixtures` |
| 42 Club Transfers | `transferHistory/` (108 lines, read-only) | `clubTransfersDetail/` at `club/$clubId/transfers` |

**Screen 35 Squad was removed from this ticket** on 2026-09-19 and is
[ticket 10](10-the-any-club-squad.md). It is not the same kind of thing: `renderer/squad/` is 2044
lines of lineup *manager*, and gating that by whose club it is means one boolean threaded through
thirteen files. See this ticket's Findings below.

## What the earlier attempt learned, and what to start from

**Each needs a club-scoped view carrying the club's identity.** `TransferHistoryView` is
`{ entries }` and `FixturesView` is `{ season, fixtures }` — neither can title itself with the
club's name or mark a club that is not the manager's. Reaching for a second read to get the name is
the trap `ClubStaffView`'s own comment names: *one read, one failure to render, and no state where
the page knows the staff but not whose they are.* Model the new views on `ClubStaffView` and
`ClubInformationView`, both of which carry `club` and `isUserClub`.

**A club-scoped fixtures read is a *third* fixture read, not a widening.** `getCompetitionFixtures`
carries the comment *"Any Competition's Fixture list, not just the human club's. Scoped by
`competitionId` rather than widening `getFixtures`, which is deliberately the human's own
calendar."* One club's matches fall across a league and a cup, so filter on
`home_club_id`/`away_club_id` rather than on a competition. Widening `getFixtures` breaks the thing
that comment protects.

**`readTransferHistory` is already club-parameterised** — only `getTransferHistoryScreen` hardcodes
`loadUserClub`, so Screen 42's read is a sibling entry point rather than a second query.

**An unknown club is `ClubNotFoundError`, never an empty list.** A club with no completed transfers
and a `results-only` club with no fixtures are both real answers, so a missing club must not be able
to impersonate one.

## Acceptance

- [x] Both render for any club, reached from a surface that names one
- [x] One implementation per subject — no read-only twin of a screen that already exists
- [x] Each club-scoped view carries `club` and `isUserClub`, so one read answers the whole page
- [x] A club that is not the manager's is marked, as `ClubStaffScreen` marks it
- [x] The Recruitment and Analysis nav entries still reach the manager's own, through a resolver
- [x] Both `*Detail/` placeholders are gone, with their routes and screen-scope entries
- [x] An unknown club fails with `ClubNotFoundError` rather than rendering an empty list
- [x] An e2e spec reaches at least one of them from a league-table row, the way a player would
- [x] `pnpm check:all` green and e2e green

**Blocked by:** None. [06](06-club-general-information.md) has already established the resolver
pattern and the club-scoped view shape; follow it rather than reinventing either.

**Status:** resolved

## Findings from an abandoned attempt, 2026-09-19

Started, then reverted before committing. The code was backend-only — two RPCs and their handlers,
typechecking green — and shipping reads with no screen behind them is dead code, so it went back.
What it bought is worth more than the code was: **this ticket bundles three screens that are not
alike, and one of them is a different case entirely.**

### Screen 35 Squad is not "the same screen with gated affordances"

`renderer/squad/` is **2044 lines across thirteen files** — a provider, a table, drag handling,
lineup edits, selection, announcements, columns and a session hook. It is a *lineup manager*.
An any-club squad is a *roster*, and `renderer/fixtures/` (113 lines) and
`renderer/transferHistory/` (108) are what a read-only club surface actually costs.

Gating that by whose club it is would mean a 2044-line component conditional on one boolean nearly
throughout. The ticket said "if it turns out the gating is genuinely unworkable for Squad, that is
worth knowing before Fixtures and Transfers copy it" — it is, and here it is.

**This needs its own ticket and probably an amendment to
[the club-scoped rule](../../../.agents/notes/proposed/architecture/2026-09-19-a-club-screen-is-club-scoped-unless-only-your-club-has-one.md).**
The rule's stated exception is subject existence, and Squad does not fit it: every club has a squad.
The real discriminator it is missing is whether the manager's own surface *acts* on the data or only
reads it. Staff and Club Information are read-only both ways, which is why the resolver worked
twice. A lineup manager is not a read.

### Fixtures and Transfers do fit the rule, and need one thing this ticket did not anticipate

Both screens are genuinely read-only — zero `onClick` or `button` in either — so one screen with an
own-club resolver is right for them. But the club-scoped versions need the **club's identity on the
wire**, which the existing views do not carry: `TransferHistoryView` is `{ entries }` and
`FixturesView` is `{ season, fixtures }`. Neither can title itself with the club's name or mark a
club that is not the manager's.

Reaching for a second read to get the name is the trap `ClubStaffView`'s own comment names — "one
read, one failure to render, and no state where the page knows the staff but not whose they are".
So each needs a club-scoped view carrying `club` and `isUserClub`, as `ClubStaffView` and
`ClubInformationView` do. That is the shape the next attempt should start from.

### A precedent worth reading before starting

`getCompetitionFixtures` exists with the comment: *"Any Competition's Fixture list, not just the
human club's. Scoped by `competitionId` rather than widening `getFixtures`, which is deliberately
the human's own calendar."* So there are already two fixture reads answering different questions,
and a club-scoped one is a **third** — one club's matches wherever they fall, filtered on
`home_club_id`/`away_club_id` rather than on a competition, so a club in a league and a cup sees
both. Widening `getFixtures` would break the thing that comment is protecting.

### Re-sliced, 2026-09-19

Done. This ticket is 40 and 42; Screen 35 is [ticket 10](10-the-any-club-squad.md).

## Answer

Both ship. `ClubFixturesDetailScreen` at `club/$clubId/fixtures` and `ClubTransfersDetailScreen` at
`club/$clubId/transfers`, each titled with the club and marking one that is not the manager's.
`pnpm check:all` green (2040 tests), **e2e 50 passed**.

### One implementation per subject, enforced by extraction

The own-club screens were not wrappers waiting to happen — their list bodies were inline. So both
were extracted rather than copied:

- `fixtures/FixtureDayList.tsx` — the day-grouped fixture list, now rendered by `FixturesScreen`
  and the club-scoped screen.
- `transferHistory/TransferEntriesTable.tsx` — the transfer table, likewise, carrying the Free Agent
  wording for a null selling club with it.

That is what keeps this honest. Two screens rendering two copies of the same list is how Screen 34
ended up with two placeholders sharing an `aria-label`.

### The nav entries did not need resolvers after all

`fixtures` and `transferHistory` are already save-scoped destinations with working own-club screens.
The club-scoped rule asks for one screen per subject and a resolver *for the nav entry* — here the
nav entry already had a screen, and it is the same list. Adding a resolver would have replaced a
working screen with a wrapper around a screen that renders the same component. So: two screens, one
list, no resolver. Screens 38 and 34 needed resolvers because their nav entries pointed at
placeholders; these did not.

### A circular import, caught by a schema that never initialised

The first attempt declared both views in `schemas/clubs.ts`, which meant importing `FixtureView`
from `season.ts` and `TransferHistoryEntryView` from `transfers.ts`. But `transfers.ts` **already
imports `ClubSummary` from `clubs.ts`** — so that closed a cycle, and the failure surfaced as
`Cannot read properties of undefined (reading 'ast')` from an unrelated schema in `squad.ts` at
module-init time.

Fixed by declaring each view where the dependency already flows: `ClubFixturesView` in `season.ts`
(a fresh one-way season→clubs edge) and `ClubTransfersView` in `transfers.ts` (which already
depends on clubs). Both carry a comment saying why they live there, because the obvious home is
`clubs.ts` and the next person will try it.

### Guards that fired, and one self-inflicted bug

`club-surface-entries.test.tsx` broke again, as designed — the row carries five controls now.
`adapter-coverage` and the destination classification map both demanded entries, each a compile
error rather than a dead button.

The self-inflicted one: an earlier rewrite of `season/index.ts` had collapsed its export list, and
my patch targeted the multi-line form that no longer existed — so `getClubFixtures` was silently
never exported. The tests failed with `not iterable`, which is what a missing export looks like
through `yield*`. Worth remembering: a `sed` that rewrites a line range makes later structural
patches miss quietly.

### Screen 35 is elsewhere

Split to [ticket 10](10-the-any-club-squad.md), and the club-scoped rule now carries
[an amendment](../../../.agents/notes/proposed/architecture/2026-09-19-a-club-screen-is-club-scoped-unless-only-your-club-has-one.md)
for the discriminator this ticket found: whether the manager's own surface *acts* on the data or
only reads it.
