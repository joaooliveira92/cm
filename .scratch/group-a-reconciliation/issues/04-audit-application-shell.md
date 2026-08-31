# 04 — Audit: application shell (spec 01)

Type: task
Status: resolved
Blocked by: 02, 03

## Question

Does the implemented application shell follow
[01_app_sheell.md](../../../docs/specs/group_a_application_shell_and_game_lifecycle_remaining/01_app_sheell.md),
and where does it deliberately not?

The shell is the spine the other sixteen implemented screens sit inside, so it is worth auditing
whatever the trim says about the rest. Relevant implementation: `apps/desktop/src/renderer/router/`,
`navigation/`, `keymap/`, `actions/`, and `KeyboardSpine.tsx`, plus the main-process entry at
`apps/desktop/src/main/index.ts`.

Note that the shell already carries a set of standing decisions from the keyboard-first effort — the
action registry, the closed navigation-destination set, the global key map, the intra-screen focus
model. Where the spec disagrees with one of those, the existing decision wins and the disagreement is
registered; it is not an invitation to redesign the shell.

## Done when

Register entries exist for spec 01, and any place the implementation must change is stated as a spec
requirement rather than fixed in place.

**Scope narrowed by ticket 02.** `01_app_sheell.md` also contains a full duplicate of Screen 2 and a
screen-inventory preamble. `02_new_game.md` is canonical for Screen 2, so this ticket audits **Screen 1
(Main Menu) only** out of file 01, and records the duplicate as a single ledger row. Findings go into
[RECONCILIATION.md
](../../../docs/specs/group_a_application_shell_and_game_lifecycle_remaining/RECONCILIATION.md) in the ticket-02
format; flip the screen's coverage status line from `Not yet audited` to `Audited` as part of closing.

## Answer

**Screen 1 audited; 28 ledger rows, no code changed.** See [Agent Note](../../../.agents/notes/proposed/process/2026-08-30-screen-audit-against-imported-spec.md).
