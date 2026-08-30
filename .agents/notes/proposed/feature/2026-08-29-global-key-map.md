# Agent Note: Global key map

Status: proposed

## Problem

The keyboard-first effort needs a concrete binding scheme. The Action model (ADR-0012) defines what an Action is, the screen tiers (feature/2026-08-29-screen-keyboard-tiers) assign each screen a priority, and the binding library (architecture/2026-08-29-keyboard-binding-library) picks `react-hotkeys-hook`. But none of these specify which keys do what, in what priority, and how they interact with focus, text input, overlays, and platform reservations.

Without a key map, the palette, help overlay, screen implementations, and per-screen bindings have no binding assignment to key on. The prototype validated that the scheme works across the six sub-decisions (navigation style, Enter semantics, reserved globals, modifier policy, text-input behaviour, and platform collision audit).

## Proposal

The renderer will implement the following key map. All bindings are explicit Action registry entries — nothing is derived from screen initials or other heuristics.

### Dispatch priority (one keystroke, one action)

1. Native text-editing and focused-control behaviour (copy, paste, Enter on button, etc.)
2. Topmost modal or transient-layer commands (overlay Escape, select close, etc.)
3. Active prefix completion or cancellation (`g <key>`, Escape cancels, timeout clears)
4. Global invariant modifier shortcuts (`Cmd+K`, `Cmd+/`)
5. Global career actions (`Space` → Continue)
6. Current-screen actions (bare keys scoped to active screen)
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
| `Cmd+K` / `Ctrl+K` | Open command palette | `app_global` | Primary modifier: Cmd on macOS, Ctrl on Win/Linux |
| `Cmd+/` / `Ctrl+/` | Open keyboard help | `app_global` | Resolved through produced character, not physical key |
| `Space` | Continue | `career_global` | Suppressed during text input, overlays, creation flow |
| `g s` | Go to Squad | `career_global` | Sequential — no single-key `g` binding registered |
| `g a` | Go to Tactics | `career_global` | `t` taken by Transfers |
| `g t` | Go to Transfers | `career_global` | |
| `g l` | Go to League Table | `career_global` | |
| `g f` | Go to Fixtures | `career_global` | |
| `g m` | Go to Match Day | `career_global` | Resumes a pending match, does not start one |
| `g y` | Go to Season Summary | `career_global` | |
| `g b` | Go to previous screen | `career_global` | Application screen history; no-op when history is empty |
| `Escape` | Close topmost transient layer | `app_global` | Layer stack: select → palette → help → prefix. Never navigates screens. |
| `Enter` | Activate focused element | `focused_control` | Not a screen-global "primary action" key |
| Arrow keys | Navigate within focused widget | `focused_control` | Tab bar, table rows, list items |
| `b` | Focus Bid workflow | `career_screen` | Transfers only; opens/focuses, does not submit |

### Prefix (`g <key>`) lifecycle

- Pressing `g` alone does nothing except enter the prefix state.
- A visible "Go to: Squad [S] · Tactics [A] · …" indicator appears while active (nonmodal, below the nav bar).
- A valid destination key performs navigation and clears the prefix.
- `Escape` cancels the prefix without navigating.
- An invalid key cancels the prefix without firing an unrelated action.
- A timeout (~800ms, tuning parameter) cancels the prefix.
- While active, no other bare-key actions fire.

### Creation-flow exemption

The creation flow (Club Selection, creation steps) uses flow-local controls only: Next, Back, Cancel, Create Career — all via focused buttons. No `g <key>` destinations are active. `g b` does not navigate creation history.

### Text-input suppression

When focus is in an input field (text, number, search, textarea, editable combobox, `contenteditable`):
- All bare letter and digit keys are suppressed
- `Space` (career-global Continue) is suppressed
- `g` prefix initiation is suppressed
- `Enter`, `Escape`, `Tab`, arrows, and `Cmd+` shortcuts remain active

### Platform collision audit

All proposed bindings are claimable in an Electron renderer with a custom `Menu.setApplicationMenu()` that omits unwanted accelerators. Unclaimable keys (Cmd+Tab, Cmd+Space, Cmd+Q, etc.) are not used. The `g <key>` sequential syntax avoids the react-hotkeys-hook limitation where a single-key `g` binding would fire immediately.

## Alternatives considered

