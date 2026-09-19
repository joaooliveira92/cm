# 03: What each of the twelve screens actually has behind it

Type: research

The survey that has to precede any disposition. Twelve screens — 33–37, 39–42, 46–48 — and for each
one, two facts: what exists in the renderer today, and what model, if any, backs it.

Ruling first and checking after is how Group D's `map.md` came to miscount its own dispositions, and
how three of the four errors M1 step 1 found were made. This ticket buys the right to rule.

## What to produce

A table, in the map's Decisions-so-far, with one row per screen:

| Screen | Placeholder(s) in `renderer/` | Route(s) | Model behind it | Shipped screen that may already satisfy it |
|---|---|---|---|---|

Two columns need care.

**Placeholder(s), plural.** Several screens have *two* — `clubInfo` and `clubInformation` are both
Screen 34's, `finances` and `clubFinancesDetail` both Screen 39's. Record both; which is right is
ticket 04's question, and a survey that records only one has pre-answered it.

**Model behind it.** Name the `CONTEXT.md` term or the table, or write *none found* — not *none*.
Several of these exist under a word the import does not use, and "I looked and did not find it" is a
different claim from "it does not exist". Check CONTEXT.md before concluding absence: this group
touches **Stature Tier**, **Simulation Depth**, **Transfer Budget**, **Wage Budget**, **Board
Objective**, **Competition**, **Fixture**, **Squad**.

## Also in scope: two stale rows

- **Screen 49 Team Scout Report reads `Not yet audited` and is shipped.** The `team-scout-report`
  effort closed with all eight tickets resolved; the screen is
  `renderer/scouting/TeamScoutReportScreen.tsx`, routed club-scoped as `teamScoutReport`. Correct the
  coverage row, with the anchor, rather than leaving a built screen listed as unexamined.
- **Screens 43–45** read `Not yet audited` and are out of this milestone: they follow Group Q,
  confirmed 2026-09-19. Give them a row saying so, so the next reader does not re-derive it.

Verify 49 against the tree rather than against this ticket. A ticket saying a thing shipped is not
evidence that it did — that is the mistake the group-d cull ticket made about `playerCoachReport`.

## Acceptance

- [ ] Twelve rows, each naming every placeholder for that screen, not just one
- [ ] Every "no model" reads *none found* with the search that was made, never a bare assertion
- [ ] Screen 49's coverage row corrected against the tree, with its anchor
- [ ] Screens 43–45 carry a row pointing at Group Q
- [ ] The table lands in `map.md`'s Decisions-so-far, not only in this ticket

**Blocked by:** None

Status: ready-for-agent
