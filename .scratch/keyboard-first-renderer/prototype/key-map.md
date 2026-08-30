# Keyboard-First Key Map — Prototype v0.1

> **PROTOTYPE — throwaway artifact for discussion.** This is the proposed concrete key map
> for the keyboard-first renderer. It builds on decisions from tickets 01-04 and the collision
> audit (research/06-collision-audit.md). Created as part of ticket 05.
>
> Final bindings to be confirmed once the Action registry shape (ticket 03 ADR) is implemented.

## Scope activation

| Scope | Active when | Inactive when |
|---|---|---|
| `app_global` | Always | — |
| `career_global` | Career loaded | No career / creation flow |
| `career_screen` | Current screen is a career screen | Overlay open / text focused |
| `creation_flow` | In creation wizard | Career loaded |
| `focused_control` | Focus is on interactive widget | — |

## Shortcut classes

| Class | Examples | Suppressed by text input? | Suppressed by overlay? |
|---|---|---|---|
| `Primary-modifier global` | `Cmd+K`, `Cmd+/` | No (but editing shortcuts take precedence) | No |
| `Career-global` | `Space` (Continue) | Yes | Yes |
| `Prefix navigation` | `g <key>` | Yes | Yes |
| `Screen-scoped bare` | `b` (Bid workflow) | Yes | Yes |
| `Focused-control` | `Enter`, arrows, `Tab` | No (native) | Captured by overlay |

## Dispatch priority (one pass, one action)

1. Native text-editing and focused-control behaviour (copy, paste, Enter on button, etc.)
2. Topmost modal or transient-layer commands (overlay escape, select close, etc.)
3. Active prefix completion or cancellation (`g <key>`, Escape cancels, timeout)
4. Global invariant modifier shortcuts (`Cmd+K`, `Cmd+/`)
5. Global career actions (`Space` → Continue)
6. Current-screen actions (bare keys, `b` → Bid workflow)
7. Otherwise no action

## Global utilities (`app_global`)

| Binding | Action | Notes |
|---|---|---|
| `Cmd+K` / `Ctrl+K` | Open command palette | Primary key for Command on macOS, Control on Win/Linux |
| `Cmd+/` / `Ctrl+/` | Open keyboard help | Resolved through produced character, not physical key position |

## Navigation (`career_global`)

| Binding | Action | Notes |
|---|---|---|
| `g s` | Go to Squad | Sequential, no single-key `g` binding |
| `g a` | Go to Tactics | `t` taken by Transfers |
| `g t` | Go to Transfers | |
| `g l` | Go to League Table | |
| `g f` | Go to Fixtures | |
| `g m` | Go to Match Day | |
| `g y` | Go to Season Summary | |
| `g b` | Go to previous screen | Application screen history, not broad-nored |

All `g <key>` bindings use react-hotkeys-hook sequential syntax (`g>s`, `g>t`, etc.).
No single-key `g` shortcut is registered — the prefix key is not an action by itself.
A visible "Go to..." indicator appears while the prefix is active.
Timeout cancels the prefix (implementation tuning, ~800ms recommended).

## Career rhythm (`career_global`)

| Binding | Action | Notes |
|---|---|---|
| `Space` | Continue | Only where the safety contract permits. Suppressed during text input, overlays, and creation flow. |

## Focused-control conventions (`focused_control`)

| Key | Behaviour |
|---|---|
| `Enter` | Activate focused actionable element (button, link, select option, etc.) |
| `Space` | Activate focused button or toggle when the control owns the key |
| Arrow keys | Navigate within focused composite widget (table, list, tab bar) |
| `Home` / `End` | Move to first/last item within the widget's interaction model |
| `Escape` | Close or cancel topmost transient layer only |
| `Tab` / `Shift+Tab` | Move focus forward/backward |

## Transfers screen-scoped actions (`career_screen`)

| Binding | Action | Notes |
|---|---|---|
| `b` | Focus Bid workflow | Opens/focuses the bid input for the selected market row. Does not submit a bid. |

## Creation-flow actions (`creation_flow`)

| Action | Trigger | Notes |
|---|---|---|
| Next | Focused button | Step progression |
| Back | Focused button | Previous step |
| Cancel | Focused button | Discards provisional career (with confirmation) |
| Create Career | Focused button | Commits career |

No `g <key>` destinations are active during creation. `g b` does not navigate creation history.

## Text-input suppression

When focus is in a text input, number input, search box, textarea, editable combobox, or
`contenteditable` element, the following are suppressed:

- All bare letter keys
- All bare digit keys
- `Space` (from career actions)
- `g` prefix initiation (but `Enter`, `Escape`, `Tab`, arrows, and `Cmd+` shortcuts remain active)

## Overlay rules

- `Escape` closes the topmost transient layer only (select → palette → help → prefix)
- Transient overlays do not create screen-history entries (`g b` skips them)
- Palette and help display active bindings from the Action registry, never a hardcoded list

## Collision audit summary

All proposed bindings are claimable in an Electron renderer with a custom
`Menu.setApplicationMenu()` that omits unwanted accelerators.

| Binding | Conflict | Verdict |
|---|---|---|
| `Cmd+K` | macOS: no system reservation. Chromium: "new tab" (but Electron can override) | Claimable via menu override |
| `Cmd+/` | No known conflict | Claimable |
| `g <key>` prefix | No conflict — no single-key `g` binding registered | Claimable |
| `Space` | No conflict — suppressed in text inputs by default | Claimable |
| `Enter` | No conflict — standard focused-control activation | Claimable |
| `Escape` | No conflict — standard close/cancel | Claimable |
| Arrow keys | No conflict — scroll behaviour preventable via `preventDefault` | Claimable |
| Bare letters | No conflict — suppressed in text inputs by `react-hotkeys-hook` default | Claimable |
| Bare digits | No conflict — suppressed in text inputs | Claimable |

## Open questions (for the wired prototype to validate)

- Is the ~800ms prefix timeout comfortable, or does it feel rushed/too slow?
- Does the "Go to..." indicator position (below nav bar) avoid being mistaken for an app notification?
- Is `Cmd+K` / `Ctrl+K` discoverable enough as the palette invocation, or should it also respond to a single key like `` ` ``?
- Should `g` followed by an invalid key show a brief "no such destination" feedback, or just silently cancel?
- Does `g b` disambiguation from `g` prefix + `b` screen action work correctly in the dispatch priority?