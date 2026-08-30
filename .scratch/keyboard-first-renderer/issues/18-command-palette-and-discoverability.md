# 18: Command palette and discoverability

**What to build:** the discoverability layer as the map's one deliberate big-bang, shipping only
once every career screen dispatches registered Actions (Stage 3): the command palette (`Primary+K`)
listing global and current-screen commands with available-above-unavailable ranking and
disabled-with-reason (never hidden), commands-only with no game-data search; the keyboard-help
overlay (`Primary+/`) with All/Global/This-screen tabs enumerating live bindings from the registry;
inline key badges on screen-scoped action buttons toggleable per screen; and the one-shot teaching
splash (exactly three shortcuts) on first load of a career screen, never re-shown. `Escape`
layering closes only the topmost transient layer.

**Decisions:**

- Yes to all four mechanisms — palette (global + current-screen, disabled-with-reason, commands-only), contextual help with tabs, inline key badges on buttons, and a one-shot teaching splash. Game-data search is out of scope. See [Agent Note](../../../.agents/notes/proposed/feature/2026-08-29-command-palette-and-discoverability.md).

**Blocked by:** 17.

**Status:** ready-for-agent

- [ ] AC-20: `Primary+K` palette, `Primary+/` help, `Escape` closes only the topmost transient layer; overlays create no history entries.
- [ ] AC-23: Palette lists global + current-screen Actions, available ranked above unavailable, disabled-with-reason, never hidden, commands-only.
- [ ] AC-24: Help overlay has All/Global/This-screen tabs and enumerates live registrations, not a hand-maintained list.
- [ ] AC-25: Inline key badges on screen-scoped action buttons, toggleable per screen via registry metadata.
- [ ] AC-26: One-shot teaching splash on first career: exactly three shortcuts, never re-shown.

## Comments

- Published from the approved to-tickets breakdown (spec: `.scratch/keyboard-first-renderer/spec.md`, Stage 4).