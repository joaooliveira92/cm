# 05: `react/memo-dependencies` — memo reads whose dependencies change

Type: task
Status: resolved

## Bucket

`react/memo-dependencies` — 16 findings, `warn` in `.oxlintrc.json`.

## What it flags

`useMemo`/`useCallback` reading values (from renderer React state and Effect atom reads) in
ways the compiler cannot memoise — dependencies it sees as unstable or missing, so the memo
either re-runs every render or is skipped as un-memoizable.

## Exit criteria

- [x] `react/memo-dependencies` graduates from `warn` to `error` in `.oxlintrc.json`.
- [x] `pnpm lint` still reports zero `react/memo-dependencies` findings.

## Answer

The measured baseline was **20 findings across 12 files**, not the 16 the spec and ticket
recorded (tickets 01–04 cleared some as collateral and others were never listed). All are
cleared and `"react/memo-dependencies"` is now `error`; `pnpm exec oxlint --disable-nested-config .`
reports **zero** `react(memo-dependencies)`.

Each site resolved one of: a missing dep that is stable (added), an extra dep on a
module-level value (dropped), an overly precise dep the compiler wants widened to the object it
reads (restructured), or a value stabilised at source so the dep is stable. The sites:

| Site | Finding | Decision |
|---|---|---|
| `leagueSelection/useLeagueSelection.ts:250` | extra `canContinueNow`, `needsWarningAcknowledgement` | **dropped** — module-level predicates; the compiler never re-renders on them |
| `playerProfile/PlayerProfileActions.tsx:67` | missing `saveId` | **added** — a stable prop the body already reads |
| `activeLeagues/ActiveLeaguesScreen.tsx:73` | missing `input`, all seven members overly precise | **restructured** — destructure the fields, rebuild the object inside the memo, depend on the fields. Re-run set unchanged |
| `playerSearch/PlayerSearchScreen.tsx:516, :530` | missing `submit`, `choosePosition` | **stabilised at source** — both became `useCallback`s (deps = the values they read), then added to the toolbar memos |
| `match/hooks/useCommentaryFeed.ts:106, :116, :153` | missing `ledger`/`feed`, overly precise `ledger.note`/`ledger.attach`/`ledger.clear`/`feed.reveal` | **restructured** — depend on the whole `ledger`/`feed` objects the compiler can reason about |
| `match/hooks/useMatchLifecycle.ts:99, :102` | missing `inPlay` | **stabilised at source** — hoisted to module scope; a module-level value is not a dependency |
| `transfers/useTransferCommands.ts:112, :138, :160, :194` | missing `draftRef`/`selectedRef`/`viewResultRef` and `setCounter`/`setCounterAmount`/`setCounterError` | **added** — all refs (`useRef`) and `useState` setters; stable identities |
| `transfers/useTransferTables.ts:162, :197` | missing `selectedRef`, `setSelected` | **added** — a `useRef` and a `useState` setter; stable |
| `chrome/CareerStateProvider.tsx:308` | missing `openDestination`, `onBackToSaves`, `runAdvance` | **stabilised at source** (`openDestination`/`onBackToSaves` became `useCallback`s) then **added**, plus `runAdvance` and `setReport` |
| `keyboard/KeyboardSpine.tsx:220` | missing `setPrefix` | **added** — a `useState` setter from `usePrefixState`; stable |
| `squad/SquadTable.tsx:468` | missing `view`, overly precise `view.layout` | **restructured** — `view` is a reference into the module-level `SQUAD_VIEWS` array, so its identity changes only when the view id does, exactly as `view.layout` did |
| `components/reui/event-calendar/event-calendar-event.tsx:329` | **vendored** — missing `viewConfig`, overly precise `viewConfig.renderAgendaEvent`/`renderEvent` | **exempted** in `.oxlintrc.json` |

### Vendored policy

`components/reui/**` is kept whole so upstream re-syncs are not hand merges
(`scripts/effect-lint.ts` `FILE_LENGTH_EXEMPTIONS`). The one `react(memo-dependencies)` site there
is exempted by extending the existing vendored override block:

