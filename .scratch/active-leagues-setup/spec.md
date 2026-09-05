# Spec: Active Leagues Setup (reworked League & Nation step)

Status: ready-for-agent

> Synthesized by `cm-to-spec` from the conversation and the implementation brief at
> `.scratch/active-leagues-setup/brief.md`. No wayfinder map or tickets were run:
> every decision below was reached by direct interview (Q1–Q10) and approved wholesale. There are no
> resolved tickets and no proposed Agent Notes, so Implementation Decisions are stated in plain prose
> with no links by design.

## Problem Statement

Starting a new career's league selection is a slow, drill-down tree browser, not a
configuration workspace. A manager assembling a career should be able to see which leagues are active
and at what simulation depth in a dense table, change them quickly, and watch the cost of the choice
land immediately in a persistent panel — the management-game density of the reference experience.
The current League & Nation screen is a territory picker: it works, but it does not read as setting
up a campaign.

The reference screen cannot be lifted onto this repo as-is. The implementation brief presumes a
calendar-bearing game and several inputs that have no ground truth here: the game has no start date
(the Calendar advances by Matchdays, not calendar dates), world generation does not yet read the
selected scope (a career still generates the fixed 20-club League), there is no staff or editor
system, and the club is not chosen until a later step — so a "currently selected team" chip and
club-grounded recommendations would have nothing to say. The brief is also finer-grained than the
current model: its grid is one row per league with its own simulation depth, while the shipped domain
deliberately lets a player pick a Nation-wide scope option rather than assemble a competition graph by
hand. A spec that copies the brief literally would fabricate inputs or reinstate the graph assembly
the domain was built to prevent. The real problem is reconciling the brief's dense consequence-driven
interaction with this repo's actual domain, so the screen ships native to this game.

## Solution

Rework create-flow step 1 into an **Active Leagues** setup screen that replaces the League & Nation
tree as the primary surface while producing exactly the same `LeagueSelectionSnapshot` the rest of the
flow depends on. The screen presents a wide, compact configuration workspace — one dense row per
active league (identifier, simulation depth, recommendation, remove) above the workspace actions
(setup preset / manage leagues) and a collapsible advanced-options section below a separator — and a
narrow, persistent consequence sidebar that only ever reads derived state: the entity count implied by
the configuration, a CM Clone-native performance estimate, warnings, and validation. Cancel and
Continue sit isolated at the bottom-right, and Continue lands the player on Step 2 · Manager as today.

The rework keeps the existing Nation + League Scope Option safety rail. Per-league depth is a new
CM Clone domain term, expressed through what each Nation's supported scope options allow; dependencies
still resolve server-side and required competitions stay capped at `background`. Inputs the domain
cannot ground — a start date, a database-preset selector, a team chip, club-based recommendations —
are deliberately out of scope and replaced by honest domain-native content, so every control on the
screen changes something real. The retained tree browser stays reachable as the "Manage leagues"
action for the full-pyramid work the grid cannot express. Nothing downstream of step 1 changes: the
four-stage flow, generation gating on the snapshot, and the Review handoff all behave as they do
today.

## User Stories

### Choosing the scope

1. As a new-career player, I want to start league selection on an Active Leagues setup screen rather
   than a territory tree, so that I configure the campaign the way I would assemble a calendar.
2. As a player, I want one row per active league or competition carrying its emblem, name, and scope
   description, so that I can see every league I am taking in at a glance.
3. As a player, I want to add a league to the active list from the available catalogue, so that a
   league I want can enter the career without a separate screen.
4. As a player, I want to remove a league from the active list with an icon-only button that names the
   league, so that pruning the scope is one compact action and never a blind click.
5. As a player, I want to change one league's simulation depth without touching its neighbours, so
   that I tune each competition individually.
6. As a player, I want depth to read as three CM Clone-native values, not the reference game's
   labels, so that the screen speaks this game's own vocabulary.
