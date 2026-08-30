# Map: keyboard-first-renderer

Label: wayfinder:map

> Status: charted — **complete**. Both research tickets resolved; action model, screen tiers, key map,
> focus model, command palette, Atom adoption shape, router adoption shape, table/grid navigation,
> match-day live keyboard control, e2e strategy, user rebinding, and adoption sequencing all settled.
> **All 14 tickets resolved — the map is ready for handoff to `/cm-to-spec`.**

## Destination

A **spec** at `.scratch/keyboard-first-renderer/spec.md` describing how the `@cm-clone/desktop`
renderer becomes a **keyboard-first** application: every action reachable without a mouse, with a
command palette for discovery and grid navigation in the data tables. TanStack Router and Table,
Effect Atom, and `react-hotkeys-hook` are the supporting libraries; adopting them is a means to that
end, not the end.
Plan-only — the map is done when nothing is left to decide and the spec can be handed to
`/cm-to-spec` → `/cm-to-tickets` → `/cm-implement`.

## Notes

- Domain: the Electron renderer of `@cm-clone/desktop` — nine screens, ~2,200 lines, React 19 +
  Tailwind 4, all data over one typed IPC channel (`window.cmClone.call`) returning a
  `{ _tag: "Success" | "Failure" }` union.
- **Starting point is greenfield for keyboard**: the renderer today has zero `onKeyDown`,
  `tabIndex`, or `autoFocus`; the e2e suite is 37 `click()` calls with no keyboard interaction.
- **TanStack provides none of the keyboard layer.** Table is headless data logic (row/column models,
  sorting, filtering, visibility) and renders no DOM and manages no focus; Router's whole published
  type surface mentions "focus" once, in a `preloadDelay` doc comment. Roving tabindex, focus
  restoration and modal focus trapping are ours to build regardless of library choice.
- **Library set, after both research tickets** (do not re-litigate): **TanStack Router and Table**
  adopted; **Effect Atom** (`@effect/atom-react`) is the data layer; **`react-hotkeys-hook@5.x`** is
  the binding library. TanStack Query and TanStack Hotkeys are rejected — see Out of scope. DB,
  Store, Charts, Markdown, Config, CLI and Intent were rejected before charting; Form, Virtual and
  Pacer are deferred.
- **Both non-TanStack libraries sit behind a one-file internal seam**, so each remains a single-file
  swap. Screens import the seam, never the package.
- Effect v4 rc is the whole-repo commitment, enforced by `scripts/effect-lint.ts`.
  `packages/contracts/src/rpc.ts` documents that `@effect/rpc` has no v4-compatible release; the
  same question for `@effect/rx` is live and is ticket 02.
- Target ambition is **level 3, mouse-free**: every action keyboard-reachable, command palette for
  discovery, arrow-key grids in tables. Levels 1 (reachable) and 2 (driveable) are the route
  through it, not separate destinations.
- Keyboard scheme is **modern** (palette, goto-prefixes, arrow grids), not period-accurate to
  classic Championship Manager.
- UI vocabulary stays **out of `CONTEXT.md`**, which is a pure game-domain glossary. It lives in the
  spec. The one exception under debate is a formal Action concept, which may earn an ADR — that is
  ticket 03's call.
- Skills: grilling + domain-modeling for the design tickets; prototype for the interaction tickets;
  research for 01 and 02; doc-standards + writing-for-agents for the spec.
- Say names, not bare ids.

## Decisions so far

- [TanStack Hotkeys viability](issues/01-tanstack-hotkeys-viability.md): **no** — alpha at 0.8.0/0.10.0,
  and it has no scopes or priority layering, the hardest requirement. Use `react-hotkeys-hook@5.x`
  behind a thin internal module; its binding registry covers the palette and help overlay. Router
  and Table confirmed to provide no focus management at all.

