# 01: Squad and Transfers re-render forever from the moment they mount

Type: bug
Status: resolved

## Correction to an earlier reading

An earlier version of this ticket claimed pressing `g` caused a **CPU spin at 202%**. That was
wrong, and the method that produced it was wrong: it compared `ps %cpu` of the *main* process
before against a *tree-wide* scan after, and `ps %cpu` on macOS is a lifetime average, not an
instantaneous reading. Re-measured with CPU-time deltas over a fixed window, per process. The
corrected findings are below. `g` is not the cause of anything.

## What was measured

`dev` at `9cc3ca1`, built app, driven over **raw CDP** — no Playwright anywhere in the loop
(this also answers the previous ticket's open question: the behaviour is not a Playwright or
accessibility-tree artifact).

DOM mutations observed on `document.body` (`subtree/childList/attributes/characterData`) while
sitting **completely idle**, no input of any kind:

| Screen | Mutations / 1.5s |
|---|---|
| Main menu | **1** |
| **Squad** | **31,488** |
| Tactics | 0 |
| **Transfers** | **51,480** |
| League Table | 0 |

Roughly 21,000–34,000 DOM mutations per second, forever, on two screens. Renderer CPU measured as a
true delta: **~123% of one core on Squad while idle**, against <5% on the main menu.

The mutation profile on Squad over 1.5s:

```
kinds:   childList x22800   attr:name x9600   attr:type x4500
targets: td.px-2.py-0.5 x15000
         input.accent-text-highlight x13500     <- the column-toggle checkboxes
         button.whitespace-nowrap.font-semibold x7500   <- the player-name cells
```

`childList` dominating means React is **destroying and recreating** these nodes, not updating them
— the subtree is being remounted, not re-rendered in place. `attr:name` on an `<input>` repeatedly
reading back `null` is the same nodes being torn down and rebuilt mid-observation.

## Scope points at the DataTable stack

The two screens that loop are the two that render `table/DataTable.tsx`
(`squad/SquadTable.tsx:240`, and Transfers via `table/TablePanel.tsx` from `MarketTable`/
`FreeAgentsTable`). Tactics and League Table, which do not use it, are flat at zero. `TacticsScreen`
only mentions `TablePanel` in a comment.

One concrete lead, not confirmed as *the* cause: `MarketTable.tsx:33` and `FreeAgentsTable.tsx:33`
pass `columns={marketPlayerColumns()}` / `columns={freeAgentColumns()}` — a freshly-constructed
array, with freshly-constructed cell renderers, on **every render**. If anything downstream treats
those as identity or as an effect dependency, that is a self-sustaining render cycle. Squad reaches
`DataTable` through a prepared `table` instance instead, so if it is one cause it is upstream of
both; if not, these are two bugs with one symptom. Start by logging render counts in `DataTable`
and walking up.

## The "wedge" is a symptom of this, not a separate bug

Both renderer hangs previously filed separately are on these two screens, and only these two:

- pressing `g` on **Squad** (mounts the `PrefixIndicator` via `KeyboardSpine`)
- clicking a Market row on **Transfers** (mounts the `BidComposer` "Place bid" region)

In both cases CPU does **not** rise (123% before, 123% after) — the renderer stops answering while
burning the same amount. `Debugger.pause` still catches it executing JS. The reading that fits: the
renderer is already saturated by the loop, and an input that mounts additional UI into that loop
tips it from "saturated but still servicing tasks" into "never yields again". Before the keypress
the renderer answers a CDP round-trip in **1ms** — it is responsive right up until the input.

So this is one bug, and fixing the loop should be expected to fix both hangs. Do not chase them
separately.

## What it costs

`e2e` currently loses 8 tests to the hang at ~48s each — about 6.4 minutes of a 7.1-minute run.
The 22 tests that pass total roughly 40 seconds. Those 8 specs are correct and were deliberately
left red rather than weakened.

More importantly, this is user-facing: two of the app's primary screens are pinning a core and
rebuilding their DOM tens of thousands of times a second with nobody touching the keyboard.

- [ ] Render-count instrumentation in `DataTable` identifies what re-triggers the cycle
- [ ] Squad and Transfers sit at ~0 idle mutations, like Tactics and League Table
- [ ] Re-check both hangs afterwards; expect them to be gone
- [ ] A guard so this cannot come back silently — an idle-mutation budget assertion is cheap and
      would have caught this the day it landed

## Resolution

Root cause, found with the CDP sampling profiler against a temporary unminified build. The update
scheduler driving every render was TanStack's own pagination auto-reset:

```
table.resetPageIndex -> table.setPageIndex -> table.setPagination
  -> onStateChange -> React dispatchSetState -> scheduleUpdateOnFiber
```

`useDataTable` handed `useReactTable` a **new `data` array and a new `columns` array on every
render** (`applyFilters(...)`, `marketPlayerColumns()`, `squadColumns({...})` are all called inline
in render). TanStack keys its internal memos on those identities, read the change as "the data
changed", and fired its `autoResetPageIndex` behaviour. That set pagination state, which
re-rendered, which produced the next pair of fresh arrays. A closed cycle, self-sustaining from
mount, on exactly the screens that mount a `DataTable`.

### Fixes

1. `table/useDataTable.ts` — `autoResetPageIndex: false`. These tables never paginate, so resetting
   a page index is meaningless; this is the edge that closed the cycle. **This alone stops the
   loop.**
2. `table/transfers/marketColumns.ts` — the column defs are static, so they are now built once at
   module load and returned by reference instead of rebuilt per call.
3. `squad/useSquadScreen.ts` — `columns` and `columnVisibility` are `useMemo`'d (`legendExpanded` is
   their only real input) and the legend toggle is a stable `useCallback`.

Fixes 2 and 3 do not stop the loop by themselves, but without them every render still rebuilt every
column, row, and cell object — the allocation churn that had the renderer spending **31.6% of its
time in GC**. They also stop fix 1 from being the only thing standing between the codebase and this
bug: with stable identities, a future `autoReset*` cannot reopen the cycle.

### Measured after

| Screen | Idle mutations / 1.5s — before → after |
|---|---|
| Squad | 31,488 → **0** |
| Transfers | 51,480 → **0** |
| Tactics / League Table / main menu | 0 → 0 |

Both hangs are gone: pressing `g` on Squad and clicking a Market row on Transfers both leave the
renderer responsive, confirming they were symptoms of this loop rather than separate bugs.

The e2e suite went from **7.1 minutes / 9 failures to 1.5 minutes / 2 failures**, with no test
timeouts remaining. Both survivors are unrelated bugs with their own tickets —
`.scratch/navbar-keyboard-intent/` and `.scratch/space-double-dispatch/`.

`.scratch/navbar-keyboard-intent/` is unaffected and still open — it was never part of this.
