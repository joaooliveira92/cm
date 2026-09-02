# Spec: Club Selection as a two-column workspace

Status: ready-for-agent

> Assembled by the club-selection wayfinder map's ticket 08 from the resolved tickets 01–07 and
> their Agent Notes (all `Status: proposed`). Every implementation decision below carries its
> source ticket's gist; decisions whose ticket produced a note end with that note's gist-link,
> copied verbatim. Nothing in this spec is implemented yet — this is a plan for
> `/cm-to-tickets` → `/cm-implement`.

## Problem Statement

Club Selection (Step 3 of 4 · Club) does not select anything. The screen renders a static column
of club cards — each repeating name, stature tier, board objective range, squad quality band,
transfer budget, and wage budget — and no interaction. The creation flow ships a hardcoded
placeholder club id into `commitCareer`, so the career is committed with no user club: `UPDATE
clubs SET is_user_club = 1` matches zero rows and the first squad screen after creation finds
nothing owned by the manager. The commit is unreachable end-to-end. The review step (Step 4)
omits the club entirely, so the most consequential choice of the flow is invisible at review.

Club selection in this game is an implicit difficulty selection: choosing a club picks the
challenge of the whole career, and the reference experience lets a player compare clubs at a
glance before committing. The current pattern is worse than no selection — the player reads six
facts per club, can only click outside the list to proceed, and what they pick is discarded at
commit.

Three adjacent gaps frame the rework. First, the world database has no league dimension — there
is no `competitions` or `leagues` table and `clubs` carries no league foreign key — so any league
selector on this screen can only be a degenerate, single-option control driven by the shared
content constant that names the one generated League; it cannot filter yet. Second, the creation
shell's main column is a centred, `overflow-y-auto` narrow column with no height passed down, so
nothing inside it can host a full-height two-column workspace; the shell itself must become a
flex-height, full-width band for this step. Third, the Screen 11 reconciliation register
describes the current static list; changing the code without restating the register would leave a
register that lies.

## Solution

Turn Club Selection into a **two-column workspace**: a left rail carrying a league selector, the
club list, and a `Pick a team for me` action beside a right detail panel. The rail row shows
exactly three facts — club name, stature tier, and a six-segment squad-quality meter — so a
column of clubs reads comparatively. The panel greets the player with a league summary (club
count, stature-tier distribution) before any pick and, once a club is chosen, a compact squad
readout: the board expectation as prose against the league's size, labelled Transfer and Wage
Budget rows in Credits, squad size and average age as subordinate figures, and a top-five-by-
overall-rating players row. All of it rides one widened read query — no per-club fetch.

The choice is real: selecting a club writes a **world-bound selection record** on the creation
session through one intent-named API, read back through one pure helper that treats a stale
binding as no selection, so a club id that belongs to a replaced world can never reach commit.
Continue (`Next: Review`) is gated on having picked, the pick survives back-navigation, the
review step gains a `Club:` row, and `commitCareer` rejects an id matching no club with the
existing tagged error instead of silently committing a career with no owner. The league selector
is built degenerate on purpose — one named, inert, disabled option — so the workspace is complete
now and becomes real when world generation grows beyond one League. `Pick a team for me` is one
unseeded `Math.random()` over the loaded clubs, excluding the currently selected one, announced
without moving focus.

The screen commits to the project's **level-2** keyboard tier as a bespoke `role="listbox"` built
on the renderer's roving primitives: ↑/↓ and Home/End rove, Enter selects, focus order runs list
→ `Pick a team for me` → Cancel → `Next: Review`, and one polite panel announcer speaks when the
shown club changes. The Screen 11 reconciliation register is restated in the same commit that
builds the code.

## User Stories

### Workspace and shell

1. As a new-career player, I want to review clubs in a two-column workspace — a club list on the
   left and a detail panel on the right — so that I can compare clubs down a rail and focus on one
   without losing sight of the list.
2. As a player, I want only the club list region to scroll, so that the league selector and the
   `Pick a team for me` button stay fixed while I scan clubs.
