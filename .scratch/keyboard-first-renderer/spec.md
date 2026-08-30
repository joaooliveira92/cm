Status: ready-for-agent

# Keyboard-first renderer

## Problem Statement

The `@cm-clone/desktop` renderer is mouse-first today, and it shows: none of its nine screens has
anything a keyboard player can use. There is no `onKeyDown`, no `tabIndex`, no `autoFocus`, and no
focus styling anywhere, so tab order is whatever the browser defaults to. Every screen operation is
an inline closure wired straight to a button, and nothing anywhere knows what operations exist or
whether one is currently available. Data tables are unusable with a keyboard — the Squad screen is a
~30-column read-only table whose only story is mouse navigation, the transfers market is up to ~475
rows of per-row actions, and the one native prompt in the app (the counter-offer path) has no
keyboard story at all. Match Day, the screen that most justifies a keyboard, is a 640-line live,
time-pressured interaction with an overlay panel and pause-for-decision moments, and it has zero
keyboard path.

Two structural debts make the problem worse to touch. Every screen hand-rolls the same data pattern —
a `useState` pair, a `useEffect` fetch, and a local `reload()` that every mutation must remember to
call — so cache invalidation is a discipline, not a mechanism. And navigation is a hand-rolled state
machine in the root component holding four pieces of state, with no URL, no back button, no
declarative route tree, and no navigation lifecycle, which a keyboard navigation layer would have to
fight. The Playwright suite is equally one-sided: 38 `click()` calls, 7 `fill()` calls and 3
`selectOption()` calls and zero keyboard or focus interaction, so it exercises the secondary input
path for an app that is about to make the keyboard primary.

## Solution

