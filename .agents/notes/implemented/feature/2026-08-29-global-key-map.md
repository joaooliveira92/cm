# Agent Note: Global key map

Status: implemented

## Problem

The keyboard-first effort needed a concrete binding scheme. The Action model (ADR-0012) defined what an Action is, the screen tiers assigned each screen a priority, and the binding library picked `react-hotkeys-hook`. None of these specified which keys do what, in what priority, and how they interact with focus, text input, overlays, and platform reservations. Without a key map, the palette, help overlay, screen implementations, and per-screen bindings had no binding assignment to key on.

## Decision

The renderer implements the following key map. All bindings are explicit Action registry entries — nothing is derived from screen initials or other heuristics.

### Dispatch priority (one keystroke, one action)

1. Native text-editing and focused-control behaviour (copy, paste, Enter on button, etc.)
2. Topmost modal or transient-layer commands (overlay Escape, select close, etc.)
3. Active prefix completion or cancellation (`g <key>`, Escape cancels, timeout clears)
4. Global invariant modifier shortcuts (`Cmd+K` palette, `Cmd+/` help) — `app_global`, always active
5. Global career actions (`Space` → Continue)
6. Current-screen actions (bare keys scoped to the active screen)
7. Otherwise no action

### Scope classification

| Scope | Active when | Inactive when |
|---|---|---|
| `app_global` | Always | — |
| `career_global` | Career loaded | No career / creation flow |
| `career_screen` | Current screen is a career screen | Overlay open / text focused |
| `creation_flow` | In creation wizard | Career loaded |
| `focused_control` | Focus is on interactive widget | — |

### Binding table

| Binding | Action | Scope | Notes |
|---|---|---|---|
| `Cmd+K` / `Ctrl+K` | Open command palette | `app_global` | Always active |
| `Cmd+/` / `Ctrl+/` | Open keyboard help | `app_global` | Always active |
| `Space` | Continue | `career_global` | Suppressed during text input, overlays, creation; guarded by the League safety contract (never fires at season completion) |
| `g s` | Go to Squad | `career_global` | Sequential — no single-key `g` registered |
| `g a` | Go to Tactics | `career_global` | `t` taken by Transfers |
| `g t` | Go to Transfers | `career_global` | |
| `g l` | Go to League Table | `career_global` | |
| `g f` | Go to Fixtures | `career_global` | |
| `g m` | Go to Match Day | `career_global` | Resumes a pending match, never starts one |
| `g y` | Go to Season Summary | `career_global` | |
| `g b` | Go to previous screen | `career_global` | App screen history; no-op when empty |
| `Escape` | Close topmost transient layer | `app_global` | Layer stack: splash → select → palette → help → prefix; never navigates |
| `Enter` | Activate focused element | `focused_control` | Not a screen-global primary |
| Arrow keys | Navigate within focused widget | `focused_control` | Tab bar, table rows, list items |
| `b` | Focus Bid workflow | `career_screen` | Transfers only; opens/focuses, does not submit |

### Prefix (`g <key>`) lifecycle

- Pressing `g` alone does nothing except enter the prefix state; a visible nonmodal `PrefixIndicator` appears while active.
- A valid destination key navigates and clears the prefix. `Escape`, an invalid key, or an ~800ms timeout cancels without firing an unrelated action. While active, no other bare-key actions fire.

### Creation-flow exemption

Creation flow (Club Selection, creation steps) uses flow-local controls only: Next, Back, Cancel, Create Career — all via focused buttons. No `g <key>` destinations are active; `g b` does not navigate creation history. (`Cmd+K`/`Cmd+/` remain `app_global`.)

### Text-input suppression

When focus is in an input field (text, number, search, textarea, editable combobox, `contenteditable`): all bare letter/digit keys are suppressed, `Space` (career-global Continue) is suppressed, `g` prefix initiation is suppressed; `Enter`, `Escape`, `Tab`, arrows, and `Cmd+` shortcuts remain active.

## Verification

- `test/keymap-prefix.test.ts` — the prefix lifecycle (valid completion, Escape/invalid/timeout cancel, no single-key `g`, no unrelated bare-key action while active).
- `test/keymap-priority.test.ts` — `resolveDispatch` is the single decision point; one action per keystroke; four-views reconcile (registry binding == spine reachability == help-derivable); suppress-while-typing; the priority-2 overlay branch.
- `test/keyboard-spine-live.test.tsx` — live `g <key>` nav, `PrefixIndicator`, Continue safety, `focus-bid` focuses (does not submit), `g b` go-back.
- `test/discoverability-escape-layering.test.tsx` — primary-K/primary-/ open, Escape topmost-only, overlays create no history entries, precedence over bare/prefix keys.
- `pnpm check:all` green.

## Risks

- **Prefix timeout feel.** An ~800ms timeout may feel rushed or too slow; it is marked as implementation tuning (per-destination override possible).
- **`g` prefix vs. text-input collision.** The sequential syntax is handled at the library level and app `shouldSuppressForTextEntry`; `g` in a text input does not start a prefix.
- **Primary modifier key ambiguity.** `Cmd+/` resolves per platform; the help action is always discoverable via the palette as fallback.
- **`g b` vs. screen-scoped `b`.** An active prefix captures the second key, so `g` then `b` always navigates back; once the prefix times out, `b` regains its Transfers focus-bid meaning. Correct by design.
