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

Decision records are Agent Notes under [.agents/notes/](../.agents/notes/), cited as
`note <name> (<lifecycle>/<class>/)`. The numbered `docs/adr/` layer this file once cited was retired;
its twelve records were migrated into notes, and the rows below point at those. Terms in **bold** are
defined in [CONTEXT.md](../CONTEXT.md) and mean exactly what it says there.

## Capabilities

| Capability | Domain terms | Decision record | Effort | Proving tests |
|---|---|---|---|---|
| Derived player ratings and value | **Position Rating**, **Overall Rating**, **Transfer Value**, **Attribute** | note `2026-08-29-player-ratings-are-derived-projections` (`proposed/architecture/`, absorbed ADR-0001) | `player-ratings-derived/` | `packages/shared/test/ratings.test.ts` |
| Match strength and deterministic seeding | **Position**, seeded simulation | note `2026-08-27-match-engine-three-phase-and-deterministic-seed` (`implemented/architecture/`) | `cm-clone/` | `packages/game-engine/test/match/` |
| Deterministic background match resolution | **Position**, seeded simulation, **World Seed** | note `2026-09-02-season-fixture-and-cup-schedule` (`proposed/architecture/`) | `world-data-model/` | `apps/desktop/test/season.test.ts` (two-advances and two-saves determinism tests) |
| Unconditional world catalogue | **World Catalogue**, **Nation**, **City** | notes `2026-09-01-world-catalogue-and-canonical-ids` (`implemented/architecture/`), `2026-09-02-results-only-geography-cost` (`proposed/architecture/`) | `world-data-model/` | `apps/desktop/test/world-determinism.test.ts` (catalogue equality + determinism), `db-schema.test.ts` (thin-catalogue shape), `packages/shared/test/cities.test.ts` |
| Role rating outside the match engine | **Role**, **Position Rating** | note `2026-08-27-role-rating-outside-match-engine` (`implemented/architecture/`) | `cm-clone/` | `packages/shared/test/ratings.test.ts` |
| Fixture-driven calendar | **Matchday**, **Season** | note `2026-08-27-fixture-driven-calendar` (`implemented/architecture/`) | `cm-clone/` | `apps/desktop/test/season.test.ts` |
| Formula-driven transfer economy | **Transfer Value** | note `2026-08-27-formula-driven-transfer-economy` (`implemented/architecture/`) | `cm-clone/` | `apps/desktop/test/transfers.test.ts` |
| Board objectives and sacking | manager tenure | note `2026-08-27-board-objectives-and-manager-sacking` (`implemented/feature/`) | `cm-clone/` | `apps/desktop/test/boardObjectives.test.ts`, `sackedGuard.test.ts` |
| Domain-bounded deciders, chunked resimulation | command → event → state | note `2026-08-27-domain-bounded-deciders-and-chunked-resimulation` (`implemented/architecture/`) | `cm-clone/` | `apps/desktop/test/decider.test.ts`, `matchCommands.test.ts` |
| Templated match commentary | commentary template | note `2026-08-27-templated-match-commentary` (`implemented/architecture/`) | `cm-clone/` | `packages/shared/test/commentary.test.ts` |
| Contact duel modeling | duel, **Condition** | note `2026-08-27-contact-duel-modeling` (`implemented/feature/`) | `injury-system/` | `packages/game-engine/test/match/`, `apps/desktop/test/fitness.test.ts` |
| Post-handoff decisions classified by type | — (process) | note `2026-08-27-classifying-post-handoff-decisions` (`implemented/process/`) | `cm-clone/` | n/a — process |
| Deterministic fractional Player Development | **Player Development**, **Potential Ability**, **Category** | note `2026-08-28-deterministic-fractional-player-development` (`implemented/feature/`) | `training/` | `packages/shared/test/development.test.ts` |
| Action registry for keyboard-first UI | — (renderer convention, not domain) | note `2026-08-29-action-model` (`implemented/architecture/`, absorbed ADR-0012) | `keyboard-first-renderer/` | `apps/desktop/e2e/` keyboard specs |
| Effect Atom renderer data layer | — (renderer plumbing) | notes `2026-08-29-atom-adoption-shape`, `2026-08-29-renderer-data-layer-effect-atom` (`implemented/architecture/`) | `keyboard-first-renderer/` | `apps/desktop/test/renderer-rpc-seam.test.ts`, `renderer-screens.test.tsx`, `renderer-boundary-lint.test.ts` |
| Hash-routed renderer navigation | — (renderer plumbing) | note `2026-08-29-router-adoption-shape` (`implemented/architecture/`) | `keyboard-first-renderer/` | `apps/desktop/test/router-stage2.test.ts`, `focus-coordinator.test.ts`, `e2e/router.spec.ts` |
| Action registry + keyboard spine | — (renderer convention) | notes `2026-08-29-action-model`, `2026-08-29-keyboard-binding-library` (`implemented/architecture/`); notes `2026-08-29-global-key-map`, `2026-08-29-intra-screen-focus-model` (`proposed/feature/`, `proposed/architecture/`) | `keyboard-first-renderer/` | `apps/desktop/test/actions-registry.test.ts`, `actions-inventory.test.tsx`, `keymap-priority.test.ts`, `keymap-prefix.test.ts`, `keyboard-spine-live.test.tsx`, `focus-restoration.test.ts`, `level1-a11y.test.tsx` |
| Command palette and discoverability | — (renderer convention) | note `2026-08-29-command-palette-and-discoverability` (`implemented/feature/`) + `2026-08-29-global-key-map` (`implemented/feature/`) | `keyboard-first-renderer/` | `apps/desktop/test/discoverability-*.test.*` (rank, command-palette, help-overlay, key-badges, teaching-splash, escape-layering) |
| Table and grid navigation (TanStack Table) | — (renderer convention) | note `2026-08-29-table-and-grid-navigation` (`implemented/feature/`) | `keyboard-first-renderer/` | `apps/desktop/test/table-grid-navigation.test.tsx`, `table-session.test.ts`, `table-column-preferences.test.ts`, `table-bid-draft.test.ts`, `table-sort-filter.test.ts`, `table-sorting.test.ts`, `table-focus-bookmark.test.ts`, `table-focus-restore.test.tsx`, `table-save-switch.test.tsx`, `table-view-state.test.ts`, `transfers-dialog-keyboard.test.tsx` |
| Match-day live keyboard control | **Injury**, **Condition** (orange/reduced-arity cap) | note `2026-08-29-matchday-keyboard-flow` (`implemented/feature/`) | `keyboard-first-renderer/` | `apps/desktop/test/matchday-live-keyboard.test.tsx`, `match-substitution-validation.test.ts`, `keymap-priority.test.ts`, `tactics-keyboard-reachability.test.tsx` |
| User key binding overrides | — (machine-local preference; never a save) | note `2026-08-30-user-key-binding-overrides` (`implemented/feature/`) | `keyboard-first-renderer/` | `packages/contracts/test/roundtrip.test.ts`; `apps/desktop/test/keybindings.test.ts`, `override-validation.test.ts`, `discoverability-rebinding.test.tsx`, `main-renderer-guard-match.test.ts`, `keyboard-spine-rebinding.test.tsx` |

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
