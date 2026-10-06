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

**Status:** resolved

- [x] The career-screen expectation is derived from the router, not a frozen literal
- [x] Adding a new career destination does not require editing this test
- [~] Both this case and `navbar.test.tsx`'s section-count case pass, or are removed with a reason

## Outcome, 2026-09-16

`route-index.test.ts` is green and self-maintaining: its union case became two derived cases, one
over `CAREER_SCREEN_TYPES` and one resolving every navbar destination against the router's
registered paths. Verified by probe — adding `tacticsEditor` (a sub-surface with no navbar entry) to
`CAREER_SCREEN_TYPES` fails it with `expected [ 'tacticsEditor' ] to deeply equal []`.

**The third criterion was met in substance, not literally, and the ticket's premise was wrong.**
`navbar.test.tsx`'s `["1".."7"]` was not a stale frozen literal — it was *correct*. It was red
because the navbar renders 8 section badges while `KeyboardStateProvider` caps level-0 keys at
`/^[1-7]$/`, so the World section advertises a `g 8` that does nothing. The first attempt derived
the expectation from `NAV_SECTIONS`, which compared `String(index + 1)` against the identical
expression in `PrimaryNav` — tautological, and it turned a real defect green.

It now derives from the binding registry instead and is **red on purpose**, naming the defect, with
[navbar-keyboard-intent ticket 02](../../navbar-keyboard-intent/issues/02-world-section-advertises-a-dead-g-key.md)
to fix it. Making it pass requires deciding whether the eighth section gains a key or loses its
badge — a design call, not a test repair. Net suite effect: one fewer failure, and the one that
remains carries a reason.

Remaining hand-kept-list debt is [ticket 06](06-career-screen-list-is-unenforced.md).
