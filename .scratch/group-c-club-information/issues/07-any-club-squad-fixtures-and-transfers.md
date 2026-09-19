# 07: Screens 35, 40, 42 — the any-club views of three screens that already ship

**What to build:** nothing new, three times over. Squad, Fixtures and Transfer History all ship for
the manager's own club. Each import screen is `renamed` in the ledger because the concept exists;
what is missing is the **any-club** view, and under
[the club-scoped rule](../../../.agents/notes/proposed/architecture/2026-09-19-a-club-screen-is-club-scoped-unless-only-your-club-has-one.md)
that is the same screen with its affordances gated, not a second implementation.

| Screen | Ships as | Placeholder to absorb |
|---|---|---|
| 35 Club Squad | `squad/` | `clubSquadDetail/` at `club/$clubId/squad` |
| 40 Club Fixtures | `fixtures/` | `clubFixturesDetail/` at `club/$clubId/fixtures` |
| 42 Club Transfers | `transferHistory/` | `clubTransfersDetail/` at `club/$clubId/transfers` |

**The trap is building three read-only twins.** The shipped Squad sorts, selects and drills down; an
any-club squad is a read. That is a capability difference, and two implementations of one list is
exactly how Screen 34 ended up with two placeholders carrying the same `aria-label`. Gate the
affordances on whether the club is the manager's — `ClubStaffScreen` already marks that case.

Take them one at a time. Squad is the hard one because it is the most interactive; doing it first
sets the pattern the other two follow, and if it turns out the gating is genuinely unworkable for
Squad, that is worth knowing before Fixtures and Transfers copy it.

## Acceptance

- [ ] Each of the three renders for any club, reached from a surface that names one
- [ ] One implementation per subject — no read-only twin of a screen that already exists
- [ ] Own-club affordances are gated, not duplicated, and a club that is not the manager's is marked
- [ ] The three `*Detail/` placeholders are gone, with their routes and screen-scope entries
- [ ] An e2e spec reaches at least one of them from a league-table row, the way a player would
- [ ] `pnpm check:all` green and e2e green

**Blocked by:** None. Prefer after [06](06-club-general-information.md), which establishes the
resolver pattern on a simpler screen.

**Status:** ready-for-agent

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

### Recommended re-slice

- **This ticket** keeps 40 and 42 only, and gains the club-scoped-view requirement above.
- **A new ticket** takes 35, starting from the question the rule cannot currently answer: is an
  any-club squad a second screen, or a read-only mode of a 2044-line lineup manager?