The renderer becomes a **keyboard-first** application (the map's "level 3, mouse-free"): every
action reachable without a mouse, a command palette and contextual key help for discovery, prefix
navigation between screens, arrow-key grids in the data tables, live keyboard control during a
running match, and user-configurable key bindings stored machine-locally. The keyboard scheme is
modern (palette, `g <key>` prefixes, arrow grids), not period-accurate to classic Championship
Manager. Seven career screens carry the interaction; the creation flow and save list are their own
scopes.

Four supporting libraries get adopted behind one-file interior seams — **TanStack Router** and
**TanStack Table** provide routing and headless table state respectively; **Effect Atom**
(`@effect/atom-react`) is the renderer data layer; **`react-hotkeys-hook@5.x`** is the binding
library. None of them provides any focus management: roving tabindex, focus restoration, and modal
layering are ours to build regardless. The known trade-offs around two non-TanStack libraries are
accepted as standing decisions, not re-litigated.

The work is sequenced into seven stages — data layer, router, keyboard spine, discoverability,
level-3 upgrades, rebinding, e2e — each of which leaves the app working and ends with `pnpm
check:all` green (see *Sequenced rollout* below). Every plan decision is decided; nothing here
requires a new decision to begin slicing.

## User Stories

1. As a manager, I want to reach every career screen with the `g <key>` prefix, so that navigating
   the game never requires a mouse.
2. As a manager, I want `g b` to go to the previous screen through real application screen history,
   so that my back path is predictable and never crosses transient overlays.
3. As a manager, I want `Enter` to activate whichever control is focused and nothing else, so that I
   never trigger a hidden screen-wide action by mistake.
4. As a manager, I want `Space` to advance the Calendar only where the existing Continue safety
   contract permits, so that I cannot continue the career unintentionally.
5. As a manager, I want a command palette (`Cmd+K` / `Ctrl+K`) listing global and current-screen
   commands, so that any action is reachable without memorising its shortcut.
6. As a manager, I want commands I cannot currently run shown disabled with a plain-language reason
   rather than hidden, so that I learn how a screen works and why a command is not yet available.
7. As a manager, I want the palette to be a strict command surface with no player, club, or
   competition search, so that I can predict exactly what it finds.
8. As a manager, I want a keyboard-help overlay (`Cmd+/` / `Ctrl+/`) with All, Global, and This
   screen tabs, so that I can look up any binding from anywhere.
9. As a manager, I want action buttons to display their key binding as an inline badge, so that I
   absorb shortcuts while reading a screen.
10. As a manager, I want a one-shot teaching splash on my first career showing exactly three
    shortcuts, so that I can start without reading documentation.
11. As a manager, I want to move through the Squad, Market, and Free Agent tables row by row with
    arrow keys, keeping selection separate from focus, so that I can inspect many players without a
    pointer.
12. As a manager, I want to sort, filter, choose columns, and restore defaults on the Squad table by
    keyboard, so that a 30-column view stays usable without a mouse.
13. As a manager, I want the bid amount entered in a persistent actions region for the selected
    player, so that placing a Bid never requires reaching into a table row.
14. As a manager, I want focus to return to the same row by identity after sorting, filtering, or a
    refresh, so that I am not lost among rows when the data changes.
15. As a manager, I want the creation flow driven entirely by Tab and focused controls, so that
    starting a career needs no mouse and no `g` destinations.
16. As a manager, I want to control a live match from the keyboard: open and dismiss the control
    panel while the commentary feed keeps advancing, and act through the decision moments.
17. As a manager, I want the injury pause to offer Play On and Bring Off, with Escape letting me
    deliberate without resuming the match, so that a time-pressured call stays in my hands.
18. As a manager, I want a two-step substitution flow — pick the player coming off, then the player
    coming on — that enforces the server-reported caps and rejects same-player swaps, so that live
    changes are deliberate and legal.
19. As a manager, I want live Mentality, Tempo, and Pressing toggles adjustable with arrow keys
    inside the open control panel, so that I can tweak tactics during a running match.
20. As a manager, I want `Escape` to close only the topmost transient layer — prefix, palette, help,
    panel, or modal — and never to navigate away or abandon a match, so that I always know exactly
    what back cancels.
21. As a manager, I want screen-scoped shortcuts suppressed while I am typing in a text field, so
    that entering a save name or bid amount never triggers an action.
22. As a manager, I want to rebind any non-locked key to suit my layout or physical needs, with
    colliding bindings rejected by name, so that one-handed and non-QWERTY play work.
23. As a manager, I want my bindings stored machine-locally and applied to every career across
    restarts, so that I configure the keyboard once.
24. As a manager, I want per-Action reset and reset-all with the default binding always visible, so
    that a mistaken rebind is trivially reversible.
25. As a developer, I want every operation to be a registered Action consumed by buttons, palette,
    help overlay, and key bindings, so that the surface always agrees with what is possible.
26. As a developer, I want the data layer behind one import seam with typed errors and success-only
    invalidation, so that the hand-rolled fetch/reload triple disappears from every screen.
27. As a developer, I want typed hash routes that survive a reload and own the save-scoped data
    registry, so that navigation and career state do not fight each other.
28. As a developer, I want a keyboard-driven e2e suite that asserts focus via `toBeFocused` and ARIA
    states, leaving the existing click suite intact, so that regression coverage tracks the primary
    input path without adding app testability seams.
29. As a developer, I want `pnpm check:all` green at every stage boundary and `test:e2e` green
    wherever UI-reachable paths change, so that each increment ships sound.

## Implementation Decisions

Every decision below carries forward a resolved map ticket's own answer verbatim, with one bullet,
one note. Supporting notes that are the rationale rather than the blueprint are cited where
relevant. Snippets inlined from the prototypes encode their decisions more precisely than prose.

- [Binding library — ticket 01] **No — TanStack Hotkeys is alpha and has no scopes or priority
  layering; use `react-hotkeys-hook@5.x` behind an internal seam. Router and Table confirmed to
  provide no focus management.** See
  [Agent Note](../../.agents/notes/implemented/architecture/2026-08-29-keyboard-binding-library.md) and
  [research findings](research/01-tanstack-hotkeys-viability.md). Exactly one module imports the
  binding library; the help overlay and command palette derive their contents from live binding
  registrations, and `enableOnFormTags`/`enableOnContentEditable` carry the text-input suppression.

- [Data layer — ticket 02] **Yes — `@effect/atom-react@4.0.0-rc.112` matches the catalog pin
  exactly and the engine ships in core as `effect/unstable/reactivity`; the renderer data layer is
  Effect Atom, not TanStack Query.** See
  [Agent Note](../../.agents/notes/implemented/architecture/2026-08-29-renderer-data-layer-effect-atom.md)
  and [research findings](research/02-effect-v4-renderer-interop.md). This is the *why*: the
  preload union maps onto Effect's error channel directly, and the reactive engine is inside the
  pinned `effect` itself. The *how* is ticket 08's note.

- [Action model — ticket 03] **Yes — a first-class Action registry. Every operation becomes a
  named, scoped, dispatchable record; buttons, palette, key bindings and help overlay are four views
  of the same record. Migration is all-or-nothing per screen. Availability predicates are
  best-effort frontend optimisations; the backend still validates.** See
  [Agent Note](../../.agents/notes/implemented/architecture/2026-08-29-action-model.md) and
  [ADR-0012](../../docs/adr/0012-action-registry-for-keyboard-first.md). Inline prototype snippet —
  the Action record shape (trimmed):
  ```ts
  interface Action {
    readonly id: string;
    readonly label: string;
    readonly scope: "global" | ScreenName;
    readonly available: (context: ScopeState) => boolean;
    readonly handler: () => Promise<void>;
    readonly binding?: string;
  }
  ```
  Actions are declared colocated per screen and collected into one registry at startup; the registry
  merges the current scope + globals into the active set; `id`s are stable kebab-case keys shared by
  the key map, palette, and help overlay.

- [Screen keyboard tiers — ticket 04] **Six screens at level 3 or 2, three at level 1; `prompt()`
  replaced by an inline modal.** See
  [Agent Note](../../.agents/notes/proposed/feature/2026-08-29-screen-keyboard-tiers.md). Level 1 is
  unconditional for all nine screens. Tiering rule: a screen with zero interactive controls beyond
  nav/back stays at level 1; any screen with actions reaches at least level 2 on its primary action;
  tables and dense interaction are level 3. Assignment:

  | Screen | Level | Rationale |
  |---|---|---|
  | MatchDayScreen | 3 | time-pressured, pause-needed, substitutions during live play |
  | TransfersScreen | 3 | per-row actions and bid inputs need full keyboard |
  | TacticsScreen | 3 | formation selector, sliders, dropdown table — dense interaction |
  | SquadScreen | 3 (grid) | 30-column read-only table — keyboard nav is the interaction |
  | LeagueTableScreen | 2 | one read-only table + one button; primary-action shortcut covers it |
  | CreationStep1 | 2 | linear form fields and buttons; full tab nav covers it |
  | FixturesScreen | 1 | zero interactive controls — read-only list |
  | SeasonSummaryScreen | 1 | zero interactive controls — read-only cards and banners |
  | ClubSelectionScreen | 1 | zero interactive controls — read-only card list |

  The native `prompt()` in the counter-offer path is replaced with an inline modal dialog (text
  input + OK/Cancel, focus trapped, Enter to submit), reusable across screens.

- [Global key map — ticket 05] **Prefix-style `g <key>` navigation with explicit registry bindings;
  `Enter` as focused-control activation (not screen-global primary); `Primary+K` palette, `Primary+/`
  help; mixed modifier policy with bare keys for screen-scoped actions and text-input suppression;
  creation is a separate scope with `g <key>` inactive.** See
  [Agent Note](../../.agents/notes/implemented/feature/2026-08-29-global-key-map.md). Prototype:
  [printed key map](prototype/key-map.md) + [wired Transfers screen](prototype/wired-transfers.html).
  Inline from the printed key-map prototype — the binding table (trimmed):

  | Binding | Action | Scope | Notes |
  |---|---|---|---|
  | `Cmd+K` / `Ctrl+K` | Open command palette | `app_global` | Cmd on macOS, Ctrl on Win/Linux |
  | `Cmd+/` / `Ctrl+/` | Open keyboard help | `app_global` | resolved through produced character |
  | `Space` | Continue | `career_global` | suppressed during text input, overlays, creation flow |
  | `g s` | Go to Squad | `career_global` | sequential — no single-key `g` binding |
  | `g a` | Go to Tactics | `career_global` | `t` taken by Transfers |
  | `g t` | Go to Transfers | `career_global` | |
  | `g l` | Go to League Table | `career_global` | |
  | `g f` | Go to Fixtures | `career_global` | |
  | `g m` | Go to Match Day | `career_global` | resumes a pending match, never starts one |
  | `g y` | Go to Season Summary | `career_global` | |
  | `g b` | Go to previous screen | `career_global` | app screen history; no-op when history empty |
  | `Escape` | Close topmost transient layer | `app_global` | layer stack: select → palette → help → prefix; never navigates screens |
  | `Enter` | Activate focused element | `focused_control` | not a screen-global primary action |
  | Arrow keys | Navigate within focused widget | `focused_control` | tab bar, table rows, list items |
  | `b` | Focus Bid workflow | `career_screen` | Transfers only; opens/focuses, does not submit |

  Dispatch priority (one keystroke, at most one action): native text/focused-control → topmost
  overlay layer → active prefix completion/cancellation → global modifier shortcuts → career-global
  (Continue) → current-screen bare actions → no action. The `g <key>` prefix shows visible nonmodal
  feedback, cancels on `Escape`, an invalid key, or an ~800ms timeout, and suppresses all other
  bare-key actions while active. Creation flow uses only flow-local focused controls.

- [Intra-screen focus model — ticket 06] **Hybrid model: native Tab for regions, roving for
  composite widgets; selection separate from focus; identity-based async restoration; one
  `:focus-visible` ring.** See
  [Agent Note](../../.agents/notes/proposed/architecture/2026-08-29-intra-screen-focus-model.md).
  Prototype: [focus model demo](prototype/focus-model.html). Focus is where the next command lands;
  selection is the durable argument consequential Actions (Bid, release, substitution) act on —
  `ArrowDown` moves focus only, `Space` commits selection, `Enter` activates. Composite widgets keep
  roving tabindex; everything else stays native Tab. Focus restoration uses a semantically-identified
  bookmark (screen, region, item, control) with a neighbor-based fallback chain, session-local, never
  index-based; during async refetch keep focus on the initiating control with `aria-busy`, and never
  send focus to `document.body`.

- [Command palette and discoverability — ticket 07] **Yes to all four mechanisms — palette (global +
  current-screen, disabled-with-reason, commands-only), contextual help with tabs, inline key badges
  on buttons, and a one-shot teaching splash. Game-data search is out of scope.** See
  [Agent Note](../../.agents/notes/implemented/feature/2026-08-29-command-palette-and-discoverability.md).
  Prototype: [command palette](prototype/command-palette.html). Palette ranking puts available
  actions above unavailable, then label match score (exact → prefix → substring → binding → scope →
  fuzzy); it navigates only through Actions ("Go to Squad"), never by instant navigation. The help
  overlay has All/Global/This-screen tabs and lists every registered Action with its binding.
  Inline key badges are toggleable per screen via registry metadata. The teaching splash is three
  lines (palette, help, prefix), shown on the *first load of a career screen*, never re-shown.

- [Atom adoption shape — ticket 08] **Seam: one public `renderer/rpc` import boundary; runtime at
  career boundary only; decode both success and failure; separate family identity from invalidation
  keys; save-level `["save", saveId]` key for calendar-wide invalidation; SWR for management reads,
  no SWR for match state; polling hand-rolled; no AtomRpc; pin `@effect/atom-react` at
  4.0.0-rc.112; boundary enforcement over new Effect-lint rules.** See
  [Agent Note](../../.agents/notes/implemented/architecture/2026-08-29-atom-adoption-shape.md). Inline
  decision snippet (trimmed) — the invalidation map:

  | Query | Reactivity keys |
  |---|---|
  | `getSquad(saveId)` | `["save", saveId]`, `["squad", saveId]` |
  | `getTransfersScreen(saveId)` | `["save", saveId]`, `["transfers", saveId]`, `["economy", saveId]` |
  | `getTactics(saveId)` | `["save", saveId]`, `["tactics", saveId]` |

  | Mutation | Invalidates |
  |---|---|
  | `advanceCalendar` | `["save", saveId]` |
  | `setTrainingFocus` | `["squad", saveId]`, `["training", saveId]` |
  | `placeBid` | `["transfers", saveId]`, `["economy", saveId]` (never squad) |
  | `submitMatchCommand` | `["match", saveId, matchId]` |
  | `commitCareer` | nothing (registry not yet mounted) |

  No wildcards, no speculative cascades; failure = no invalidation. The registry is mounted at the
  active-career boundary keyed by save, so switching saves replaces it wholesale and cannot serve
  stale data; pre-career screens use plain promises. The seam decodes both wire branches with method
  schemas and distinguishes transport, contract-decode, and typed remote failures, replacing every
  `_tag`-string-match in the renderer. SWR applies to management reads (5-minute idle TTL), never to
  active match state, and `refreshOnWindowFocus` is off in a single-window app. The MatchDay
  polling/reveal decoupling (`REVEAL_INTERVAL_MS`, `POLL_INTERVAL_MS`, `REFETCH_THRESHOLD`) stays
  hand-rolled per [ADR-0007](../../docs/adr/0007-domain-bounded-deciders-and-chunked-match-resimulation.md);
  disposing a match atom must never abandon the durable started match. The hand-rolled RPC group is
  left alone (no `AtomRpc`), leaving room for a later `effect/unstable/rpc` migration without
  touching screens.

- [Router adoption shape — ticket 09] **Typed hash routing for career, creation, and save-list
  views; no route loaders; early `beginCareer` preserved under a parent-owned creation session;
  navigation via typed destination Actions; semantic focus after keyboard navigation only.** See
  [Agent Note](../../.agents/notes/implemented/architecture/2026-08-29-router-adoption-shape.md). Hash
  history keeps the active route across a reload. The active career is a path parameter whose parent
  route owns the persistent career shell and the save-scoped registry, rendering an Outlet for the
  active child; a career URL with no child redirects to Squad. Routes validate structure and
  parameter shape only — a well-formed-but-missing save is a typed RPC failure, never a loader.
  Creation steps share one parent-owned provisional session; leaving creation runs idempotent
  cleanup, and reloading a later step without a recoverable session redirects to step 1. Navigation
  is a closed union of typed destinations with typed parameters, resolved through an adapter; career
  `g <key>` bindings target only persistent career screens. Focus policy lives in the focus
  coordinator, not the router: keyboard/palette navigation requests semantic focus; pointer
  navigation does not force focus; back restores the previous semantic target where available; Match
  Day routing resumes the pending match rather than starting one on mount.

- [Table and grid navigation — ticket 10] **TanStack Table for Squad, Market, and Free Agents;
  semantic `<table>` with row-oriented roving, no ARIA grid; contextual Actions region for bid
  entry; sortable header buttons + palette Actions; identity-based focus restoration across
  sort/filter/refetch.** See
  [Agent Note](../../.agents/notes/implemented/feature/2026-08-29-table-and-grid-navigation.md). Bid
  tables and the League Table stay hand-rendered. One meaningful focus control per row (the player
  name), never a bare row tabstop; `Tab`/`Shift+Tab` moves into and out of the row sequence. Squad
  gets sorting on any column, per-column visibility with presets, a pinned identity column, and
  persistent preferences; Market and Free Agents get sorting/filtering/search but no column
  configuration. The Bid draft lives in the actions region with an explicit dirty-draft lifecycle
  (retarget when clean, explicit discard when dirty, clear on submit/reload/player-unavailable).
  Sorting and filtering are reachable through native sortable header buttons *and* parameterized
  palette Actions, with visible filter controls (never palette-only) so the active state and removal
  paths are obvious. Table state is session-scoped per table id; only Squad column preferences
  survive an app restart, reconciled against unknown/mandatory columns. Selection clears when the
  selected row is filtered out (explicit, first implementation). Result states are explicit
  (`InitialLoading`, `LoadError`, `EmptyDataset`, `NoFilterResults`, `Populated`) with an orthogonal
  refresh state; one polite status announcer per table, `role="alert"` for blocking errors,
  `aria-sort` on the active column, `aria-selected` on selected rows.

- [Match-day live keyboard control — ticket 11] **Keyboard control during a running match** — panel
  Escape semantics, injury decision flow, two-step substitution flow, and live tactics toggles.
  Keyboard-bound within the control panel; escape closes panel only; injury pause with `Play On` /
  `Bring Off` choices; substitution requires two-key sequence; tactics toggles with arrow keys. See
  [Agent Note](../../.agents/notes/implemented/feature/2026-08-29-matchday-keyboard-flow.md). Prototype:
  [11-match-day-live-keyboard-control-prototype.html](prototype/11-match-day-live-keyboard-control-prototype.html).
  The key invariant: panel controls are keyboard-reachable only while the panel is open. Escape
  semantics in context:

  | Key | Panel open | Panel closed | Paused |
  |---|---|---|---|
  | `Escape` | Close panel | No-op (feed continues) | Close panel + close injury modal; match stays paused |
  | `Primary+K` | Open palette | Open palette | Open palette |
  | `S` | Open substitution tab | N/A (open panel or palette first) | N/A |

  Injury decision: the feed pauses; an inline modal offers Play On (`Enter`) or Bring Off (`B`);
  Escape closes the modal and panel but does **not** resume the match — the pause persists for
  deliberation. Substitution is two-step (out player, then in player) with validation against the
  server-reported substitution caps, no-subs and same-player swaps; `Enter` confirms, `Escape`
  aborts. Live tactics (Mentality, Tempo, Pressing) are arrow-key-toggled controls while the panel
  is open, `Tab` cycling between them — no inline formation editing (the dedicated Tactics screen
  owns that).

- [e2e strategy — ticket 12] **Convert the level-3 journeys to keyboard driving, keep
  creation/save-management/error-paths as clicks; cover navigation, palette, the Squad grid, the
  Match Day substitution flow, and Escape layering; uphold the no-testability-seam line — assert
  focus with `toHaveFocus()` on role/text locators plus ARIA states; the reliability contract holds
  unchanged with `toBeFocused` (auto-retrying) as the authoring rule; the existing click suite is
  expected to survive unchanged, and any break is app regression, not a test to edit.** See
  [Agent Note](../../.agents/notes/proposed/testing/2026-08-30-e2e-keyboard-strategy.md).

- [Adoption sequencing — ticket 13] **Seven stages — data layer → router → keyboard spine →
  discoverability → level-3 upgrades → rebinding → e2e — screen-by-screen within stages, one
  big-bang (palette/help) gated on full screen conversion; the router precedes the Action spine so
  navigation Actions resolve through it; all four `App.tsx` state variables die at the router stage;
  `pnpm check:all` green at every stage with renderer boundary lint shipped in Stage 1.** See
  [Agent Note](../../.agents/notes/proposed/architecture/2026-08-30-adoption-sequencing.md). The
  stage plan is expanded in *Sequenced rollout* below.

- [User rebinding — ticket 14] **Configurable yes, stored machine-locally in a `keybindings.json`
  under Electron `userData` (a sibling of `saves/`), read/written in main through the existing typed
  RPC seam — never `localStorage`, the Saves dir, or the event stream; locked infrastructure keys
  (`Escape`, `Primary+K`, `Primary+/`, `Enter`) are non-rebindable; collisions are validated with
  the conflicting Action named; the help overlay is the rebinding surface (palette offers
  "Rebind…"), with per-Action reset and reset-all.** See
  [Agent Note](../../.agents/notes/implemented/feature/2026-08-30-user-key-binding-overrides.md).
  Overrides are a layered `record<ActionId, binding>` over unchanged coded defaults; a two-step
  prefix binding is rebound as one entry. A corrupt or truncated file is tolerated at startup (falls
  back to defaults, fixed on next write); invalid shapes for the prefix layer are rejected.

### Sequenced rollout — the seven stages

Each stage ends with its done criteria met *and* `pnpm check:all` green. Within Stages 1, 2, 3 and
5, screens migrate one at a time; each landing leaves a working app. The only intentional mixed
state is a screen fully converted or fully untouched — the Action model forbids the half-migrated
palette-lie.

| # | Stage | What lands | Done when |
|---|---|---|---|
| 1 | **Data layer** | The renderer RPC seam — decode both wire branches, typed failure union, atom families, invalidation map, SWR policy — the registry mounted at the active-career boundary, screen-by-screen migration off the `useState`/`useEffect`/`reload()` triple, and the dependency-boundary lint forbidding direct preload/atom imports outside the seam | No screen hand-rolls a fetch triple or a manual reload; screens import only the seam; the boundary lint ships with the seam and passes; `pnpm check:all` green |
| 2 | **Router** | Hash route tree (save list / creation / active career), the root screen-state machine dissolved, the registry relocated into the career parent, navigation as typed destination Actions with the resolver adapter, the parent-owned creation session, semantic focus on route change | `App.tsx` holds no screen state; every stable view is a route; its four state variables (`loadedSave`, `screen`, `creating`, `creationState`) are gone, replaced by route + session; `g b` uses history; gate green |
| 3 | **Keyboard spine** | Action registry (per-screen, all-or-nothing), key map + binding library behind its one-file seam, focus coordinator (roving, restoration, intent-aware), the single `:focus-visible` ring, Escape layering, text-input suppression | Every career screen dispatches registered Actions; the key map is active across all seven career screens; prefix `g <key>` nav, `Enter` activation, and text-input suppression work; gate green |
| 4 | **Discoverability** | Command palette (global + current-screen, disabled-with-reason), keyboard help overlay (All/Global/This screen tabs), inline key badges, one-shot teaching splash | The palette lists only currently-available Actions and is consistent with every screen's registry; the help overlay enumerates bindings from live registrations; gate green |
| 5 | **Level-3 upgrades** | TanStack Table for Squad, Market, Free Agents with row-roving, sortable headers, and the contextual Actions region; match-day live keyboard control (panel Escape, injury decisions, two-step substitution, tactics arrows); any remaining tier-3 interactions | Match Day, Transfers, Tactics, and Squad are driveable with no mouse; gate green |
| 6 | **Rebinding** | `keybindings.json` under `userData` via new typed RPC methods, in-place help-overlay rebinding, per-Action reset and reset-all, collision and locked-key validation | Overrides persist across restart and apply to all saves; locked keys reject; gate green |
| 7 | **e2e conversion** | The level-3 journeys rewritten keyboard-first, `toBeFocused`/ARIA assertions, the remaining specs stay clicks | The suite passes; e2e proves `g <key>` navigation, the palette, the Squad grid, the substitution flow, and Escape layering; existing click specs survive unchanged; gate + e2e green |

The palette and help are the one deliberate big-bang: they cannot ship until every career screen
dispatches registered Actions, so they are released together (Stage 4) after conversion completes.
The router precedes the Action spine because navigation is a typed Action that resolves through the
router. `pnpm check:all` is the guard at every stage boundary; typecheck during Stage 2 must prove
the dead root state is *removed*, not merely unused.

## Testing Decisions

Good tests here exercise external behavior — reachable states, focus positions, effective bindings —
not implementation internals like which hook a screen calls. Assert focus and selection through the
DOM and ARIA states the focus model carries anyway; never through an app testability seam.

The proving test class follows the contract's risk table: unit for pure renderer logic (decode,
priority, bookkeeping), determinism/save-compat regression where the renderer could disturb match
replay, RPC roundtrip for any new typed procedure, and Playwright for every reachable UI path. The
e2e choices follow ticket 12: level-3 journeys are keyboard-driven with `toBeFocused` + ARIA
assertions, and no testability seams are introduced.

