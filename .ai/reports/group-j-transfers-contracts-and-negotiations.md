# Validation Report: group-j-transfers-contracts-and-negotiations

## Ticket 08 — Navbar entries for Screens 141 and 145, 2026-09-16

### What shipped

Contract Expiry and Budget Review are in the Recruitment submenu, reachable by pointer and by
`g 4 o` / `g 4 p`, the same way Transfer History is. `POSITION_KEYS` gained `p` for the tenth
Recruitment item. The submenu strip (`ContextNav`) now scrolls horizontally: ten entries are wider
than the 1200px window, and the strip previously clipped them with no way to scroll.

### Acceptance criteria → tests

| Criterion | Test |
|---|---|
| Each reachable from the Recruitment submenu | `e2e/contract-expiry-and-budget-review.spec.ts` — "Recruitment opens Contract Expiry", "Recruitment opens Budget Review" (navbar clicks via `goto`, `aria-current="page"` on the entry); "the Recruitment submenu scrolls to its last entry at the default window width" (fails with the old CSS: viewport ratio 0); `route-index.test.ts` — six sanctioned navbar sub-surfaces |
| A Playwright spec navigates through the navbar | the two `goto` tests above |
| Keyboard access matches Transfer History's | `test/renderer/keyboard/spine-live.test.tsx` — "g <Recruitment> <position key> reaches {Transfer History, Contract Expiry, Budget Review}"; fails for Budget Review with `p` removed |

### Review

First review **NEEDS_REWORK**: one high (the entries were clipped at the default window width, and
the e2e passed anyway because Playwright scrolls targets programmatically), one medium (desktop-suite-red
decision request 01 still called both screens URL-only). Both repaired, plus a dated update line on the
Transfer History Agent Note. The orchestrator re-checked the rework diff rather than running a second
full review, since the repairs were one className, one spec, and doc lines.

### Gate

- `pnpm check:all` — exit 1, pre-existing failures only:
  - typecheck ✓, effect-lint ✓ ("no violations found (850 files)"), verify-db-schema ✓
  - lint ✗ — pre-existing `MatchDayScreen.tsx` unused `state`
  - verify-md-links ✗ — pre-existing links in `.scratch/group-c-club-information/RECONCILIATION.md` and
    group-d `issues/02`; none new
  - tests: shared 461/461, contracts 149/149, game-engine 50/50; desktop **69 failed | 1789 passed
    (1858)** across 18 files. No failure mentions the submenu, Recruitment, or either screen. Touched
    files that fail do so on the same cases as before editing: `navbar.test.tsx` (intentional `g 8`
    badge) and `stage2.test.ts` (3× `window is not defined`). Focused baseline over the seven
    navigation/keyboard files: 4 failed | 134 passed before, 4 failed | 137 passed after.
- `pnpm test:e2e e2e/contract-expiry-and-budget-review.spec.ts e2e/transfer-history.spec.ts` — 4 passed (25.0s).
- Determinism and save compatibility: not touched (no engine, shared, or persistence change).

### Changed files

Created: `apps/desktop/e2e/contract-expiry-and-budget-review.spec.ts`.

Modified: `src/renderer/navigation/{nav-config.ts,components/ContextNav.tsx}`, `e2e/launchApp.ts`,
`test/renderer/{career-destination-classification.ts,keyboard/spine-live.test.tsx,navigation/route-index.test.ts,router/stage2.test.ts}`,
desktop-suite-red decision request 01, the Transfer History Agent Note, the ticket, the map, and the
sprint plan.

### Known limitations

- The scroll e2e asserts Budget Review starts outside the viewport, so it needs revisiting if the
  default window grows wider than the ten-entry strip.
- Budget Review's navbar label is shorter than its h1 ("Transfer & Wage Budget Review"); it matches
  the screen's `aria-label`.

## Ticket 07 — Transfer History (Screen 146), 2026-09-15

### What shipped

A read-only Transfer History screen at `career/$saveId/transfer-history`, reachable from the
Recruitment submenu: every completed transfer into or out of the manager's Club, newest first, with
the in-world date, the Player, the Club left, the Club joined, and the fee in Credits.

The design question the ticket left open — fill the `club/$clubId/transfers` stub or take a new
route — was answered in favour of a new route. The stub is parameterised by `clubId` while this
screen is own-club only, so filling it would mean either reading any Club's transfers (outside
Group J v1 scope, and prejudging Group I decision request 01) or carrying a route parameter the
screen ignores. Recorded in
[Agent Note: Transfer History takes its own career route](../../.agents/notes/implemented/architecture/2026-09-15-transfer-history-takes-its-own-career-route.md),
promoted `proposed/` → `implemented/` in this commit.

