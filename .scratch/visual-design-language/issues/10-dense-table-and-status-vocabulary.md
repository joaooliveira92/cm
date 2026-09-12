# 10: Dense shared-table layer and the player-status vocabulary

**What to build:** every career table (squad, transfers, league table) reads at the compact tier: 12px body and small row padding so a 30-column squad fits the screen, flat divider headers with a secondary-toned sort indicator that still reads at 12px, and four visual states that stay separable — neutral row, hover lift, a low-opacity chrome-blue selection fill, and keyboard focus on the player-name button — with no zebra striping. When the table overflows horizontally, the edge is signalled by a soft fade driven by scroll position, so the player always knows more columns exist beyond the visible width.

Beside the player name sits a reserved Status column that is pinned and always visible: it survives horizontal scroll, the column-visibility toggles, and the saved view presets. It renders **only engine-modeled state** — today that is the player's condition — and nothing invented; unmodeled statuses render as empty cells under Mechanical Provenance. Statuses render as CM-style three-letter abbreviations coloured by the existing danger/warning/success semantic tokens. The full CM 03/04 abbreviation set is earmarked as reserved-but-unbuilt slots, each carrying its honest likelihood note, so the reservation reads as a contract, not a promise. Accessibility: on row focus the full term is fed to the polite announcer, never the raw abbreviation, and a full abbreviation legend is reachable from the Status column's header via the Term Disclosure pattern — never hover-only.

The slice's edge promise: this lands entirely inside the shared table layer, so screens inherit it — no per-screen table theming is in scope. The Status column is a renderer-side contract over the engine's modeled state; unmodeled state renders empty, so no new engine data is promised.

**Decisions:**

- **Shared-table density contract (12px/`py-0.5`, flat divider headers, four-way separable row states, scroll-driven edge fade) plus a reserved, always-on, pinned Status column rendering only engine-modeled state, with the full CM 03/04 abbreviation set earmarked as reserved slots.** See [Agent Note](../../../.agents/notes/implemented/architecture/2026-08-31-dense-table-and-status-vocabulary.md).

**Blocked by:** 08 — Token foundation, alias-first repaint, and the slate guard (the density and status tokens, and the four-way row-state colors, come from the emitted token system).

**Status:** resolved

- [x] All career tables render at the compact tier: 12px body, small row padding, flat divider headers, secondary-toned sort indicator legible at 12px.
- [x] Row hover, row selection, neutral state, and the name-button focus ring are visually distinct from one another and from the focus ring; no zebra striping.
- [x] Horizontal overflow is signalled by a scroll-position-driven edge fade.
- [x] A Status column is pinned beside the player name, always visible, and excluded from the column-visibility toggles and presets; it survives horizontal scroll.
- [x] The Status column renders only engine-modeled state (today `condition`); unmodeled statuses render as empty cells, and no unmodeled abbreviation is displayed anywhere.
- [x] Statuses render as three-letter abbreviations coloured by the shared danger/warning/success semantic tokens.
- [x] The full CM 03/04 abbreviation set is recorded as reserved-but-unbuilt slots with per-status likelihood notes (low for selection-rule and scouting statuses; plausible for injury, suspension, condition, transfer-listed/wanted) — the reservation reads as a contract, not a promise.
- [x] On row focus the polite announcer speaks the full term, never the raw abbreviation.
- [x] A full abbreviation legend is reachable from the Status column's header (Term Disclosure), usable without a mouse.
- [x] `pnpm check:all` is green at this commit.