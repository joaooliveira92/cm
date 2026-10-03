# 19: the Select popup has no listbox, so every spec that picks from a Select times out

Type: bug
Status: resolved

**Blocked by:** none.

## Symptom

Found 2026-09-28 while reproducing [18](18-two-unreproduced-e2e-failure-shapes.md) in a fresh
worktree at `a5dc04c5`. The first full `test:e2e` run failed five specs in its first 28:
`active-leagues-setup:36`, `app:41`, `app:93`, `contract-offer:78` and `contract-renewal:15`. Each
failure fails the same way. The combobox reads `[expanded]` and its options are rendered, but no
element carries `role="listbox"`, so `getByRole("listbox")` waits out its 5s expect timeout, or the
30s action timeout when the call is `listbox.getByRole("option").nth(1).click()`. `pmset -g log`
shows no sleep in the window, and `caffeinate` was holding, so this is not ticket 17's cause.

## Cause

`66b628ec` (`refactor(ui): Select renders its own value and selected mark over Autocomplete`)
rebuilt `components/ui/select.tsx` on Base UI's Autocomplete. `SelectContent` renders the items
directly inside `Autocomplete.Popup`, without `Autocomplete.List`, and `List` is the part that
renders `role="listbox"`. The commit message recorded the break ("Known broken: the create-flow
tests fail in openSelect (no listbox appears)").

## Acceptance criteria

- [x] An open Select exposes its options inside a `listbox`
- [x] The Select unit tests and the create-flow tests that open a Select pass
- [x] A full `test:e2e` run has no Select-shaped failure
- [x] No test is loosened, skipped, retried into green, or given a larger timeout to absorb it

## Answer

Resolved 2026-09-28 in `186dc78e`. Finishing the Autocomplete version would have meant redesigning
how the field shows its value (the trigger had become a text input showing the raw value, `b`, not
the label, `Bravo`) and rewriting every form spec. Reverting was the smaller change, and the human
chose it. `select.tsx` and its test helpers are back to Base UI's Select primitive, keeping the
palette. Match Substitutions goes back to native `<select>`s, which
[the component-adoption note](../../../.agents/notes/proposed/architecture/2026-08-31-shadcn-component-adoption.md)
keeps native.

That brought the desktop unit suite from 60 failures to 36. The other 36 were unrelated drift from
the same night's commits, fixed in `4a384da3`, `2683c985` and `0c1da979`. Evidence: `pnpm check:all`
passed all six gates with 2338 of 2338 tests, and a full `test:e2e` run passed 66 of 67 with no
Select-shaped failure. The one red spec, `development-centre:11`, asserted the old copy that
`ddffce47` replaced, and it was re-pointed in the same commit as this answer.