- [Effect v4 renderer interop](issues/02-effect-v4-renderer-interop.md): an Effect-native option
  **does** exist on v4 — `@effect/atom-react@4.0.0-rc.112` matches the catalog pin exactly, and the
  engine ships in core as `effect/unstable/reactivity` with `Reactivity.mutation` covering
  invalidation. Verified independently. **TanStack Query is dropped**; ticket 08 is re-scoped to an
  Atom adoption shape. Reverses the "no Effect runtime in the renderer" clause of
  `.agents/notes/proposed/architecture/2026-08-28-renderer-boundary-posture.md`.

- [Action model](issues/03-action-model.md): **registry yes** — every operation becomes a named,
  scoped, dispatchable Action record. Buttons, palette, key bindings and help overlay are four views
  of the same record. Migration is all-or-nothing per screen. See Agent Note and ADR-0012.

- [Screen keyboard tiers](issues/04-screen-keyboard-tiers.md): **six screens at level 3 or 2, three
  at level 1** — MatchDay/Transfers/Tactics/Squad at level 3; LeagueTable/CreationStep1 at level 2;
  Fixtures/SeasonSummary/ClubSelection at level 1. `prompt()` at TransfersScreen.tsx:57 replaced
  with an inline modal. Level 1 is unconditional for all nine. Tiering rule: screens with zero
  interactive controls stay at level 1; level 2 minimum otherwise; level 3 for tables and dense
  interaction.

- [Global key map](issues/05-global-key-map.md): **prefix-style `g <key>` navigation** with
  explicit registry bindings, not derived from screen initials. **`Enter` activates focused
  controls** (never a screen-global primary action). **`Primary+K` palette, `Primary+/` help,
  `Escape` closes topmost layer only**. Mixed modifier policy — `Cmd+` for global invariants,
  `g` prefix for navigation, bare keys for screen-scoped actions. **Text input suppresses bare
  shortcuts**. Creation flow is a separate scope with no `g <key>` destinations. Seven career
  screens (not nine — Club Selection and creation are flow steps).

- [Intra-screen focus model](issues/06-intra-screen-focus-model.md): **hybrid model** — native Tab
  for regions, roving for composite widgets; selection separate from focus; identity-based async
  restoration; one `:focus-visible` ring. See Agent Note and prototype.

- [Command palette and discoverability](issues/07-command-palette-and-discoverability.md):
  **Yes to all four mechanisms** — palette (global + current-screen actions, disabled-with-reason,
  commands-only), contextual help with tabs (All/Global/This screen), inline key badges on buttons,
  and a one-shot teaching splash on first career. **Game-data search is out of scope** for this map.
  See Agent Note and prototype.

- [Atom adoption shape](issues/08-atom-adoption-shape.md): **one public `renderer/rpc` seam** —
  registry at career boundary only; decode both wire branches; separate family identity from
  reactivity keys; save-level `["save", saveId]` key for calendar-wide invalidation; SWR for
  management reads, no SWR for match state; polling hand-rolled; boundary enforcement over new
  Effect-lint rules. See Agent Note.

- [Router adoption shape](issues/09-router-adoption-shape.md): **typed hash routing for career,
  creation, and save-list views; no route loaders; early `beginCareer` preserved under a
  parent-owned creation session; typed destination Actions for navigation; semantic focus after
  keyboard navigation only.** See Agent Note.

- [Table and grid navigation](issues/10-table-and-grid-navigation.md): **TanStack Table for Squad,
  Market, and Free Agents; semantic `<table>` with row-oriented roving, no ARIA grid; contextual
  Actions region for bid entry; sortable header buttons + palette Actions; identity-based focus
  restoration.** See Agent Note. **Shipped** — Stage 5, ticket 19, all six ACs PASS.

