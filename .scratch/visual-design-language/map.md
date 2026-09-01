# Map: visual-design-language

Label: wayfinder:map

> Status: charted and complete. Tickets 01–07 are resolved; ticket 04 was rewritten on
> 2026-08-31 because the renderer it was written against no longer exists, tickets 05 and 06 are
> new, and ticket 07 graduated from fog into the frontier on 2026-08-31 and closed the same day.
> The frontier is empty; nothing is left to decide. The map is ready to hand to `/cm-to-spec`.

## Destination

A **spec** at `.scratch/visual-design-language/spec.md` describing (a) the visual design
language and UI element inventory for the `@cm-clone/desktop` renderer, grounded in the CM
03/04 analysis at `docs/ui-elements.md`, and (b) the **incremental adoption path** that moves
the renderer's ~391 hardcoded `slate-*` call sites onto that language without a big-bang
restyle.

The second half is what distinguishes this from a greenfield design doc. The visual frame was
already adopted (see Decisions so far) and has sat unbuilt while flat-slate styling spread
further; a spec that only says what the UI should look like reproduces that failure. The spec
must also say how to get there from here.

Plan-only: the map is done when nothing is left to decide and the spec can be handed to
`/cm-to-spec` → `/cm-to-tickets` → `/cm-implement`.

## Notes

- Domain: the `@cm-clone/desktop` Electron renderer (React 19, Tailwind 4, Effect stack).
- **Source material**: `docs/ui-elements.md` — CM 03/04's UI: entry flow, squad table, status
  abbreviations, navigation model, news/task surface, tactics/training screens, and visual
  design language (dense, text-led, abbreviated, skin-based).
- **Keyboard-first is shipped code, not a sibling effort.** The Action registry, focus model
  (`renderer/focus.js`), roving tabindex, `g <key>` navigation, and command palette are live in
  the tree. They are constraints to render through, never decisions to re-litigate. Any visual
  proposal that fights `DataTable`'s focus model is wrong by construction.
- **A shared table layer already exists.** `renderer/table/DataTable.tsx` and
  `renderer/table/TablePanel.tsx` own sorting, filtering, roving focus, selection-vs-focus
  separation, row primary actions, and Squad's column visibility. Visual decisions about tables
  land in these two components, not in the individual screens.
- **The chrome-blue prototype was deleted.** `renderer/components/match-screen/` supplied every
  token in the ticket-02 decision and was removed in commit `590434c`. It is recoverable at
  `590434c^` and should be read there rather than treated as missing.
- **The current-state research doc is partly stale.** `docs/research/visual-design-language-current-state.md`
  was accurate on 2026-08-29. Its claims about the match-screen component, clickable rows, and
  view switching have since been overtaken. Trust it for palette and density facts; verify
  anything it says about tables or navigation against HEAD.
- Skills: grilling + domain-modeling for the frame-defining tickets; doc-standards +
  writing-for-agents for the spec.
- Say names, not bare ids.

## Decisions so far

<!-- the index: one line per closed ticket, enough to judge relevance, then zoom the link for the detail the ticket holds -->

- [Current visual state audit](issues/01-current-visual-state-audit.md): 9-dimension audit —
  the main renderer is flat dark slate, scoring modern/modified or no-equivalent against CM
  03/04 on every axis. Research note at `docs/research/visual-design-language-current-state.md`.
  Partly stale as of 2026-08-31; see Notes.

- [Visual frame and design tokens](issues/02-visual-frame-tokens.md): **Retro chrome-blue visual
  frame adopted** — palette (dark base, chrome-blue gradients, panel-dark surfaces), typography
  (Trebuchet MS, 12px table body), panel system (semi-transparent borders), two-tier buttons
  (gradient primary, flat secondary), compact density (py-0.5 rows). Skin system deferred. Agent
  Note at `.agents/notes/implemented/architecture/2026-08-29-visual-design-tokens.md`. **The
  palette, typography, panel and button sections stand. That note's "Navigation frame" section
  does not** — it proposes replacing a tab bar that has since shipped and been wired into
  keyboard navigation, and is superseded by
  [Navigation frame and Continue/date bar](issues/04-navigation-frame-and-continue-bar.md).

- [Dense table visuals and status abbreviations](issues/03-dense-table-and-abbreviations.md):
  shared-table density contract (12px/`py-0.5`, flat divider headers, four-way separable
  hover/selection/focus, scroll-driven edge fade) plus a reserved, always-on, pinned Status column
  that renders only engine-modeled state (today `condition`) and earmarks the full CM 03/04
  abbreviation set as future slots under provenance. Agent Note at
  `.agents/notes/implemented/architecture/2026-08-31-dense-table-and-status-vocabulary.md`.

- [Navigation frame and Continue/date bar](issues/04-navigation-frame-and-continue-bar.md):
  **Two-row career chrome** — chrome-blue gradient title bar (club identity left;
  `Season n · Matchday m/38` readout + Continue right) with the existing tab strip
  restyled beneath (gradient-inverted active tab, Back-to-saves as chrome, scrollable
  overflow). Continue renders from the `continue` Action record (effective binding badge,
  disabled-with-reason, `primary: true`) and its handler moves out of LeagueTableScreen
  into CareerShell; label stays "Continue" (the CM-style "Go to Match" switch deferred to a
  future slot past this effort); screens keep section headings while the chrome owns club
  identity. Supersedes the Navigation-frame section of the visual-design-tokens note. Agent
  Note at `.agents/notes/proposed/architecture/2026-08-31-career-chrome-and-date-continue-bar.md`.

