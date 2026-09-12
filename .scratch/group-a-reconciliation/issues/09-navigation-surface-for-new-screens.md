# 09 — Navigation surface for the new shell screens

Type: grilling
Status: resolved
Blocked by: 05, 06, 08

## Question

`navigation/destinations.ts` calls its destination set "deliberately closed": the save list, three
creation steps, and seven career screens, with `CAREER_G_BINDINGS` mapping `g <key>` onto career screens
only. Whichever of screens 18–21 survive reopen that decision.

- Are Game Status and Manager Status career screens (`/career/$saveId/...`, tab in `CareerChrome`,
  a `g` binding), or shell-level surfaces reachable from anywhere?
- Quit is a modal confirmation rather than a destination. Does it become a route at all, or a dialog
  owned by the screen that launches it — and what does the router-vs-dialog choice cost in focus
  handling? Ticket 07 already settled the Retire half: a dialog on Manager Profile, no route, no
  binding, no tier. Whatever this ticket decides for Quit should either match that or say why it
  differs.
- Which `g` keys are still free, and does adding tabs to `CareerChrome` push it past what a tab strip
  should hold.
- Keyboard tier per new screen, against the rule in the screen-keyboard-tiers note — **plus the Save
  List itself**, which ticket 04 found missing from that note's nine-screen table despite being
  shipped. Its two controls put it at level 2 minimum under the rule as written.
- Where an Exit, Preferences, and Credits entry live. Ticket 04 found all three absent: the Save List
  is a list, not a menu, so there is no menu group to hang them on. Screens 16 and 21 own two of the
  destinations; this ticket owns the surface that reaches them.
- Whether these belong in the command palette.

## Answer

**Save List keyboard tier**: Level 2. Per the tiering rule (zero-interactive-controls exemption fails — two control types present). Primary-action shortcut: Enter to select the focused save row; C to Continue on the most-recent save.

**Boot-screen chrome**: An app-chrome bar at the top of the Save List with three icon-only buttons — Preferences, Credits, and Quit. All three are lightweight dialogs (no routes), matching the Retire and Quit patterns. Quit reuses the existing before-quit guard. Preferences and Credits are informational dialogs.

**Command palette**: No entries. The palette is for career-mode navigation and screen-local actions; boot-screen chrome, Quit, Preferences, and Credits are set-and-forget actions that don't benefit from palette access.

See [Agent Note: Boot-screen app-chrome bar](/.agents/notes/proposed/architecture/2026-08-30-boot-screen-app-chrome-bar.md).

## Note-worthiness

The Save List keyboard-tier assignment extends the existing [Screen keyboard tiers](/.agents/notes/proposed/feature/2026-08-29-screen-keyboard-tiers.md) note — no new note needed, the table is updated there.

The app-chrome bar decision (boot screen as host for Preferences, Credits, Quit) is a design choice with genuine alternatives — warrants a new `architecture` note.

The command-pallet exclusion is a minor boundary clarification, not a standalone decision.