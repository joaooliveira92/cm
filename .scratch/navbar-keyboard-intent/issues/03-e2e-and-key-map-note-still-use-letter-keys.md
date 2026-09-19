# 03: e2e specs and the global-key-map note still use the retired letter `g` keys

Type: bug
Status: resolved

## What was measured

Found on `dev` during the review of ticket 02. Commit `860d429` ("two-level position-based shortcut
system") replaced the letter `g` bindings with position keys (`g 1` to `g 8`, then a position key for
the section's item). Three e2e specs and one implemented Agent Note were never updated:

- `apps/desktop/e2e/keyboard.spec.ts:36-53` presses `g a`, `g t`, `g d`, `g s`. None of them is bound.
- `apps/desktop/e2e/journeys.spec.ts` (around lines 100-209) presses the same letter keys.
- `apps/desktop/e2e/keybindings.spec.ts:37` rebinds "Go to Transfers" from `g t`. That action no
  longer exists. The section is Recruitment, `go-to-recruitment`, `g 4`.
- `.agents/notes/implemented/feature/2026-08-29-global-key-map.md:40-47`: its binding table lists
  `g s/a/t/l/f/m/y`. `allActions.ts` still sends readers to this note for the key map.

None of these files changed in ticket 02. It predates that ticket.

## Related, lower priority

`PrimaryNav.tsx` badges each section `String(index + 1)` without checking the effective bindings. If
a user rebinds a section action, for example `go-to-squad` to a bare key, the `1` badge stays even
though level 0 no longer accepts `1`. The default bindings are consistent since ticket 02. Whether
badges should follow user overrides is a design call. If this ticket does not settle it, raise a
decision request.

- [x] The three specs drive navigation with the position keys, and their assertions still check the
      same destinations, with no assertion weakened
- [x] The global-key-map note records that the position-based scheme superseded its table and points
      to where the live scheme is defined
- [x] The override-aware badge question is answered or raised as a decision request

## Answer

Badges follow user overrides. Ticket 02 set the rule that the navbar shows a key only if that key
dispatches, and an override is exactly the case where the coded key stops dispatching. Level 0 of
the prefix builds its accepted keys from the effective bindings (`level0Completions` in
`KeyboardStateProvider.tsx`). So once `go-to-tactics` is rebound off `g 2`, pressing `2` after `g`
cancels the prefix, and a `2` badge on Tactics would be advertising a dead key.

The live navbar badge is drawn by `PrimaryNavItem.tsx`, not `PrimaryNav.tsx`. `PrimaryNav.tsx` is
not mounted by the app. It renders the older `SPEC_SECTIONS` list and only
`test/renderer/navigation/primary-nav.test.tsx` imports it, so it was left alone. `PrimaryNavItem`
now reads the published override map (`actions/bindingState.ts`, the same store
`ActionKeyBadge` reads) and shows the section's number only while the effective binding of
`go-to-<section id>` is `g <position>`. `test/renderer/navigation/navbar.test.tsx` rebinds
`go-to-tactics`, checks that the Tactics badge is gone while the others stay, and checks that it
comes back after a reset.

The submenu item hints in `ContextNav.tsx` needed no change. They only render while the prefix is
at the item level for that same section, and `KeyboardSpine` only enters that level after level 0
accepted the section key. If the key was overridden away through the help overlay, that level is
never entered, so the item hints never show. A hand-edited `keybindings.json` can move a freed
`g <n>` onto another section's action, which enters the level without a badge; that gap predates this
ticket and is [ticket 04](04-level-one-follows-key-position-not-the-dispatched-section.md).

### Criterion 1, qualified

The keys and destinations are migrated in all three specs, and no assertion was removed or weakened.
The migrated destinations are proven green by `keyboard.spec.ts:32`, `journeys.spec.ts:92` (up to
its Match day heading and focus) and `journeys.spec.ts:202`. Two groups of assertions have not
executed, because other bugs stop the tests first:

- `keybindings.spec.ts:18`'s `keybindings.json` and relaunch checks, and `journeys.spec.ts:69`: the
  specs call `app.close()` directly, which hangs. [desktop-suite-red 07](../../desktop-suite-red/issues/07-e2e-specs-hang-on-bare-app-close.md).
- `journeys.spec.ts:92` and `:158` and `keyboard.spec.ts:158` after Match Day: no `Start match`
  button. [desktop-suite-red 08](../../desktop-suite-red/issues/08-before-matchday-seed-offers-no-fixture.md).
