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
