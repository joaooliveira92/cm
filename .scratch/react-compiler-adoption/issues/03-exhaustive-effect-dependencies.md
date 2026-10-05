# 03: `react/exhaustive-effect-dependencies` — reconcile deliberately-scoped dependency arrays

Type: task
Status: resolved

## Bucket

`react/exhaustive-effect-dependencies` — 29 findings, `warn` in `.oxlintrc.json`.

## What it flags

Effects whose declared dependency arrays are missing values the body reads or carry values it
does not read — e.g. `apps/desktop/src/renderer/transfers/useTransferTables.ts`:

```
useEffect(() => {
  restoreFocusFor(MARKET, market.active, market.bookmark, marketIds);
}, [marketIdsKey, viewWaiting, market.active, market.bookmark]); // eslint-disable-line react-hooks/exhaustive-deps
```

Several sites already carry `eslint-disable-line react-hooks/exhaustive-deps` comments: the
arrays are deliberately scoped (often keyed by an id-generation instead of the value). Each site
needs a call: fix the array, restructure the effect, or turn the rule-suppression into something
the compiler approves of.

## Exit criteria

- [x] `react/exhaustive-effect-dependencies` graduates from `warn` to `error` in `.oxlintrc.json`.
- [x] `pnpm lint` reports zero `react/exhaustive-effect-dependencies` findings.
- [x] No `eslint-disable-line react-hooks/exhaustive-deps` suppression is left in the renderer.

## Answer

The measured baseline was **25 findings across 21 files**, not the 29/27 the spec and ticket
recorded. All are cleared and the rule is now `error`; the 9 `eslint-disable-line
react-hooks/exhaustive-deps` comments in the renderer are gone.

Each site resolved one of: an extra dep the body never read (dropped), a missing dep that is stable
(added), a missing dep that was unstable (stabilized at source), or an id-generation key standing in
for the value it reads (restructured to read through a layout-effect-written ref or a keyed store, so
the array can name exactly what the body uses). Re-run sets that genuinely changed are listed in the
commit body: `useTransferPaletteActions` and `useSquadScreen` re-register when a filter command
changes, `KeyboardSpine` no longer re-registers on navigation, `useMatchLifecycle` still re-registers
on save change through `startMatch`/`commitResult`, and `useResetDraftOnSaveChange` resets on mount
because the Transfers subtree remounts per save (`RegistryProvider key={saveId}`).

**Not in this ticket:** the 12 `eslint-disable-next-line react-hooks/exhaustive-deps` suppressions in
the vendored `components/reui/` files (`data-grid`, `event-calendar`). They are the `-next-line`
form, which the exit criterion does not name, and removing them surfaces real missing-dep findings
in vendored code. They stay in bucket 07 (small buckets / `rule-suppression`).