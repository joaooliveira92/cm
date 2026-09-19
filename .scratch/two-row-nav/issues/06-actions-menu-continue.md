# 06: Actions menu and Continue button

**What to build:** Two persistent controls in the header area:

**Actions menu** — a dropdown button in the page header area (below the navbar, above content) that contains page-level commands, never navigation destinations. The button label names the current entity or context (e.g., "Player Actions ▼", "Squad Actions ▼"). Actions are conditionally enabled; disabled actions display an explanation.

Example actions (spec §3.3): Make Offer, Add to Shortlist, Request Scout Report, Compare Player, Offer New Contract, Move to Reserves, Save Tactic, Select Team, Confirm Lineup.

**Continue button** — the main game-loop action, positioned in the primary row's right side and visually dominant (spec §4.3):
- Normal state: "Continue"
- Next event is a match: "Go to Match"
- Blocking decision exists: contextual label ("Respond", "Submit Team", "Attend Draw")
- Progression unavailable: disabled state with explanation

Implement as two new components under `apps/desktop/src/renderer/chrome/header/`. The Continue button reads the game-loop state from the existing calendar/season system to derive its label and enabled state.

**Decisions:**

- Actions menu in page header, not in nav rows. See [Agent Note](../../../.agents/notes/implemented/architecture/2026-09-10-menu-nav-architecture.md).

**Blocked by:** 02 (PrimaryNav), 03 (SecondaryNav).

**Status:** resolved

- [x] Actions menu renders in page header below the navbar, above content
- [x] Actions menu label names the current entity/context (e.g., "Actions ▼")
- [x] Page-level commands are in the Actions menu — no page-level action appears as a nav tab
- [x] Disabled actions show an explanation (not silently ignored)
- [x] Continue button is always visible and visually prominent in the primary row's right side
- [x] Continue label matches state: "Continue" (normal), "Go to Match" (match pending), contextual ("Respond", etc.) for blocking decisions
- [x] Continue is disabled with explanation when progression is unavailable
- [x] Destructive actions (Resign, Retire) require confirmation
- [x] Tests cover: actions menu rendering, Continue button label derivation, disabled states, destructive confirmation