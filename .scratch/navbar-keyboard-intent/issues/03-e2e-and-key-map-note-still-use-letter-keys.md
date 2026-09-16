# 03: e2e specs and the global-key-map note still use the retired letter `g` keys

Type: bug
Status: ready-for-agent

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

- [ ] The three specs drive navigation with the position keys, and their assertions still check the
      same destinations, with no assertion weakened
- [ ] The global-key-map note records that the position-based scheme superseded its table and points
      to where the live scheme is defined
- [ ] The override-aware badge question is answered or raised as a decision request