3. As a player on a short window, I want the workspace to fill the available height as a real flex
   column with fixed-height chrome, rather than a literal 5%/90% split, so that rows never shrink
   below a usable size.
4. As a player, I want the workspace to live inside the existing creation shell (header, step
   label, Cancel, footer actions) with the shell widened to a full-width band for this step, so
   that the screen reads as one step of the flow, not a different app.

### The rail row

5. As a new-career player, I want each row to show the club name, its stature tier, and a
   six-segment squad-quality meter with its band label, so that I can read the whole list
   comparatively at a glance.
6. As a new-career player, I want board objective, transfer budget, and wage budget to appear in
   the detail panel only, so that rows stay scannable and the money reads once, about the club I
   am already considering.
7. As a colour-blind player, I want the selected row to be identifiable in greyscale — a selected
   fill, a left accent bar, and a selection marker — against the single focus ring, so that
   selection never depends on colour.
8. As a player, I want the selected row to keep its stature-tier badge, so that selecting a club
   never silently drops a fact from the row.

### The detail panel

9. As a new-career player, I want the panel to show a league summary — club count and
   stature-tier distribution — before I choose anything, so that the larger half of the workspace
   is honest and useful even before a decision exists.
10. As a new-career player, I want no club to be auto-selected on load, so that the panel does not
    assert a choice I never made.
11. As a player, I want the chosen club's panel to show, from data that is already loaded: the
    board expectation as prose against the league's size, labelled Transfer Budget and Wage Budget
    rows in Credits, squad size and average age as subordinate figures, and the top five players
    by overall rating with name and Position, so that I can judge the job before committing.
12. As a player, I want the detail block to appear the instant a club is focused or picked, with
    no second fetch and no loading flash, so that scanning clubs is continuous.

### The league selector

13. As a new-career player, I want the league selector to show the single League a career is
    generated in, by name, so that the workspace shape is complete even though a second League
    does not exist yet.
14. As a screen-reader player, I want the single-option league control rendered as a disabled
    native select with an explanation of why it is disabled, so that it is never announced as a
    changeable control that does nothing.

### Pick a team for me

15. As a player who wants help choosing, I want `Pick a team for me` to select a uniformly random
    club from the loaded list, excluding the one already selected, so that re-pressing always
    changes the suggestion.
16. As a player, I want the pick to select-and-stay, so that I can inspect the suggestion and press
    Continue myself rather than being walked forward.
17. As a screen-reader or keyboard player, I want the picked club announced without focus leaving
    the button, so that the changing panel is spoken and I keep my place.
18. As a player, I want the assist to be a subdued button below the list, disabled while the list
    is loading or failed, so that it can never pick over zero rows.

### Selection and commit

19. As a player, I want my chosen club to survive stepping back to the Manager step and forward
    again, so that back-navigation never loses my decision.
20. As a player, I want `Next: Review` disabled with a stated reason ("Choose a club to continue.")
    until a club is picked, so that the flow never advances past the decision this screen exists
    to collect.
21. As a player, I want the club I chose to be the club the career starts at, replacing the
    hardcoded placeholder, so that the career I commit to is at the club I actually picked.
22. As a player, I want the review step to show a `Club:` row with the chosen club's name, so that
    the review is complete before I commit.
23. As a player, if the club I chose no longer exists at commit time, I want the flow to fail with
    a clear message ("That club is no longer available. Choose another.") rather than silently
    commit a career with no club.

### Loading and failure

24. As a player, I want the rail and the panel to load independently — skeleton rows in the rail,
    the panel shell throughout — so that a slow read does not blank the whole screen.
25. As a player, I want a load failure rendered inline in the rail with the selector and chrome
    left in place, so that retrying does not feel like navigating to a different screen.

### Keyboard and accessibility

26. As a keyboard player, I want the club list rovable with ↑/↓ and Home/End and selectable on
    Enter, with Space toggling, so that the whole screen is operable without a pointer.
