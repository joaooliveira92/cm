# Agent Note: Career chrome frame and date/Continue bar

Status: proposed

## Problem

`CareerChrome` in `apps/desktop/src/renderer/router/career.tsx` renders a flat dark-slate strip: eight tab chips (`bg-slate-800`, active `bg-slate-100`) plus a "Back to saves" button. It is the persistent shell every career screen shares, but it has no visual identity, no temporal orientation, and no Continue affordance. The recent visual frame decision ([Visual design tokens and chrome-blue retro frame](../../implemented/architecture/2026-08-29-visual-design-tokens.md)) proposed a chrome-blue gradient title bar and a sidebar, but that note predates `CareerChrome` shipping by construction, and its "Navigation frame" section is wrong at HEAD — it proposes replacing a tab bar that now exists and is wired into keyboard navigation. The chrome needs a decided visual shape: how the tab strip reads as chrome, where the date/Continue bar lives, how Continue relates to the Action registry, whether the title bar owns screen titles, and how the strip degrades as sections grow.

The functional decisions for time and Continue are already recorded elsewhere and are not re-opened here: [Continue as the global career loop](../feature/2026-08-29-continue-as-global-career-loop.md) fixes Continue's placement in the shared shell, its "Continue" label, its `Space` binding, and its five-state model; [Screen 18 (Game Status) removed](../architecture/2026-08-30-game-status-screen-removed.md) lands the season/phase orientation line in `CareerChrome`. This note supplies the visual treatment those decisions render through.

## Proposal

A **two-row career chrome**: a chrome-blue gradient title bar on top holding identity (left) and the date/Continue cluster (right), and the existing tab strip below it restyled so each tab reads as a chrome control. No sidebar. This supersedes the "Navigation frame" section of the visual-design-tokens note; that note's palette, typography, panel, and button sections stand.

### Row 1 — the gradient title bar

The persistent career bar uses the ticket-02 chrome gradient (`--chrome-top` → `--chrome-bottom`) in the title-bar variant (inset shadow, dark border). Layout:

- **Left — club identity.** The human club's name, page-title size (18px, bold). The club is the career's root context (CM 03/04's contextual title), so it belongs in the chrome, not in per-screen headings.
- **Right — the temporal cluster.** Two pieces:
  - The **season readout**, steady state: `Season {n} · Matchday {m}/38`, with a phase word replacing the matchday segment when out of the in-season phase (`Pre-season`, `Transfer window open`, `Season complete`). The unit is always the Matchday; **no copy expresses time in days or dates** (the Calendar has no day-by-day clock, per the continue-career-loop note). The save name appears here as a subdued secondary to satisfy the Game Status orientation breadcrumb.
  - The **Continue control**, the focal point of the cluster.

### Row 2 — the tab strip

The existing flat strip keeps its structure (eight `CAREER_TABS` entries, active-tab inversion, "Back to saves") but is restyled as chrome: tabs become flat controls in the chrome-blue frame rather than peer chips on slate, **the active tab inverts to the gradient** (the primary direction) so the current section reads as the framed locus, and **Back to saves reads as a chrome control** — a subdued flat control with a quiet border, visually distinct from a navigable section because it is not a section (leaving the career is not a career section). The strip owns a horizontal scroll affordance for overflow (see Degradation); with the current eight tabs it is static.

No tab duplication, no sidebar, no hierarchical sub-nav. Keyboard interaction design stays out of scope per the map: this is how the strip looks, not how it behaves.

### The date/Continue cluster and the Action registry

Continue is the app's primary verb and must be expressed exactly once. The chrome renders the button **from the `continue` Action record**, never as a hardcoded second definition:

- The career-global Action `continue` (label "Continue", `Space` binding, availability guard in `ALL_ACTIONS`) is the single source of truth. The button displays the effective binding badge (`Space`), and the disabled state renders the Action's `unavailableReason` — a disabled button with no reason is unacceptable under the continue-career-loop note.
- **`.primary` on the Action model starts being consumed.** `continue` is marked `primary: true` (the third such action, joining `advance-calendar` and `save-tactic`), and the chrome drives the gradient-primary button treatment from that flag. This is the first consumer of `.primary`; the field exists but nothing reads it today. The flag drives presentation only — never automatic `Enter` dispatch, per the Action model — so the palette, the help overlay, and key badges keep deriving from the same `ALL_ACTIONS` projection and cannot drift from the button.
- **The `continue` handler moves out of `LeagueTableScreen` and into the chrome** (`CareerShell`), per the continue-career-loop note's placement decision. Today `LeagueTableScreen` registers the `continue` handler, so `Space` works only from that screen; once the chrome owns it and renders the button everywhere, the note's acceptance criterion ("no longer owned by `LeagueTableScreen`") is served.
- **Label stays fixed "Continue".** The CM 03/04 contextual switch — "Go to Match" when the next interrupt is the human's match — has nothing to compute from at HEAD: the Match day screen is a manual friendly decoupled from the calendar, and no per-club next-fixture query exists. The rule is recorded as a future slot, gated on the calendar/match integration that will give the chrome a real "your next event" read; until then a varying label would claim a state the domain does not expose.

### Title ownership

**Chrome owns the club; screens own their section heading.** Row 1's left is the club name; each screen keeps its `<h1>` but screen-owned headings lose any redundant club suffix they render today (`Tactics — {club}`, `Transfers — {club}`, and Squad's second `<h1>{clubName}` revert to the section name alone). Chrome does not duplicate `Club — Section` against the page heading; the gradient bar's left is the club, and the section name stays where the content is.