### Acceptance criteria → proving tests

| ID | Acceptance criterion | Primary class | Proving test |
|---|---|---|---|
| AC-01 | No career screen hand-rolls a fetch triple or a manual `reload()`; all RPC-backed reads go through the renderer RPC seam | unit | Seam-focused renderer tests plus the Stage 1 boundary lint (`effect-lint`) rejecting out-of-seam imports |
| AC-02 | The seam decodes *both* wire branches with method schemas; transport, contract-decode, and typed remote failures are distinct variants | unit | Adapter unit tests over canned success/failure/malformed union payloads |
| AC-03 | Screens consume typed domain errors by pattern-matching the union, never string-matching `_tag` | unit | Screen-level unit tests asserting typed error render paths |
| AC-04 | Family identity is the complete normalized request; reactivity keys describe invalidation domains and are not conflated | unit | Seam unit test: two saves with the same query never share family state |
| AC-05 | Every save-scoped query subscribes to `["save", saveId]`; `advanceCalendar` invalidates only after success; mutations invalidate only what they change; no wildcards | unit | Invalidation-rule unit tests driven through `Reactivity.mutation`, incl. failure = no invalidation |
| AC-06 | Management reads use SWR with visible refresh state; active match state never shows stale progress; no `refreshOnWindowFocus` | unit | Staleness-policy unit tests per read category |
| AC-07 | Match polling and event reveal stay independently paced; dispose never abandons the durable started match | unit | Pacing-constants unit test + existing match-replay determinism suite as regression |
| AC-08 | Both Effect packages pinned at the exact rc in the workspace catalog; no peer conflict | gate | `pnpm install --frozen-lockfile` succeeds and `pnpm check:all` typecheck passes |
| AC-09 | Boundary lint rejects direct preload and atom imports from career screens; existing Effect lint applies by import | lint | The lint rule ships with a failing fixture in Stage 1; gate enforces it thereafter |
| AC-10 | Production routing uses hash history; a reload preserves the active route | Playwright | Reload-a-route spec: land on a career screen, reload, assert same screen focused |
| AC-11 | The active career is a route parameter; the career parent owns the persistent shell and the save-scoped registry | Playwright | Career-shell spec asserting the parent chrome + registry-mounting across routes |
| AC-12 | Career routes have no domain loaders; malformed parameter shape and missing-save stay distinct failures | RPC roundtrip | Roundtrip test for the missing-save typed failure in `packages/contracts/test/` + route-parse unit test |
| AC-13 | `beginCareer` still runs before Club Selection; creation steps share a parent-owned session; leaving creation discards idempotently; reload mid-creation redirects to step 1 | Playwright | Creation-flow spec proving the session lifecycle and the reload redirect |
| AC-14 | Navigation is a typed destination Action with typed parameters, not a path template; career `g` destinations exclude creation steps; `g b` uses history | unit | Typed-destination resolver unit test + registry gist asserting no creation destinations |
| AC-15 | Keyboard/palette navigation requests semantic focus; pointer navigation does not force it; back restores the previous target; Match Day resumes a pending match on arrival | Playwright | `toBeFocused` specs for keyboard-vs-pointer arrival + the Match Day resume-on-arrival journey |
| AC-16 | Every button on a converted screen dispatches a registered Action; no screen is half-converted; the palette cannot list an Action the registry cannot dispatch | unit | Per-screen Action-inventory unit test mapping rendered controls to registry entries |
| AC-17 | One keystroke executes at most one registered action; automated collision checks across active scopes | unit | Registry collision unit tests incl. locked-infra-key protection |
| AC-18 | `g <key>` prefix navigation over all career screens, explicit bindings, visible nonmodal feedback, Escape/timeout/invalid-key cancel, no unrelated bare-key action | Playwright | `g <key>` navigation spec (priority coverage target) + prefix-lifecycle unit test |
| AC-19 | `Enter` activates the focused control only; `Space` Continues only where the safety contract permits; bare screen-scoped keys suppressed while typing | Playwright | Focus-activation spec + a converted journey typing into a field while a screen-scoped key is bound |
| AC-20 | `Primary+K` palette, `Primary+/` help, `Escape` closes only the topmost transient layer; overlays create no history entries | Playwright | Palette spec + Escape-`layering` spec (priority coverage target) |
| AC-21 | Hybrid focus model: native Tab + roving in composite widgets; selection separate from focus; one `:focus-visible` ring; identity-based async restoration survives full refetch | Playwright | `toBeFocused` specs on rows/selection + a refetch-then-restore journey |
| AC-22 | All nine screens meet level 1: correct tab order, visible focus ring, Enter/Space on every control; tiers hold | Playwright | Tab-order smoke across all nine screens + a11y (axe) sweep |
| AC-23 | Palette lists global + current-screen Actions, available ranked above unavailable, disabled-with-reason, never hidden, commands-only | Playwright | Palette spec asserting ranking and disabled-with-reason rendering |
| AC-24 | Help overlay has All/Global/This-screen tabs and enumerates live registrations, not a hand-maintained list | unit | Registry-driven overlay derivation unit test (overlay == registry snapshot) |
| AC-25 | Inline key badges on screen-scoped action buttons, toggleable per screen via registry metadata | unit | Badge-configuration unit test reading registry metadata |
| AC-26 | One-shot teaching splash on first career: exactly three shortcuts, never re-shown | Playwright | Assertion inside the surviving click-driven creation journey (splash appears once) |
| AC-27 | Squad, Market, Free Agents adopt TanStack Table; bid tables and League Table stay hand-rendered; session-scoped state per table id; only Squad column preferences survive restart, reconciled | unit | Table-state lifecycle + preference-reconciliation unit tests |
| AC-28 | Row-oriented roving, semantic `<table>` (no ARIA grid), one focus control per row, sortable header buttons in native Tab order with `aria-sort`, `aria-selected` on selection | Playwright | Squad-grid roving spec (priority coverage target) with ARIA assertions |
| AC-29 | Bid entry lives in the contextual Actions region with a single BidDraft and the dirty-draft lifecycle; no silent discard | Playwright | Transfers journey: select, draft, dirty-retarget behavior asserted |
| AC-30 | Sorting and filtering keyboard-reachable via header buttons *and* palette Actions, with visible filter controls showing active state | Playwright | Squad/Market journey sorting and filtering by keyboard |
| AC-31 | Focus restored by stable ID after sort/filter/refetch with neighbor fallback; selection cleared when the selected row is filtered out (explicit) | Playwright | Sort-then-restore and filter-out journeys asserting focus and cleared selection |
| AC-32 | Explicit result/refresh states render the specified statuses; polite status announcer per table; `role="alert"` for blocking errors; announcements deduplicated | Playwright | Error-paths spec additions + unit tests for the view-state reducer and announcer dedup |
| AC-33 | Match Day keyboard flow: panel Escape semantics, injury Play On/Bring Off with pause, two-step substitution against server-reported caps, tactics arrow toggles | Playwright | Two-step substitution flow spec (priority coverage target) + unit tests for the substitution validation logic |
| AC-34 | Rebinding roundtrips the typed RPC seam (`getKeyBindingOverrides`, `setKeyBindingOverride`, `resetKeyBinding`, `resetAllKeyBindings`) and persists under `userData`; applies across saves and restarts; never in saves/event stream; no migration | RPC roundtrip | Roundtrip tests in `packages/contracts/test/` + a Playwright spec proving a rebind survives restart |
| AC-35 | Locked infra keys (`Escape`, `Primary+K`, `Primary+/`, `Enter`) reject rebinding with a reason; colliding rebinds are rejected naming the conflicting Action; unsupported shapes rejected | unit | Override-validation unit tests (merge, locked set, collision naming, shape checks) |
| AC-36 | Help overlay is the rebinding surface (palette offers "Rebind…"), shows effective bindings, supports per-Action reset and reset-all; a corrupt override file is tolerated | unit | Override lifecycle unit tests incl. tolerant corrupt-file decode |
| AC-37 | Level-3 journeys drive by keyboard; creation/save-management/error-paths stay clicks; the five mandated coverages each have a keyboard test | Playwright | The converted keyboard journeys + unchanged click specs passing as one suite |
| AC-38 | Focus asserted via `toBeFocused` on role/text locators and ARIA only; no `data-testid`/test-only attributes; existing click suite result recorded before and after, behavior unchanged; reliability contract values unchanged | Playwright | The e2e suite itself plus the recorded before/after click-suite result |
| AC-39 | Match replay determinism and save → load → continue continuity still provable and green; renderer work never consumes simulation randomness; opening/refreshing a screen cannot change a result | determinism / save-compat | Existing determinism and save-continuation suites re-run in the gate; new-behavior hooks assert polling issues deterministic RPC payloads only |