- **Derive destination keys from screen initials.** Rejected — Squad and Season Summary collide on `s`, Tactics and Transfers collide on `t`. An explicit registry avoids the collision problem and is more stable as screens are added or renamed.
- **Direct single-key screen navigation.** Rejected — nine screens exceed a comfortable single-key alphabet and guarantee collisions with per-screen actions.
- **Numbered navigation (1-9).** Rejected — no mnemonic value, collides with bid-amount input digits, and single digits are valuable for in-workflow use (e.g., bid amounts).
- **Palette-only navigation (no prefix).** Rejected — contradicts level 3 (mouse-free). The palette is for discovery; prefix navigation is the efficiency path for repeated use.
- **Contextual Enter as "primary screen action".** Rejected — "the main thing this screen is for" is not stable across states (e.g., Transfers might mean "bid," "open player," or "accept counter-offer" depending on focus and workflow). Enter keeps its standard focused-control semantics.
- **Backspace for back navigation.** Rejected — Backspace on text inputs would need complex suppression; `g b` is unambiguous.
- **Escape as screen-back navigation.** Rejected — Escape closes the topmost transient layer; using it for navigation creates unresolvable ambiguity when both an overlay and a screen are present.
- **Hardcoded `Cmd` only.** Rejected — the specification uses "Primary modifier" throughout, mapping to Cmd on macOS and Ctrl on Windows/Linux.

## Acceptance criteria

- AC-01: Screen navigation uses explicit `g <key>` prefix bindings.
- AC-02: Destination keys are registered explicitly, never derived from screen initials.
- AC-03: Every career screen has exactly one stable prefix-navigation binding.
- AC-04: No two destinations share the same `g`-prefix completion.
- AC-05: The command palette displays registered destination bindings.
- AC-06: An active `g` prefix has visible nonmodal feedback.
- AC-07: `Escape` and timeout cancel an incomplete prefix without navigation.
- AC-08: An invalid prefix completion does not trigger an unrelated bare-key action.
- AC-09: `Enter` activates the focused actionable element.
- AC-10: `Enter` does not invoke a hidden screen-global primary action.
- AC-11: The Action registry's primary designation controls presentation and discovery, not automatic `Enter` dispatch.
- AC-12: Dedicated per-screen bindings may open or focus workflows but do not silently commit consequential actions.
- AC-13: `Primary+K` opens the command palette.
- AC-14: `Primary+/` opens keyboard help.
- AC-15: Primary means Cmd on macOS and Ctrl on Windows and Linux.
- AC-16: `Escape` closes or cancels only the topmost transient layer.
- AC-17: `Escape` never navigates to another screen or abandons a started match.
- AC-18: `g b` uses application screen history.
- AC-19: Transient overlays do not create screen-history entries.
- AC-20: Bare screen-scoped shortcuts are suppressed during text entry.
- AC-21: Focused-control keyboard semantics take precedence over application shortcuts.
- AC-22: `Space` continues the career only where the existing Continue safety contract permits it.
- AC-23: One keystroke executes at most one registered action.
- AC-24: The Action registry has automated collision checks across simultaneously active scopes.
- AC-25: Destructive and irreversible commands cannot be triggered by an ambiguous contextual `Enter` action.
- AC-26: All active shortcuts are keyboard-help and command-palette discoverable.

## Risks

- **Prefix timeout feel.** An 800ms timeout may feel rushed or too slow. Mitigation: mark it as implementation tuning; the Action registry binding entry can carry a per-destination timeout override.
- **`g` prefix vs. text-input collision.** The sequential syntax (`g>s`) in react-hotkeys-hook may interact differently than expected when `g` is typed in a text input immediately after focus transfers. Mitigation: the `enableOnFormTags: false` default suppresses `g` in form elements.
- **Screen-count stability.** If the codebase actually has 7 career screens (not 9 as the charting pass assumed), one `g <key>` slot is unused. Mitigation: seven explicit bindings is cleaner than nine with two no-op slots — the `g y` for Season Summary should be reserved regardless to allow for future screens without reshuffling.
- **Primary modifier key ambiguity.** `Cmd+/` resolves to different physical keys on different keyboard layouts. Mitigation: react-hotkeys-hook's `ignoreModifiers` with the `mod` alias or the produced character approach; the help action is always discoverable via the palette as fallback.
- **`g b` collisions with per-screen `b`.** The dispatch priority (prefix active → prefix completion) means `g` followed by `b` always navigates back, not fires the screen-scoped `b` (Bid workflow). This is correct by design — the prefix captures the second key. Once the prefix times out, `b` regains its screen-scoped meaning.