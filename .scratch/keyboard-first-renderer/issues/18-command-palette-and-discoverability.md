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

- Yes to all four mechanisms — palette (global + current-screen, disabled-with-reason, commands-only), contextual help with tabs, inline key badges on buttons, and a one-shot teaching splash. Game-data search is out of scope. See [Agent Note](../../../.agents/notes/implemented/feature/2026-08-29-command-palette-and-discoverability.md).

**Blocked by:** 17.

**Status:** resolved

- [x] AC-20: `Primary+K` palette, `Primary+/` help, `Escape` closes only the topmost transient layer; overlays create no history entries. (`discoverability-escape-layering.test.tsx` — open/close, topmost-only, no nav/back steps, precedence over `b`/`g`, focus restore.)
- [x] AC-23: Palette lists global + current-screen Actions, available ranked above unavailable, disabled-with-reason, never hidden, commands-only. (`discoverability-command-palette.test.tsx`, `discoverability-rank.test.ts` — pure ranking exact→prefix→substring→binding→scope→word-initials, available tier first.)
- [x] AC-24: Help overlay has All/Global/This-screen tabs and enumerates live registrations, not a hand-maintained list. (`discoverability-help-overlay.test.tsx` — overlay == registry snapshot, tab filtering, availability indicators.)
- [x] AC-25: Inline key badges on screen-scoped action buttons, toggleable per screen via registry metadata. (`discoverability-key-badges.test.ts` + badge renders on League `c` / Transfers `b`.)
- [x] AC-26: One-shot teaching splash on first career: exactly three shortcuts, never re-shown. (`discoverability-teaching-splash.test.tsx`, `discoverability-escape-layering.test.tsx` — first career-screen load, 3 `<kbd>`s, dismiss persists, remount silent, focused-button Escape.)

## Comments

- Published from the approved to-tickets breakdown (spec: `.scratch/keyboard-first-renderer/spec.md`, Stage 4).
- Implemented, reviewed (APPROVE), and repair-folded by the orchestrator: un-gated `open-palette`/`open-help` to always-active `app_global` (the global-key-map note says Active when: Always), added priority-2 overlay unit tests and a focused-button splash-Escape test. Gate green (`pnpm check:all`). Note promotions: `command-palette-and-discoverability` and `global-key-map` promoted proposed → implemented (the latter's Stage-3-open AC-13/14/16/19/26 now close). Splash state uses a renderer-local `localStorage` flag (cosmetic UI preference, not authoritative game state — contract's no-localStorage rule targets authoritative state; the Stage-6 rebinding store is separate).