Counts by class: 14 unit (AC-01–07, 14, 16, 17, 24, 25, 35, 36), 1 determinism/save-compat
(AC-39), 2 RPC roundtrip (AC-12, 34), 20 Playwright (AC-10, 11, 13, 15, 18–23, 26–33, 37, 38), 1
lint (AC-09), 1 gate verification (AC-08).

### Modules under test and prior art

- The renderer data seam, Action registry, focus bookmark resolution, prefix lifecycle, and
  override validation follow the repo's pure-function unit-test precedent (`packages/shared` tests)
  and the Effect-vitest + real-SQLite pattern (`apps/desktop/test/*`) where a service is involved.
- Every new typed procedure (the four rebinding methods) gets a roundtrip test in
  `packages/contracts/test/`, mirroring `roundtrip.test.ts`; existing RPC methods that the seam now
  calls are unchanged contract types and their roundtrips stand as regression.
- The e2e suite extends the wave-1/wave-2 structure (`app`, `journeys`, `error-paths`,
  `save-management`): level-3 journeys drive by keyboard, creation/save-management/error-paths stay
  clicks, and the reliability contract (`workers: 1`, `fullyParallel: false`, CI-only `retries: 2`,
  per-test `timeout: 30_000`) is unchanged. `toBeFocused` is the authoring rule because it
  auto-retries past focus transitions — the reliability contract's tolerance exists for exactly
  those transitions.
