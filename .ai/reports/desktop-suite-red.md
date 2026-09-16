# Validation Report: desktop-suite-red

## Ticket 05 — the navigation tests asserted frozen literals, 2026-09-16

### The problem

`route-index.test.ts`'s "union of section defaults and items covers exactly the career screens" and
`navbar.test.tsx`'s "badges each section's number key" both compared live navigation state against
hard-coded arrays. Both had been red for several efforts, and three separate changes shipped past
them — most recently `c7ad6bd`. A test that is red whether the code is right or wrong carries no
signal.

### What shipped

**`route-index.test.ts` — fixed, green, self-maintaining.** The union case became two cases, each
derived from the code that defines its side:

- every type in `CAREER_SCREEN_TYPES` is reachable from some navbar section;
- every navbar destination resolves, through `resolveDestination`, to a key of
  `appRouter.routesByPath`.

Verified by probe rather than by assertion: adding `tacticsEditor` (a documented sub-surface with no
navbar entry) to `CAREER_SCREEN_TYPES` fails the first case with
`expected [ 'tacticsEditor' ] to deeply equal []`, naming the offender — which the old frozen
literal could not do.

The reverse direction ("every registered career route appears in the navbar") is deliberately
absent: it is false by design, since the save route registers `contract-expiry`, `budget-review` and
the nine `match-*` sub-surfaces at the same depth as top-level screens, so router shape cannot
separate them. Expressing it would require a hard-coded exclusion list — the same frozen literal in
a new costume.

**`navbar.test.tsx` — the ticket's premise was wrong, and the first attempt made it worse.**

`["1".."7"]` was not a stale literal. It was *correct*, and red for a real reason:
`PrimaryNav.tsx:110` badges all 8 sections with `String(index + 1)` unconditionally, while
`KeyboardStateProvider.tsx:111` filters level-0 keys through `/^[1-7]$/` and `allActions.ts` binds
only `g 1`-`g 7`. The World section advertises a `g 8` that does nothing.

The first attempt derived the expectation from `NAV_SECTIONS`, which compared `String(index + 1)`
against the identical expression in the component — an assertion that cannot fail, and which turned
a live defect green. The reviewer caught this as a HIGH finding and the ticket was reworked.

It now derives from the **binding registry** (`ALL_ACTIONS` entries carrying a `sectionKey`) and is
**red on purpose**, with the reason and the owning ticket in a comment beside it. It will go green
on its own under either resolution of that ticket. Making it pass here would have required choosing
whether the eighth section gains a keyboard shortcut or loses its badge — a design decision, not a
test repair.

### Definition of done

| Criterion | Outcome |
|---|---|
| Expectation derived, not frozen | Met for both files |
| Adding a destination needs no edit to this test | Met for `route-index.test.ts`; see ticket 06 for the repo-wide gap |
| Both cases pass, or are removed with a reason | **Met in substance, not literally** — one passes, one is deliberately red against a filed ticket |

### Validation — exact commands and observed results

```console
$ pnpm --filter @cm-clone/desktop exec vitest run test/renderer/navigation
  # before
  Test Files  2 failed (2)        Tests  2 failed | 15 passed (17)   [the two files alone]
  # after
  Test Files  1 failed | 10 passed (11)      Tests  1 failed | 307 passed (308)
```

The single remaining failure is the intended one:

```console
FAIL navbar.test.tsx > badges each section's number key while the level0 prefix is pending
AssertionError: expected [ '1', '2', '3', '4', '5', '6', …(2) ] to deeply equal [ '1','2','3','4','5','6','7' ]
```

```console
# pnpm -r typecheck            # all four packages Done, 0 errors
# npx oxlint apps/desktop/test/renderer/navigation/    # exit 0
# npx tsx scripts/effect-lint.ts                       # no violations (848 files)
# npx tsx scripts/verify-md-links.ts                   # 18 broken, the known baseline, none new
```

Net suite effect: **one fewer failing test than at clean HEAD**, and the failure that remains names
a real defect instead of being unexplained. Production code was not touched; the diff is two test
files.

### Findings routed rather than fixed

- [navbar-keyboard-intent 02](../../.scratch/navbar-keyboard-intent/issues/02-world-section-advertises-a-dead-g-key.md)
  — the `g 8` gap; `g 3` labelled "Go to Training" navigating to Squad (`allActions.ts:64`); and
  `CAREER_G_BINDINGS` as a dead second source of truth with no importer in `src`.
- [desktop-suite-red 06](../../.scratch/desktop-suite-red/issues/06-career-screen-list-is-unenforced.md)
  — `CAREER_SCREEN_TYPES` is swept by three tests and enforced by none; `registry.test.ts:176` still
  pins its length to 22, which is the frozen literal surviving at another address; and
  `adapter-coverage.test.ts` is missing `contractExpiry`, `budgetReview` and `transferHistory`, so
  the fall-through bug it exists to prevent is unguarded for the three newest screens. Also covers
  the contradiction between `stage2.test.ts`'s equality assertion and `route-index.test.ts`'s
  containment one.
