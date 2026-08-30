# Traceability

Replaces the requirement-ID index this workflow carries in projects with a written specification.
cm-clone has no `REQ-###` document and does not need one invented: the durable spine here is
**domain term → decision record → effort → proving test**. This file is that spine, one row per
shipped capability.

## How to use it

- **Implementing?** Find the rows your change touches, read their decision records first, and keep
  the proving tests passing. If a change makes a row wrong, update the row in the same commit.
- **Adding a capability?** Add its row when the sprint closes, not before. A row describes shipped
  behavior; anything in flight belongs in [SPRINT-PLAN.md](SPRINT-PLAN.md).
- **No row for what you are changing?** Either you are in new territory (add one), or the capability
  shipped without traceability (add one, and say so in the report).

`ADR-NNNN` links are under [docs/adr/](../docs/adr/). Terms in **bold** are defined in
[CONTEXT.md](../CONTEXT.md) and mean exactly what it says there.

## Capabilities

| Capability | Domain terms | Decision record | Effort | Proving tests |
|---|---|---|---|---|
| Derived player ratings and value | **Position Rating**, **Overall Rating**, **Transfer Value**, **Attribute** | [ADR-0001](../docs/adr/0001-derived-player-ratings-and-value.md) | `player-ratings-derived/` | `packages/shared/test/ratings.test.ts` |
| Match strength and deterministic seeding | **Position**, seeded simulation | [ADR-0002](../docs/adr/0002-three-phase-match-strength-and-deterministic-seed.md) | `cm-clone/` | `packages/game-engine/test/match/` |
| Role rating outside the match engine | **Role**, **Position Rating** | [ADR-0003](../docs/adr/0003-role-rating-outside-match-engine.md) | `cm-clone/` | `packages/shared/test/ratings.test.ts` |
| Fixture-driven calendar | **Matchday**, **Season** | [ADR-0004](../docs/adr/0004-fixture-driven-calendar-no-day-clock.md) | `cm-clone/` | `apps/desktop/test/season.test.ts` |
| Formula-driven transfer economy | **Transfer Value** | [ADR-0005](../docs/adr/0005-formula-driven-transfer-economy.md) | `cm-clone/` | `apps/desktop/test/transfers.test.ts` |
| Board objectives and sacking | manager tenure | [ADR-0006](../docs/adr/0006-board-objectives-and-manager-sacking.md) | `cm-clone/` | `apps/desktop/test/boardObjectives.test.ts`, `sackedGuard.test.ts` |
| Domain-bounded deciders, chunked resimulation | command → event → state | [ADR-0007](../docs/adr/0007-domain-bounded-deciders-and-chunked-match-resimulation.md) | `cm-clone/` | `apps/desktop/test/decider.test.ts`, `matchCommands.test.ts` |
| Templated match commentary | commentary template | [ADR-0008](../docs/adr/0008-templated-match-commentary.md) | `cm-clone/` | `packages/shared/test/commentary.test.ts` |
| Contact duel modeling | duel, **Condition** | [ADR-0009](../docs/adr/0009-contact-duel-modeling.md) | `injury-system/` | `packages/game-engine/test/match/`, `apps/desktop/test/fitness.test.ts` |
| Post-handoff decisions live in ADRs | — (process) | [ADR-0010](../docs/adr/0010-post-handoff-decisions-live-in-adrs-map-closes.md) | `cm-clone/` | n/a — process |
| Deterministic fractional Player Development | **Player Development**, **Potential Ability**, **Category** | [ADR-0011](../docs/adr/0011-deterministic-fractional-player-development.md) | `training/` | `packages/shared/test/development.test.ts` |
| Action registry for keyboard-first UI | — (renderer convention, not domain) | [ADR-0012](../docs/adr/0012-action-registry-for-keyboard-first.md) | `keyboard-first-renderer/` | `apps/desktop/e2e/` keyboard specs |
| Effect Atom renderer data layer | — (renderer plumbing) | notes `2026-08-29-atom-adoption-shape`, `2026-08-29-renderer-data-layer-effect-atom` (`implemented/architecture/`) | `keyboard-first-renderer/` | `apps/desktop/test/renderer-rpc-seam.test.ts`, `renderer-screens.test.tsx`, `renderer-boundary-lint.test.ts` |
| Hash-routed renderer navigation | — (renderer plumbing) | note `2026-08-29-router-adoption-shape` (`implemented/architecture/`) | `keyboard-first-renderer/` | `apps/desktop/test/router-stage2.test.ts`, `focus-coordinator.test.ts`, `e2e/router.spec.ts` |
| Action registry + keyboard spine | — (renderer convention) | notes `2026-08-29-action-model`, `2026-08-29-keyboard-binding-library` (`implemented/architecture/`); ADR-0012; notes `2026-08-29-global-key-map`, `2026-08-29-intra-screen-focus-model` (`proposed/feature/`, `proposed/architecture/`) | `keyboard-first-renderer/` | `apps/desktop/test/actions-registry.test.ts`, `actions-inventory.test.tsx`, `keymap-priority.test.ts`, `keymap-prefix.test.ts`, `keyboard-spine-live.test.tsx`, `focus-restoration.test.ts`, `level1-a11y.test.tsx` |
| Command palette and discoverability | — (renderer convention) | note `2026-08-29-command-palette-and-discoverability` (`implemented/feature/`) + `2026-08-29-global-key-map` (`implemented/feature/`) | `keyboard-first-renderer/` | `apps/desktop/test/discoverability-*.test.*` (rank, command-palette, help-overlay, key-badges, teaching-splash, escape-layering) |
| Table and grid navigation (TanStack Table) | — (renderer convention) | note `2026-08-29-table-and-grid-navigation` (`implemented/feature/`) | `keyboard-first-renderer/` | `apps/desktop/test/table-grid-navigation.test.tsx`, `table-session.test.ts`, `table-column-preferences.test.ts`, `table-bid-draft.test.ts`, `table-sort-filter.test.ts`, `table-sorting.test.ts`, `table-focus-bookmark.test.ts`, `table-focus-restore.test.tsx`, `table-save-switch.test.tsx`, `table-view-state.test.ts`, `transfers-dialog-keyboard.test.tsx` |
| Match-day live keyboard control | **Injury**, **Condition** (orange/reduced-arity cap) | note `2026-08-29-matchday-keyboard-flow` (`implemented/feature/`) | `keyboard-first-renderer/` | `apps/desktop/test/matchday-live-keyboard.test.tsx`, `match-substitution-validation.test.ts`, `keymap-priority.test.ts`, `tactics-keyboard-reachability.test.tsx` |

## Contract invariants

Not tied to one capability; every sprint must leave these true. Each is enforced by the gate, a
test, or the reviewer — never by memory alone.

| Invariant | Enforced by |
|---|---|
| Pure packages stay free of Node, Electron, React, and IPC | `oxlint` import rules + review dimension 6 |
| No banned Effect combinators; explicit concurrency | [scripts/effect-lint.ts](../scripts/effect-lint.ts) |
| Renderer↔main traffic only through `packages/contracts` | roundtrip tests + review dimension 8 |
| Same seed → same match, incl. after resimulation | determinism tests + the gate's determinism step |
| Save → load → continue preserves future outcomes | save/load tests |
| Domain language matches CONTEXT.md | review dimension 2 |
| Markdown links resolve | `verify-md-links` in `pnpm check:all` |