- [Token adoption mechanism and migration strategy](issues/05-token-adoption-and-migration.md):
  **Tailwind 4 `@theme` (non-inline) in `index.css`** — role-named `--color-*` tokens emit custom
  properties on `:root` *and* generate utilities (which reference them via `var()`), so a future
  skin override is a scoped re-declaration, not a new foundation. Consumption via generated
  utilities plus `PANEL`/`PANEL_CHROME`/`BTN_PRIMARY`/`BTN_SECONDARY` constants (and a token-retuned
  `FOCUS_RING`) — no `Panel`/`Button` component library. Migration is **alias-first**: the 391
  `slate-*` sites repaint atomically through `--color-slate-*` alias entries with zero JSX churn,
  then shared-layer-first renames under the stable palette, deleting each alias as its last user
  renames. Guard: a `no-slate-class-name` rule in `scripts/effect-lint.ts`, live from the alias
  commit, baseline registry = the migration backlog. Supersedes the `theme.extend` + `:root`
  mechanism clause of the visual-design-tokens note (its token values stand). Agent Note at
  `.agents/notes/proposed/architecture/2026-08-31-token-adoption-and-migration.md`.

- [Match-day visual language](issues/06-match-day-visual-language.md):
  **Match day stays in the career chrome on the shared token system** — the distinct lane is the
  content region, not the shell. Only match-only element: the scoreboard surface token family.
  Stadium is a CSS-only wash (an image, when assets exist, injects under the panel-dark overlay).
  Scoreboard is the neutral chrome-band, white-score-box pattern (renders from name + score;
  `ClubSummary` has no colors). The chrome's temporal cluster shows the match readout during a
  live match and returns to season readout + Continue at full time (two verbs: career Continue is
  unavailable mid-match). Feed keeps a minute gutter + incident colors from shared status tokens;
  possession/incidents/fixture panels defer on engine data; no prototype code salvaged.
  Agent Note at
  `.agents/notes/proposed/architecture/2026-08-31-match-day-visual-language.md`.

- [Layout grammar beyond tables](issues/07-layout-grammar-beyond-tables.md):
  **Four non-table patterns** — `FIELD_INPUT`/`FIELD_SELECT` constants + a new `--color-field-bg`
  opaque token (fields stay constants, not components); `MODAL` constants + documented anatomy
  (chrome-gradient title band, strong-panel body, two sizes, uniform scrim-click) replacing the
  seven hand-copied overlay chromes, never a `<Dialog>` component; a lightweight pre-career chrome
  band with an in-band "Step N of 4" indicator replacing the floating `StepBadge` (Save List stays
  a standalone boot screen); and a text-led empty / structural-error / inline-error grammar with
  `BTN_SECONDARY` Retry. Behavior (Tab trap, Escape, focus restore) left to the focus model — this
  is the look only. Fact corrections: quit-confirm has no component (open feature ticket elsewhere)
  and match-readiness is inline, not a modal; no iconography change. Agent Note at
  `.agents/notes/proposed/architecture/2026-08-31-layout-grammar-beyond-tables.md`.

## Not yet specified

- **Skin system architecture.** CM 03/04 supported multiple skins (traditional, Ter) and
  context-sensitive backgrounds per screen. Whether the clone ships a switchable skin system or a
  single fixed theme stays deferred behind the two gates in the visual-design-tokens note (two
  distinct themes producible from one component set; a use case). What the token-adoption decision
  settled is the *foundation*: tokens are `@theme` custom properties that utilities reference via
  `var()`, so a future skin is a scoped override of those properties, cheap precisely because
  `@theme inline` was rejected. The remaining question — whether any second theme ships, and when —
  cannot be decided until a concrete second theme exists to judge; it is still fog, not a ticket.

- **Visual asset pipeline.** Club crests, screen background imagery, and stadium photography
  are load-bearing in CM 03/04's look and entirely absent here — no assets, no sourcing plan, no
  licensing position. Expect this to graduate once the panel and chrome system settles enough to
  say where an image would even go. Match day's seam is now decided in advance: when assets
  exist, a stadium image injects under the match-day panel-dark overlay per the match-day
  decision — the remaining question stays fog until an actual asset exists to judge.

## Out of scope

- **Keyboard interaction design.** Bindings, the focus model, and the Action registry are
  shipped and settled. This map decides how those interactions *look* — focus rings, sort
  indicators, active-tab treatment — never how they behave.

- **Onboarding and career-creation flow.** The sequence of screens, the league selector's
  behaviour, and the manager-creation form logic are product decisions made elsewhere. This map
  provides the visual shell those screens render in.

- **Writing the actual CSS and React components.** Plan-only: this map hands a spec to
  implementation. It does not author renderer code.

- **Game domain vocabulary in `CONTEXT.md`.** UI design language terms (panel, tab, badge,
  abbreviation) belong in the spec. `CONTEXT.md` is a pure game-domain glossary.

- **Calendar/match integration for a context-sensitive Continue.** The CM 03/04 "Go to Match"
  label switch needs per-club next-fixture data the domain does not expose (the match flow is
  calendar-decoupled; no per-club next-match query exists). That is engine work past this
  effort's destination — the ticket-04 decision fixed the label as "Continue" and recorded the
  switch as a future slot that returns only if the destination is redrawn.
