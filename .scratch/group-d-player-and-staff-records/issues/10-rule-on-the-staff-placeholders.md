# 10: The staff placeholders, three of which answer to no screen

**What to build:** nothing, but a ruling before any deletion. Six `staff*` folders are routed; only
three map onto a Group D screen. The ledger is explicit that this ticket must **rule on each rather
than assume**, which is why it is separate from [09](09-cull-the-player-placeholders.md).

## The three that map

| Folder | Screen | Kind |
|---|---|---|
| `renderer/staffProfile/` | 64 Staff Profile | `out-of-scope` — the closed role set |
| `renderer/staffContract/` | 65 Staff Contract | `out-of-scope` — the closed role set |
| `renderer/staffHistory/` | 66 Staff History | `out-of-scope` — the closed role set |

These three are the easy half. `out-of-scope` under the closed role set is a ruling about what Staff
*are* in this game, not an observation that a model is missing, so nothing brings them back.

## The three that do not

`renderer/staffJobInfo/`, `renderer/staffOverview/` and `renderer/staffAttributes/` answer to no
screen in the Group D import at all. A deletion here is not the cull finishing its list — it is a
disposition being made for the first time, on a surface nobody specified.

Rule on each, and say which of three cases it is:

1. **It belongs to another group.** `staffSearch/` is Group I's Screen 120 and is not this group's to
   touch; check the same for these three before ruling.
2. **It is a surface this game wants, unspecified.** Then it is `deferred` with an anchor, and the
   ledger gains a row — not a silent deletion.
3. **It is a placeholder for a screen nobody asked for.** Then it goes, and the ledger records that
   it existed and why it went. A route nobody specified and nobody can point at a spec for is the
   clearest case there is, but it still gets a row: the next reader should not have to re-derive that
   these were considered.

Staff exist in this game — `career/staff.ts` materialises them, and Group K/H surfaces use them — so
"Staff screens are out of scope" is a claim about *these* screens, not about the concept. Check what
each folder renders before ruling on it.

## Acceptance

- [x] Each of the six folders has an explicit ruling, and the three unmapped ones name which of the
      three cases above applies
- [x] The Group D ledger gains a row per unmapped folder, so the ruling is durable rather than living
      in this ticket
- [x] Whatever is ruled removed is removed with its route, nav entry and key binding
- [x] `grep -rl "WIP" apps/desktop/src/renderer --include "*.tsx"` returns no `staff*` screen that
      this ticket ruled removed
- [x] `staffSearch/` is untouched, and the ticket says why
- [x] e2e green, `pnpm check:all` green

**Blocked by:** None

**Status:** resolved

## Answer

Five deleted, one kept. The whole `staff/$staffId` route branch went with the five — no per-staff
surface survives, so its parent route, its URL-segment map and its line in `screenIdOfPath` are gone
too. Leaving an empty parent routing to nothing would have been the cull stopping one level short.

### The three that mapped (64–66) — `out-of-scope`, deleted

The closed role set disposes 64, and `CONTEXT.md` disposes the other two in its own words rather than
by inheritance: **Staff never touch Contract or Wage Budget**, and Staff are *fixed for the life of a
career* — they neither develop, age, nor turn over. So 65 Staff Contract has no contract to show and
66 Staff History has no history.

### The two that mapped to nothing — `out-of-scope`, first ruled here

`staffAttributes/` and `staffJobInfo/` answer to no screen in this import, so removing them is a
disposition made for the first time, and the ledger carries a row for each.

Both are disposed by the same sentence that disposed 64–66, a fortiori. A Coach carries a single
quality number, not an Attribute sheet, and cannot develop; "job information" means employment terms,
and there are no Staff wages, no hiring and no firing. Neither is a screen whose *model* is missing —
each is a screen whose *subject* does not exist in this game, which is what `out-of-scope` means and
why the absence-of-a-model rule does not apply.

### `staffOverview/` — `deferred`, kept, and the one real finding

It answers to no import screen either, but unlike the other five it is **a live navbar destination**:
the Club section's *Staff* entry points at it. So the nav offers a screen called Staff and delivers a
WIP placeholder — while the real roster **already exists**, shipped as `clubStaff` at
`club/$clubId/staff` by the `club-staff-presence` effort.

Deleting it would remove a nav entry the game wants. It is `deferred` with an owner rather than
disposed: `destinations.ts` records that `clubStaff` is club-scoped and cannot itself be a nav
destination, so connecting them means resolving the *own* club — a small piece of real design. Its
three Club-section siblings (`clubInfo`, `finances`, `boardConfidence`) are placeholders for the same
reason, and that section is Group C's remainder, M1 step 3.

Filed as [group-c ticket 02](../../group-c-club-information/issues/02-the-club-staff-nav-entry-lands-on-a-placeholder.md).

### Where this leaves M1 exit criterion 1

`grep -rl "WIP" apps/desktop/src/renderer --include "*.tsx"` now returns two `staff*` screens:
`staffSearch/` (Group I's Screen 120, never this group's) and `staffOverview/` (deferred above). No
`player*` screen from Group D remains. The `club*`, `competition*` and `nation*` share is steps 3
and 4.

### Validation

`pnpm check:all` green. e2e green — 46 passed.
