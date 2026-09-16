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

## Ticket 06 — the career-screen classification was swept but not enforced, 2026-09-16

### The problem

`CAREER_SCREEN_TYPES` is a hand-kept array naming the top-level career screens. Three tests swept it
and none enforced it, so adding a screen to the navbar and router while forgetting that array left
`route-index.test.ts` passing vacuously, `registry.test.ts` passing on a stale pinned count, and
`adapter-coverage.test.ts` quietly less-covering. One omission weakened four guards at once.

### What shipped

The classification moved to `test/renderer/career-destination-classification.ts`, where
`CareerSubSurfaceType = Exclude<CareerDestination["type"], (typeof CAREER_SCREEN_TYPES)[number]>`
and an exhaustive `Record` over it make **the compiler the guard**. `adapter-coverage.test.ts` gets
the same treatment through a `SamplesOf<T>` mapped type, so both a missing key and a sample filed
under the wrong discriminant are compile errors. `apps/desktop`'s tsconfig covers `test/`, so this
is enforced by the `typecheck` gate rather than by a test anyone can forget to run.

Verified by probe rather than by assertion — adding a `probeOmitted` member to `CareerDestination`
without classifying it:

```console
registry.test.ts(198,7): error TS2741: Property 'probeOmitted' is missing ... required in type
  'Readonly<Record<CareerSubSurfaceType, string>>'
adapter-coverage.test.ts(74,7): error TS2741: Property 'probeOmitted' is missing ... required in
  type 'SamplesOf<CareerDestination>'
```

The adapter sweep had been missing **five** destinations, not the three the ticket named:
`contractExpiry`, `budgetReview`, `transferHistory`, `playerDetail` and `trainingCoaching`.

### The two things review caught

**The recorded rationale was false.** The justification for classing four navbar items as
sub-surfaces was "they carry no `g` binding". There are 7 `g` nav actions resolving to 6 distinct
destinations, so 16 of the 22 top-level screens have no binding either — the criterion does not
separate the list from its complement. `transferHistory`, `scoutingAssignment`, `scoutingKnowledge`
and `trainingCoaching` are first-class `NavItem`s sitting beside top-level siblings. Reason strings
corrected; the real question routed to
[decision request 01](../../.scratch/desktop-suite-red/decision-request-01-what-makes-a-career-destination-top-level.md),
since the new guard forces a classification without being able to check it.

**A deleted assertion covered something.** `stage2.test.ts`'s equality was removed as false — and it
is false — but it carried a real direction: the navbar links nothing unexpected. That is restored in
`route-index.test.ts` as "top-level screens plus exactly these four", naming the exceptions so a
fifth requires a deliberate edit.

The first attempt at restoring it asserted only "every navbar destination is classified somewhere".
That is **vacuous** — the classification is total by construction, so no destination can fail it.
Caught before commit, during my own verification rather than by review, and replaced with the named
form. Probed: dropping `trainingCoaching` from the sanctioned set fails with
`expected [ 'trainingCoaching' ] to deeply equal []`.

A third fix: the `g`-binding assertion now iterates `ACTION_REGISTRY.all` rather than
`navKeyByDestinationOf`, whose `Map` keys by destination and so collapsed `g 1` (Squad) into `g 3`
(labelled Training, pointing at `squad` — the live defect in navbar-keyboard-intent 02). Seven
bindings in, seven checked, where before six were.

### Validation — exact commands and observed results

```console
# pnpm -r typecheck                     → 0 errors, all four packages Done
# vitest run test/renderer/navigation test/renderer/actions
#                                       → Test Files 1 failed | 13 passed (14)
#                                         Tests      1 failed | 355 passed (356)
# npx oxlint <touched files>            → clean
# npx tsx scripts/effect-lint.ts        → no violations (849 files)
# npx tsx scripts/verify-md-links.ts    → 18 broken, the known baseline, none new
```

The single failure is the intentional `navbar.test.tsx` badge case from ticket 05, unchanged.
Production code was not touched; the diff is four test files plus one new test helper.

## Ticket 07 — two e2e specs hang on a bare `app.close()`, 2026-09-16

- Ticket closed: [07](../../.scratch/desktop-suite-red/issues/07-e2e-specs-hang-on-bare-app-close.md)
- Follow-ups filed: [09](../../.scratch/desktop-suite-red/issues/09-e2e-harness-kills-every-app-after-five-seconds.md),
  [group-a-reconciliation 20](../../.scratch/group-a-reconciliation/issues/20-quit-dialog-hidden-under-router-overlays.md)

### Root cause

