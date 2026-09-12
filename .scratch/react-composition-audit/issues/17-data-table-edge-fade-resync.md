# 17 — Restore the DataTable edge-fade re-sync that ticket 10 dropped

Type: bug
Status: resolved

**Blocked by:** none.

## Symptom

The horizontal overflow fades on every shared table only measure on mount and on window resize.
Scrolling the table, loading its rows, and toggling Squad column visibility leave them stale:

- Market and Free Agents measure before any rows exist, so the right fade never appears once rows
  load, until the window is resized.
- Trackpad or wheel scrolling never turns the left fade on or the right fade off.
- Squad restores a saved `initialScrollLeft` *after* measuring, so a remount with a saved offset
  shows no left fade.

Found by the reviewer on [desktop-suite-red 01](../../desktop-suite-red/issues/01-select-primitive-breaks-filter-tests.md),
2026-09-10. Not reproduced in a running app; established by reading the code against its
pre-refactor version.

## Cause

`f464885` (ticket 10, the `useScrollEdges` / `useTableKeyboard` extraction) moved the measurement
into `useScrollEdges` but dropped all three of its re-sync triggers. Before, in `DataTable.tsx`:

| Trigger | Before `f464885` | Now |
|---|---|---|
| Re-measure on rows / visible columns | effect deps `[syncEdges, rows.length, table.getVisibleFlatColumns().length]` | `useScrollEdges(scrollRef)` with no `extraDeps` |
| Re-measure on scroll | `onScroll={syncEdges}` on the scroll container | no scroll handler; the hook does not return `syncEdges` |
| Re-measure after Shift+Arrow | `syncEdges()` after setting `scrollLeft` | not called in `useTableKeyboard` |

The restore-then-measure order also flipped: the `initialScrollLeft` restore now runs after the
measuring layout effect.

Tests stayed green because only the pure `scrollEdges` rule is covered; no component or e2e spec
reads `data-scroll-edge`.

## What to build

- `useScrollEdges` also returns `syncEdges`; the scroll container gets `onScroll={syncEdges}`. A
  programmatic `scrollLeft` write fires `scroll`, so this also covers Shift+Arrow and the restore.
- `DataTableRoot` passes `[orderedIds.length, table.getVisibleFlatColumns().length]` as `extraDeps`.
  `table` is still a `DataTableRootProps` prop that both callers pass; read it again rather than
  removing it.
- Update the stale pointer in
  [the dense-table decision record](../../../.agents/notes/implemented/architecture/2026-08-31-dense-table-and-status-vocabulary.md),
  which still says the `scrollEdges` rule lives in `DataTable.tsx`. It lives in `useScrollEdges.ts`.

## Acceptance criteria

- [x] A jsdom component test stubs `scrollWidth` / `clientWidth`, fires `scroll`, and asserts the
      `data-scroll-edge` fades update. It fails at the current `HEAD`.
- [x] A test covers rows arriving after mount (empty → populated) turning the right fade on.
- [x] Mounting with a saved `initialScrollLeft` shows the left fade.
- [ ] `pnpm check:all` passes.

## Answer

2026-09-10. The fades re-measure on scroll, when rows arrive, and when columns are shown or hidden,
and a mount with a saved offset shows the left fade.

- **`useScrollEdges`** returns `{ edges, syncEdges }`. `syncEdges` keeps the previous object when
  neither edge changed, so scrolling does not re-render the table every frame.
- **`DataTableRoot`** puts `syncEdges` on the container's `onScroll` and passes
  `[orderedIds.length, table.getVisibleFlatColumns().length]` as `extraDeps`.
- **The `initialScrollLeft` restore** is declared before the hook again. The browser's `scroll`
  for that write does arrive, but the re-render it causes commits after the first paint.
- **Shift+Arrow** has no re-measure of its own. The `scrollLeft` write fires `scroll` in Chromium,
  and `onScroll` handles it. The fade updates one frame later than the old synchronous call,
  which the 150ms opacity transition hides. jsdom cannot prove this path, and no e2e spec reads
  the fades.

**Tests:** `test/renderer/table/scroll-edge-fades.test.tsx` has four tests: scroll, rows arriving,
columns shown, and a restored offset. All four failed at `8f95c8f`; the reviewer reproduced that
by stashing only the two source files. All four pass with the fix.

**Last criterion (left unticked):** `pnpm check:all` passed every gate except one unit test,
`test/renderer/match/screen-fulltime.test.tsx`. That spec also fails 1 run in 3 at bare `8f95c8f`
with no diff applied, so it is a pre-existing flake, filed as
[desktop-suite-red 04](../../desktop-suite-red/issues/04-fulltime-spec-flakes.md).

**E2e:** 5 failed / 28 passed, the same five as at bare `8f95c8f`. See
[the report](../../../.ai/reports/react-composition-audit-ticket-17.md).

**Reviewer's follow-up candidates** (not filed; they predate `f464885` or sit outside this ticket):

- Content width can change with the same row and column counts, and the container can resize
  without a window resize; a `ResizeObserver` would catch both.
- Squad clamps a saved offset to 0 when it mounts before its rows exist.
- Passing `onScrollCommit` would silently turn on Shift+Arrow scrolling for Market and Free Agents.
- `pinnedStyle` is duplicated.
- `.agents/notes/implemented/architecture/2026-09-01-club-selection-keyboard-tier-and-listbox.md:15`
  still says row roving lives in `DataTable.tsx`.
