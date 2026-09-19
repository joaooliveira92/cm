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

- [ ] Each of the six folders has an explicit ruling, and the three unmapped ones name which of the
      three cases above applies
- [ ] The Group D ledger gains a row per unmapped folder, so the ruling is durable rather than living
      in this ticket
- [ ] Whatever is ruled removed is removed with its route, nav entry and key binding
- [ ] `grep -rl "WIP" apps/desktop/src/renderer --include "*.tsx"` returns no `staff*` screen that
      this ticket ruled removed
- [ ] `staffSearch/` is untouched, and the ticket says why
- [ ] e2e green, `pnpm check:all` green

**Blocked by:** None

**Status:** ready-for-agent