7. As a player, I want to see a league's effective depth even where dependency rules fix it, so that
   I never believe I am managing a parent division the game only simulates.
8. As a player, I want duplicate league selections to be impossible, so that the list never shows the
   same competition twice.
9. As a player, I want each league row to keep a stable identity across add, remove, and reorders,
   so that my edits never silently jump rows.
10. As a player, I want a one-action setup preset that configures the whole scope, so that I can start
    from a sensible whole rather than twenty individual choices.
11. As a player, I want a "Manage leagues" action opening the fuller scope workflow, so that the
    pyramid-level work the grid cannot express is still available without leaving the flow.

### Consequences in the sidebar

12. As a player, I want a persistent sidebar that reflects only my actual configuration, so that what
    I see there is always true of what I just set.
13. As a player, I want the loaded entity count derived from active leagues and their depth, never a
    hardcoded total, so that the number moves with my edits.
14. As a player, I want the performance consequence shown as a CM Clone-native meter, not reference
    star rating, so that the estimate matches the game's own visual language.
15. As a player, I want performance copy that says what it means — this configuration causes longer
    processing intervals — and never claims hardware benchmarking no code performs.
16. As a player, I want the sidebar to surface a warning when the setup is unusually expensive, so
    that I can back off before committing.
17. As a player, I want validation status visible in the sidebar, so that I always know whether
    Continue is allowed and, when it is not, which part is missing.
18. As a player, I want the sidebar's pinned bottom slot to say what happens next (the selection is
    recorded, world generation follows), so that the consequence panel reads as a complete statement.

### Advanced options

19. As a player, I want the uncommon settings below a separator, collapsed by default, so that the
    primary configuration stays uncluttered.
20. As a player, I want every advanced option to change something real — feeding the estimate or a
    shipped system — so that no checkbox lies to me.
21. As a player, I want the shipped options to cover match simulation detail, transfer-market
    activity, roster-generation detail, and information visibility, so that the settings tune systems
    this game actually has.
22. As a player, I want each option's help control to be keyboard-reachable independently of its
    checkbox, so that I can look something up without changing the setting.
23. As a player, I want a growing option list to split into labelled groups, so that a long checklist
    never becomes an undifferentiated wall.

### Recommendations

24. As a player, I want each recommendation to name a real, traceable reason — Argentina's nation,
    a linked nation, a dependency relationship, or preset membership — so that I can trust the
    suggestion.
25. As a player, I want each recommendation to carry icon and visible text, so that the category is
    never communicated by icon alone.
26. As a player, I want no "recommended for your club" reading at this stage, because the club is not
    chosen yet and the screen must not pretend it knows what I would want for a club I have not
    picked.

### Inputs the domain cannot ground

27. As a player, I want no start-date picker that selects nothing, so that no dead control sits in
    the sidebar.
28. As a player, I want no database-preset selector that scales nothing, so that the entity count I
    am shown is honestly derived rather than set by a lever with no engine behind it.
29. As a player, I want no "currently selected team" chip where no team exists, so that the
    introduction never presents a choice I cannot change.

### Flow and handoff

30. As a player, I want Continue to record the same snapshot the current step records and land me on
    Step 2 · Manager, so that nothing downstream of this screen changes.
31. As a player, I want Cancel to return me to the Main Menu, so that abandoning setup is one clear
    step.
32. As a player, I want my in-progress configuration remembered across navigation and app restarts,
    so that a partial setup is not lost the moment I leave the screen.
33. As a player, I want the Review step still summarizing the scope this screen produced, so that the
    handoff stays consistent.

### Density and layout

34. As a player, I want the full viewport given to a wide workspace and a narrow sidebar, so that
    many leagues display at once in the management-game style.
35. As a player, I want rows at 30–34px with tight gaps, so that the screen reads dense, not airy.
36. As a player, I want advanced options to stay visually secondary, so that I can ignore them until
    I need them.
37. As a player, I want the final actions isolated at the bottom-right, so that the commitment point
    is always obvious.