### Acceptance criteria → tests

| Criterion | Test |
|---|---|
| Read returns the Club's transfers newest first | `test/main/transfers/transfer-history.test.ts` — "returns transfers into and out of the manager's Club, newest first"; a rival-to-rival row dated later than everything else is asserted absent, so a broken `WHERE` surfaces as a wrong first row rather than a silent pass |
| RPC roundtrip | `packages/contracts/test/transfer-history.test.ts` — 8 cases over `TransferHistoryEntryView`, `TransferHistoryView`, and the `AppRpcs.getTransferHistoryScreen` payload/success/error |
| Empty case | main: "returns an empty history for a fresh save…"; contracts: "roundtrips an empty success view"; renderer: "shows an empty state when the club has completed no transfer" |
| Screen lists date, Player, from Club, to Club, fee | `test/renderer/transferHistory/transfer-history-screen.test.tsx` — column headers and exact cell text; `e2e/transfer-history.spec.ts` asserts the same through the real navbar |
| Free Agent signing (no from Club) reads correctly | main: "reads a Free Agent signing, which has no selling Club" (`fromClubName === null`, fee 0); contracts: roundtrips a null selling Club; renderer renders `Free Agent` / `0 Credits`; e2e asserts the row |

### Review findings and their disposition

Reviewer verdict **APPROVE**, no blocker or high findings. Two mediums:

- **Date formatting (fixed).** The screen rendered the raw ISO `transferred_on`. Every other screen
  showing an in-world date goes through `formatCalendarDate` from `@cm-clone/shared`, which is a
  pure string split precisely so a date reads identically in any locale — its own docstring warns
  that "two screens disagreeing about how to say one date would read as two different dates". The
  manager would have seen `2026-08-20` here and `20 Aug 2026` on the fixture list. Now routed
  through the formatter; the three date assertions in the renderer test and e2e updated to match.

- **Missing club-scoped index (backed out, escalated).** The read filters
  `from_club_id = ? OR to_club_id = ?` over `player_transfers`, the one table the schema calls out
  as unboundedly growing, and no existing index serves that predicate. Adding
  `(from_club_id, transferred_on)` and `(to_club_id, transferred_on)` removes the full scan —
  verified by `EXPLAIN QUERY PLAN`, `SCAN t` becoming `MULTI-INDEX OR`.

  It was implemented, then **reverted**. `test/main/season/query-plans.test.ts:96` asserts the save
  carries exactly three named indexes, and its comment states the assertion exists to force that an
  index arrives by an open question rather than from whoever is writing the migration; `schema.ts`
  says every index is "measured against the scale probe rather than assumed". A query plan on an
  empty table is not that measurement. Editing the guard to admit my own unmeasured index is what
  the guard exists to prevent, so the change was backed out and the question written up as
  [decision request 02](../../.scratch/group-j-transfers-contracts-and-negotiations/decision-request-02-club-scoped-transfer-history-index.md),
  recommending it be answered with a probe number alongside the deferred club-scoped screens.
  The shipped screen is correct without the indexes, only slower as a career ages.

Three low findings were filed rather than fixed: navbar entries for Screens 141 and 145
([ticket 08](../../.scratch/group-j-transfers-contracts-and-negotiations/issues/08-navbar-entries-for-141-and-145.md)),
and the stale `route-index.test.ts` assertion
([desktop-suite-red ticket 05](../../.scratch/desktop-suite-red/issues/05-route-index-test-no-longer-guards.md)).
Two more — `displayNames` resolved twice per request, and `transferHistoryKey` having no
invalidator — are noted here and in the review; both copy an existing pattern and neither is a live
defect, since `advanceCalendar` invalidates `saveKey`, which does refresh the screen.

### Gate — exact commands and observed results

```console
$ pnpm check:all
  ✓ typecheck (1809ms)
  ✗ lint (430ms)
  ✓ effect-lint (690ms)
  ✗ verify-md-links (524ms)
  ✓ verify-db-schema (759ms)
  ✗ test (489875ms)
```

Each failing gate accounted for:

- **typecheck** — clean. TS377112/TS377091 suggestions only, all in files this ticket did not touch.
- **lint** — `oxlint .` exits 1 on pre-existing errors in `playerProfile/PlayerProfileScreen.tsx`,
  `matchHomeTeam/`, `matchPreview/`, `main/career/player.ts`, `test/main/transfers/budget-review.test.ts`,
  `match/PostMatchSummary.tsx`, `match/MatchDayScreen.tsx`. Filtering the error list for
  `transferHistory|transfer-history|db/schema` returns nothing: no lint error in a ticket 07 file.