- No test is loosened, skipped, or deleted to go green, and no fixture is regenerated without
  stating the cause.

### Definition of done

- [ ] All 14 resolved decision tickets reproduced as verbatim decision bullets with their Agent Note
      links, one decision per bullet, per *Implementation Decisions*.
- [ ] The seven stages implemented in order (data layer → router → keyboard spine → discoverability →
      level-3 upgrades → rebinding → e2e), each stage's done criteria from *Sequenced rollout* met.
- [ ] `pnpm check:all` green at every stage boundary, with the observed output recorded per stage;
      never hand-run a subset and call it passed.
- [ ] Stage 1: the boundary lint ships with the seam (not later); no career screen on a fetch
      triple or manual reload; the catalog pin lands with a clean frozen-lockfile install.
- [ ] Stage 2: the root screen-state machine is gone (its four state variables removed, not unused);
      every stable view is a route; the registry is owned by the career parent; `g b` uses history.
- [ ] Stage 3: every career screen dispatches registered Actions (all-or-nothing); the key map is
      active across all seven career screens; prefix nav, `Enter` activation, and suppression work.
- [ ] Stage 4: palette, help overlay, inline badges, and the splash ship together, and the palette is
      consistent with every screen's registry (no half-migrated lie).
- [ ] Stage 5: Match Day, Transfers, Tactics, and Squad are driveable with no mouse; tables, the
      contextual Actions region, and the match-day keyboard flow ship.
