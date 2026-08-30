Type: task
Status: ready-for-agent
Blocked by: 16

# 17: Action registry and keyboard spine

**What to build:** the screen-operation backbone of the renderer: a first-class Action registry
where every career screen operation is a named, scoped, dispatchable record consumed by buttons and,
in later stages, the palette, help overlay, and key bindings — migrated all-or-nothing per screen.
The key map from ticket 05 goes live behind the `react-hotkeys-hook@5.x` one-file seam: `g <key>`
prefix navigation, `Enter` as focused-control activation, `Primary+K` palette / `Primary+/` help
hooks (opening in Stage 4), `Escape` closing only the topmost transient layer, bare screen-scoped
keys with text-input suppression, and the mixed modifier policy. The focus coordinator from ticket
06 ships: native Tab for regions, roving for composite widgets, selection separate from focus,
identity-based async restoration, and the single `:focus-visible` ring. All nine screens reach level
1 (correct tab order, visible focus ring, Enter/Space on every control).

**Decisions:**

- Yes — a first-class Action registry. Every operation becomes a named, scoped, dispatchable record; buttons, palette, key bindings and help overlay are four views of the same record. Migration is all-or-nothing per screen. Availability predicates are best-effort frontend optimisations; the backend still validates. See [Agent Note](../../../.agents/notes/proposed/architecture/2026-08-29-action-model.md) and [ADR-0012](../../../docs/adr/0012-action-registry-for-keyboard-first.md).
- No — TanStack Hotkeys is alpha and has no scopes or priority layering; use `react-hotkeys-hook@5.x` behind an internal seam. Router and Table confirmed to provide no focus management. See [Agent Note](../../../.agents/notes/proposed/architecture/2026-08-29-keyboard-binding-library.md).
- Prefix-style `g <key>` navigation with explicit registry bindings; `Enter` as focused-control activation (not screen-global primary); `Primary+K` palette, `Primary+/` help; mixed modifier policy with bare keys for screen-scoped actions and text-input suppression; creation is a separate scope with `g <key>` inactive. See [Agent Note](../../../.agents/notes/proposed/feature/2026-08-29-global-key-map.md).
- Hybrid model: native Tab for regions, roving for composite widgets; selection separate from focus; identity-based async restoration; one `:focus-visible` ring. See [Agent Note](../../../.agents/notes/proposed/architecture/2026-08-29-intra-screen-focus-model.md).

**Blocked by:** 16.

**Status:** ready-for-agent

- [ ] AC-16: Every button on a converted screen dispatches a registered Action; no screen is half-converted; the palette cannot list an Action the registry cannot dispatch.
- [ ] AC-17: One keystroke executes at most one registered action; automated collision checks across active scopes.
- [ ] AC-18: `g <key>` prefix navigation over all career screens, explicit bindings, visible nonmodal feedback, Escape/timeout/invalid-key cancel, no unrelated bare-key action.
- [ ] AC-19: `Enter` activates the focused control only; `Space` Continues only where the safety contract permits; bare screen-scoped keys suppressed while typing.
- [ ] AC-21: Hybrid focus model: native Tab + roving in composite widgets; selection separate from focus; one `:focus-visible` ring; identity-based async restoration survives full refetch.
- [ ] AC-22: All nine screens meet level 1: correct tab order, visible focus ring, Enter/Space on every control; tiers hold.

## Comments

- Published from the approved to-tickets breakdown (spec: `.scratch/keyboard-first-renderer/spec.md`, Stage 3).