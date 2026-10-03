# 03: `react/exhaustive-effect-dependencies` — reconcile deliberately-scoped dependency arrays

Type: task
Status: ready-for-agent

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

- `react/exhaustive-effect-dependencies` graduates from `warn` to `error` in `.oxlintrc.json`.
- `pnpm lint` still reports zero `react/exhaustive-effect-dependencies` findings.
- No `eslint-disable-line react-hooks/exhaustive-deps` suppression is left in the renderer.