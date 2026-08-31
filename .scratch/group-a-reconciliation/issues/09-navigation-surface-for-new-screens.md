# 09 — Navigation surface for the new shell screens

Type: grilling
Status: open
Blocked by: 05, 06, 08

## Question

`navigation/destinations.ts` calls its destination set "deliberately closed": the save list, three
creation steps, and seven career screens, with `CAREER_G_BINDINGS` mapping `g <key>` onto career screens
only. Whichever of screens 18–21 survive reopen that decision.

- Are Game Status and Manager Status career screens (`/career/$saveId/...`, tab in `CareerChrome`,
  a `g` binding), or shell-level surfaces reachable from anywhere?
- Retire and Quit are modal confirmations rather than destinations. Do they become routes at all, or
  dialogs owned by the screen that launches them — and what does the router-vs-dialog choice cost in
  focus handling?
- Which `g` keys are still free, and does adding tabs to `CareerChrome` push it past what a tab strip
  should hold.
- Keyboard tier per new screen, against the rule in the screen-keyboard-tiers note — **plus the Save
  List itself**, which ticket 04 found missing from that note's nine-screen table despite being
  shipped. Its two controls put it at level 2 minimum under the rule as written.
- Where an Exit, Preferences, and Credits entry live. Ticket 04 found all three absent: the Save List
  is a list, not a menu, so there is no menu group to hang them on. Screens 16 and 21 own two of the
  destinations; this ticket owns the surface that reaches them.
- Whether these belong in the command palette.

## Done when

The destination set, bindings, and tiers for the surviving new screens are specified.