- **effect-lint** — 0 violations across 848 files.
- **verify-md-links** — 18 unresolvable references, all in
  `.scratch/group-c-club-information/RECONCILIATION.md` (17) and
  `.scratch/group-d-player-and-staff-records/issues/02-staff-screens-scope.md` (1), both committed
  earlier. None in this ticket's files.
- **verify-db-schema** — passes. (It failed while the index change was in the tree; passes again
  after the revert, with `migrations.generated.ts` and `drizzle/0000_schema.sql` back at HEAD.)
- **test** — see the baseline below.

### Unit-test baseline, measured rather than assumed

The desktop suite's failure count moves between runs (72, then 73, on two full runs of the same
tree), so the baseline was established by running the *same file subset* both ways:

```console
$ pnpm --filter @cm-clone/desktop exec vitest run <21 failing files>   # with ticket 07
  Test Files  20 failed | 1 passed (21)      Tests  72 failed | 159 passed (231)

$ git stash push --include-untracked      # tree verified clean at HEAD
$ pnpm --filter @cm-clone/desktop exec vitest run <same 21 files>      # clean HEAD
  Test Files  19 failed | 2 passed (21)      Tests  71 failed | 160 passed (231)
```

That one-file, one-test difference was **not** waved through as noise. It was isolated to
`test/main/season/query-plans.test.ts` — the index-count assertion, tripped by the index change
described above. After the revert:

```console
$ pnpm --filter @cm-clone/desktop exec vitest run test/main/season/query-plans.test.ts \
    test/main/transfers/incoming-bids.test.ts test/main/transfers test/renderer/transferHistory
  Test Files  7 passed (7)      Tests  53 passed (53)
```

So the shipped tree matches the 71-failure baseline exactly: **no regression, and no pre-existing
failure repaired or hidden.** The 19 baseline-failing files are the known jsdom `window`,
route-content, and mock-RPC families already recorded in this plan.

```console
$ pnpm --filter @cm-clone/contracts test
  Test Files  14 passed (14)    Tests  149 passed (149)     [141 before this ticket]

$ cd apps/desktop && npx playwright test e2e/transfer-history.spec.ts
  ✓ Recruitment opens Transfer History with the club's transfers newest first (6.1s)
  1 passed (6.6s)
```

The e2e spec was re-run after the date-formatting fix changed its three assertions.

### Determinism and save compatibility

- **Determinism** — the read orders `transferred_on DESC, id DESC`. `transferred_on` is ISO
  `YYYY-MM-DD`, so the lexicographic sort is chronological, and the `id` tie-break makes the order
  total rather than leaving same-date rows to SQLite's discretion. The test covering this was
  strengthened during the gate: it previously inserted hard-coded ids 1 and 2, which asserted the
  `ORDER BY` clause back to itself. Ids are now left to autoincrement, the path `completeTransfer`
  actually takes, and the assertion reads the rows back by fee.
- **Save compatibility** — no schema change ships (the index change was reverted), so the save's
  shape is untouched and `verify-db-schema` is green. No migration.
- The screen reads no simulation randomness and holds no authoritative state.

### Changed files

Created: `src/main/transfers/transferHistory.ts`, `src/renderer/transferHistory/TransferHistoryScreen.tsx`,
`test/main/transfers/transfer-history.test.ts`,
`test/renderer/transferHistory/transfer-history-screen.test.tsx`, `e2e/transfer-history.spec.ts`,
`packages/contracts/test/transfer-history.test.ts`, the Agent Note, decision request 02, ticket 08,
and desktop-suite-red ticket 05.

Modified: `packages/contracts/src/{rpc.ts,schemas/transfers.ts}`, `src/main/rpc/rpcServer.ts`,
`src/main/transfers/index.ts`, `src/renderer/rpc.ts`, `src/renderer/rpc/queries.ts`,
`src/renderer/navigation/{destinations.ts,adapter.ts,NavProvider.tsx,nav-config.ts}`,
`src/renderer/router/index.tsx`, `src/renderer/keyboard/KeyboardSpine.tsx`,
`e2e/{seedSaves.ts,launchApp.ts}`, the ticket, the map, and this plan.

### Deliberately deferred

- The two club-scoped indexes — decision request 02.
- Navbar entries for Screens 141 and 145 — ticket 08.
- `route-index.test.ts` and `navbar.test.tsx`'s stale assertions — desktop-suite-red ticket 05.
- `displayNames` resolving twice per request, and the unreferenced `transferHistoryKey` invalidator.
