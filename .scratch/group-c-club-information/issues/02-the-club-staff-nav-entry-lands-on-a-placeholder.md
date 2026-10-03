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

- [x] The Club → Staff nav entry lands on the club staff roster, showing the manager's own club
- [x] `clubStaff`'s existing screen is reused, not duplicated — one roster implementation
- [x] `staffOverview/` is gone, or is the thin own-club wrapper and carries no `WIP` marker
- [x] `grep -rl "WIP" apps/desktop/src/renderer --include "*.tsx"` returns no `staff*` screen except
      `staffSearch/`, which is Group I's Screen 120
- [x] The Group D ledger's `staffOverview` row moves from `deferred` to built, pointing here
- [x] An e2e spec reaches the roster through the nav entry, not by address
- [x] `pnpm check:all` green and `pnpm --filter @cm-clone/desktop test:e2e` green

**Blocked by:** None

**Status:** resolved

## Answer

`StaffOverviewScreen` is now a **resolver, not a screen**: it reads the own club's id and hands off
to `ClubStaffScreen`, which is the roster and stays the only one.

The missing piece really was just the club id. `ClubStaffScreen` takes a `clubId` because it is a
drill-down reached from a surface that already names a club; a navbar entry names only a save. That
is the whole reason `destinations.ts` excludes club-scoped drill-downs from save-scoped nav, and the
whole reason this entry pointed at a placeholder for as long as it did.

`getSquad` already carries the own club — it is the read every own-club surface uses — so no new RPC,
no new atom and no second roster. The resolver owns exactly two states, the squad read's loading and
failure; once the club is known the roster owns everything after, including its own loading line. A
second spinner here would have reported on a read that had not started.

### The e2e spec goes through the navbar, because the navbar is the subject

`club-staff-nav.spec.ts` clicks Club → Staff. A spec that addressed `club/$clubId/staff` directly
would have passed for the entire life of this defect, which is the point: the roster was never
broken, the entry was. `launchApp.ts`'s `NAV_PATH` gains `"club staff"`, so the next navigation
change is one edit rather than a scatter.

e2e: **47 passed**, up from 46.

### Two notes for whoever takes the siblings

`clubInfo`, `finances` and `boardConfidence` are placeholders in the same section, but they are not
the same shape as this one — this was a built screen waiting on an id, and those three have no
implementation anywhere. Reusing this resolver for them would be cargo cult; what transfers is the
observation that `squadAtom(saveId).club.id` is the established own-club resolution in the renderer.

And a process one: `npx playwright test` skips `pretest:e2e`, which is `pnpm build`. Running it that
way tested a stale bundle and reported this fix as failing, with a snapshot showing the old
placeholder. Always go through `pnpm --filter @cm-clone/desktop test:e2e`.
