# 04 — Navigation frame and Continue/date bar

Type: grilling
Status: resolved

> Rewritten 2026-08-31. The original version asked whether to keep flat tabs or move
> to CM's hierarchical model. `CareerChrome` shipped in the meantime and wired the
> tab strip to `NavigationDestination` and the `g <key>` bindings, so the structural
> question is closed by construction. What is open is the visual treatment and the
> still-absent date/Continue affordance.

## Question

What does the persistent career chrome look like, and where does the date/Continue
affordance live?

### What is already settled (do not re-decide)

- `CareerChrome` in `renderer/router/career.tsx` renders a flat tab strip from
  `CAREER_TABS` (squad, tactics, transfers, league table, fixtures, match day,
  season summary, manager) plus a "Back to saves" button. Each tab maps to a
  `CareerDestination` and a `g <key>` binding; a screen with a route and a binding
  but no tab is keyboard-only, which the list exists to prevent.
- Boot-screen app chrome (Quit, Preferences, Credits) is decided in
  `.agents/notes/proposed/architecture/2026-08-30-boot-screen-app-chrome-bar.md`.
  That bar belongs to the Save List. This ticket covers career chrome only.
- Tab activation already distinguishes pointer from keyboard intent to decide
  whether the destination requests semantic focus.

### Decide

1. **Chrome-blue treatment of the tab strip.** The visual frame decision proposed a
   gradient title bar. Apply it to the existing strip: gradient, active-tab
   inversion, and how "Back to saves" reads as chrome rather than as a peer tab.
2. **The date/Continue bar.** CM 03/04's most load-bearing chrome element and still
   entirely absent — no date display, no Continue button. Decide what it shows, where
   it sits relative to the tab strip, and whether Continue is context-sensitive
   ("Go to Match" on match days).
3. **Continue's relationship to the Action registry.** It is the app's primary verb;
   it needs a binding, a palette entry, and a focus story, not just a button.
4. **Screen title bar.** Every screen currently floats an `<h1>`. Does a persistent
   contextual title bar (club name, section, player) become part of the chrome, or
   do headings stay screen-owned?
5. **How the strip degrades as sections are added.** Eight tabs fit; fifteen will not.
   Decide the overflow behaviour before it is forced.

### Supersession

The "Navigation frame" section of
`.agents/notes/proposed/architecture/2026-08-29-visual-design-tokens.md` proposes
replacing the tab bar and adding a sidebar. That predates `CareerChrome` and is
wrong at HEAD. Resolving this ticket must supersede that section explicitly — the
rest of that note (palette, typography, panels, buttons) stands.

## Answer

**Two-row career chrome (gradient title bar: club identity left, `Season n · Matchday m/38` readout + Continue right; restyled strip beneath with gradient-inverted active tab), Continue rendered from the `continue` Action record (`Space`, disabled-with-reason, `primary: true`) with its handler moved out of LeagueTableScreen into CareerShell, fixed "Continue" label with the contextual "Go to Match" rule deferred to a future slot, screens keep section headings while the chrome owns club identity, and a scrollable strip for overflow with all tabs kept in the DOM.** See [Agent Note](../../../.agents/notes/proposed/architecture/2026-08-31-career-chrome-and-date-continue-bar.md).
