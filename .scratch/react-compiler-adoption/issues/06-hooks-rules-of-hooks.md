# 06: `react/hooks` — Rules-of-Hooks violations

Type: task
Status: resolved

## Bucket

`react/hooks` — 12 findings, `warn` in `.oxlintrc.json`.

## What it flags

Compile-time Rules-of-Hooks violations: calls to hooks from conditional/looped/early-return
positions, hooks invoked outside a hook call, or similar structure the compiler refuses to
memorize because the hook topology is not static.

## Exit criteria

- `react/hooks` graduates from `warn` to `error` in `.oxlintrc.json`.
- `pnpm lint` still reports zero `react/hooks` findings.

## Answer

Fourteen findings (the bucket had drifted from the spec's baseline of 12) across five screens, all
resolved by giving each hook a fixed call site. The rule is now `error` with zero findings.

- **`HiddenSelectedNotice`** (`leagueSelection/LeagueSelectionScreen.tsx`) read the notice context
  once, instead of a second time after its `return null` guard.
- **`CareerShell`** split its save-scope read from the malformed-address branch, so
  `CareerShellContent` runs every hook unconditionally.
- **`SquadTable`** split the `LoadError` branch into a wrapper; `SquadTableLoaded` holds the hooks.
  The split (rather than reordering the hooks above the return) keeps the error path from
  registering the toolbar and bottom bar, which the early return used to skip.
- **`TacticsScreen`** split the route and in-match data sources (`StandaloneTacticsScreen` /
  `InMatchTacticsScreen`) over a shared `TacticsWorkspace`, so `useTacticDraft` is only called on
  the route.
- **`MatchMatchTacticsScreen`** moved the command body into `MatchTacticsReady`, so its `useCallback`s
  sit at the top level rather than inside `LiveCommandFrame`'s render prop.

The React Compiler rule set itself shipped in `2ad88739`; the fixes in `01ed1be2`. `pnpm check:ci`
is green.