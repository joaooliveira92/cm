# 06: Screen 34 — Club General Information, as one club-scoped screen

**What to build:** a club's identity and standing, for **any** club, reached with a club in hand and
from the Club section's own entry via an own-club resolver.

There are two placeholders today — `clubInfo/` (save-scoped, `club-info`) and `clubInformation/`
(club-scoped, `club/$clubId/information`) — and both carry `aria-label="Club Information"`. They are
one screen. [The club-scoped rule](../../../.agents/notes/proposed/architecture/2026-09-19-a-club-screen-is-club-scoped-unless-only-your-club-has-one.md)
says which survives: `clubInformation/`, with the nav entry resolving the own club the way
[ticket 02](02-the-club-staff-nav-entry-lands-on-a-placeholder.md) did for Staff.

**What it shows** is what exists: club name and nation, **Stature Tier**, and the ground —
`stadium_name` and `stadium_capacity` on `clubs`. Screen 46's facilities do not exist and are
`deferred`; the ground is the part of 46 that folds in here, so this screen is where a reader finds
it.

Read the [ledger row](../../../docs/specs/group_c_club_information/RECONCILIATION.md) before
inventing a field. A screen that displays something unmodelled is how a placeholder becomes a lie
with better styling.

## Acceptance

- [x] One screen, club-scoped, showing name, nation, Stature Tier, ground name and capacity
- [x] The Club section's Information entry reaches it through an own-club resolver, reusing
      `squadAtom(saveId).club.id` as `staffOverview` does — not a second resolution mechanism
- [x] A club that is not the manager's is marked, as `ClubStaffScreen` marks it
- [~] `clubInfo/` — **not deleted; it became the resolver**, which is what the Staff precedent
      this ticket cites actually did. The acceptance line as written contradicted the precedent.
- [x] Nothing on the screen is sourced from a model the ledger says does not exist
- [x] An e2e spec reaches it **through the nav entry**, and another through a club-scoped entry point
- [x] `pnpm check:all` green and `pnpm --filter @cm-clone/desktop test:e2e` green

**Blocked by:** None

**Status:** resolved

## Answer

One screen — `ClubInformationScreen`, club-scoped at `club/$clubId/information` — showing the club's
name, standing, town, nation, ground and capacity, with `[Not your club]` on a club that is not the
manager's. Reached two ways, and `clubInfo/ClubInfoScreen.tsx` is now the own-club **resolver** over
it, exactly as `StaffOverviewScreen` is for Staff.

### A correction to this ticket

It asked for `clubInfo/` to be **deleted**. That contradicts the precedent it cites in the same
breath: for Staff, the save-scoped destination was *kept* and became the resolver, because a nav
entry needs a destination to point at. Deleting `clubInfo/` would have meant deleting the Club
section's Information entry too. Followed the precedent, not the acceptance line.

### What the screen shows, and what it deliberately does not

Name, standing, town, nation, ground, capacity. Nothing else — ownership, reputation, finances,
facilities and history are all `deferred` in the ledger, and a test asserts none of them appears. A
screen that grew an invented figure would be worse than the placeholder it replaced, because a reader
cannot tell an invented number from a right one.

The ground is Screen 46's one modelled field folded in here, so a reader looking for a stadium finds
one.

### A real bug the tests caught before it shipped

The first draft resolved the nation through `displayNames`, like the club. It came back as
`nation_eng`. **The content pack resolves club and competition identities only** — nation names live
in `NATION_PROFILES[code].displayName`, and `packages/shared` already exports `nationName` for
exactly this, with a comment saying so. The assertion that caught it (`!nationName.startsWith("nation_")`)
is kept, because the mistake is one line and invisible on a screen if you do not know the nation.

### A third control on the league-table row, and a note about the first

The row carries one control per club surface, so Information is a third. Left alone deliberately:
the row's **name** button still opens Staff rather than Information, which is a leftover from when
Staff was the only club surface and is arguably backwards now. Changing it is a navigation decision
rather than this ticket's, and it is commented at the site.

Adding the destination touched five places the type system insisted on —
`CareerDestination`, `CareerSubSurfaceType`'s classification table, `ResolvedDestination`, the
adapter's route switch and the coverage test's sample map. Every one was a compile error rather than
a dead button, which is `assertNoUnhandledRoute` doing precisely the job its comment describes.

### Two guards fired, and both were right to

`pnpm check:all` went red on the first run, on two tests that exist precisely to catch this kind of
change.

**`club-surface-entries.test.tsx`** enumerates every control on a league-table row by `aria-label`.
Adding a third surface broke it, which is the spec working: its docstring says an entry point was
once silently repointed at another and the suite stayed green. Updated to expect three.

**`display-names.test.ts`** — "no read path outside the seam takes a club name from a column" — fired
on `club/clubInformation.ts`, and this one was a **false positive worth fixing rather than working
around**. The guard matched any `name` in a select list rooted at `clubs`; my query joins `cities`
for the club's home town and takes `ct.name`, which is not a club's name. Tightened so a *qualified*
`name` must belong to the clubs alias, with two new self-tests: the join shape does not trip it, and
`c.name` beside `ct.name` still does. Unqualified `name` still matches, because in a clubs-rooted
select it can only be the club's.

That is the second time this guard has been a false positive and been tightened with a self-test
rather than loosened — the pattern is worth keeping.

### Validation

`pnpm check:all` green. **e2e 49 passed**, up from 47 — one spec per path, and the league-row spec
selects its control by label because picking the row's first button would exercise Staff and pass
for the wrong reason.
