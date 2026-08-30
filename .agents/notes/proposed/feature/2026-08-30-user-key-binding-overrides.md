# Agent Note: User key binding overrides

Status: proposed

## Problem

The Action model (ADR-0012) and the global key map (feature/2026-08-29-global-key-map) settle the
default bindings: every Action may carry an optional `binding`, and the registry is the single
source the palette, help overlay, and key handler read. They leave open whether the map is fixed or
user-configurable, and if configurable, where overrides persist.

A keyboard-first app makes the keyboard the primary input path. A fixed map is the cheapest option —
the player learns it once and the help overlay is the only reference — but it commits the game to a
single layout and hand shape. Non-QWERTY layouts, non-US keyboards, and one-handed or ergonomic play
cannot adapt a fixed map.

## Proposal

**Binding overrides are user-configurable, stored machine-locally, and never part of a save.**

- **Configurable: yes.** An override is a mapping from Action `id` to a new binding string
  (`record<string, string>`), applied over — never replacing — the coded defaults. Rebinding
  replaces the whole binding string, so a two-step `g <key>` navigation binding is rebound as one
  entry; the prefix mechanism itself is unchanged.
- **Storage: a single JSON file under Electron `userData`**, a sibling of the `saves/` directory
  (e.g. `userData/keybindings.json`). Machine-local by design: bindings follow the machine and apply
  to every save and every career on it. A new career inherits the player's bindings; a reinstall
  loses them, which is the accepted cost of a preference.
- **The renderer-vs-backend line: the override data is renderer-authored, but the file I/O runs in
  main through the existing typed RPC seam.** New RpcGroup methods
  (`getKeyBindingOverrides`, `setKeyBindingOverride`, `resetKeyBinding`, `resetAllKeyBindings`)
  carry the data over the same schema-validated channel the app already uses; the handler reads and
  writes the JSON file in main, exactly as `saves.ts` owns save files. The renderer never touches
  the filesystem, and no binding ever enters an event stream, the SQLite save, a migration, or the
  determinism/save-compat contract.
- **Locked invariants.** Rebinding is offered for career-global, screen-scoped, and prefixed
  bindings, but not for the app_global infrastructure keys — `Escape` (close topmost transient
  layer), `Primary+K` (palette), `Primary+/` (help) — whose semantics are architectural, nor for
  `Enter`, which is focused-control activation, not a registry binding. Attempting to override a
  locked Action is rejected, not silently ignored.
- **Collision validation.** A new binding must not collide with the effective binding of another
  Action that is live in the same scope; the conflicting Action is named in the rejection. The
  automated registry collision check mandated by the key map (AC-24) is the enforcement point.
- **Discovery: the help overlay is the rebinding surface.** Ticket 07's contextual help shows each
  Action with its effective binding — rebinding is editing that surface in place (select the Action,
  press the new key). The palette lists a "Rebind…" command that opens the help overlay rather than
  shipping a separate screen.
- **Reset semantics.** Per-Action reset and reset-all are both offered from the help overlay, and
  neither is separately undoable: deleting an override returns the Action to its coded default, and
  that default is always visible in the overlay, so the action is inherently reversible.

## Alternatives considered

- **Fixed map, no rebinding.** Rejected as the outcome: it is cheapest to ship, but commits a
  primary-input pathway to a single layout and hand shape, with no adaptation path for non-QWERTY,
  non-US, or one-handed play. The Action model made the override trivial, so the marginal cost of
  configurability is low.
- **Overrides persisted in the backend's event-sourced store (a `SetKeyBinding` command).**
  Rejected: a key-binding preference is not game state. It is not deterministic, not part of a
  career, and should survive across cells/saves; putting it in a save couples a UI preference to a
  single career and forces an unneeded migration. The event stream keeps only the game.
- **`localStorage`.**
  Rejected: it is renderer-owned, sits in the Chromium profile the app never touches explicitly, is
  evictable, and would be a brand-new persistence mechanism used by exactly one preference. The app
  already has one durable-state story (`userData`), so the override file extends that story instead
  of adding a second one.
- **Overrides in the per-save directory.**
  Rejected: bindings are a machine property, not a career property; per-save storage makes a player
  rebind once per career and fragments the map across saves.
- **A dedicated rebinding screen / settings screen.**
  Rejected for v1: the effort has no settings screen, and the help overlay already renders the exact
  data (Action → binding) the edit needs. A separate surface would duplicate it.
- **Configurable infra keys (`Escape`, `Primary+K`, `Primary+/`, `Enter`).**
  Rejected: their semantics are load-bearing — single-layer Escape, discoverable palette, and
  focused-control Enter — and rebinding them invites designs that break those invariants for no
  access win.

## Acceptance criteria

- The default map is unchanged; overrides are a layered `record<ActionId, binding>` that defaults
  to empty.
- `setKeyBindingOverride`, `resetKeyBinding`, and `resetAllKeyBindings` roundtrip through the RPC
  seam and persist to a `keybindings.json` under `userData`.
- Overrides apply across all saves on the machine and survive an app restart.
- No binding override is ever written to a `.sqlite` save or an event stream; no migration exists.
- Overriding a locked Action (`Escape`, `Primary+K`, `Primary+/`, `Enter`) is rejected with a
  reason.
- A colliding rebind is rejected with the name of the conflicting Action.
- The help overlay shows effective bindings and supports in-place rebind, per-Action reset, and
  reset-all.
- The e2e suite proves rebind persists across restart, per the keyboard e2e strategy
  (testing/2026-08-30-e2e-keyboard-strategy).
- `pnpm check:all` passes.

## Risks

- **Rebinding surface is easy to mis-discover.** Because rebinding lives inside the help overlay,
  a player who never opens help may never know it exists. Mitigation: the palette's "Rebind…" command
  is a second entry point, and the teaching splash (ticket 07) can mention it.
- **Prefix rebound to a non-prefix shape.** A `g s` binding replaced by something arbitrary could
  produce an entry the prefix layer cannot express. Mitigation: validation rejects bindings whose
  shape (single key, primary-modifier chord, or two-step prefix) the framework cannot represent.
- **Config file corruption.** A hand-edited or truncated `keybindings.json` must not fail startup.
  Mitigation: decode tolerantly in main and fall back to defaults, fixing the file only on the next
  write; a corrupt file is not a startup error.
- **Scope creep toward a settings screen.** Rebinding is intentionally the only preference; if the
  game later grows real settings, the override file is a precedent but not a framework for them.