# Validation Report: navbar-keyboard-intent

## Ticket 02 — the World section badges a dead `g 8`, 2026-09-16

- Effort: `.scratch/navbar-keyboard-intent/`
- Ticket closed: [02](../../.scratch/navbar-keyboard-intent/issues/02-world-section-advertises-a-dead-g-key.md)
- Branch: `dev`
- Follow-up filed: [03](../../.scratch/navbar-keyboard-intent/issues/03-e2e-and-key-map-note-still-use-letter-keys.md)

### Decision

World gains a working `g 8` instead of losing its badge. Grounds: the implemented
[career chrome note](../../.agents/notes/implemented/architecture/2026-08-31-career-chrome-and-date-continue-bar.md)
keeps every tab "`g <key>`-available", and two-row-nav user story 13 asks for keyboard navigation
for every nav item. Recorded in the ticket's `## Answer`.

### Acceptance criteria → evidence

| # | Criterion | Proving test | Result |
|---|---|---|---|
| 1 | Decision recorded | ticket `## Answer` | done |
| 2 | Navbar advertises a key iff it dispatches | `navbar.test.tsx` "badges each section's number key while the level0 prefix is pending" (expectation unedited) | pass (was red on purpose) |
| 3 | `g 3` reaches Training | `spine-live.test.tsx` "g <%s section key> reaches that section's default destination"; `stage2.test.ts` binding table | pass |
| 4 | `CAREER_G_BINDINGS` single source or removed | removed; consumers read `ALL_ACTIONS` | no importers remain |
| 5 | nav-config comments agree | `1`–`N`, one key per section | done |
| 6 | Badge case passes without re-freezing | as 2 | pass |

The spine-live `g 8` case fails with the `/^[1-7]$/` cap restored (checked by the implementator).

### Gate

| Gate | Command | Result |
|---|---|---|
| check:all | `pnpm check:all` | exit 1, pre-existing only. typecheck ✓, effect-lint ✓, verify-db-schema ✓; lint ✗ (19 error lines, same as before this ticket); verify-md-links ✗ (same 18 group-c/group-d links). Tests: shared 461/461, contracts 149/149, game-engine 50/50; desktop **68 failed / 1792 passed (1860)**, 17 files. The failing-case list equals the previous gate run's (at `99b60fe` plus the tree) minus exactly `navbar.test.tsx` badge case. |
| e2e | `pnpm test:e2e e2e/keyboard.spec.ts e2e/keybindings.spec.ts e2e/router.spec.ts` | 4 failed / 9 passed, all pre-existing. See below. |
| determinism | — | not applicable: no engine, shared, or seeding change |
| save compatibility | — | not applicable: no persistence change. Saved key-binding overrides are keyed by action id, and the ids for sections 1–7 are unchanged (verified by the reviewer against HEAD). |

e2e failures, none caused by this ticket:

- `keyboard.spec.ts:30` "g <key> navigation reaches the career screens…" and `keyboard.spec.ts:156`
  "Escape closes only the topmost transient layer" — press `g a` / `g s` / `g t` / `g d`, unbound
  since `860d429`. Failure at `keyboard.spec.ts:176`, Tactics heading not found after `g a`. Ticket 03.
- `keybindings.spec.ts:18` — rebinds "Go to Transfers", an action that no longer exists. Ticket 03.
- `router.spec.ts:184` "Match Day arrival resumes a pending match…" — navigates by pointer, no key
  involved; `Start match` not found at `router.spec.ts:190`. Unrelated UI drift, not filed here.

### Behavior changes

- `g 8` now opens World (Competitions).
- `g 3` now opens Training; it previously opened Squad despite its "Go to Training" label.
- No save or seeded outcome changes.

### Review

Reviewer **APPROVE**, three lows: the global-key-map note's stale letter-key table, a saved override
of `g 8` made before this change now losing to `go-to-world` (that override never worked, since level
0 rejected `8`), and navbar badges not following user overrides. The first and third are in ticket 03.

### Decision records

- ADRs added: none
- Agent Notes written: none. One line in the proposed
  [career-scoped placeholder screens note](../../.agents/notes/proposed/feature/2026-09-11-career-scoped-placeholder-screens.md)
  repointed from `CAREER_G_BINDINGS`.
- Agent Notes promoted: none

### Changed files

`apps/desktop/src/renderer/`: `actions/allActions.ts`, `keyboard/{KeyboardSpine.tsx,KeyboardStateProvider.tsx}`,
`navigation/{destinations.ts,nav-config.ts,nav-route-index.ts}`.
`apps/desktop/test/renderer/`: `actions/registry.test.ts`, `clubStaff/club-staff-route.test.ts`,
`keyboard/spine-live.test.tsx`, `navigation/navbar.test.tsx` (comment only),
`router/{stage2.test.ts,team-scout-report-route.test.ts}`. Ticket 02, new ticket 03, this report, the
sprint plan, and the placeholder-screens note.