27. As a keyboard player, I want Tab order to run club list → `Pick a team for me` → Cancel →
    `Next: Review`, skipping the disabled league selector, so that focus follows the task and never
    gets trapped.
28. As a screen-reader player, I want the listbox rows to expose `aria-selected`, so that my
    current selection is always spoken.
29. As a screen-reader player, I want the panel to announce a change in what it shows through one
    polite live region — and nothing on plain arrow navigation — so that I am told when the panel
    content changes without a narration barrage.

### Standards and handoff

30. As a spec maintainer, I want the Screen 11 reconciliation register restated in the same commit
    as the implementing code, so that the register never describes a screen that no longer exists.
31. As an implementer, I want the selection state owned by one parent and passed to the rail and
    panel as props, so that both regions stay testable against a fixed selection.

## Implementation Decisions

- **The screen becomes a two-column workspace with a left rail and right panel.** The row carries
  exactly name, stature tier, and a six-segment squad-quality meter; the panel shows a league
  summary until a club is picked, then the compact squad readout; the rail loads and fails
  independently of the panel; selection reads redundantly (selected fill, left accent bar, and a
  marker in the row's badge slot) against the single focus ring, and the selected row keeps its
  stature-tier badge. One parent owns the selection state; rail and panel are sibling children
  taking props — no context, no compound component. **Making this work requires the creation shell
  to become a flex-height, full-width band for this step** (today its main is a centred
  `max-w-5xl` `overflow-y-auto` column with no height from `RouteView`); that is a shared-layout
  change in the shell, not a workaround inside the club screen — the prototype's viewport-calc
  and negative-margin breakout is explicitly not shippable. The rail row carries name, stature tier and a squad-quality meter; the panel shows a league summary until a club is picked, with no auto-selection and no empty state; the rail loads and fails independently of the panel; selection is redundantly coded (fill, accent bar, badge) against the single focus ring. Recorded as [Agent Note: The Club Selection two-column workspace](../../.agents/notes/proposed/architecture/2026-09-01-club-selection-workspace-shape.md).

- **The chosen club lives on the creation session as a record bound to the world it was picked
  from**, written through one intent-named API and read through one pure helper. The record is
  `{ clubId, clubName, provisionalId } | null`; `null` is both first paint (no auto-selection) and
  the state a world swap produces. A new `selectClub(clubId, clubName)` on the session API writes
  both halves (no-oping outside a `Ready` generation), and a `selectedClubOf(session)` helper next
  to `provisionalIdOf` returns `null` on a binding mismatch and never writes the stale record back.
  Continue (`Next: Review`) is disabled with an `aria-describedby` reason line "Choose a club to
  continue." until a pick exists; the selection survives back-navigation with no mechanism of its
  own; `commitCareer`'s error union grows `ClubNotFoundError` (alongside
  `InvalidPillarDistributionError`) so an id matching no club fails inside the transaction and
  rolls back, with the existing `ClubNotFoundError` reused rather than a new class invented; and
  `ReviewPane` gains a `Club:` row showing the club's name. The selection is a record bound to the world it was picked from — `{ clubId, clubName, provisionalId }` or `null` — written only through a new `selectClub` on `CreateSessionApi` and read only through a `selectedClubOf` helper that returns `null` on a binding mismatch, so a stale id cannot reach `commitCareer`. Continue is gated on a pick with a stated reason; the pick survives back-navigation; `commitCareer` rejects an unknown id with the existing `ClubNotFoundError`; `ReviewPane` gains a club row. Recorded as [Agent Note: The club selection is bound to the world it was picked from](../../.agents/notes/proposed/architecture/2026-09-01-club-selection-bound-to-its-world.md).

