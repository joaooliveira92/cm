# 07-command-palette-and-discoverability

Type: prototype
Status: resolved
Blocked by: 03, 05

## Question

How does a player discover what the keyboard can do?

A keyboard-first app that nobody can learn is a mouse app with extra steps. Two mechanisms are on
the table and they are not alternatives — decide whether each exists, and what it shows.

Build a rough palette prototype to react to.

Decide:

- **Command palette**: whether it exists, what it lists (global Actions only, or the current
  screen's too), how entries are ranked and filtered, whether it can navigate as well as act, and
  whether unavailable Actions are hidden or shown disabled with a reason. Showing them disabled
  teaches the model; hiding them keeps the list short.
- **Help overlay**: whether a persistent key map reference exists, how it is opened, and whether it
  is contextual to the current screen or the whole map at once.
- **Inline affordances**: whether buttons display their key binding in the UI, which is the cheapest
  discovery mechanism and the one that survives a player never opening the palette.
- **First-run**: whether anything teaches the keyboard model on a new career, or whether discovery
  is entirely pull-based.
- **Search over game data**: whether the palette also finds players and clubs, or is strictly a
  command surface. This is a scope fork — the former is a much larger feature and may belong in
  the map's Out of scope rather than here.

## Answer

**Yes to all four mechanisms — palette (global + current-screen, disabled-with-reason, commands-only), contextual help with tabs, inline key badges on buttons, and a one-shot teaching splash. Game-data search is out of scope.** See [Agent Note](../../../.agents/notes/proposed/feature/2026-08-29-command-palette-and-discoverability.md).

## Prototype

Interactive HTML: `../prototype/command-palette.html`

Branch: `prototype/command-palette-discoverability` (commit `94b105e`)

Open the file in a browser. Use **Cmd+K** (or **Ctrl+K** on Windows/Linux) to open the palette,
**Cmd+/** for the help overlay, or click the buttons. The config panel toggles between variants —
tweak while the palette is open to see how scope, unavailable-action display, and inline hints affect
the discovery experience.