```json
{
  "files": ["apps/desktop/src/renderer/components/reui/**"],
  "rules": { "react/todo": "off", "react/memo-dependencies": "off" }
}
```

Ticket 07 extends the same block for `react/rule-suppression`; the config comment says so. Scoping
to the directory (rather than the file) is the established vendor-policy shape from ticket 04.

### Re-run sets that changed

Two memos gained a dependency. One is a latent-bug fix; the other is a lint-correctness change
with no reachable behaviour change in today's code:

- `PlayerSearchScreen`'s `toolbarControls` / `toolbarTrailing` now depend on `submit` /
  `choosePosition` (both became `useCallback`s), where before they depended only on
  `invalidRange` / `position`. **This fixes a stale-memo bug**: editing a filter without toggling
  the age range left the cached toolbar button bound to the `submit` captured at first render, so
  clicking the toolbar's "Search players" issued the search for the old (often empty) query
  instead of the edited filters. The memos now re-run when a filter value changes; the effect
  that registers them re-clears and re-sets the toolbar slot; no loop (the slot is a sibling
  store, not React state) and no focus is at stake while typing. `submit` does **not** change when
  `submitted` changes, so the toolbar is stable across a search.
- `SquadTable`'s `toolbarControls` now depends on `view` instead of the overly precise
  `view.layout`. The lint rule requires it, but it is **behaviour-neutral today**: the memo's
  `onSortCycle` dependency is recreated on every render (it closes over `orderedIds`, a fresh
  `rows.map(...)` array in `useSquadScreen`), so the memo already re-runs every render and the
  checked View item is never stale. No reachable regression, so no test; if `onSortCycle` is ever
  stabilised, `view` is the correct dependency and this becomes load-bearing.
- `useCommentaryFeed`'s `read`, `reveal` and `resume` now re-run when `ledger`/`feed` identity
  changes (i.e. when revealed lines change), where before they depended on the members. Their only
  consumer is `useMatchStream`, which holds `read`/`reveal` in refs written by an effect, so the
  stream port is still minted once and no downstream effect re-runs. `resume`'s wider identity is
  masked by `state` already re-running on the same `ledger.revealed` change.

Every other site's re-run set is unchanged: the added values are refs, `useState` setters, a
stable prop (`saveId`), or a module-level reference, and `CareerStateProvider`'s
`openDestination`/`onBackToSaves` were plain functions before — memoizing them can only narrow.

### Tests

One new test: `apps/desktop/test/renderer/playerSearch/player-search-toolbar.test.tsx` mounts the
screen with the toolbar slot, edits a filter, clicks the toolbar's "Search players", and asserts
`getPlayerSearch` was issued for the edited query. It fails on the unfixed memo (the read comes
back with `query: {}` instead of `{ name: "Ada" }`) and passes with it. No test was added for the
`SquadTable` dep: it cannot fail for the right reason (see above), and a vacuous test is worse
than none. The lint gate remains the criterion for every other site. The existing suites cover
every touched screen — focused renderer run of `transfers`, `match`, `playerSearch`,
`activeLeagues`, `leagueSelection`, `chrome`, `keyboard`, `squad`, `playerProfile`:
**79 files / 623 passed / 5 skipped**.

## Evidence

| Criterion | Command | Result |
|---|---|---|
| Rule graduates to `error` | `.oxlintrc.json` | `"react/memo-dependencies": "error"` |
| Zero `react(memo-dependencies)` | `pnpm exec oxlint --disable-nested-config . 2>&1 \| grep -c "react(memo-dependencies)"` | baseline 20 → 0 |
| No new lint errors | `pnpm exec oxlint --disable-nested-config .` | 57 warnings, 0 errors (was 77 warnings, 0 errors) |
| Gates green | `pnpm check:all` | green — typecheck, lint, effect-lint, verify-md-links, verify-db-schema, test (337 files / 2826 passed / 5 skipped) |
| Reachable-UI path | `pnpm --filter @cm-clone/desktop test:e2e` | 22 failed / 76 passed — the pre-existing `.scratch/desktop-suite-red/` set, unchanged |

Determinism and save compatibility: not applicable — no simulation, seeding, persistence or schema
touched (memo dependency arrays and one lint config).