- **The detail panel is a compact squad readout over one widened payload, with a shared credits
  formatter.** The panel shows board expectation restated as prose from the shared
  `BOARD_OBJECTIVE_BANDS` band (never the raw min–max pair, never clusters of invented copy),
  labelled **Transfer Budget** and **Wage Budget** rows in Credits through a new shared
  `formatCredits` helper (replacing the inline `$`/`toFixed(0)` leftover; TransfersScreen's local
  copy stays until that screen is touched), squad size and average age as subordinate figures, and
  a top-five-by-`overallRating` players row (name + strongest Position). The read query widens so
  every club ships its detail up front — squads are already loaded server-side to compute Squad
  Quality, so the cost is transfer, not computation — with **no per-club RPC**; the per-club-RPC
  split is the recorded trigger for the multi-league effort, not this one. No raw player views
  cross the boundary, and no facilities or prior-season values appear (the schema has neither).
  The panel is a compact squad readout — board expectation as prose from the shared constant, labeled Transfer/Wage Budget rows in Credits, squad size + average age (subordinate), and a top-five-by-`overallRating` players row — shipped in one widened `ClubSelectionView` payload (no per-club RPC), with a shared `formatCredits` replacing the inline `$`. Recorded as [Agent Note: The club detail panel is a compact squad readout over one payload](../../.agents/notes/proposed/architecture/2026-09-01-club-detail-contract.md).

