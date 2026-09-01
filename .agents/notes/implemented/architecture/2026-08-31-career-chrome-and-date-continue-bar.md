# Agent Note: Career chrome frame and date/Continue bar

Status: implemented

## Problem

`CareerChrome` in `apps/desktop/src/renderer/chrome/CareerChrome.tsx` renders the persistent shell every career screen shares: a chrome-blue gradient title bar (club identity left, season readout + Continue right) and the tab strip below. The visual design tokens note ([Visual design tokens and chrome-blue retro frame](../../implemented/architecture/2026-08-29-visual-design-tokens.md)) had proposed a sidebar and replacing the tab bar, but that note predates `CareerChrome` shipping by construction — the tab bar now exists and is wired into keyboard navigation, so its "Navigation frame" section is wrong at HEAD. This decision supplies the visual shape the shipped chrome renders through.

## Decision

A **two-row career chrome**: a chrome-blue gradient title bar on top holding identity (left) and the date/Continue cluster (right), and the tab strip below restyled so each tab reads as a chrome control. No sidebar. This supersedes the "Navigation frame" section of the visual-design-tokens note; that note's palette, typography, panel, and button sections stand. The functional placement decisions (Continue in the shared shell, its "Continue" label, `Space` binding, and the season/phase orientation line) are recorded separately and are not re-opened here.

### Row 1 — the gradient title bar

The persistent career bar uses the chrome gradient (`--chrome-top` → `--chrome-bottom`) in the title-bar variant (inset shadow, dark border).

- **Left — club identity.** The human club's name, page-title size (18px, bold). The club is the career's root context, so it lives in the chrome, not in per-screen headings.
- **Right — the temporal cluster.** Two pieces:
  - The **season readout**, steady state: `Season {n} · Matchday {m}/38`, with a phase word replacing the matchday segment outside the in-season phase (`Pre-season`, `Transfer window open`, `Season complete`). The unit is always the Matchday; **no copy expresses time in days or dates**. The save name appears here as a subdued secondary.
  - The **Continue control**, the focal point of the cluster.

### Row 2 — the tab strip

The strip keeps its structure (eight `CAREER_TABS` entries, active-tab inversion, "Back to saves") but is restyled as chrome: tabs become flat controls in the chrome-blue frame, **the active tab inverts to the gradient**, and **Back to saves reads as a subdued chrome control** — visually distinct from a navigable section because leaving the career is not a career section. The strip scrolls horizontally for overflow; with the current eight tabs it is static.

### The date/Continue cluster and the Action registry

Continue is the app's primary verb and is expressed exactly once. The chrome renders the button **from the `continue` Action record**, never as a hardcoded second definition:

- The career-global Action `continue` (label "Continue", `Space` binding) is the single source of truth. The button displays the effective binding badge, and the disabled state renders the Action's `unavailableReason` — a disabled button with no reason is unacceptable.
- **`.primary` on the Action model is consumed.** `continue` is marked `primary: true` and the chrome drives the gradient-primary button treatment from that flag — the first consumer of `.primary`. The flag drives presentation only, never automatic `Enter` dispatch.
- **The `continue` handler lives in the chrome** (`CareerShell`), so `Space` and the button work from every career screen, not only the League table (which no longer owns it).
- **Label stays fixed "Continue".** The CM 03/04 contextual switch — "Go to Match" when the next interrupt is the human's match — has nothing to compute from at HEAD: no per-club next-fixture query exists. The rule is recorded as a future slot, gated on the calendar/match integration that will give the chrome a real "your next event" read.

### Title ownership

**Chrome owns the club; screens own their section heading.** Row 1's left is the club name; each screen keeps its `<h1>` but screen-owned headings carry no club suffix (`Tactics`, `Transfers`, `Squad`, …).

### Degradation as sections are added

The strip **scrolls horizontally** with arrow affordances once the tabs exceed the strip width. Every tab stays in the DOM and reachable by focus and `g <key>` regardless of visibility, so the keyboard and palette paths are unaffected — a hidden tab would reinsert exactly the keyboard-only screen the `CAREER_TABS` invariant exists to prevent.

## Consequences

- `CareerChrome` renders the two-row shell on every career screen — gradient title bar with club identity left and the season readout + Continue right, and the tab strip with the active tab inverted to the primary gradient.
- No sidebar or hierarchical sub-nav; the `CAREER_TABS` set is unchanged and the strip remains the tab bar the keyboard/nav wiring already serves.
- The season readout is `Season {n} · Matchday {m}/38` with phase words outside in-season, and no day-or-date copy appears anywhere in the chrome.
- Continue renders from the `continue` Action record: effective binding badge, disabled-with-`unavailableReason`, gradient-primary driven by `primary: true` — presentation only, never dispatch.
- `Space` and the Continue button invoke the career loop from every career screen; `LeagueTableScreen` no longer owns the handler.
- Continue's label is "Continue"; the "Go to Match" switch is deferred to a future slot gated on calendar/match integration.
- Screen headings hold only the section name; club identity lives in the title bar.
- The strip overflows by horizontal scroll with arrow affordances; every tab stays in the DOM, focus-reachable, and `g <key>`-available regardless of visibility.
- **Chrome clutter risk.** Rows 1 and 2 carry identity, season readout, Continue, eight tabs, and Back to saves; the mitigation is the subdued readout/save-name line, the gradient doing the visual work, and the unchanged eight-entry strip.
- **`.primary` semantics were empty before this consumer.** If a later screen marks its own primary, the chrome must drive the same presentation for it or "primary verb" degrades into a special case for Continue.

---
Supersedes the "Navigation frame" section of [Visual design tokens and chrome-blue retro frame](../../implemented/architecture/2026-08-29-visual-design-tokens.md).
