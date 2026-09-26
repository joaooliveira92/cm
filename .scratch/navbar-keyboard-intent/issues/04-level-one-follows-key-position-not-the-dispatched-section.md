# 04: The item level follows the key's position, not the section the key dispatched

Type: bug
Status: resolved

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

- [x] The decision is recorded
- [x] A test with such an override shows that the navbar badge, the dispatched section and its item
      level all agree, or that the override is rejected

## Answer

**Override validation rejects the binding.** A `g <n>` key, where `n` is a section's position, may
be bound only to the section action at position `n`. A section action can still be rebound away
from its key, and back to it, so ticket 03's override-aware badges stay.

Why: the navbar badge, level 0 of the prefix and the item level all find a section by its
position. Keeping "section `n` is `g n`" fixed leaves all three on that one rule. Re-keying the item
level by the dispatched action's `metadata.sectionKey` would also need the badge to move, which is
more code. The help overlay records only one key, so only a hand-edited `keybindings.json` loses
anything.

What changed:

- `actions/overrides.ts`: `validateOverride` gains the check (a `shape` rejection naming the
  section that owns the key). It reads the section keys from the actions' `metadata.sectionKey`,
  which `allActions.ts` derives from `NAV_SECTIONS`.
- `actions/overrides.ts`: `withoutMisplacedSectionKeys` drops such entries from a loaded map.
  `KeyboardStateProvider.tsx` applies it to the map fetched at mount and to every map the help
  overlay adopts, since main returns the whole file each time. The dropped action falls back to
  its coded default for the badge, level 0 and the item level.
- Main (`main/rpc/keybindings.ts`) has no guard for this rule, and its module doc now says why.
  Main's guards are string-level and do not know the registry. This check needs the section order,
  which is renderer config (`NAV_SECTIONS`, alongside its icons), and main may not import renderer
  modules. Before this ticket, main also passed a hand-edited file to the renderer without checking
  its entries. The renderer load path is therefore where such an entry is stopped.

Tests: `test/renderer/actions/override-validation.test.ts` ("ticket 04") covers the rejections, the
accepted rebinds and the load filter. `test/renderer/keyboard/spine-rebinding.test.tsx` ("ticket
04") mounts the spine with a hand-edited map that holds the moved key. It checks the published map
the badge reads, that level 0 cancels the moved key, and that the section's own key opens its own
items.