Playwright's `ElectronApplication.close()` evaluates `app.quit()` and waits for exit with no
timeout. The `before-quit` guard (`src/main/index.ts`) calls `preventDefault()` and asks the renderer
for the Quit dialog, and nothing answers it. Observed with `DEBUG=pw:api`: `electronApplication.close
started` was the last call, followed by the 45s timeout. A probe confirmed that clicking Quit ends the
process in about 1s, so there is no product hang.

### Acceptance criteria → evidence

| # | Criterion | Proving test | Result |
|---|---|---|---|
| 1 | Neither spec hangs on close | both tests below, about 12s each, previously 45s timeouts | pass |
| 2 | Stored-binding and relaunch assertions execute and pass | `keybindings.spec.ts:19` "a rebind applied in the help overlay survives an app restart" | pass (11.8s) |
| 3 | Save-restart journey executes past the close | `journeys.spec.ts:70` "a save persists across app restarts" | pass (11.7s) |

### Gate

| Gate | Command | Result |
|---|---|---|
| check:all | `pnpm check:all` | exit 1, pre-existing only; typecheck, effect-lint and verify-db-schema ✓. Desktop 68 failed / 1793 passed, the same failing cases as navbar-keyboard-intent 03's run. Lint and md-link counts unchanged. Only e2e files changed. |
| e2e | `pnpm test:e2e e2e/keybindings.spec.ts e2e/journeys.spec.ts` | 3 passed / 3 failed. `journeys:96` and `:162` are ticket 08 (`Start match`). `journeys:206` failed at `rowButton.focus()` in a run started straight after the gate. Re-run alone with `--grep "transfer bid"`, it passed (7.2s), so the failure was a throttling artifact. |
| determinism / save compatibility | — | not applicable; no source change |

### Review

Reviewer **APPROVE**, read-only. Confirmed that the rebind write is awaited before the RPC resolves,
and that the journey's open path does not write to the save. Lows: the post-stop `storedBinding`
check is redundant after the poll (kept), and `launchApp.ts` comments blame a wedged renderer (ticket
09). The reviewer confirmed, by reading the code, that the stacking of the Quit dialog is a real
player-facing defect of low severity (group-a-reconciliation 20).

## Ticket 08 — the before-matchday seed offers no fixture, 2026-09-16

- Ticket closed: [08](../../.scratch/desktop-suite-red/issues/08-before-matchday-seed-offers-no-fixture.md)
- Follow-ups filed: [10](../../.scratch/desktop-suite-red/issues/10-live-match-specs-assert-retired-copy-and-nav.md),
  [11](../../.scratch/desktop-suite-red/issues/11-live-match-reaches-full-time-mid-test.md),
  [12](../../.scratch/desktop-suite-red/issues/12-squad-screen-has-no-h1.md),
  [13](../../.scratch/desktop-suite-red/issues/13-transfer-bid-spec-collides-on-duplicate-player-names.md)

### Acceptance criteria → evidence

| # | Criterion | Evidence | Result |
|---|---|---|---|
| 1 | Cause observed in a page snapshot | baseline `error-context.md`: "Season 1 · Pre-season", "No Fixture is waiting…", matching `KickoffPanel.tsx`'s copy | pass |
| 2 | The tests reach a startable match without loosening later assertions | `router.spec.ts:195` and `keyboard.spec.ts:158` pass; `journeys.spec.ts:96`/`:162` and `app.spec.ts:90` click Play match and fail later on retired copy and nav (10, 11). The reviewer confirmed that every assertion after the start is byte-identical. | pass |
| — | Seed invariant | `test/main/season/seed-saves.test.ts` "before-matchday seed stands at the human club's first Fixture with nothing played" | 4/4 in file |

### Gate

| Gate | Command | Result |
|---|---|---|
| check:all | `pnpm check:all` | exit 1, pre-existing only. Typecheck, effect-lint and verify-db-schema ✓. Desktop 68 failed / 1793 passed, the same failing cases as ticket 07's run. Lint and md-link counts unchanged. The run did not include the seed unit test, which was added from the review's finding M1 during the run. It was run afterwards: `pnpm exec vitest run test/main/season/seed-saves.test.ts` gave 4 passed, and `pnpm typecheck` found 0 `error TS`. |
| e2e | `pnpm test:e2e e2e/router.spec.ts e2e/keyboard.spec.ts e2e/app.spec.ts e2e/journeys.spec.ts` | 20 passed / 4 failed. The failures are `app:20` (h1, ticket 12), `app:90` at :115 (Applied copy, 10), `journeys:96` at :132 (Applied copy, 10) and `journeys:162` at :178 ("Live match screens" nav, 10). The implementator's baseline over router/journeys/keyboard was 12 passed / 5 failed. |
| determinism / save compatibility | — | not applicable; no source change. The seed goes through the real `advanceCalendar` RPC path. |