38. As a player, I want only the league-list region to scroll when it overflows, so that the sidebar,
    actions, and footer never leave view.
39. As a player, I want the screen to tolerate resized windows — at narrow widths the sidebar flows
    into the main column and rows fold to two lines — without shrinking any control until it is
    unreadable.

### Keyboard, accessibility, and motion

40. As a keyboard-only player, I want every control reachable by keyboard with focus order following
    visual order, so that the whole screen is operable without a pointer.
41. As a keyboard player, I want selector triggers to expose their expanded and controlled states, so
    that I never lose track of what a trigger governs.
42. As a keyboard player, I want the remove buttons to say which league they remove, so that pruning
    is never blind.
43. As a keyboard player, I want focus after removing a league to move to the next row's equivalent
    control, else the previous row's, else the Manage leagues action, so that I never land nowhere.
44. As a screen-reader player, I want performance changes announced through a polite live region, so
    that the consequence panel speaks when it changes.
45. As a screen-reader player, I want validation failures connected to the control they concern, so
    that I can find and fix what blocks Continue.
46. As a player who prefers reduced motion, I want layout transitions restrained and reduced-motion
    aware, so that nothing animates big or springy against my preference.
47. As a player, I want long labels to truncate with a tooltip, and tooltips never to be the only
    home of anything essential, so that dense rows stay legible without hiding facts.

### Implementer and quality

48. As an implementer, I want domain calculations — depth validity, costing, entity counts,
    recommendations, incompatibility rules — in the domain layer rather than components, so that they
    are shared, tested, and auditable.
49. As an implementer, I want the renderer to import no Electron or Node API and every RPC payload
    validated at the boundary with the main process revalidating everything, so that renderer input
    stays untrusted.
50. As an implementer, I want an end-to-end Playwright flow over the critical setup path plus unit
    coverage of costing, duplication, presets, and incompatibilities, so that the gate pipeline
    protects the screen's observable behavior.

## Implementation Decisions

- **Step 1 is replaced, not extended.** Active Leagues setup becomes create-flow step 1, retiring the
  League & Nation tree as the primary surface; the four-stage flow (Leagues · Manager · Club ·
  Review), its step gating, and the `LeagueSelectionSnapshot` handoff are unchanged. The step
  indicator keeps its current label; the screen's own heading is "Active Leagues". Continue records
  the same snapshot and navigates to Step 2 · Manager. Retirement is a decided outcome of this effort,
  not an accident of the rewrite.

- **Per-competition grain rides the Nation + scope-option safety rail.** The grid's rows are
  competitions, but the authoritative model stays the existing per-Nation Selection Intent — a
  Simulation Mode and a League Scope Option. A league row's depth selects between what its Nation's
  supported scope options express, and a true per-competition override lands only where the model can
  express it. Dependency closure still runs server-side and every required competition stays capped
  at `background`; where the grid cannot change a league's effective mode it shows the effective mode
  rather than fabricating an override. No free-form competition-graph assembly is reintroduced.

- **Simulation Depth is a new domain term.** Introduce `SimulationDepth` as the per-competition detail
  tier with three CM Clone-native values mapping onto the existing mode ladder — full (as
  `playable`), standard (as `background`), results-only (as `view_only`) — while `SimulationMode`
  keeps its per-Nation meaning including `not_loaded` for the leagues a row removal takes out of the
  career. The two are distinct grains, not synonyms, and both become glossary entries so the 
  distinction outlives this screen.

- **This effort ships a spec, not a prototype.** The brief plus the approved selection-model decision
  pin the interaction; the map resolves what the brief leaves open and no prototype ticket is run.

- **Start date is out of scope.** The Calendar advances by Matchday, not by calendar date, so a
  start-date selector would either be fake or force a calendar rewrite. The sidebar's pinned bottom
  slot carries the setup's validation status plus a one-line statement of what happens next (Continue
  records the snapshot; world generation follows behind the Manager step). A start-date dimension
  returns only as part of the effort that redraws the Calendar.

