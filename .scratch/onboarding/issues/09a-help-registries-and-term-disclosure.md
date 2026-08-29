# 09a: Contextual help registries and Term Disclosure pattern

**What to build:** Exhaustive typed presentation registries in `packages/shared` for all domain vocabularies: Attribute, Role, Position, tactical instruction options, Attribute Category, Manager Pillar, Stature Tier, Training Focus Category, and readiness blocker type. A provenance registry names each Attribute's authoritative consumer category. `firstTouch` and `determination` are removed from player-facing screens (absent from the displayable set while nothing reads them). A reusable Term Disclosure component (keyboard-reachable, non-modal, non-hover) for displaying the registries' content. `pnpm check:all` fails on a missing label, a non-exhaustive mapping, or a displayed Attribute lacking provenance.

**Decisions:**

- Contextual help is a typed projection of the simulation model: help may make a mechanical claim only where that claim traces to authoritative game data, derived state, or structured resolver output, with one bounded Irreversibility Disclosure exception. See [Agent Note](../../../.agents/notes/proposed/architecture/2026-08-29-contextual-help-mechanical-provenance.md).

**Blocked by:** 05 (Squad screen exists for the Attribute display change)

**Status:** ready-for-agent

- [ ] Presentation registries exist in `packages/shared` as exhaustive typed mappings over every domain vocabulary (Attribute, Role, Position, instruction, Category, Pillar, Stature Tier, Training Focus, readiness blocker)
- [ ] Provenance registry: each Attribute names its authoritative consumer category; `firstTouch` and `determination` are absent from the player-facing displayable set
- [ ] `bravery`, `aggression`, `agility`, `naturalFitness` remain visible; explained through collision, injury, and Condition mechanics (not ratings)
- [ ] Registries import authoritative tables (`POSITION_ROLES`, `ROLE_WEIGHTS`, multiplier tables) rather than duplicating values
- [ ] Term Disclosure component: focusable, keyboard-operable, non-modal, anchored to the term, reachable on touch
- [ ] `pnpm check:all` fails on missing label, non-exhaustive mapping, displayed Attribute lacking provenance; raw camelCase identifiers never rendered
- [ ] No per-save help state stored; help never tapers
- [ ] Tests: exhaustiveness causes `check:all` failure on registry drift; every displayed Attribute has provenance entry