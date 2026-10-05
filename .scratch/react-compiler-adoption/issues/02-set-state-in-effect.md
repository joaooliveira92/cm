# 02: `react/set-state-in-effect` — stop calling state setters from inside effects

Type: task
Status: resolved

## Bucket

`react/set-state-in-effect` — 43 findings, `warn` in `.oxlintrc.json`.

## What it flags

Calling a state setter (setState, or an Effect atom setter/filler) from inside an effect
(useEffect / useCallback / useMemo body). Per the Rules of React, state should change in
response to render or events, not as a side effect of another state change.

## Exit criteria

- [x] `react/set-state-in-effect` graduates from `warn` to `error` in `.oxlintrc.json`.
- [x] `pnpm lint` reports zero `react/set-state-in-effect` findings.
- [x] Any behaviour change (an update firing differently) is justified per site.

## Answer

The measured baseline was **27 findings across 25 files**, not the 43 the ticket recorded. All are
cleared and the rule is now `error`. Three fix shapes:

- **Derived during render** — the state existed to mirror props/other state or to mark a load
  in flight, so it became a render-time computation: `squadBottomBar` (the "last changed wins"
  line), `FavoriteTeamField`, `NationalityField`, `useLineupFit`, `CommandPalette`,
  `TacticsOverviewScreen`, `useTacticDraft`, `useMatchLifecycle`, `useCreateSession`,
  `ReviewPane`, `number-ticker`.
- **Keyed read store** — `ReportScreen`, `LatestScoresScreen`, `PostMatchSummary` and
  `useBoundMatchRead` store `{ key, state }` and derive `loading` when the current binding key
  differs, so retry/reload changes the key instead of setting a synchronous loading state. A new
  binding shows `loading` for the refetch window, as before.
- **Explicit justification or suppression** — `HomeTeamScreen`, `AwayTeamScreen`, `useSaveList`
  are genuine false positives (state is set only after an `await`) and carry a visible
  `eslint-disable-next-line react/set-state-in-effect -- reason`. `CommentaryScreen` and
  `match/useMatchControl` suppress because the synchronous set is intrinsic (ref-owned reveal cut;
  mirroring the tactics atom into an editable local draft). Three vendored `components/ui` /
  `components/reui` sites suppress likewise.

**The first pass was rejected.** It hid eight sites behind `void Promise.resolve().then(load)` and
wrapped one effect body in a local `run()` — clearing the linter without removing the pattern, which
the reviewer flagged as a blocker and a high. Both idioms are gone; the keyed derives replace them.
`squadBottomBar` needed a second repair to mirror the two effects it replaced exactly (a
`null → same-value` round trip re-asserts the notice), now covered by a regression test.