- [ ] Stage 6: rebindings persist across restart and apply to all saves; locked keys reject;
      collisions name the conflicting Action; no binding ever enters a save or the event stream; no
      migration exists.
- [ ] Stage 7: e2e proves `g <key>` navigation, the palette, the Squad grid, the substitution flow,
      and Escape layering; the existing click suite's results are recorded before and after; a click
      break is treated as an app regression, not a test edit.
- [ ] All 39 acceptance criteria (AC-01…AC-39) have a passing test of the mapped class.
- [ ] The full gate at delivery: `pnpm check:all` green, and `pnpm --filter @cm-clone/desktop
      test:e2e` green where UI-reachable paths changed.
- [ ] No app testability seam (`data-testid` or similar) added; the deliberate escape hatch, if ever
      needed, is a recorded decision, not a silent one.
- [ ] Clean feature-branch tree with small Conventional Commits; Agent Notes promoted to
      `implemented/` in the commits that ship their code (per cm-implement).

### Validation commands

- `pnpm check:all` — the gate, after every stage and at delivery (typecheck, `oxlint`,
  `effect-lint`, `verify-md-links`, unit tests).
- `pnpm --filter @cm-clone/desktop test:e2e` — whenever UI-reachable paths change (the router,
  keyboard-spine, discoverability, level-3, rebinding, and e2e stages; and as a regression check at
  delivery).