- **Database preset is out of scope as an input.** World generation does not yet read the selected
  scope — it still generates the fixed 20-club League — so a database-density selector would scale
  nothing. The sidebar shows the entity count derived from active leagues and their depth, never a
  hardcoded total and never an input that lies. An explicit database preset returns only when world
  generation materializes the snapshot.

- **Club identity and club-grounded recommendations do not exist at this step.** The club is chosen at
  the Club step, after this screen, so the brief's "currently selected team" slot and its
  "recommended for the selected club" reason have no referent here. The introduction's anchor becomes
  the current scope selection (an active-league summary) with an inline change action that opens
  Manage leagues, and the recommendation resolver never emits a club-grounded reason.

- **Advanced options ship only where a real system exists.** Four categories land: match-simulation
  detail, transfer-market activity, roster-generation detail, and information visibility — each tunes
  a shipped system and feeds the estimate (or a real information policy), so a checkbox cannot change
  nothing. Staff generation and editor/developer capabilities are out of scope because no such system
  exists in v1, and they stay recorded as future slots. The section splits into labelled groups once
  the list outgrows a plain checklist.

- **Recommendations derive from authoritative game data.** A shared resolver produces each league's
  recommendation reason from data the simulation actually reads: Nation Profile recruitment links,
  dependency relationships, scope and tier structure, and preset membership. Every reason carries
  icon and visible text — icon alone is banned — and copy stays under Mechanical Provenance.

- **The tree is retained as Manage leagues.** The grid is the primary surface; the existing League &
  Nation tree remains reachable through the workspace's Manage leagues action for the full-pyramid and
  scope work the grid cannot express. Two presentations over one intent model, so no second state
  exists to drift.

- **One authoritative setup state; everything else is derived.** A single setup state carries the
  active leagues (each with a stable league id and depth), the scope-level intents, and the advanced
  options. Derived atoms compute active-league count, estimated entity count, the processing-cost
  meter and label and warning, recommendation reasons, validation status, and whether Continue is
  allowed — none of them written into authoritative state. No `useEffect`-driven copying of calculated
  numbers into state; derived atoms or pure selectors instead, so a summary can never go stale.

- **Interactions as typed intents; operations as explicit lifecycles.** UI emits
  `changeSimulationDepth({ leagueId, simulationDepth })`, `addActiveLeague`,
  `removeActiveLeague`, `applySetupPreset`, `changeAdvancedOption`, and the rest — never arbitrary
  path mutation. Saving and campaign creation are operations modeled as Idle / Pending / Success /
  Failure, never scattered booleans. The domain owns depth validity, duplicate prevention, the at
  least one active league rule, costing, entity count, recommendations, and advanced-option
  incompatibilities; the application layer owns the use case list and the draft plumbing.

- **The RPC seam is reused, not widened.** No new Electron preload namespace: setup goes over the
  existing typed call seam covering catalogue lookup, resolution, submission, snapshot, draft, and
  presets, extended only where the grid needs a method the seam lacks. The renderer never imports
  Electron or Node APIs; every request and response validates at the boundary; the main process
  revalidates every command, treating renderer input as untrusted.

- **Draft persistence follows the standing rules.** The draft saves machine-local, fingerprint-bound,
  debounced at the application boundary, with stale saves cancelled, the latest successful state
  identifiable, and pending work flushed or cancelled on deterministic screen disposal; the draft
  carries the versioned shape the scope model needs.

- **Density and layout from the brief.** Full-viewport grid with a flexible workspace and a sidebar
  clamped between 18 and 22rem; column flex so the list region is the only thing that scrolls; rows
  at 30–34px with 8px column and 3–4px row gaps and 10–12px control padding; the remove target never
  smaller than 30×30px. League rows read as a dense repeated structure, never as spacious cards, and
  repeated grid definitions are extracted rather than restated as arbitrary values.

