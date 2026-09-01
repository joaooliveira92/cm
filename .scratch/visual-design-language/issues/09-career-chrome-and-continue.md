# 09: Career chrome — two-row frame, season readout, and Continue from every career screen

**What to build:** from the root of a career, the player sees a persistent two-row chrome that owns the club's identity and the career's temporal state. The first row is a chrome-blue gradient title bar: the club's name on the left, and a temporal cluster on the right showing the season readout — `Season n · Matchday m/38`, phase words outside in-season (Pre-season, Transfer window open, Season complete), the save name subdued, never day-or-date copy — next to one always-visible Continue control. The second row is the existing tab strip restyled beneath it: the active career tab reads as the framed locus (gradient-inverted against the primary gradient), "Back to saves" reads as a subdued chrome control rather than a peer tab, and once sections outgrow the strip it scrolls with arrow affordances while every tab stays in the DOM and reachable by focus and quick key.

Continue renders **from the `continue` Action record** as the single source of truth: it shows the effective binding badge (`Space`), disables with the action's reason, and is the first consumer of the Action model's `primary: true` flag for gradient-primary *presentation only*, never dispatch. Its handler moves out of the LeagueTableScreen into the career shell, so `Space` and the button work from every career screen. The label stays "Continue"; the CM-style "Go to Match" switch is deferred to a future slot past this effort. Screens keep their section headings — the chrome owns club identity, not the screen titles.

The slice's edge promise: the career-chrome and the always-visible Continue land in the same change, because the chrome's right cluster *is* the Continue affordance's home; a caretaker that splits them loses the "one primary verb" invariant. Callers observe the shell's handler through the Action registry only — an always-visible action present on every career route.

**Decisions:**

- **Two-row career chrome (gradient title bar: club identity left, `Season n · Matchday m/38` readout + Continue right; restyled strip beneath with gradient-inverted active tab), Continue rendered from the `continue` Action record (`Space`, disabled-with-reason, `primary: true`) with its handler moved out of LeagueTableScreen into CareerShell, fixed "Continue" label with the contextual "Go to Match" rule deferred to a future slot, screens keep section headings while the chrome owns club identity, and a scrollable strip for overflow with all tabs kept in the DOM.** See [Agent Note](../../../.agents/notes/proposed/architecture/2026-08-31-career-chrome-and-date-continue-bar.md).

**Blocked by:** 08 — Token foundation, alias-first repaint, and the slate guard (the chrome consumes the emitted token utilities and the `PANEL_CHROME`/`BTN_PRIMARY` constants).

**Status:** ready-for-agent

- [ ] Every career screen renders under the two-row chrome: gradient title bar with club identity left and the temporal cluster right.
- [ ] The temporal cluster shows `Season n · Matchday m/38` with phase words outside in-season and the save name subdued, and never renders day-or-date copy.
- [ ] Continue is visible in the chrome's right cluster on every career screen; it renders from the `continue` Action record (effective binding badge, disabled-with-reason, gradient-primary presentation driven by `primary: true` — dispatch untouched).
- [ ] `Space` and the Continue button invoke the career-loop Continue handler from any career screen, not just the league table; the LeagueTableScreen no longer owns it.
- [ ] The active tab reads as the gradient-inverted framed locus; "Back to saves" reads as a chrome control distinct from the section tabs.
- [ ] Once sections outgrow the strip, the strip scrolls with an arrow affordance and every tab remains in the DOM, reachable by focus and its quick key.
- [ ] Screens keep their section headings; the club name lives only in the chrome.
- [ ] The label is exactly "Continue"; no "Go to Match" logic ships.
- [ ] `pnpm check:all` is green at this commit.