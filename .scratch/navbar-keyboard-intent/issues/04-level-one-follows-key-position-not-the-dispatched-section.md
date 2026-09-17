# 04: The item level follows the key's position, not the section the key dispatched

Type: bug
Status: claimed

## What was measured

Found in the review of ticket 03. `validateOverride` and main's backstop both accept `g <n>` for any
career-global action. A hand-edited `keybindings.json` can therefore free a section key and give it
to another section's action. For example, `go-to-tactics` is set to `n` and then `go-to-squad` to `g 2`:

- Level 0 accepts `2` and dispatches Squad (`KeyboardStateProvider.tsx`, `level0Completions`).
- The item level is then entered by position (`sectionKey "2"`), so `g 2 q` opens Tactics' first item.
- No section shows a `2` badge (`PrimaryNavItem.tsx`), even though `g 2` works.

The help overlay records only one key, so this cannot be reached from the UI. The lookup by position
predates tickets 02 and 03.

## The decision this needs

Either the item level follows the dispatched action's `metadata.sectionKey`, and the badge moves
with it, or override validation rejects `g <n>` on an action whose section is not at position `n`.
The second keeps "section `n` is `g n`" as a fixed rule and is less code.

- [ ] The decision is recorded
- [ ] A test with such an override shows that the navbar badge, the dispatched section and its item
      level all agree, or that the override is rejected