- **TanStack Table for identity and rendering, not state ownership.** The table supplies column
  definitions, row-model generation, consistent rendering, and stable row identity keyed by league id —
  never the array index — while authoritative configuration state stays in the setup state model.
  Body cells render on CSS Grid; future sorting and grouping remain available without a refactor.

- **Behavior contract on the list.** Add, remove, depth change, preset apply, and Manage leagues all
  work; duplicates are prevented; derived estimates recompute after each relevant change. Motion is
  used only for a restrained layout transition on add and remove, honoring reduced motion and never
  large entrances or spring-heavy movement.

- **Workspace actions and the advanced disclosure.** Setup preset on the left and Manage leagues on the
  right sit below the list with `margin-top: auto`, visually subordinate to the final action, and
  never in the table header. Advanced options live below a full-width separator in a collapsible
  disclosure with `aria-expanded` and `aria-controls`, a two-column option grid, Base UI checkbox
  primitives, independently keyboard-accessible help controls, and 28–32px option rows.

- **Sidebar contract.** A persistence consequence panel, never a second form: the derived entity-count
  readout, the processing-cost meter in a CM Clone-native form (a five-segment bar or equivalent)
  with a human-readable label, a concise explanation, and an expensive-setup warning phrased as longer
  processing intervals — never a hardware capability claim — then a flexible spacer and the pinned
  validation-and-next-step slot at the bottom.

- **Footer.** Cancel and Continue, right-aligned, with the primary action labelled as the next actual
  step (Continue) and showing the pending state while creating. Duplicate submission is prevented,
  controls that would invalidate a running command are disabled, an `AbortSignal` flows into the
  application operation where cancellation is supported, an actionable state is restored on failure,
  and errors read understandably with no stack trace or database detail.

- **Accessibility contract.** Every control is keyboard-reachable with focus order following visual
  order; triggers expose expanded and controlled state; remove buttons name the league; every
  recommendation has visible text; performance changes are announced through a polite live region;
  validation failures connect to their control; the advanced trigger exposes expansion; tooltips never
  hold essential information; icon-only buttons have accessible names; reduced motion is honored; and
  post-removal focus moves next row, else previous row, else Manage leagues.

- **Responsive behavior.** At 1280px and above the workspace and sidebar stay side by side with all
  columns visible and two-column advanced options. Between 960 and 1279px the sidebar persists,
  recommendation labels truncate, nonessential padding gives way, and the remove button never
  overlaps content. Below 960px the sidebar summary flows into the main column after the league list
  and before the advanced section, the footer becomes sticky, and each league row folds to two lines —
  with desktop controls never shrinking to the point of unreadability.

- **Renderer organization and layer discipline.** The route component loads initial data, handles
  navigation, and wires intents to application actions before rendering the screen; the screen
  composes the introduction, workspace, sidebar, and footer; presentational components never call IPC;
  and domain calculations live in the domain layer no matter how small they first appear.

## Testing Decisions

**What makes a good test here: assert observable behavior, never implementation.** Utility class
strings, atom wiring, and reducer internals are the mechanism, not the contract — tests assert
rendered semantics: which leagues render, what intent firing a control emits (and against which
stable id), whether a disclosure expands, whether derived figures move after a configuration change,
whether Continue is enabled, and what the failure state presents.

**Seam 1 — the whole screen over the shipped trusted service (the primary seam).** Render the complete
Active Leagues screen on top of the real domain-service behavior with a mocked Electron transport that
round-trips JSON, the same seam the existing league-selection screen test uses. Cover: all configured
leagues render; changing a depth emits the correct intent targeting the correct stable league id;
removal targets the correct id; the advanced section expands and collapses; derived summary values
update after a configuration change; keyboard navigation reaches every control; icon-only actions carry
accessible names; Continue is disabled when validation fails; and campaign creation failure presents
the failure state. Prior art: the existing league-selection-screen test, which renders the shipped
screen against the shipped service over a mocked IPC channel with JSON round-trip.

