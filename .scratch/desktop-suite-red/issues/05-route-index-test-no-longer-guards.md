# 05: `route-index.test.ts` asserts a hard-coded screen list nobody updates

**What to fix:** `test/renderer/navigation/route-index.test.ts`, the case "the union of section
defaults and items covers exactly the career screens", compares the router's registered career
children against a hard-coded array. At clean HEAD that array already diverges by 24 entries
(`shortlist`, `staffOverview`, `staffSearch`, `training`, `trainingCoaching`, and more). It has been
failing for several efforts and its failure no longer carries information: a screen added correctly
and a screen added wrongly both turn it red.

`navbar.test.tsx`'s "badges each section's number key" is failing in the same way and for the same
reason — it expects 7 sections and finds 8.

Ticket 07 of group-j is the third change to add a destination and walk past both. Per
[AGENTS.md](../../../AGENTS.md) § Routing repeat review findings, a finding this mechanical should
stop costing review attention: either derive the expected set from the router's registered career
children so it self-maintains, or delete the assertion and keep the part that still guards
something.

Deriving is preferred — an assertion that every registered career screen is reachable from some
section is worth keeping; it is the frozen literal that is worthless.

**Decisions:**

- Found during the group-j ticket 07 review, 2026-09-15. Not that ticket's debt, so filed here
  rather than fixed in passing.

**Blocked by:** None

**Status:** ready-for-agent

- [ ] The career-screen expectation is derived from the router, not a frozen literal
- [ ] Adding a new career destination does not require editing this test
- [ ] Both this case and `navbar.test.tsx`'s section-count case pass, or are removed with a reason
