# 14-user-rebinding

Type: grilling
Status: open
Blocked by: 05

## Question

Is the key map fixed or user-configurable, and if configurable, where do binding overrides persist?

The Action model settled that bindings are data — each Action record carries an optional `binding` field. This makes the question of rebinding tractable: the override is a mapping from Action `id` to a new key string.

Decide:

- **Configurable or not.** If fixed, the player learns the map and the help overlay is the only reference. If configurable, the palette needs a rebinding affordance and the player needs to discover it.
- **Storage**, if configurable: where overrides persist. A file in the save directory (Electron has `userData`), `localStorage`, or the backend's event-sourced store (a new command like `SetKeyBinding { actionId, key }`). Each has different implications for multi-save consistency and sync.
- **Reset semantics**: whether the player can reset a single binding, all bindings for a screen, or the entire map to defaults, and whether that's undoable.
- **Discovery**: how a player learns they *can* rebind. The palette is the natural surface; whether it shows the current binding as editable or routes to a separate screen.
- **The renderer vs backend line**: whether rebinding is purely renderer-side (overrides in a local config file) or persisted in the save (so it survives a reinstall but is per-save).

This ticket is gated on ticket 05 because the concrete binding map must exist before the rebinding surface can be designed.