**Seam 2 — the pure domain in the shared package.** Unit-test depth validity, duplicate prevention, the
at-least-one-active-league rule, preset application, entity-count estimation, processing-cost
estimation, recommendation resolution, advanced-option incompatibilities, and the empty-invalid setup.
Prior art: the existing pure resolver/estimator tests in `packages/shared` and the contracts
round-trip test — deterministic fixtures, no dependence on current time, random ids, or a real
database without a controlled adapter.

**Seam 3 — one Playwright flow over the critical setup path.** Launch the built app, open a new career,
add a league, change its simulation depth, apply a preset, toggle a real advanced option, verify the
performance estimate and entity count change, verify a valid setup, Continue, and assert navigation to
Step 2 · Manager. The terminal assertion is navigation to the next step, not world creation: generation
runs behind the Manager step, so "campaign creation" has no single-step surface on this screen. Role-
based selectors only; the temp `--user-data-dir` fixture and the existing launch/seed harness provide
the environment. Prior art: the existing e2e specs and the shared launch harness.

The dense visual look has no screenshot harness in this repo and this spec does not invent one; density
and consequence-feedback are confirmed by a human pass at the responsive breakpoints, with
`pnpm check:all` green throughout.

## Out of Scope

- **Start date and the GameStartDateSelector**: the Calendar has no dates; the pinned sidebar slot is
  filled by validation and next-step copy instead. A date dimension belongs to the Calendar redraw.
- **Database preset as an input and the DatabaseSizeSelector**: world generation does not read the
  scope yet, so the lever would scale nothing; the entity count is shown derived. Returns when world
  generation materializes the snapshot.
- **A "currently selected team" chip and club-grounded recommendations**: the club is chosen at a
  later step, so neither has a referent on this screen.
- **Staff generation and editor/developer advanced options**: no such system ships in v1; recorded as
  future slots, not built here.
- **Free-form competition assembly**: the Nation + scope-option safety rail is retained; the grid
  never lets the player build an invalid competition graph by hand.
- **World-generation materialization of the wider scope**: this screen ends at the snapshot; widening
  the generated world belongs to the world-generation effort.
- **Literal reference-game styling** — original colors, typography, competition names, button
  silhouettes, icons, backgrounds, star ratings, and wording: the design is CM Clone-native.
- **New libraries**: no additional component, form, global-state, icon, or CSS-in-JS solution beyond
  what the app already ships.
- **A second preload/IPC surface**: setup reuses the established typed seam instead of a new
  `gameSetup.*` namespace.

## Further Notes

- **This spec supersedes the brief where the domain disagrees.** The implementation brief at
  `.scratch/active-leagues-setup/brief.md` remains the reference for structure and
  detail wherever this spec does not override it, but every fabricated-input deviation above
  (start date, database preset, team chip, club recommendations, staff/editor options) is deliberate:
  carry this divergence list into implementation copy so nobody reintroduces the dead controls "to
  match the brief".
- **The interaction principle, from the brief, is the non-negotiable.** Present dense editable setup
  data in the primary workspace, show consequences in a persistent side panel, keep uncommon controls
  below the main workflow, and isolate the final commitment action at the bottom-right. A resolution
  that trades this for closeness to the brief's letter has misread this spec.
- **The generation boundary is unchanged.** Step 1 still ends at the `LeagueSelectionSnapshot`;
  materializing the chosen scope remains the world-generation effort's subject, and the screen's
  sidebar copy should state that handoff honestly rather than implying the wider world already
  exists.
- **Two vocabularies now coexist by design.** `SimulationMode` (per Nation, including not-loaded) and
  `SimulationDepth` (per competition, three tiers) are distinct grains that both live in the glossary;
  the implementation contract between the grid and the trusted service must preserve which grain each
  boundary payload carries.
- **Every decision above was reached by interview and approved wholesale**; no wayfinder tickets were
  run and no Agent Notes exist, so the decisions carry no note links. If the record needs a map, one
  can be added to this effort later without changing this spec.