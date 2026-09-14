# 03 — Missing systems disposition

Type: grilling

## Question

Several Group D screens describe features with no counterpart in this game:

- Screen 58 (Player Happiness) — morale, happiness, discontent. No morale system exists.
- Screen 60 (Player Discipline) — fines, warnings, red/yellow card tracking. Discipline exists only as a match event; no player discipline record.
- Screen 63 (Player Comparison) — side-by-side player comparison. No comparison UI exists.
- Screen 62 (Player Action Menu) — a context menu of actions per player. Some actions (scout, approach to sign, offer contract) may exist; many do not.

For each: is it out of scope, deferred to a future spec group, or does this effort need a design decision on whether to build it?

**Blocked by:** 01 (the inventory must confirm unbuilt status before scoping disposition).

**Status:** ready-for-agent

- [ ] Each of screens 58, 60, 62, 63 has a disposition.
- [ ] Decisions recorded in the reconciliation ledger.