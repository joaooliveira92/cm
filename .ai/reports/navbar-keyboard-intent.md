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

## Ticket 03 — e2e specs and the global-key-map note on the retired letter keys, 2026-09-16

- Ticket closed: [03](../../.scratch/navbar-keyboard-intent/issues/03-e2e-and-key-map-note-still-use-letter-keys.md)
- Follow-ups filed: [navbar-keyboard-intent 04](../../.scratch/navbar-keyboard-intent/issues/04-level-one-follows-key-position-not-the-dispatched-section.md),
  [desktop-suite-red 07](../../.scratch/desktop-suite-red/issues/07-e2e-specs-hang-on-bare-app-close.md),
  [desktop-suite-red 08](../../.scratch/desktop-suite-red/issues/08-before-matchday-seed-offers-no-fixture.md)

### What shipped

- `keyboard.spec.ts`, `journeys.spec.ts` and `keybindings.spec.ts` press position keys through new
  `launchApp.ts` helpers `pressSectionKey` / `pressItemKey`, which derive the keys from `NAV_SECTIONS`
  and `POSITION_KEYS`: `g a` → `g 2`, `g t` → `g 4`, `g d` → `g 5 e`, `g s` → `g 1`. The rebind test
  targets "Go to Recruitment".
- The global-key-map note marks its letter rows superseded and points to the live definitions.
- Navbar section badges follow user overrides (`PrimaryNavItem.tsx`), so a rebound section action
  loses its badge. The decision extends ticket 02's rule that a key is advertised only if it dispatches.
  `PrimaryNav.tsx` is unmounted and was left alone.

### Acceptance criteria → evidence

| # | Criterion | Proving test | Result |
|---|---|---|---|
| 1 | Specs use position keys, same destinations, nothing weakened | `keyboard.spec.ts:32`, `journeys.spec.ts:202`; `journeys.spec.ts:92` up to Match day | pass, **qualified**: keybindings persistence/relaunch and the post-Match-Day steps have not executed (desktop-suite-red 07, 08) |
| 2 | Note records the supersession | note edit | done |
| 3 | Override-aware badges answered | `navbar.test.tsx` "drops a section's number badge once the user rebinds its go-to action away from it" | pass |

### Gate

| Gate | Command | Result |
|---|---|---|
| check:all | `pnpm check:all` | exit 1, pre-existing only. typecheck ✓, effect-lint ✓, verify-db-schema ✓; lint ✗ and verify-md-links ✗ with the same counts as ticket 02's run. Desktop **68 failed / 1793 passed (1861)**. The failing-case list is identical to ticket 02's run; the extra pass is the new badge test. |
| e2e | `pnpm test:e2e e2e/keyboard.spec.ts e2e/keybindings.spec.ts e2e/journeys.spec.ts` | 5 passed / 5 failed. Before the ticket (implementator's baseline): 3 passed / 7 failed. Remaining: `journeys:69`, `keybindings:18` hit the 45s timeout on bare `app.close()` (07); `journeys:92` at line 112, `journeys:158` at 171, `keyboard:158` at 184 find no enabled `Start match` (08). |
| determinism | — | not applicable |
| save compatibility | — | not applicable; no persistence change |

### Review

Reviewer **APPROVE**. Medium: criterion 1 needed the qualification above. Lows: a hand-edited override
can move a freed `g <n>` to another section's action (ticket 04, and the Answer's wording narrowed);
a small timing window in `pressSectionKey` if the machine stalls past the 800ms prefix timeout
(accepted); the note hard-coded `g 1` to `g 8` (fixed).

## Ticket 04 — the item level follows key position, not the dispatched section, 2026-09-17

- Ticket closed: [04](../../.scratch/navbar-keyboard-intent/issues/04-level-one-follows-key-position-not-the-dispatched-section.md)

**Decision (orchestrator).** A section's `g <position>` key may only be bound to that section's own
action. Override validation rejects it elsewhere, and a loaded or adopted map drops such an entry.
This keeps "section n is `g n`" fixed for the badge, level 0 and the item level, with less code than
re-keying the item level. The rule is recorded as a dated update on the
[user key binding overrides note](../../.agents/notes/implemented/feature/2026-08-30-user-key-binding-overrides.md).

| Gate | Command | Result |
|---|---|---|
| check:all | `pnpm check:all` | exit 1, pre-existing only. Typecheck, effect-lint and verify-db-schema ✓. Desktop 61 failed / 1884 passed, the same failing cases as group-g 30's run. Lint 19, md-links 18. |
| focused | `npx vitest run test/renderer/actions test/renderer/keyboard test/renderer/navigation test/renderer/keymap test/main/rpc test/renderer/discoverability` | 512 passed, 4 failed. The 4 are the discoverability tests that were already failing; they fail identically with this ticket's source reverted. |
| e2e | `pnpm test:e2e e2e/keybindings.spec.ts e2e/keyboard.spec.ts` | 5 passed |

**Tests.** `override-validation.test.ts`: rejects another section's action on a freed key, rejects a
non-section action on it, accepts rebinding away and back, and the load filter drops only the bad
entries. `spine-rebinding.test.tsx` loads a hand-edited file through the real spine: no stray badge,
`g 2` does not navigate, the item keys and the rebind-away still work. All failed first. Reviewed
inline by the orchestrator.