- `pnpm install --frozen-lockfile` — at Stage 1 to prove the catalog pins of `effect` and
  `@effect/atom-react` resolve with no peer conflict.

## Out of Scope

- **Level 4 modal interaction** — vim-style modes, leader keys, chords. A new paradigm; level 3
  should teach whether it is wanted.
- **Period-accurate CM keyboard scheme** — function keys and single-letter menu jumps. The repo has
  already broken with CM's internals where it mattered (ADR-0001, ADR-0004); period fidelity is not
  a value here.
- **TanStack Query** — ruled out by ticket 02; an Effect-native option exists on the pinned rc.
- **TanStack Hotkeys** — ruled out by ticket 01; alpha with no scopes or priority layering.
- **TanStack DB, Store, Charts, Markdown, Config, CLI, Intent** — ruled out before charting;
  **Form, Virtual, Pacer** are deferred, not rejected, and the sequence does not build the middleware
  they would slot into.
- **Game-data search in the command palette** — the palette is a strict command surface; finding
  players, clubs, or competitions is a separate effort.
- **UI vocabulary in CONTEXT.md** — it remains the pure game-domain glossary; all keyboard/UI
  vocabulary lives in this spec.
- **Replacing the hand-rolled RPC group** — `effect/unstable/rpc` is now in core, but migrating the
  hand-rolled group off it is a separate effort, recorded so it is not lost; this effort only leaves
  the seam ready for it.