- [Match-day live keyboard control](issues/11-match-day-live-keyboard-control.md): **Keyboard control during a running match** – panel Escape semantics, injury decision flow, two-step substitution flow, and live tactics toggles. Keyboard-bound within the control panel; escape closes panel only; injury pause with `Play On` / `Bring Off` choices; substitution requires two-key sequence; tactics toggles with arrow keys. See Agent Note and prototype. **Shipped** — Stage 5, ticket 20, AC-33 + tier-3 done-criteria PASS.

- [e2e strategy](issues/12-e2e-strategy.md): **convert the level-3 journeys to keyboard driving, keep creation/save-management/error-paths as clicks; cover navigation, palette, Squad grid, Match Day substitution, and Escape layering; uphold the no-testability-seam line with `toHaveFocus()` + ARIA assertions; reliability contract unchanged (retries CI-only, 30s timeout) with `toBeFocused` as the authoring rule; existing click suite expected to survive unchanged.** Writing the tests is deferred to implement.

- [User rebinding](issues/14-user-rebinding.md): **configurable yes — overrides as a `record<ActionId, binding>` layered over defaults; persisted in a `keybindings.json` under `userData` (sibling of `saves/`), I/O in main via the RPC seam, never localStorage/the event stream; locked infra keys (`Escape`, `Primary+K`, `Primary+/`, `Enter`) non-rebindable; collision validation names the conflicting Action; help overlay is the rebinding surface with per-Action and reset-all.**

- [Adoption sequencing](issues/13-adoption-sequencing.md): **seven stages — data layer → router → keyboard spine → discoverability → level-3 upgrades → rebinding → e2e — screen-by-screen within stages, one big-bang (palette/help) gated on full screen conversion; router precedes the Action spine so navigation resolves through it; all four `App.tsx` state variables die at the router stage; gate green every stage with boundary lint in Stage 1.**

## Not yet specified

- **Screen density.** Keyboard navigation rewards denser tables than mouse navigation does; this may
  change what the squad and market screens show, which is a product question, not a library one.

- **The hand-rolled RPC group.** `effect/unstable/rpc` is now in core at rc.112, so the block
  comment at `packages/contracts/src/rpc.ts:50` is stale about the capability. Whether the
  hand-rolled group is replaceable is a separate effort, not this map's — recorded so it is not
  lost.

## Out of scope

- **Level 4 modal interaction** — vim-style modes, leader keys, chords. A novel paradigm for a
  football sim; level 3 should teach us whether it is wanted before betting on it.
- **Period-accurate CM keyboard scheme** — function keys and single-letter menu jumps. The repo has
  already broken with CM's internals where it mattered (ADR-0001, ADR-0004); period fidelity is not
  an established value here.
- **TanStack DB, Store, Charts, Markdown, Config, CLI, Intent** — ruled out before charting. DB is a
  sync engine for browser-persisted collections against a remote API and mismatches an IPC/SQLite
  architecture; Store has no state left to own once the data layer and Router are in; the rest have
  no present use in this app.
- **TanStack Query** — ruled out by ticket 02. An Effect-native option exists on the pinned v4 rc,
  making Query a second async model bought for no capability gain, with an error channel that cannot
  carry the repo's tagged domain errors without erasing their types.
- **TanStack Hotkeys** — ruled out by ticket 01. Alpha at 0.8.0/0.10.0, with no scopes and no
  priority layering, which was the hardest requirement. Revisit only if it ships those and reaches
  1.0.
- **TanStack Form, Virtual, Pacer** — deferred, not rejected. One form exists, the largest list is
  ~500 rows, and MatchDay's pacing is three constants. Revisit as separate efforts when those
  facts change.
- **UI vocabulary in `CONTEXT.md`** — it is a game-domain glossary and stays devoid of
  implementation detail.
- **Writing the e2e tests** — ticket 12 decides the strategy; authoring happens during implement.
- **Game-data search in the command palette** — ruled out by ticket 07. The palette is a strict
  command surface; finding players, clubs, or competitions is a separate effort with different UX,
  ranking, and data-fetching requirements. Pursued as its own map, not this one.