### Degradation as sections are added

The strip **scrolls horizontally** with affordance arrows once the tabs exceed the strip width. Every tab stays in the DOM and reachable by focus and `g <key>` regardless of visibility, so the keyboard and palette paths are unaffected — a hidden tab would reinsert exactly the keyboard-only screen the `CAREER_TABS` invariant exists to prevent. A "More" menu and label compression are rejected (below).

## Alternatives considered

- **Single-band chrome (tabs, date/Continue, and identity all in one row).** Rejected: the gradient needs vertical room to read, eight tabs plus the date/Continue cluster plus Back to saves does not fit one row at a 1024-width display, and CM 03/04's global navigation surface (date, advance control, contextual title) is two-region anatomy.

- **Sidebar or hierarchical sub-nav in place of the tab strip** (the superseded design-tokens section). Rejected: the strip is shipped and wired to `NavigationDestination` and the `g <key>` bindings, and nothing a sidebar would add (hierarchy, sub-sections) has a current career screen beneath it; adopting it re-opens a structural question already closed by construction.

- **Transient advance-feedback ticker in the bar ("Matchday 3 played", "Transfer window opened").** Rejected: the continue-career-loop note already gives advance consequences a structured, persistent-until-acknowledged result surface as the dedicated channel; a fading bar would duplicate that channel and creep toward the news surface the no-onboarding-inbox decision rules out.

- **Contextual "Go to Match" label now.** Rejected as unbuildable at HEAD (no per-club next-fixture data), not as undesirable; recorded as a future slot.

- **Rendering the button independently of the Action record.** Rejected: two homes for the primary verb guarantees drift between the button, the palette, and the help surface, and forces a second definition of primary the registry already has.

- **Chrome owning `Club — Section` with screens dropping headings entirely.** Rejected: every screen already selects a section stop, the `<h1>` is the level-1 semantic head, and a chrome-wide section-name mapping would duplicate route labels for the sake of one fewer heading.

- **Headings wholly screen-owned, the title bar carrying no identity.** Rejected: a gradient bar with an empty left half reads wrong and omits the club context the game-status breadcrumb wants on every career screen.

- **Overflow "More" discloser.** Rejected: hiding sections re-creates the keyboard-only screen drift the tablist exists to prevent, even though `g <key>` still works — visibility and reachability would diverge.

- **Label compression under overflow.** Rejected as insufficient past ~eleven sections and as degrading legibility at the sizes a 1024 design targets.

## Acceptance criteria

1. `CareerChrome` renders two rows: a chrome-blue gradient title bar (club identity left; season/phase/Matchday readout + Continue right) and the tab strip below, restyled as chrome controls with the active tab inverted to the primary gradient.
2. No sidebar or hierarchical sub-nav; the `CAREER_TABS` set is unchanged and the strip remains the tab bar the keyboard/nav wiring already serves.
3. Season readout: `Season {n} · Matchday {m}/38` with phase words for non-in-season phases; no day-or-date copy anywhere in the chrome.
4. Continue renders from the `continue` `Action` record: effective binding badge, disabled-with-`unavailableReason`, gradient-primary driven by `primary: true` on that record.
5. The `continue` handler is owned by the chrome (`CareerShell`), not by `LeagueTableScreen`; `Space` and the button work from every career screen.
6. Continue's label stays "Continue"; no varying label until the calendar/match integration supplies a real next-event read.
7. Screen headings drop redundant club suffixes; club identity lives in the title bar, section names in screen-owned `<h1>`.
8. The strip overflow scrolls horizontally with arrow affordances; every tab remains in the DOM, focus-reachable, and `g <key>`-available regardless of visibility.
9. `.primary` is consumed by the chrome for Continue only; it drives presentation, never dispatch.

## Risks

- **Chrome clutter.** Rows 1 and 2 carry identity, season readout, Continue, eight tabs, and Back to saves. The game-status note names "CareerChrome clutter" as its own risk; mitigation is the same: readout and save name stay a subdued line, the gradient does the visual work, and the strip stays the same eight entries.
- **`.primary` semantics are currently empty.** Consumption is new code; if a screen later marks its own primary action, the chrome must drive the same presentation for it or "primary verb" degrades into a special case for Continue.
- **The continue-career-loop note's placement is proposed, not implemented.** This decision assumes the shell owns the handler; if that note is re-opened, the bar's always-visible Continue loses its reach-anywhere backing. The two decisions stand together and should land together or neither.

---
Supersedes the "Navigation frame" section of [Visual design tokens and chrome-blue retro frame](../../implemented/architecture/2026-08-29-visual-design-tokens.md).