### Review

Reviewer **APPROVE**, read-only. It confirmed the cause against `f1c5681`, and that the first Continue
reaches a human Fixture for any world seed. M1 (missing seed unit test) is done. M2 (say the cause was
observed, not inferred) is done in the ticket Answer. L1: the `not.toBeVisible("Play match")` half of
the resume check would pass vacuously after another rename, but `matchScore` still guards the test.
That half was left as is.

## Ticket 09 — the e2e harness kills every app after 5s, 2026-09-16

- Ticket closed: [09](../../.scratch/desktop-suite-red/issues/09-e2e-harness-kills-every-app-after-five-seconds.md)

### Acceptance criteria → evidence

| # | Criterion | Evidence | Result |
|---|---|---|---|
| 1 | A normal teardown quits gracefully, well under `CLOSE_TIMEOUT_MS` | temporary timing in `closeOrKill` over keybindings and router: 10 of 10 closes in 138–155ms, `exitCode=0`, no signal | pass |
| 2 | The kill fallback still bounds a wedged app | throwaway probe busy-looping main: `closed=false after 5003ms`, killed, returned in 5055ms, process gone (probe deleted) | pass |
| 3 | Comments name the quit guard | `launchApp.ts` (`CLOSE_TIMEOUT_MS`, `closeOrKill`, `launchExtraApp`), `keybindings.spec.ts`, `journeys.spec.ts`, `playwright.config.ts` | done |

### Gate

| Gate | Command | Result |
|---|---|---|
| check:all | `pnpm check:all` | exit 1, pre-existing only. Typecheck, effect-lint and verify-db-schema ✓. Desktop 68 failed / 1794 passed, the same failing cases as ticket 08's run (+1 pass: ticket 08's seed test). Lint and md-link counts unchanged. |
| e2e | `pnpm test:e2e e2e/keybindings.spec.ts e2e/router.spec.ts e2e/journeys.spec.ts` | 11 passed / 3 failed in 1.3m wall time. Per-test times are now 0.9–2.5s where nothing is played live, against 6–12s before. The failures are `journeys:96` and `:162` (ticket 10), and `journeys:206`, a strict-mode violation on two Market rows named "Thomas Bell" (ticket 13, now observed in a snapshot). |
| determinism / save compatibility | — | not applicable; harness only |

### Review

Reviewed inline by the orchestrator, not by a reviewer subagent. The diff is four e2e harness files,
and the handler analysis it rests on was already checked by ticket 07's reviewer. The checks: the
`quit-guard-confirmed` listener takes no arguments and does no cleanup, so a bare `emit` matches the
Quit button; the `evaluate` shares the timeout, so a wedged main is still bounded; and the fallback's
kill and `waitForExit` are unchanged.

## Ticket 10 — live-match specs assert retired copy and nav, 2026-09-16

- Ticket closed: [10](../../.scratch/desktop-suite-red/issues/10-live-match-specs-assert-retired-copy-and-nav.md)
- Follow-up filed: [two-row-nav 08](../../.scratch/two-row-nav/issues/08-match-context-tablist-named-after-the-section.md) (tablist named "Squad" in the live-match context)

### Acceptance criteria → evidence

| # | Criterion | Evidence | Result |
|---|---|---|---|
| 1 | Each assertion checks the copy or tab the screen shows for the same outcome | `app.spec.ts:90`, `journeys.spec.ts:96`, `journeys.spec.ts:163` pass; labels taken from `commandStatus.ts`, nav names from a page snapshot | pass |
| 2 | No assertion dropped; success and failure still distinguished where they were | diff: one regex per test and one locator; the "either definitive outcome" regex keeps its two alternatives (Accepted, Rejected) | pass |

### Gate

| Gate | Command | Result |
|---|---|---|
| check:all | `pnpm check:all` | exit 1, pre-existing only. Typecheck, effect-lint and verify-db-schema ✓. Desktop 68 failed / 1794 passed, the same failing cases as ticket 09's run. Lint and md-link counts unchanged. |
| e2e | `pnpm test:e2e e2e/app.spec.ts e2e/journeys.spec.ts` | 10 passed / 2 failed (30.8s). Before the ticket: 8 passed / 4 failed. The remaining failures are `app:20`, no `h1` (ticket 12), and `journeys:207`, a strict-mode violation on two "Ethan Hall" Market rows (ticket 13). |
| determinism / save compatibility | — | not applicable; e2e only |

### Review

Reviewed inline by the orchestrator. The diff is two regexes and one locator. The checks: each new
label exists in `commandStatus.ts` for the command type the test sends; the either-outcome assertion
is no wider than before; and the tab names match the snapshot.
