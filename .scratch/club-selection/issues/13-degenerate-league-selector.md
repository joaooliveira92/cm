# 13: Degenerate league selector

**What to build:** The workspace's league selector shows the single League a career is generated
in, by name, and is honest about being unable to change anything. The option's name comes from a
new shared content constant beside the existing league-club set — never from the session's league
selection snapshot (which records un-honoured intent) and never hardcoded in the renderer. The
control renders as a disabled native `<select>` with a persistent label and helper text explaining
why it is disabled, so a screen reader never announces a changeable control that does nothing;
there is no enabled single-option trap. Interacting with the selector has no effect on the club
list, because every generated club belongs to the one League and there is nothing to filter by. No
league field is added to the club row or view contract, and the panel's league summary still
derives from the club list itself.

The slice's edge: no wire contract change — the row/view schemas and the read query gain no league
field, and nothing new enters the effect graph; the control is presentational and inert by design.

**Decisions:**

- The selector is built degenerate — the single option names the one generated League from a new
  shared `LEAGUE_NAME` constant (not the session snapshot, which records un-honoured intent);
  selecting it is inert chrome while the world holds one League; `ClubSelectionRow` gains no league
  field now (league identity's scheme belongs to the multi-league effort); and it renders as a
  disabled native `<select>` with a stated reason, never the enabled single-option trap. See
  [Agent Note: The league selector sources a named, inert, single-option control](../../../.agents/notes/proposed/architecture/2026-09-01-league-selector-options-source.md).

**Blocked by:** 10 — Two-column workspace in a full-width creation band.

**Status:** ready-for-agent

- [ ] The selector shows exactly one option, labelled from the new shared `LEAGUE_NAME` content
      constant — never from the session snapshot and never hardcoded in the renderer.
- [ ] The control is a disabled native `<select>` with a persistent label and `aria-describedby`
      helper text explaining why it is disabled.
- [ ] Interacting with the selector has no effect on the club list.
- [ ] The club row/view contracts and the club-selection read gain no league field; the panel's
      league summary still derives from the club list itself.