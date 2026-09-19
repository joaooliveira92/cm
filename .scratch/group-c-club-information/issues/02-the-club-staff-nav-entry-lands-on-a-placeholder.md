# 02: The Club → Staff nav entry lands on a placeholder, next to a screen that already works

Found 2026-09-19 while ruling on the staff placeholders in
[group-d ticket 10](../../group-d-player-and-staff-records/issues/10-rule-on-the-staff-placeholders.md),
which ruled `staffOverview` **`deferred` rather than deleted** and anchored it here. This ticket is
that anchor.

## What is wrong

The Club section's *Staff* entry (`nav-config.ts`, `id: "club-staff"`) has
`destination: "staffOverview"`, and `staffOverview/StaffOverviewScreen.tsx` is a WIP placeholder —
an `h1` reading "Staff" and the words "WIP — Placeholder screen".

The roster it promises **already exists and works**: `clubStaff/ClubStaffScreen.tsx`, shipped by the
`club-staff-presence` effort, at `club/$clubId/staff`. So the nav offers a screen, a real
implementation of that screen sits one route away, and the two have never been connected.

## Why it was not simply re-pointed

`destinations.ts` records `clubStaff` among the club-scoped drill-downs that "need a target club and
so cannot" be a nav destination: it takes a `clubId`, and a navbar entry has only a `saveId`. Making
this work means resolving the **own** club — which is a small piece of real design, not a one-line
redirect, and is why group-d ticket 10 ruled rather than fixed.

Check first whether an own-club resolution already exists. `loadUserClub` answers it in main, and the
renderer reaches the user's club on other surfaces; if there is an established way, use it rather
than inventing a second.

## The section is the real subject

Three of the Club section's other entries point at placeholders for the same reason — `clubInfo`,
`finances`, `boardConfidence`. This ticket is the Staff one, but a fix that resolves the own club
well is likely to be what the others need too, so prefer a seam over a special case.

## Acceptance

- [ ] The Club → Staff nav entry lands on the club staff roster, showing the manager's own club
- [ ] `clubStaff`'s existing screen is reused, not duplicated — one roster implementation
- [ ] `staffOverview/` is gone, or is the thin own-club wrapper and carries no `WIP` marker
- [ ] `grep -rl "WIP" apps/desktop/src/renderer --include "*.tsx"` returns no `staff*` screen except
      `staffSearch/`, which is Group I's Screen 120
- [ ] The Group D ledger's `staffOverview` row moves from `deferred` to built, pointing here
- [ ] An e2e spec reaches the roster through the nav entry, not by address
- [ ] `pnpm check:all` green and `pnpm --filter @cm-clone/desktop test:e2e` green

**Blocked by:** None

**Status:** ready-for-agent
