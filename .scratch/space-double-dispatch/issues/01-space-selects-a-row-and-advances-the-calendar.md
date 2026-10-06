# 01: Space on a grid row both selects it and advances the Calendar

Type: bug
Status: resolved

## What happens

On Transfers (and any table screen with roving selection), focusing a row and pressing `Space`
fires **two** actions from one keystroke:

1. the grid's own selection toggle (`onToggleSelection`), and
2. the career-global **Continue** action, which is bound to `Space` in
   `renderer/actions/allActions.ts:62` and advances the Calendar.

Measured on a fresh seed, settled, on the Transfers screen:

```
before Space: Calendar: Season 1 · Pre-season
after  Space: Calendar: Season 1 · 1 Aug 2026
```

This directly violates AC-17 — "one keystroke executes at most one action" — which
`keymap/priority.ts` names as an invariant of `resolveDispatch`.

## Why it was invisible until now

The visible symptom is indirect and looks like something else entirely. Advancing out of
`pre_season` closes the transfer window (`isWindowOpen`, `season/currentSeason.ts:61`), so the Bid
button silently disables and the Composer renders "The transfer window is closed." on a save whose
header still reads Season 1. It looks like a broken bid form, not a calendar advance.

Isolated with a 2x2 — navigation method is irrelevant, selection method is everything:

| | click-select | Space-select |
|---|---|---|
| arrived via `g t` | window open | **window closed** |
| arrived via navbar | window open | **window closed** |

Click-select goes through `onRowPrimary` and never touches the calendar.

## Impact

Worse than a failing test: a keyboard player selecting a row in a grid **advances the game calendar
by a match round**, irreversibly, with no confirmation. Selection is a browsing gesture; it should
never mutate the save.

It also silently corrupts any keyboard-driven flow that selects before acting — the bid journey in
`e2e/journeys.spec.ts` ("a transfer bid settles and the budget reflects the spend (keyboard)")
fails because by the time it submits, the window it needs has been closed by its own selection
keystroke.

## Suggested direction (a decision is needed, so this is not pre-empted)

`Space` inside a focused grid should belong to the grid, and the career-global `Continue` should not
fire while a roving row owns focus — the same shape as the existing text-entry carve-out
(`shouldSuppressForTextEntry`), which already stops bare-key actions firing while an input has
focus. A "grid row has focus" scope check in `resolveDispatch` would cover every table screen at
once rather than per-screen.

The alternative — rebinding `Continue` off `Space` — is cheaper but loses a deliberate affordance
(`primary: true` drives the chrome's gradient treatment), so it should be a conscious choice.

- [ ] One keystroke, one action: `Space` on a focused grid row toggles selection and nothing else
- [ ] A `keymap/` unit test pinning AC-17 for this collision specifically
- [ ] `e2e/journeys.spec.ts` "a transfer bid settles… (keyboard)" passes unchanged

## Resolution

Fixed one level more general than the ticket proposed, because the collision was not really about
grids. A native `<button>` activates on Space, so *any* focused button plus a career-global Space
binding was already two actions from one keystroke — the grid row was just where it had a visible,
destructive consequence.

`keymap/keystroke.ts` gained `controlOwnsSpace(target, keystroke)`: true when the focused element
(or an ancestor — the event target is usually an inner `<span>`) is a control that natively
activates on Space. `keymap/priority.ts` consumes it as `nativeActivation` and returns
`{ kind: "native" }`, placed with the existing typing carve-out at priority 1, since it is the same
principle: the focused control has first claim on the key.

Deliberately narrow in two ways:

- **Space only.** No career-global or app-global action binds Enter today, so widening it there
  would change dispatch for flows nothing currently collides with.
- **No change to `Continue`.** It keeps its `Space` binding and its `primary: true` chrome
  treatment; it simply no longer fires while a control that owns Space has focus. Space on a screen
  region still advances the Calendar exactly as before.

Four regression tests in `test/keymap-priority.test.ts` pin it: Space on a focused control resolves
`native`; Space away from one still reaches `continue`; `controlOwnsSpace` holds for a button and
its descendants but not a plain region; and a bare letter on a button still reaches its binding.
That file is 32/32.

`e2e/journeys.spec.ts` "a transfer bid settles and the budget reflects the spend (keyboard)" passes
unchanged — the bid now completes because selecting a row no longer closes the transfer window.
