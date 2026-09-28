# 19: the Select popup has no listbox, so every spec that picks from a Select times out

Type: bug
Status: claimed

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

- [ ] An open Select exposes its options inside a `listbox`
- [ ] The Select unit tests and the create-flow tests that open a Select pass
- [ ] A full `test:e2e` run has no Select-shaped failure
- [ ] No test is loosened, skipped, retried into green, or given a larger timeout to absorb it