- **Saves, migrations, and the event stream** — untouched by this effort; rebinding files are
  explicitly kept out of all three.
- **Writing the keyboard mechanics into the game domain** — the backend validates every command;
  availability predicates and renderer-side validation are UX only, never permission gates.

## Further Notes

- Architecture rationale live in [ADR-0012](../../docs/adr/0012-action-registry-for-keyboard-first.md);
  [ADR-0007](../../docs/adr/0007-domain-bounded-deciders-and-chunked-match-resimulation.md) explains
  why MatchDay polling stays hand-rolled; [ADR-0010](../../docs/adr/0010-post-handoff-decisions-live-in-adrs-map-closes.md)
  governs how runtime discoveries get classified after handoff — implementation discoveries that
  contradict this spec amend it with a correction block rather than reopening the map.
- Decision records carried forward: `architecture/2026-08-29-keyboard-binding-library`,
  `architecture/2026-08-29-renderer-data-layer-effect-atom`, `architecture/2026-08-29-action-model`,
  `feature/2026-08-29-screen-keyboard-tiers`, `feature/2026-08-29-global-key-map`,
  `architecture/2026-08-29-intra-screen-focus-model`,
  `feature/2026-08-29-command-palette-and-discoverability`,
  `architecture/2026-08-29-atom-adoption-shape`, `architecture/2026-08-29-router-adoption-shape`,
  `feature/2026-08-29-table-and-grid-navigation`, `2026-08-29-matchday-keyboard-flow`,
  `testing/2026-08-30-e2e-keyboard-strategy`, `architecture/2026-08-30-adoption-sequencing`,
  `feature/2026-08-30-user-key-binding-overrides` — all under
  `.agents/notes/proposed/`, linked in *Implementation Decisions*.
- **Open fog, deliberately not resolved here** (per ADR-0010, `Not yet specified` stays unresolved
  until a named owner resolves it):
  - **Screen density.** Keyboard navigation may reward denser squad/market tables; whether the
    screens change what they show is a product question to decide against the shipped level-3
    experience (Stage 5), not a decision this spec can pre-empt.
  - **Orphaned provisional-save cleanup.** A process kill mid-creation leaves an unreclaimed
    provisional database entry; acceptable for v1 and recorded in the router note as unresolved — do
    not silently "fix" it in this effort.
  - **Authoritative screen inventory.** The route tree must be reconciled against the final screen
    list at Stage 2; the plan names seven career screens plus the creation flow and save list, and
    the tier table's nine entries — reconcile, don't assume.
  - **`g b` across lifecycle scopes.** Back navigation may cross the creation ↔ career boundary in
    confusing ways; the focus coordinator may need to filter cross-scope back navigation — resolve
    during Stage 2, not by guessing here.
- The help overlay's availability markers are a snapshot at open time; the binding table is always
  accurate — that staleness is accepted.
- The Match Day substitution caps are server-reported and authoritative; renderer validation is a
  UX guard that the backend still enforces.
- The rendered bindings may be rebound per ticket 14; the table in this spec describes the coded
  defaults, and "Primary" always means Cmd on macOS and Ctrl on Windows/Linux.
- The teaching splash shows on first load of a career screen, not on the creation step itself, so
  the player has context for what the keyboard does.