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

- [ ] One screen, club-scoped, showing name, nation, Stature Tier, ground name and capacity
- [ ] The Club section's Information entry reaches it through an own-club resolver, reusing
      `squadAtom(saveId).club.id` as `staffOverview` does — not a second resolution mechanism
- [ ] A club that is not the manager's is marked, as `ClubStaffScreen` marks it
- [ ] `clubInfo/` is deleted with its route, nav wiring and screen-scope entries
- [ ] Nothing on the screen is sourced from a model the ledger says does not exist
- [ ] An e2e spec reaches it **through the nav entry**, and another through a club-scoped entry point
- [ ] `pnpm check:all` green and `pnpm --filter @cm-clone/desktop test:e2e` green

**Blocked by:** None

**Status:** ready-for-agent
