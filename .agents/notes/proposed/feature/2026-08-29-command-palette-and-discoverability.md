# Agent Note: Command palette and discoverability

Status: proposed

## Problem

A keyboard-first app is only usable if players can learn what the keyboard does. The Action model (ADR-0012) defines what actions exist and the Global key map (feature/2026-08-29-global-key-map) assigns them bindings, but neither specifies how a player discovers those bindings — whether through a searchable palette, a help reference, inline key hints on buttons, or first-run teaching.

Without these mechanisms, level 3 (mouse-free) is unreachable: every action might be bound, but a player who doesn't know the bindings will reach for the mouse. Six sub-decisions need settling.

## Proposal

The renderer will implement four discovery mechanisms that work together — none is an alternative to the others:

### Command palette (`Cmd+K` / `Ctrl+K`)

- **Exists at level 1**, unconditionally. The palette is the primary discovery surface.
- **Lists global + current-screen actions.** Not "global only" (misses screen context) and not "all screens" (noisy — actions from irrelevant screens add friction).
- **Available actions ranked above unavailable**, then by label match score: exact label match → prefix match → substring → binding match → scope/screen match → word-initials fuzzy. Available actions get a +10 rank boost so the player sees what they *can* do first, but disabled entries still appear with context.
- **Unavailable actions shown disabled with a reason**, never hidden. Teaching the model ("I need to select a player first") is worth the list length. Reason text is per-predicate: "Select a player first" for `hasSelection`, etc.
- **Navigates as actions ("Go to Squad")**, never as instant navigation on select. Consistent with the Action model — every palette entry dispatches an Action record.
- **Strictly a command surface.** Game-data search (players, clubs) is out of scope for this effort. Ruled explicitly — it is a much larger feature and belongs in a separate effort.

### Help overlay (`Cmd+/` / `Ctrl+/`)

- **Provides a persistent key map reference**, opened from any screen.
- **Tabs: All, Global, This screen.** "All" shows everything; "Global" filters to navigation and invariants; "This screen" shows screen-scoped bindings. The player chooses the level of detail.
- **Lists every registered Action with its binding**, including availability-afforded entries where the predicate currently evaluates to true (marked with a check indicator).

### Inline affordances

- **Screen-scoped action buttons display their key binding** as a small badge (e.g., "b" on the Bid button). Navigation actions (g s, g t, etc.) have no visible button, so they rely on palette and help.
- **Toggleable per-screen**, not an all-or-nothing project switch. Some screens (dense data tables) may prefer cleaner buttons; others (action-heavy like Transfers) benefit most.

### First-run teaching

- **A brief, dismissible splash on first career creation.** Three lines maximum: `Cmd+K` for palette, `Cmd+/` for help, `g <key>` to navigate. No full binding table.
- **Never re-shown.** All subsequent discovery is pull-based via palette and help.

### Search over game data

Explicitly **out of scope for this effort**. The command palette finds commands only. Game-data search (finding a player by name, a club, a competition) is a separate feature with different UX, ranking, and data-fetching requirements. If pursued later, it goes as a distinct effort with its own map and spec.

## Alternatives considered

- **Palette: global actions only.** Rejected — hides screen-scoped actions from discovery, forcing players to use the help overlay for every context change. The extra noise of 5–10 screen actions is negligible.
- **Palette: all screens' actions at once.** Rejected — actions from Match Day have no relevance on the Transfers screen. Long lists erode the palette's speed advantage.
- **Palette: unavailable actions hidden.** Rejected — a player who doesn't know "Bid workflow" exists cannot discover the condition that enables it. Disabled-with-reason teaches the model.
- **Palette: instant navigation on typing a screen name.** Rejected — breaks the Action model's consistency ("Go to Squad" is an Action like any other). Instant navigation would also need a separate "execute or select" UI pattern (Cmd+Enter vs Enter) that adds complexity.
- **Palette: instant navigation as default with "hold Cmd to navigate" modifier.** Rejected — adds a modal distinction between "search for action" and "search for screen" that the player must discover. Simpler to have one list of Actions, some of which navigate.
- **Help overlay: contextual-only (current screen only).** Rejected — a player who wants to learn all navigation bindings in one place would need to visit every screen. Tabs let them choose.
- **Help overlay: full-map-only (no filtering).** Rejected — overwhelming on dense screens. Tabs resolve this.
- **Inline affordances: always on.** Rejected — some screens (Squad with many action buttons) could become visually noisy. Per-screen toggle.
- **Inline affordances: always off.** Rejected — the cheapest discovery mechanism, visible without any action. The key hint badge communicates "this button has a keyboard binding" and teaches the model passively.
- **First-run: no teaching at all.** Rejected — a purely pull-based model requires the player to know to open the palette, which is itself a keyboard shortcut. A one-time splash bridges the gap.
- **First-run: full key map walkthrough.** Rejected — information overload. Three lines about the meta-mechanisms (palette, help, navigation prefix) is sufficient; the map itself is learned through use.
- **Palette includes game-data search.** Rejected — scope fork. Game-data search is a distinct feature with different ranking (fuzzy name matching), data-fetching (IPC calls to the engine), and UX (results can be thousands of rows). Combining both in one surface creates a "Swiss army knife" that is worse at both jobs.

## Acceptance criteria

- AC-01: Command palette opens with `Cmd+K` (macOS) / `Ctrl+K` (Windows, Linux).
- AC-02: Help overlay opens with `Cmd+/` (macOS) / `Ctrl+/` (Windows, Linux).
- AC-03: Palette displays global and current-screen actions when opened.
- AC-04: Palette ranking: available actions before unavailable; label match score within each tier.
- AC-05: Unavailable actions are shown with a plain-language reason for unavailability.
- AC-06: Unavailable actions are never hidden from the palette (no "hidden" mode).
- AC-07: Palette entries are Actions — navigating to a screen is listed as "Go to [screen name]", not an instant navigation on select.
- AC-08: Palette does not search game entities (players, clubs, competitions).
- AC-09: Help overlay has three tabs: All, Global, This screen.
- AC-10: Help overlay lists every registered action visible in the current scope mode.
- AC-11: Screen-scoped action buttons display their key binding as an inline badge.
- AC-12: Inline affordances can be toggled per screen via the Action registry metadata.
- AC-13: A dismissible teaching splash appears on first career creation.
- AC-14: Teaching splash shows exactly three shortcuts: palette, help, and navigation prefix.
- AC-15: Teaching splash never re-shows after dismissal.

## Risks

- **Palette latency.** If the palette queries the Action registry synchronously for every keystroke and the registry grows large (100+ actions), filtering may lag. Mitigation: the registry is O(n) with n < 50 for this app; pre-index by label and binding on registry construction.
- **Inline affordance collisions on small buttons.** A single-letter binding badge on a button with a long label may overflow on short buttons (e.g., "Scout" + "r" badge). Mitigation: the badge is positioned absolutely (top-right corner); if the button text truncates, adjust button min-width.
- **First-run splash timing.** Showing the splash on career creation means the player sees it before they have any context for what they'll do in the app. Mitigation: show it on the *first load of a career screen* (i.e., the first time the player enters Squad or Transfers after creation), not on the creation step itself.
- **Help overlay staleness.** If a screen has action availability predicates that change frequently, the help overlay's "available ✓" markers may be stale by the time the player acts. Mitigation: availability is a snapshot at help-open time; the binding table is always accurate.