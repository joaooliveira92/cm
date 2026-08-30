Type: task
Status: ready-for-agent
Blocked by: 18

# 21: User key binding overrides

**What to build:** the rebinding surface: a `keybindings.json` inherited from Electron `userData`
(sibling of `saves/`), surfaced over four new typed RPC methods
(`getKeyBindingOverrides`, `setKeyBindingOverride`, `resetKeyBinding`, `resetAllKeyBindings`) with
file I/O in main — never `localStorage`, the Saves dir, or the event stream. Overrides are a layered
`record<ActionId, binding>` over unchanged coded defaults. The help overlay becomes the rebinding
surface (palette offers a "Rebind…" command), with per-Action reset and reset-all and the effective
default always visible. Locked infrastructure keys (`Escape`, `Primary+K`, `Primary+/`, `Enter`)
reject rebinding with a reason; colliding rebinds are rejected naming the conflicting Action;
unsupported binding shapes are rejected; a corrupt override file is tolerated at startup and fixed
on the next write.

**Decisions:**

- Configurable yes, stored machine-locally in a `keybindings.json` under Electron `userData` (a sibling of `saves/`), read/written in main through the existing typed RPC seam — never `localStorage`, the Saves dir, or the event stream; locked infrastructure keys (`Escape`, `Primary+K`, `Primary+/`, `Enter`) are non-rebindable; collisions are validated with the conflicting Action named; the help overlay is the rebinding surface (palette offers "Rebind…"), with per-Action reset and reset-all. See [Agent Note](../../../.agents/notes/proposed/feature/2026-08-30-user-key-binding-overrides.md).

**Blocked by:** 18.

**Status:** ready-for-agent

- [ ] AC-34: Rebinding roundtrips the typed RPC seam and persists under `userData`; applies across saves and restarts; never in saves/event stream; no migration.
- [ ] AC-35: Locked infra keys reject rebinding with a reason; colliding rebinds are rejected naming the conflicting Action; unsupported shapes rejected.
- [ ] AC-36: Help overlay is the rebinding surface (palette offers "Rebind…"), shows effective bindings, supports per-Action reset and reset-all; a corrupt override file is tolerated.

## Comments

- Published from the approved to-tickets breakdown (spec: `.scratch/keyboard-first-renderer/spec.md`, Stage 6).