- **The league selector is built degenerate: one named, inert, disabled option.** The single option
  names the one generated League via a new shared `LEAGUE_NAME` content constant beside
  `LEAGUE_CLUBS` — never the session snapshot, which records un-honoured intent — and selecting it
  does nothing because every generated club belongs to that one League. `ClubSelectionRow` gains
  no league field now: the field would answer identically on every row and would pre-decide the
  league-identity scheme world generation owns; retrofit is the multi-league effort's contained
  trigger. The control renders as a **disabled native `<select>`** with a persistent label and
  `aria-describedby` helper text explaining why it is disabled — never an enabled single-option
  trap. The architecture is correct in shape and flips to real when a second League exists. The selector is built degenerate — the single option names the one generated League from a new shared `LEAGUE_NAME` constant (not the session snapshot, which records un-honoured intent); selecting it is inert chrome while the world holds one League; `ClubSelectionRow` gains no league field now (league identity's scheme belongs to the multi-league effort); and it renders as a disabled native `<select>` with a stated reason, never the enabled single-option trap. Recorded as [Agent Note: The league selector sources a named, inert, single-option control](../../.agents/notes/proposed/architecture/2026-09-01-league-selector-options-source.md).

- **`Pick a team for me` is an unseeded, exclusion-rolled assist.** One press of `Math.random()`
  over the loaded clubs (every club, not a league — the selector does not filter), excluding the
  currently selected one, so a press is always observable; re-pressing re-rolls. It is deliberately
  **not** seeded from the world: the suggestion is never persisted, the world seed never reaches the
  renderer, and nothing downstream reads the suggestion. It **selects-and-stays** — the user still
  presses Continue. Focus stays on the button; the picked club is announced through an `aria-live`
  region ("Picked X. The panel shows X."). It renders as a subdued button below the list, disabled
  while the list is loading or failed. The pick is one press of `Math.random()` over the loaded clubs, excluding the currently selected one — unseeded (the world seed never reaches the renderer, and the suggestion isn't persisted), every club, not a league; focus stays on the button with the result announced through an `aria-live` region; a subdued button below the list, disabled while the list is empty. Recorded as [Agent Note: `Pick a team for me` is an unseeded, exclusion-rolled assist](../../.agents/notes/proposed/architecture/2026-09-01-pick-a-team-for-me-semantics.md). The row-reading and panel-live-region half lands in ticket 06.

- **Club Selection lands at keyboard tier level 2 as a bespoke `role="listbox"`, not a
  `DataTable`.** The club list is a listbox with roving focus built on the renderer's existing
  roving primitives (not `aria-activedescendant`, not TanStack `DataTable` — no headers, columns,
  or sorting exist to justify it): rows are `role="option"` with `aria-selected`, ↑/↓ rove and
  Home/End jump, Enter selects the focused row, Space toggles (focus ≠ selection), Tab moves in
  and out. Focus order is club list → `Pick a team for me` → Cancel → `Next: Review`; the disabled
  league selector is skipped. The detail panel carries exactly one polite live region announcing a
  change in the shown club on pick, deduplicated, never narrating plain arrow navigation. There is
  **no key binding** for the assist and **no Clear Selection** this effort (both recorded as
  deliberate reconciliation deviations; roving-and-Enter *is* clear-and-replace). The
  screen-keyboard-tiers table row for Club Selection is updated from 1 to 2. The screen is level 2 — a bespoke `role="listbox"` on the renderer's roving primitives (not `DataTable`, not `aria-activedescendant`), Enter selects, ↑/↓ Home/End rove, focus order list → `Pick a team for me` → Cancel → `Next: Review`; one polite panel announcer on show-change; no key binding for the assist and no Clear Selection (both reconciliation deviations). Recorded as [Agent Note: Club Selection is a level-2 listbox, not a DataTable](../../.agents/notes/proposed/architecture/2026-09-01-club-selection-keyboard-tier-and-listbox.md). The screen-keyboard-tiers table row updates from 1 to 2.

- **The Screen 11 reconciliation register edit ships with the implementing code, in the same
  commit, as a normative instruction from this spec.** The restatement itself is settled by ticket
  07 and transcribes it exactly: the `# Screen 11: Club Selection` status block is appended with a
  re-audit note, the second audit table (from the row beginning `§4 Page header, §5 Mode selector`
  through the trailing no-selection-affordance paragraph) is replaced with a fully restated
  table — mode selector / availability / eligibility, search-and-filter, and facilities / staff /
  performance rows ruled deliberate `out-of-scope` deviations with reasons; keyboard and
  state-model rows restated at level 2 and world-bound; pagination/virtualization and autosave
  `deferred`/`unscheduled`; and the stale `temp-club-id` paragraph replaced with the wired-selection
  state. Screen 12's trailing paragraph asserting the unreachable commit is updated to match. The
  register must never describe a screen that no longer exists. (Scoping + transcription of the six
  decisions above: no Agent Note.)

## Testing Decisions

**What makes a good test here: assert observable behavior and rendered semantics, never
implementation.** Which rows render and what they carry, what intent a control fires (and against
which stable id), whether Continue is enabled and why, how the selection binding reads after a
world swap, that `commitCareer` fails on an unknown club id and leaves the save undiscoverable,
the listbox's `role`/`aria-selected`/focus order, and the panel announcement on pick. Atom wiring,
hook internals, and component-local state are the mechanism, not the contract.

- **Seam 1 — the whole screen over the shipped main-process service (the primary seam).** Render
  the Club Selection screen on top of the real `getClubSelection` query with a mocked Electron
  transport that round-trips `JSON`, the same seam as the existing league-selection-screen test.
  Cover: rows render name, stature tier, and the meter (and no budget/objective in the rail);
  focusing/picking a row fills the panel from the already-fetched payload with no second method
  call; `Pick a team for me` selects a club other than the current one and announces it without
  moving focus; the subset the screen needs derives from the widened payload correctly.

- **Seam 2 — the full creation flow over a memory router.** Mount the whole flow (header, footer
  actions, session context) the way the create-flow-generation test mounts it, riding real
  main-process handlers. Cover: `Next: Review` disabled with the stated reason until a pick and
  enabled after; the pick survives Step 3 → Step 2 (Back) → Step 3; `ReviewPane` shows the chosen
  club's name; `commitCareer` with a stale/unknown club id fails with `ClubNotFoundError` and
  leaves the save not discoverable; no `temp-club-id` placeholder survives anywhere in the flow.
  The session-field binding is asserted directly through the helper against a swapped generation
  state, not merely through the UI.

- **Seam 3 — the pure helpers in the shared package and renderer/create.** Unit-test
  `selectedClubOf`'s binding mismatch (null on a different `provisionalId`), the board-expectation
  prose derived from `BOARD_OBJECTIVE_BANDS`, the top-five squad readout computation, and the
  `formatCredits` convention. Prior art: the existing pure resolver tests in `packages/shared` and
  the contracts round-trip test — deterministic fixtures, no dependence on time or a real database.

- **Seam 4 — keyboard and screen-reader behavior through rendered semantics.** Using the roving and
  accessibility-assertion patterns already in the repo's keyboard/table tests: listbox `role`,
  `aria-selected` toggling, ↑/↓ roving, Enter selection, the Tab order reaching exactly the four
  stops, and the single polite panel announcer firing only when the shown club changes.

- **Seam 5 — one end-to-end flow over the critical path.** Extend the existing creation journey
  e2e (the shared launch/seed harness): pick a club, Continue, verify the Review `Club:` row,
  Create Career, and assert arrival in the career with the chosen club as the user club. Once
  Playwright lands on the list, also assert the pick button's keyboard reachability. The visual
  shape of the workspace has no screenshot harness in this repo and this spec does not invent one;
  the two-column look is confirmed by a human pass with `pnpm check:all` green throughout.

## Out of Scope

- **Multi-league world generation** — materializing the League Selection Snapshot into more than
  the fixed 20-club League is world generation's subject, per the recorded generation boundary.
  This effort builds the selector that will consume it. Includes **the changing-league-scope-after-
  generation lifecycle** (re-scoping Step 1 after a world exists silently keeps the first world; the
  regeneration/abandon decisions belong to the generation effort that honours the snapshot), tracked
  and closed on the club-selection map as ticket 09.
- **Search and filter over the club list**, per the imported Screen 11 spec.
- **The eligibility model** — availability states (eligible / unavailable / occupied / restricted /
  unsuitable), manager reputation, qualifications, nationality, and language gating.
- **The Clubs / National Teams / Unemployed mode selector**, and starting a career unemployed.
- **A manager-to-club fit model.** `Pick a team for me` is uniform random; weighting a
  recommendation by Pillars or Archetype needs a fit model that does not exist.
- **A facilities readout, staff summary, recent performance, or full club profile** — the schema
  has no facilities data, and the other surfaces are beyond this effort.
- **Club list virtualization.** Twenty rows render eagerly; the threshold and the shared
  `renderer/table/` host choice are reserved for whenever multi-league generation grows the list.
- **Alignment with the visual-design-language effort.** Whether this screen adopts that map's
  create-career chrome band and surface-field tokens directly, or needs its own workspace grammar,
  is that effort's decision, not this one.

## Further Notes

- **This is a plan, not an implementation.** Every decision above is sourced from resolved
  wayfinder tickets and proposed Agent Notes; the notes are promoted to `implemented/` in the same
  commit that ships their code. The workspace shape's variant set (of which variant D won) lives on
  the throwaway branch `prototype/club-selection-workspace`, deleted from the main line.
- **The league selector is honest about the world, not about future intent.** Its single option
  names the one generated League (shared `LEAGUE_NAME` content); it does not read the session
  snapshot, and nothing re-enables or re-sources it until the multi-league world-generation effort
  wires real attribution in the same change that re-enables it.
- **The detail payload is "as of first load".** The widened read query is a snapshot of the
  provisional world at selection time, correct because selection happens once against a world that
  cannot change until commit. It must not be mistaken for a live read model when a squad-changing
  system (transfers, simulation) later exists.
- **Two homes, one fact for the tier.** The screen-keyboard-tiers table states Club Selection's
  level-2 tier; the keyboard Agent Note cross-links it. A future re-tiering must update the table.
- **The reconciliation register restatement is normative.** The exact replacement table and the
  Screen 12 paragraph are settled in ticket 07 and land with the code, not before, so the register
  never describes the old screen as shipped or the new one as built.
- **Read this spec's scope against the map.** The club-selection map records what this effort
  consciously rules out. A later effort (world generation, visual design language) that touches
  items in Out of Scope reopens them there, as a fresh effort, not as an amendment to this one.