# Group A reconciliation ledger

The specs in this directory are an **import**, not a set of requirements. They read as generated from a
generic template rather than authored against this game, and they routinely describe subsystems this
project has never decided to build. This ledger records, per spec section, every place the import is
knowingly not followed, and why.

It is an index, not a store. A row states the divergence in one line and points at the decision that
carries it. Anything needing more than a line belongs in an Agent Note under
[.agents/notes/](../../../.agents/notes/), with the row's Anchor linking to it.

The import files are never edited. Their value is that you can always see what arrived.

## How to read a row

| Field | Meaning |
|---|---|
| Sections | The cited import sections: file, `§N`, and the heading text. Heading text is carried because this import's numbering is not trusted to be stable. |
| Kind | One of the four below. |
| What the spec asks | One line, so the ledger is readable without opening a 1,700-line import. |
| Disposition | What this project does instead, or nothing. |
| Anchor | Meaning set by Kind — the mandatory field that stops an entry being an unsupported assertion. |

### Kinds

| Kind | Meaning | Anchor holds | Can it return? |
|---|---|---|---|
| `out-of-scope` | Ruled permanently outside this game. | The reason. | No. |
| `contradicted` | This codebase already made an incompatible decision. | The Agent Note or `CONTEXT.md` term carrying that decision. | Only if that decision is overturned. |
| `deferred` | Wanted, in scope, not built. | The owning spec group, or `unscheduled`. | Yes. |
| `renamed` | The concept exists here under different vocabulary; behaviour agrees. | The `CONTEXT.md` term. | N/A — this row asserts agreement. |

Sections that are followed as written get **no row**. What that silence means depends on the screen's
status line:

| Status | What silence asserts |
|---|---|
| `Audited` | Everything not listed below is followed. A section-by-section pass was made. |
| `Reviewed` | Nothing. The rows are the material conflicts a single-session pass found; unlisted sections were not individually checked. |
| `Not yet audited` | Nothing. |

`Reviewed` exists because a full `Audited` pass costs roughly one session per fifteen import sections,
and the surviving screens carry 807 of them. Screen 1 is `Audited`; the rest are `Reviewed` unless a
ticket says otherwise. The trade is deliberate: a `Reviewed` screen can hide a followed-or-not question
that an `Audited` screen cannot.

Every screen below already carries rows, because the **blanket scope trim** ran across the whole group
before any screen was audited. Those rows are all `out-of-scope` and each screen's preamble says so.
They narrow what an audit has to read; they do not make the screen audited.

`Screen 2: New Game, Database Initialization` appears in full in two files. `02_new_game.md` is
canonical; the copy inside `01_app_sheell.md` is redundant and is not audited separately.

## Coverage

| Screen | Import file | Status |
|---|---|---|
| 1 Main Menu | [01_app_sheell.md](01_app_sheell.md) | Audited |
| 2 New Game, Database Initialization | [02_new_game.md](02_new_game.md) | Not yet audited |
| 3 League and Nation Selection | [03_league_and_nation_selection.md](03_league_and_nation_selection.md) | Not yet audited |
| 4 Competition Detail Selection | [04_competition_detail_selection.md](04_competition_detail_selection.md) | Not yet audited |
| 5 Database Size and Performance Options | [05_database_size_and_performance_options.md](05_database_size_and_performance_options.md) | Not yet audited |
| 6 Game Loading and World Generation | [06_game_loading_and_world_generation.md](06_game_loading_and_world_generation.md) | Not yet audited |
| 7 Add Manager | [07_add_manager.md](07_add_manager.md) | Not yet audited |
| 8 Manager Personal Details | [08_manager_personal_details.md](08_manager_personal_details.md) | Not yet audited |
| 9 Manager Nationality and Languages | [09_manager_nationality_and_languages.md](09_manager_nationality_and_languages.md) | Not yet audited |
| 10 Manager Background | [10_manager_background.md](10_manager_background.md) | Not yet audited |
| 11 Club Selection | [11_club_selection.md](11_club_selection.md) | Not yet audited |
| 12 Manager Confirmation | [12_manager_confirmation.md](12_manager_confirmation.md) | Not yet audited |
| 13 Load Saved Game | [13_load_saved_game.md](13_load_saved_game.md) | Not yet audited |
| 14 Save Game and Save As | [14_save_game_and_save_as.md](14_save_game_and_save_as.md) | Not yet audited |
| 15 Delete Saved Game | [15_delete_saved_game.md](15_delete_saved_game.md) | Not yet audited |
| 16 Game Preferences | [16_game_preferences.md](16_game_preferences.md) | Not yet audited |
| 17 Display and Sound Options | [17_display_and_sound_options.md](17_display_and_sound_options.md) | Not yet audited |
| 18 Game Status | [18_game_status.md](18_game_status.md) | Removed — group-a-reconciliation ticket 05 |
| 19 Manager Status | [19_manager_status.md](19_manager_status.md) | New design — group-a-reconciliation ticket 06 |
| 20 Retire Manager | [20_retire_manager.md](20_retire_manager.md) | New design — group-a-reconciliation ticket 07 |
| 21 Quit Game Confirmation | [21_quit_game_confirmation.md](21_quit_game_confirmation.md) | New design — group-a-reconciliation ticket 08 |

Ticket references are deliberately unlinked: they live under `.scratch/`, which is cleared when an
effort is archived, and this ledger outlives the effort that produced it.

## Screen 1: Main Menu

Status: **Audited** against the shell implementation (group-a-reconciliation ticket 04, 2026-08-30).
Everything not listed below is followed. The implementation audited is `apps/desktop/src/renderer/`
(`router/`, `navigation/`, `keymap/`, `actions/`, `KeyboardSpine.tsx`, `router/saveList.tsx`) plus
`apps/desktop/src/main/index.ts`.

| Sections | Kind | What the spec asks | Disposition | Anchor |
|---|---|---|---|---|
| §1 Purpose, §3 Screen structure, §5 Navigation behavior (§5.3 Multiplayer), §8 Persistent state, §9 Commands emitted by the screen, §14 Recommended tests | `out-of-scope` | A `Network / Multiplayer` menu entry with Host game, Join game, and Load multiplayer career; a `multiplayerAvailable` flag; an `OPEN_MULTIPLAYER` command; a network transport dependency; and tests for the disabled state. | None of it exists. The menu's third entry is not reserved. | The multiplayer, network, and cloud axis is removed wholesale from this project. |
| §15 Clean-room constraints | `out-of-scope` | Guidance on avoiding protected expression: original naming, artwork, and data. | Not audited as screen behaviour. | Non-normative import scaffolding — authoring guidance, not a requirement on any screen. |
| Throughout ("Main Menu") | `renamed` | The application's entry point is the **Main Menu**. | The entry point is the **Save List**, the route at `/`. | [Save List](../../../CONTEXT.md) — the term lists `Main Menu` and `title screen` as the words to avoid. |
| §3.4 Primary menu group, §5.2 Load Career | `contradicted` | A centred vertical group of six large menu rows, from which `Load Career` *transitions* to a separate saved-game browser. | There is no menu group and no transition: the entry point already is the browser. `saveList.tsx` renders a list of Saves plus one `Start New Career` button. The empty state §5.2 asks for is present in place — "No saves yet." alongside that button. | [Save List](../../../CONTEXT.md) — "the only navigation destination outside a Save: it lists existing Saves and starts the creation flow". |
| §1 Purpose, §5.4 Preferences, §10.2 Preferences cannot load | `deferred` | A menu entry opening application-level settings that apply with no career loaded, degrading to safe defaults with a nonblocking warning when they fail to load. | No preferences surface exists anywhere in the app. | Group A [Screen 16 Game Preferences](16_game_preferences.md). The entry point that would reach it is unowned; ticket 09 holds the navigation surface. |
| §1 Purpose, §5.5 Credits | `deferred` | A Credits entry opening a scrollable informational page with a Back action. | Not built — no screen, no route, no destination. | `unscheduled`. |
| §1 Purpose, §5.6 Exit | `deferred` | An Exit entry that opens a confirmation before terminating. | The Save List offers no way to quit. The application closes only through the window control, and `main/index.ts` calls `app.quit()` on `window-all-closed` with nothing in between. | Group A [Screen 21 Quit Game Confirmation](21_quit_game_confirmation.md). |
| §7 Exit confirmation dialog | `contradicted` | The dialog warns that "Any unsaved setup changes will be lost." | It will not. | [Save](../../../CONTEXT.md) — a Save is durable at commit, so there is no unsaved progress to warn about. Screen 21 §4 carries the same divergence. |
| §5.1 Start New Career | `contradicted` | Main Menu → Database Initialization → League Selection → Database Creation → Manager Creation → Club Selection. | Three creation steps at `/create/step-1..3`, with league and database selection absent as separate stages. | [New game flow sequence](../../../.agents/notes/proposed/feature/2026-08-29-new-game-flow-sequence.md) |
| §5.1 Start New Career | `contradicted` | The journey terminates at a **Career Inbox**. | It terminates at the Squad screen; `saveList.tsx` navigates to `{ type: "squad" }` on load, and `CareerIndexRedirect` does the same. | [No onboarding inbox](../../../.agents/notes/proposed/architecture/2026-08-29-no-onboarding-inbox.md) — v1 ships no inbox, news screen, or message feed. |
| §9 Commands emitted by the screen | `renamed` | The screen emits named application commands (`START_NEW_CAREER`, `OPEN_LOAD_GAME`, …) rather than containing career logic. | The same separation exists as registry Actions with stable kebab-case ids, dispatched by id. | [Screen operations become a first-class Action registry](../../../.agents/notes/implemented/architecture/2026-08-29-action-model.md) |
| §9 Commands emitted by the screen | `deferred` | Every menu choice is a dispatchable named command. | `saveList` is a declared `ScreenName` and action scope, but no Action in `allActions.ts` uses it. Both Save List buttons are raw `onClick` closures, so neither operation reaches the command palette, the help overlay, or the key map. | [Action registry](../../../.agents/notes/implemented/architecture/2026-08-29-action-model.md) — its "all-or-nothing per screen" rule makes the Save List an unconverted screen. |
| §4.1 Menu button, §11 Accessibility (focus visibility, no colour-only state) | `deferred` | Each control carries `idle`/`pointer_hover`/`keyboard_focused`/`pressed`/`disabled` states, with focus always visible and state never conveyed by colour alone. | The Save List's buttons have a hover colour change and nothing else: no focus ring, no pressed state, no disabled state, no `tabIndex`. | [Intra-screen focus model](../../../.agents/notes/proposed/architecture/2026-08-29-intra-screen-focus-model.md) — proposed, unimplemented on this screen. |
| §6 Keyboard interaction (`Up`, `Down`, `Home`, `End`), §13 criterion 1 | `deferred` | Arrow keys move between menu items and `Home`/`End` jump to the ends. | The Save List declares no roving region, so its controls are reachable by native `Tab` only. It is also absent from the tiering table, which covers nine screens and not this one; its two controls put it at level 2 minimum under that note's own rule. | [Screen keyboard tiers](../../../.agents/notes/proposed/feature/2026-08-29-screen-keyboard-tiers.md) — ticket 09 absorbs the assignment. |
| §6 Keyboard interaction (`Escape`) | `contradicted` | `Escape` closes a dialog **or returns from a secondary menu**. | `Escape` closes the topmost transient layer and never navigates. Returning to the previous screen is the `g b` Action. | [Global key map](../../../.agents/notes/implemented/feature/2026-08-29-global-key-map.md) — "Layer stack: splash → select → palette → help → prefix; never navigates". |
| §6 Keyboard interaction (`Alt+Enter`), §10.4 Unsupported display configuration | `deferred` | `Alt+Enter` toggles fullscreen; an unsupported display falls back to windowed mode at an accessible minimum resolution, recording diagnostics. | Unbound. `main/index.ts` opens a fixed 1200×800 `BrowserWindow` and inspects no display capability. | Group A [Screen 17 Display and Sound Options](17_display_and_sound_options.md). |
| §6 Keyboard interaction (focus wrap) | `deferred` | Focus wraps at the ends of the menu only when an accessibility preference says so. | Nothing decides wrapping either way, and there is no accessibility-preferences surface to configure it from. | [Intra-screen focus model](../../../.agents/notes/proposed/architecture/2026-08-29-intra-screen-focus-model.md) owns the arrow/`Home`/`End` contract; whether wrapping is user-configurable belongs to [Screen 16](16_game_preferences.md). |
| §2 Intended emotional effect, §3.2 Background layer, §3.3 Product identity area, §12 Responsive behavior | `deferred` | A restrained early-2000s desktop-software look: a quiet background layer, a product identity area carrying title and database edition, a centred panel, wider margins on ultrawide displays, a preserved minimum viewport. | The Save List is flat `bg-slate-950` with default Tailwind type, left-aligned at `p-8`, inside a fixed-size window with no responsive handling. Only the title is present. | [Visual design tokens and chrome-blue retro frame](../../../.agents/notes/proposed/architecture/2026-08-29-visual-design-tokens.md) — proposed, unimplemented. |
| §3.3 Product identity area, §4.2 Footer, §8 (`currentVersion`, `databaseVersion`) | `deferred` | A low-emphasis footer distinguishing the application version from the football-database version, plus a build identifier. | No footer, and neither version is read or surfaced anywhere in the renderer. | `unscheduled`. |
| §4.2 Footer, §8 (`enabledMods`) | `out-of-scope` | An active-modification indicator listing enabled mods. | No such indicator. | The game has no mod system: nothing loads third-party content, so there is nothing to enable, list, or indicate. Recorded by ticket 04. |
| §8 (`updateStatus`) | `out-of-scope` | The menu tracks an online update check across `not_checked` / `checking` / `up_to_date` / `update_available` / `offline` / `error`. | No update check exists. | Same axis as off-device telemetry: the app has no backend to query and no update channel. |
| §8 (`lastOpenedSaveId`) | `deferred` | The menu remembers the last opened save. | Not tracked. The Save List lists every Save in repository order with no emphasis or ordering. | `unscheduled`. |
| §10.1 Save repository unavailable | `deferred` | A concise explanation, a retry action, a path to storage preferences, and a safe route to New Career. | `SaveListScreen` discards the failure: `listSaves()` returns early on `Result.isFailure`, so a broken repository is indistinguishable from having no Saves. Nothing is explained and nothing can be retried. | Owned by the `save-list-error-handling` effort, ticket 01. Cut as a defect rather than left to the Group A spec assembly; it is not covered by the stale-entry decision below. |
| §10.3 Corrupt last-save metadata | `contradicted` | A corrupt or missing save must not auto-load, must leave `Load Career` available, and must be **marked** in the saved-game browser. | Nothing auto-loads, and the list stays available — but a stale entry is a silent no-op: `handleContinue` returns early on failure and the entry is never marked. | [Save management edge case e2e coverage](../../../.agents/notes/implemented/testing/2026-08-28-save-management-edge-cases.md) — the nonexistent-save test asserts the user "stays on the landing screen with no crash **and no error banner**". |
| §11 Accessibility (localization), §13 criterion 7 | `deferred` | Labels are localizable and expand without clipping. | No i18n layer exists; every string is a hard-coded English literal. | `unscheduled`. |
| §11 Accessibility (optional UI sounds, reduced motion) | `deferred` | UI sounds must be optional and background animation must respect reduced motion. | Neither exists yet to make optional. | Group A [Screen 17 Display and Sound Options](17_display_and_sound_options.md). |
| §13 Acceptance criteria | `deferred` | Criteria 4 (Exit requires confirmation), 6 (preferences survive restart), 7 (localization does not clip) and 8 (focus remains visible). | None hold; each restates a deferred row above rather than adding a requirement. | `unscheduled` — ticket 10 writes the replacement criteria from the rows above. |
| §14 Recommended tests (visual regression) | `deferred` | Visual regression suites across default, minimum and ultrawide resolutions, 125/150/200% UI scaling, long translated labels, and a high-contrast theme. | No visual regression harness exists. Browser-level coverage is Playwright keyboard e2e. | [e2e keyboard strategy](../../../.agents/notes/proposed/testing/2026-08-30-e2e-keyboard-strategy.md) |

Sections followed as written, called out because they are easy to misread as gaps: §8's
`hasSavedGames` is computed from `listSaves()` rather than stored as a production Boolean, exactly as
the section requires; and §9's separation of the entry screen from career logic holds — the Save List
carries no simulation state.

The screen-inventory preamble (`## A.` through `## J.`) and the second copy of Screen 2 that share this
file are likewise not audited here. See the duplicate-screen note above.

## Screen 2: New Game, Database Initialization

Status: **Not yet audited.** Rows below are the blanket scope trim only (ticket 03).

| Sections | Kind | What the spec asks | Disposition | Anchor |
|---|---|---|---|---|
| §29 Condensed LLM implementation brief | `out-of-scope` | A prose restatement of the whole file. | Not audited. Auditing it would double-count every section it summarizes. | Non-normative import scaffolding. |

The blanket trim removes nothing else from this screen. Its worker references (§9, §13, §25) are
internal discovery and validation threads, not the configurable worker policy ruled out elsewhere, so
they survive into the audit.

## Screen 3: League and Nation Selection

Status: **Not yet audited.** Rows below are the blanket scope trim only (ticket 03).

| Sections | Kind | What the spec asks | Disposition | Anchor |
|---|---|---|---|---|
| §13 Bulk actions and presets, §15 Validation rules | `out-of-scope` | Presets and warnings evaluated against "the system's recommended memory budget", including the warning `This configuration exceeds the recommended memory budget.` | The clauses are dropped; the surrounding preset and validation behaviour survives. | The app has no configurable memory budget, so the warning has no source value to compare against. |
| §34 Condensed LLM implementation brief, §35 Next planned item, `Suggested Git commit` | `out-of-scope` | A restatement, a pointer to the next file the import author intended to write, and a commit message. | Not audited. | Non-normative import scaffolding. |

## Screen 4: Competition Detail Selection

Status: **Not yet audited.** Rows below are the blanket scope trim only (ticket 03).

| Sections | Kind | What the spec asks | Disposition | Anchor |
|---|---|---|---|---|
| §41 Condensed LLM implementation brief, §42 Next planned item, `Suggested Git commit` | `out-of-scope` | A restatement, a next-file pointer, and a commit message. | Not audited. | Non-normative import scaffolding. |

The blanket trim removes nothing else. This screen is the largest fully surviving spec in Group A.

## Screen 5: Database Size and Performance Options

Status: **Not yet audited.** Rows below are the blanket scope trim only (ticket 03).

| Sections | Kind | What the spec asks | Disposition | Anchor |
|---|---|---|---|---|
| §18 Memory budget (and §18.1–§18.3), §1 Purpose (the "configure an application memory budget" goal), §30 Warning examples (near-budget, over-recommended, over-hard-limit), §45 Edge cases (guaranteed population exceeds the memory budget) | `out-of-scope` | A user-selectable working-memory budget with a `MemoryBudgetPolicy`, four budget states, and warnings driven by them. | No budget control, no budget states, no budget warnings. Estimates remain, expressed as estimates rather than as utilization of a configured ceiling. | The app exposes no configurable memory budget or worker profile; resource-policy tuning is ruled out of this project. |
| §48 Condensed LLM implementation brief, §49 Next planned item, `Suggested Git commit` | `out-of-scope` | A restatement, a next-file pointer, and a commit message. | Not audited. | Non-normative import scaffolding. |

## Screen 6: Game Loading and World Generation

Status: **Not yet audited.** Rows below are the blanket scope trim only (ticket 03).

| Sections | Kind | What the spec asks | Disposition | Anchor |
|---|---|---|---|---|
| §33 Performance requirements, §34 Resource-pressure behavior | `out-of-scope` | Respect a configured memory budget; derive worker count from a configured policy; reduce concurrency under memory, storage, thermal, and power pressure. | Those clauses are dropped. Storage-pressure handling survives, because running out of disk is reachable and has to be handled. | No configurable worker profile or memory budget; resource-policy tuning is out of scope. |
| §40 Next planned item, §39 Condensed LLM implementation brief, `Suggested Git commit` | `out-of-scope` | A restatement, a next-file pointer naming Add Manager, and a commit message. | Not audited. | Non-normative import scaffolding. |

§11 Concurrency model prescribes a worker pool under a generation coordinator. It is **not** trimmed
here: it describes internal generation architecture rather than a user-facing resource policy, and
whether world generation is concurrent at all is a decision the audit ticket owns.

## Screen 7: Add Manager

Status: **Not yet audited.** Rows below are the blanket scope trim only (ticket 03), and they consume
most of the screen.

| Sections | Kind | What the spec asks | Disposition | Anchor |
|---|---|---|---|---|
| §1 Purpose, §2 Position in the career flow, §3 Core concepts, §5 Conceptual desktop layout, §6 Screen regions, §7 Manager-slot row specification, §15 Maximum manager count, §22 Career Setup Summary (manager capacity, multiplayer mode) | `out-of-scope` | A roster of human manager slots with capacity, per-slot states, and an "add another manager" path. | No roster. A save has exactly one human manager. | Multiple human managers per career are removed wholesale from this project. |
| §9 Hot-seat local multiplayer, §10 Invite Network Manager behavior, §11 Network claim flow, §23 Multiplayer settings entry | `out-of-scope` | Hot-seat play, network invitations, claim codes, and host connection, join, and password policy. | None of it exists. | The multiplayer, network, and cloud axis. |
| §16 Ownership model, §17 Permission model, §18 Existing active manager actions, §34 Security and privacy requirements (participant permission clauses) | `out-of-scope` | Ownership of a manager record by a participant, per-participant permissions, and transfer between them. | There is one local user; nothing to own against or grant permission to. | Ownership transfer and participant permissions have no referent in a local single-player app. |
| §8 Add Local Manager behavior (steps 2–3: participant permission, slot reservation), §27 Concurrency and conflict handling, §29 Empty states (awaiting network participants) | `out-of-scope` | Permission checks, short-lived slot reservations, and conflict resolution between concurrent claimants. | No second claimant exists, so no reservation or arbitration is needed. | Multiple human managers and the network axis. |
| §40 Condensed LLM implementation brief, §41 Next planned item, `Suggested Git commit` | `out-of-scope` | A restatement, a next-file pointer, and a commit message. | Not audited. | Non-normative import scaffolding. |

| §8 Add Local Manager behavior (the remainder), §12 Manager draft lifecycle, §13 Resume Draft, §14 Remove Draft, §20 Career-without-manager state, §21 Back behavior, §24 State model, §25 State transitions, §26 Commands and events, §35 Persistence rules, §36 Observability, §37 Edge cases, §38 Acceptance criteria, §39 Recommended tests | `contradicted` | What the trim leaves: a resumable manager draft, a generated world sitting without a manager, and a Back path to the world-generation summary. | None of it exists. Generation runs *underneath* the manager step rather than before it, a provisional world is never a career, and cancelling deletes the provisional database rather than leaving a resumable draft. | [New-game flow sequence and screens](../../../.agents/notes/proposed/feature/2026-08-29-new-game-flow-sequence.md) — three steps, Manager then Club then Review, with `beginCareer` and `commitCareer`. |

**Nothing of Screen 7 survives.** The trim removes the roster, the slots, the network paths, and the
ownership model; the new-game-flow note removes everything left, because it places manager creation
*over* world generation rather than after it. There is no Add Manager screen, no managerless save, and
no manager draft to resume. Charting expected this screen to shrink; it disappears. That note is still
`proposed`, so the audit ticket confirms the anchor rather than assuming it.

## Screen 8: Manager Personal Details

Status: **Not yet audited.** Rows below are the blanket scope trim only (ticket 03).

| Sections | Kind | What the spec asks | Disposition | Anchor |
|---|---|---|---|---|
| §20 Local hot-seat privacy (and §20.1–§20.5), §1 Purpose (the hot-seat privacy goal), §6 Screen regions (the hot-seat privacy controls) | `out-of-scope` | A local access code guarding private screens between managers sharing one machine, plus a note that it does not replace network authentication. | No access code and no private-screen guard. | Hot-seat play requires multiple human managers per career, which is out of scope. |
| §3 Core concepts (multiplayer manager lists), §9 Name validation (characters prohibited by multiplayer policy), §11 Reserved and misleading names (impersonating system roles in multiplayer), §29 Concurrency and conflict handling (ownership transfer, participant loses permission), §36 Security and privacy requirements (multiplayer messages as untrusted input) | `out-of-scope` | Name policy, conflict handling, and input-trust rules framed around other participants. | Those clauses are dropped. Name normalization, validation, and the untrusted-input discipline itself all survive. | The multiplayer, network, and ownership axis. |
| Throughout ("draft ownership") | `out-of-scope` | Revalidating draft ownership before Save and Continue (§29, §31, §37, §40, §41). | Nothing to revalidate: one user, one draft. Revision and idempotency checks survive; the ownership half of each clause does not. | Ownership has no referent with a single local user. |
| §42 Condensed LLM implementation brief, §43 Next planned item, `Suggested Git commit` | `out-of-scope` | A restatement, a next-file pointer, and a commit message. | Not audited. | Non-normative import scaffolding. |

## Screen 9: Manager Nationality and Languages

Status: **Not yet audited.** Rows below are the blanket scope trim only (ticket 03).

| Sections | Kind | What the spec asks | Disposition | Anchor |
|---|---|---|---|---|
| Throughout ("draft ownership") | `out-of-scope` | Revalidating draft ownership on Continue and Save (§28, §30, §34, §35, §42, §45). | The ownership half of each clause is dropped; revision and idempotency checks survive. | Ownership has no referent with a single local user. |
| §41 Security and privacy requirements (multiplayer messages), §30 State model (state crossing network boundaries) | `out-of-scope` | Treat multiplayer messages as untrusted; serialize state across network boundaries. | No multiplayer messages, no network boundary. The process boundary between main and renderer survives and carries the same discipline. | The multiplayer and network axis. |
| §47 Condensed LLM implementation brief, §48 Next planned item, `Suggested Git commit` | `out-of-scope` | A restatement, a next-file pointer, and a commit message. | Not audited. | Non-normative import scaffolding. |

## Screen 10: Manager Background

Status: **Not yet audited.** Rows below are the blanket scope trim only (ticket 03).

| Sections | Kind | What the spec asks | Disposition | Anchor |
|---|---|---|---|---|
| §25 Difficulty and fairness (the "In multiplayer:" clause), §43 Edge cases (multiplayer policy changes capacity or budget) | `out-of-scope` | Fairness rules across several human managers, and capacity or budget policy changed by a host mid-creation. | Neither applies. | Multiple human managers per career, and host policy, are out of scope. |
| Throughout ("draft ownership") | `out-of-scope` | Revalidating draft ownership on Save and Continue (§28, §40, §44, §45). | The ownership half of each clause is dropped. | Ownership has no referent with a single local user. |
| §46 Condensed LLM implementation brief, §47 Next planned item, `Suggested Git commit` | `out-of-scope` | A restatement, a next-file pointer, and a commit message. | Not audited. | Non-normative import scaffolding. |

## Screen 11: Club Selection

Status: **Not yet audited.** Rows below are the blanket scope trim only (ticket 03).

| Sections | Kind | What the spec asks | Disposition | Anchor |
|---|---|---|---|---|
| §29 Reservation behavior, §30 Reservation expiration, §35 Multiplayer conflict handling, §11.7 Multiplayer exclusivity, §1 Purpose (resolving multiplayer conflicts), §3 Core concepts (multiplayer ownership), §8 Availability states (network synchronization) | `out-of-scope` | An expiring `AppointmentReservation` holding a role against other claimants, and transactional conflict resolution when two human managers target the same club. | No reservations and no conflict arbitration. A vacant club is available until this manager takes it. | Reservations and role conflicts exist only to arbitrate between concurrent human managers, which are out of scope. |
| §53 Acceptance criteria (criterion 16), §54 Recommended tests (multiplayer conflict, reservation ownership) | `out-of-scope` | Criteria and tests asserting two human managers cannot hold one exclusive role. | No referent. | As above. |
| Throughout ("draft ownership") | `out-of-scope` | Verifying draft and reservation ownership on Save and Continue (§36, §37, §50, §53). | The ownership half of each clause is dropped. | Ownership has no referent with a single local user. |
| §55 Condensed LLM implementation brief, §56 Next planned item, `Suggested Git commit` | `out-of-scope` | A restatement, a next-file pointer, and a commit message. | Not audited. | Non-normative import scaffolding. |

§9 Incumbent manager policy, §28 Replacement of an AI incumbent, §32 National-team selection, and §33
Dual-role policy all concern *AI* managers and survive intact.

## Screen 12: Manager Confirmation

Status: **Not yet audited.** Rows below are the blanket scope trim only (ticket 03).

| Sections | Kind | What the spec asks | Disposition | Anchor |
|---|---|---|---|---|
| §14 Ownership summary, §27 Ownership binding, §28 Manager permissions | `out-of-scope` | Bind the activated manager to an owning participant, summarize that ownership for review, and grant per-participant permissions. | No owner to bind to and no permissions to grant. | Ownership transfer and participant permissions have no referent in a local single-player app. |
| §19 Activation lock, §35 Idempotency (concurrent activation by another manager), §45 Concurrency and conflict handling, §47 Failure states (network and participant failures) | `out-of-scope` | Locking activation against a second concurrent activation and reporting when a peer wins the race. | No second actor. Idempotency against a repeated local request survives; the multi-actor race does not. | Multiple human managers per career. |
| §49 Initial destination (multiplayer lobby or manager status routing) | `out-of-scope` | Route to a multiplayer waiting state when other managers are still being created. | Routing goes straight into the career. | The multiplayer axis. |
| §54 Security and integrity requirements, §55 Persistence rules, §58 Acceptance criteria, §59 Recommended tests (ownership clauses) | `out-of-scope` | Ownership validation woven through the activation transaction's integrity, persistence, criteria, and tests. | The ownership clauses are dropped; the transactional integrity they sit inside survives. | As above. |
| §60 Condensed LLM implementation brief, §61 Next planned item, `Suggested Git commit` | `out-of-scope` | A restatement, a next-file pointer, and a commit message. | Not audited. | Non-normative import scaffolding. |

## Screen 13: Load Saved Game

Status: **Not yet audited.** Rows below are the blanket scope trim only (ticket 03), and they consume
roughly a quarter of the screen.

| Sections | Kind | What the spec asks | Disposition | Anchor |
|---|---|---|---|---|
| §24 Local and cloud synchronization states, §25 Synchronization conflict review, §26 Keep Both behavior, §27 Remote-only save, §28 Offline behavior, §29 Cloud deletion interactions in §43 Delete Save, §42 Duplicate Save (cloud copies) | `out-of-scope` | A save existing in local and remote repositories with sync state, conflict review, Keep Both resolution, remote-only download, and offline degradation. | Every save is one local SQLite file. There is no second copy to reconcile. | No cloud or remote repository exists in this project. |
| §7 Storage-location states, §11 Save row specification, §17 Filters, §19 Details panel, §22 Save type presentation (the cloud and remote facets) | `out-of-scope` | Location badges, cloud filters, and sync indicators on rows and in the details panel. | Those facets are dropped; the row, filter, and details behaviour around them survives. | As above. |
| §45 Multiplayer save ownership, §46 Network host save, §47 Join existing network career, §48 Managerless career (network claim path), §4 Save-type model (`multiplayer_host`, `multiplayer_client`) | `out-of-scope` | Save types, ownership, and load paths for hosting or joining a networked career. | Those save types and paths do not exist. | The multiplayer and network axis. |
| §20 Manager preview, §55 Runtime initialization, §70 Security and integrity requirements, §71 Persistence rules, §72 Observability, §74 Acceptance criteria, §75 Recommended tests (cloud, network, and ownership clauses) | `out-of-scope` | Cloud, network, and ownership facets threaded through preview, initialization, integrity, logging, criteria, and tests. | Those clauses are dropped; the local behaviour they surround survives. | As above. |
| §76 Condensed LLM implementation brief, §77 Next planned item, `Suggested Git commit` | `out-of-scope` | A restatement, a next-file pointer, and a commit message. | Not audited. | Non-normative import scaffolding. |

§60 Save read lease and §61 Concurrent save changes are **not** trimmed: they guard against a second
local process opening the same file, which is reachable without any network.

## Screen 14: Save Game and Save As

Status: **Not yet audited.** Rows below are the blanket scope trim only (ticket 03).

| Sections | Kind | What the spec asks | Disposition | Anchor |
|---|---|---|---|---|
| §11 Cloud-backed saving, §43 Cloud synchronization failure, §44 Cloud conflict during save, §7 Conceptual Save As layout (repository picker), §10 Repository selection (cloud targets), §24 Progress stages (upload stage), §27 Commit boundary and §29 Save success criteria (cloud-durability clauses), §50 Save result (cloud fields) | `out-of-scope` | Saving to a cloud repository, its upload progress stage, its failure and conflict handling, and whether the commit boundary waits for it. | Saving writes one local file. The commit boundary is local durability, full stop. | No cloud repository exists in this project. |
| §37 Multiplayer saving, §38 Multiplayer save permissions, §15 Save preconditions (participant permission) | `out-of-scope` | Only a permitted participant may save a networked career, and saving coordinates with peers. | No participants, no coordination. | The multiplayer and network axis. |
| §64 Security and integrity requirements, §65 Persistence rules, §66 Observability, §67 Edge cases, §68 Acceptance criteria, §69 Recommended tests (cloud and multiplayer clauses) | `out-of-scope` | Cloud and multiplayer facets threaded through integrity, persistence, logging, edge cases, criteria, and tests. | Those clauses are dropped; the local behaviour survives. | As above. |
| §70 Condensed LLM implementation brief, §71 Next planned item, `Suggested Git commit` | `out-of-scope` | A restatement, a next-file pointer, and a commit message. | Not audited. | Non-normative import scaffolding. |

§41 Permission failure is **not** trimmed: it is an operating-system filesystem permission, not a
participant permission.

## Screen 15: Delete Saved Game

Status: **Not yet audited.** Rows below are the blanket scope trim only (ticket 03).

| Sections | Kind | What the spec asks | Disposition | Anchor |
|---|---|---|---|---|
| §25 Local-only deletion, §26 Cloud-only deletion, §27 All-known-copies deletion, §28 Offline repository behavior, §29 Cloud deletion tombstones, §4 Deletion scopes (the per-repository scopes), §13 Soft delete behavior and §16 Permanent deletion behavior (cloud clauses) | `out-of-scope` | Deletion scoped per repository, tombstones propagating a deletion to other devices, and degraded behaviour when a repository is offline. | There is one repository: the local filesystem. Deletion is deletion. | No cloud or remote repository exists in this project. |
| §30 Multiplayer ownership, §31 Multiplayer deletion warning | `out-of-scope` | Only the owning participant may delete a shared career, and other participants are warned first. | No owner and no other participants. | The multiplayer and network axis. |
| §1 Purpose, §52 Security and integrity requirements, §54 Observability, §55 Edge cases, §56 Acceptance criteria, §57 Recommended tests (cloud and multiplayer clauses) | `out-of-scope` | Cloud and multiplayer facets threaded through the purpose statement, integrity, logging, edge cases, criteria, and tests. | Those clauses are dropped; local deletion behaviour survives. | As above. |
| §58 Condensed LLM implementation brief, §59 Next planned item, `Suggested Git commit` | `out-of-scope` | A restatement, a next-file pointer, and a commit message. | Not audited. | Non-normative import scaffolding. |

§36 Partial deletion outcomes and §37 Compensation behavior survive in reduced form: a partial failure
is still reachable against one filesystem, but not across repositories.

## Screen 16: Game Preferences

Status: **Not yet audited.** Rows below are the blanket scope trim only (ticket 03).

| Sections | Kind | What the spec asks | Disposition | Anchor |
|---|---|---|---|---|
| §41 Multiplayer category, §42 Multiplayer authorization, §39 Hot-seat privacy, §32 Notification preview (hiding previews from other participants), §63 Preference persistence (per-participant scope) | `out-of-scope` | A whole preferences category for connection, join, invitation, and authorization policy, plus hot-seat privacy and per-participant preference scope. | The category does not exist. Preferences are device-scoped and career-scoped only. | The multiplayer axis, and multiple human managers per career. |
| §23 Cloud synchronization, §49 Dependency behavior (settings gated on cloud sync), §20 Saving preferences (cloud clauses), §28 Background processing (background cloud upload) | `out-of-scope` | A cloud-sync preference, an upload-in-background option, and settings that depend on sync being enabled. | None exist. | No cloud repository or account service exists in this project. |
| §26 Processing profiles, §27 Worker-count policy, §25 Processing preferences (worker-count, battery, thermal, network-tolerance entries) | `out-of-scope` | User-selectable processing profiles, an explicit worker count, CPU utilization targets, and thermal response. | Not exposed. | The app has no configurable worker profile; resource-policy tuning is out of scope. |
| §40 Telemetry and diagnostics | `out-of-scope` | Opt-in product analytics, crash reports, and explicit diagnostic-bundle upload, with links to privacy information. | Nothing leaves the device, so there is no consent to collect and no privacy policy to link. Local structured logging survives and is not a preference. | The app has no backend to receive telemetry; off-device data collection is out of scope. |
| §75 Security and integrity requirements, §78 Edge cases, §79 Acceptance criteria, §80 Recommended tests (multiplayer, cloud, and telemetry clauses) | `out-of-scope` | Those axes threaded through integrity, edge cases, criteria, and tests. | Dropped. | As above. |
| §81 Condensed LLM implementation brief, §82 Next planned item, `Suggested Git commit` | `out-of-scope` | A restatement, a next-file pointer, and a commit message. | Not audited. | Non-normative import scaffolding. |

## Screen 17: Display and Sound Options

Status: **Not yet audited.** Rows below are the blanket scope trim only (ticket 03).

| Sections | Kind | What the spec asks | Disposition | Anchor |
|---|---|---|---|---|
| §44 Setting ownership and scope | `out-of-scope` | An `audioLevelScope` and `accessibilityScope` that may be `"account"`, account-synchronized theme and accessibility preferences, and a rule that cloud sync must not push a device ID to another device. | All display and audio settings are device-scoped. There is no account and no second device. | No cloud or account service exists in this project. |
| §34 Notification sounds (per-manager sounds) | `out-of-scope` | Notification sounds scoped to a particular manager. | One manager, one sound set. | Multiple human managers per career. |
| §67 Condensed LLM implementation brief, §68 Next planned item, `Suggested Git commit` | `out-of-scope` | A restatement, a next-file pointer, and a commit message. | Not audited. | Non-normative import scaffolding. |

This is the least-trimmed spec in Group A: display capability, resolution, rendering, and the full audio
and sensory-accessibility surface all survive intact.

## Screen 18: Game Status

Status: **Removed — group-a-reconciliation ticket 05.** Rows below carry the blanket scope trim (ticket 03)
and the design decision (ticket 05). The entire screen is out of scope; no dedicated route, component, or
data source remains.

| Sections | Kind | What the spec asks | Disposition | Anchor |
|---|---|---|---|---|
| §4 Information sections (Runtime), §3 Main layout, §9 Warnings (worker and memory warnings), §12 Edge cases | `out-of-scope` | Report worker-pool occupancy, memory budget utilization, and resource-pressure warnings. | Nothing to report: no worker profile, no configurable budget. | The app has no worker profile or configurable memory budget; resource-policy tuning is out of scope. |
| §1 Purpose, §4 Information sections (Session, Cloud), §11 Security, §13 Acceptance criteria, §14 Recommended tests | `out-of-scope` | Report multiplayer session state, connected participants, and cloud synchronization status. | None of it exists. | The multiplayer, network, and cloud axis. |
| §8 Read-only boundary (participant and ownership clauses) | `out-of-scope` | Redact values other participants must not see. | No other participants. | Ownership and participant permissions have no referent. |
| `Suggested Git commit` | `out-of-scope` | A commit message. | Not audited. | Non-normative import scaffolding. |
| §2 Entry points, §4 Career state, §4 Loaded world, §5 Status model (`GameStatusSnapshot`), §6 Refresh behavior, §7 Safe diagnostic summary, §10 Accessibility, §12 Edge cases (remaining), §13 Acceptance criteria (remaining), §14 Recommended tests (remaining) | `out-of-scope` | A dedicated Game Status screen with entry points, an async `GameStatusSnapshot`, refresh with stale-response handling, safe-diagnostic-copy action, and accessibility for a technical dashboard. | No dedicated screen. Survivors (season/save-name orientation, sacked badge, app/schema version) redistribute into CareerChrome, Save List, and a new About dialog — none warrant a route or a `GameStatusSnapshot` type. No async refresh needed for synchronous local data. | [Game Status screen removed](../../../.agents/notes/proposed/architecture/2026-08-30-game-status-screen-removed.md) |

Nothing of Screen 18 survives as a screen. The Game Status entry is removed from navigation, no
`GameStatusSnapshot` schema is added, and no async refresh machinery is built.

## Screen 19: Manager Profile (was Manager Status)

Status: **Audited — ticket 06 resolved.** The screen is redefined as the single-manager profile-and-tenure
view, named "Manager Profile". "Manager Status" is retired as a domain term; the `manager_status` table
keeps its technical name but is not a player-facing concept.

| Sections | Kind | What the spec asks | Disposition | Anchor |
|---|---|---|---|---|
| §2 Main layout, §3 Manager states, §4 Row content, §6 Switch Control, §9 Add Manager, §11 Manager summary panel (as a per-row panel), §13 Refresh and concurrency | `out-of-scope` | A table of the career's human managers with per-row state, control handover between them, and an Add Manager action. | There is one manager. The screen is that manager's profile, not a roster. | Multiple human managers per career are removed wholesale. |
| §7 Network reconnect, §1 Purpose (network and ownership framing), §17 Edge cases | `out-of-scope` | Disconnected and reconnecting manager states, and a reconnect action. | No connection to lose. | The multiplayer and network axis. |
| §8 Manage Ownership, §12 Permissions, §14 State model (ownership fields), §16 Security and privacy, §18 Acceptance criteria, §19 Recommended tests | `out-of-scope` | Transfer ownership of a manager record between participants, and per-participant permission grants. | No ownership and no permissions. | Ownership transfer and participant permissions have no referent in a local single-player app. |
| `Suggested Git commit` | `out-of-scope` | A commit message. | Not audited. | Non-normative import scaffolding. |
| §5 Open Profile | `renamed` | Click a roster row to open that manager's profile. | The profile is a dedicated career tab (`/career/$saveId/manager`) reached from CareerChrome or a `g` binding, not by clicking a roster row. Content: manager name, archetype, four pillar values, club, season, tenure, and an Active/Archived badge. | [Manager Profile screen Agent Note](../../../.agents/notes/proposed/feature/2026-08-30-manager-profile-screen.md) |
| §11 Manager summary panel (single-manager form) | `contradicted` | A per-row panel showing that manager's state, permissions, and connection status. | A full-screen dedicated view showing profile identity only — name, archetype, pillars, club, season, tenure. Sacking/outcome data stays on Season Summary. No state, permissions, or connection fields. | [Manager Profile screen Agent Note](../../../.agents/notes/proposed/feature/2026-08-30-manager-profile-screen.md) |
| §15 Accessibility | `deferred` | Address keyboard navigation, screen-reader labels, focus management, colour contrast, and reduced-motion compliance for a manager roster table with per-row interactive controls. | The screen is a career tab inheriting existing CareerChrome keyboard navigation and the project's accessibility conventions. A dedicated accessibility ticket for the new screen is deferred to the implementation ticket. | The project's screen-keyboard-tiers rule and CareerChrome keyboard model. |

The survivors above replace the roster and manager-states content with profile identity data (name,
archetype, pillar values, club, season, tenure) and a passive Active/Archived status badge. §10 Retire
Manager is owned by ticket 07.

## Screen 20: Retire Manager

Status: **New design — group-a-reconciliation ticket 07, resolved 2026-08-30.** The design is
[Retire Manager, and the Archived Save concept](../../../.agents/notes/proposed/feature/2026-08-30-retire-manager.md).
Rows below carry the blanket scope trim (ticket 03) and the rulings that resolution made.

| Sections | Kind | What the spec asks | Disposition | Anchor |
|---|---|---|---|---|
| §14 Multiplayer behavior, §4 Preconditions (multiplayer clauses), §21 Edge cases (multiplayer clauses) | `out-of-scope` | Notify other participants, release the retiring manager's session, and block retirement while a networked career is mid-turn. | None of it applies. | The multiplayer and network axis. |
| §5 Consequences, §10 Retirement transaction, §16 Failure and rollback (ownership clauses), §13 Last active manager (handover to another human manager) | `out-of-scope` | Release ownership of the manager record and hand the career to a remaining human manager. | There is no other human manager and no ownership to release. Retiring the only manager ends the career. | Multiple human managers per career, and ownership transfer. |
| §2 Retirement is not resignation (the "Resign instead" alternative) | `out-of-scope` | Offer resignation as an alternative to retirement. | Not offered. | Resignation only means something with an unemployed-manager job market to return to, which belongs to Group N, not the application shell. |
| §6 Organization continuity | `out-of-scope` | Appoint an interim manager and preserve club continuity across the handover. | No interim-manager machinery. | Settled during charting: retirement reuses the existing sacked-archive path, differing in cause and messaging only. |
| §9 Confirmation policy (`requireAcknowledgment`, `requireTypedManagerName`), §3 Conceptual layout (the acknowledgement checkbox) | `contradicted` | Retirement is confirmed by an acknowledgement checkbox, optionally reinforced by typing the manager's name. | Confirmed by an Irreversibility Disclosure plus a distinct destructive confirm button. No checkbox, no typed name. | [Retire Manager](../../../.agents/notes/proposed/feature/2026-08-30-retire-manager.md) — the checkbox duplicates a disclosure the repo already defines; typed confirmation is heavier than deleting the save. |
| §9 Confirmation policy (`createRecoveryCheckpoint`), §10 Retirement transaction (checkpoint and lock steps), §16 Failure and rollback, §20 Security and integrity | `out-of-scope` | A recovery checkpoint written before mutation, manager and organization locks, expected-revision checks, idempotency keys, and a rollback path. | None exist. The command is one SQL transaction against a local file. | No concurrent writer and no remote caller; the event log is the audit trail. |
| §11 Command model, §12 Retirement result | `contradicted` | `RetireManagerCommand` carries career/manager ids, expected revisions, an acknowledgement fingerprint, a controller context and a request id; the result returns a transaction id, history entry id, checkpoint id and next destination. | The command carries the `SaveId` alone and returns nothing but success. | [Retire Manager](../../../.agents/notes/proposed/feature/2026-08-30-retire-manager.md) — every other field addresses multi-manager, multi-participant, or checkpoint machinery that is out of scope. |
| §4 Preconditions (the remainder) | `contradicted` | Seven preconditions, covering authority, revisions, transactions, save targets and host availability. | Two: the save is not already archived, and it is not mid-match. | [Retire Manager](../../../.agents/notes/proposed/feature/2026-08-30-retire-manager.md) |
| §13 Last active manager, §18 Success state | `contradicted` | A success screen offering to switch to another manager, add a manager, or return to the Main Menu, plus a warning that simulation time will not advance. | Confirming returns to the Save List with the save shown as archived. No success screen. | [Retire Manager](../../../.agents/notes/proposed/feature/2026-08-30-retire-manager.md) — the offered actions have no referent with one manager per save. |
| §2 Retirement is not resignation (the state model) | `renamed` | The retired manager "becomes historical and cannot submit career commands". | The save becomes an Archived Save: viewable, read-only, no further commands. Retirement is one of its two causes, sacking the other. | [Archived Save](../../../CONTEXT.md) |
| `Suggested Git commit` | `out-of-scope` | A commit message. | Not audited. | Non-normative import scaffolding. |

## Screen 21: Quit Game Confirmation

Status: **New design — group-a-reconciliation ticket 08.** Rows below carry only what the map settled
during charting. Ticket 08 owns the remaining design and may add rows; the absence of a row for a
section is not yet a claim that the section is followed.

| Sections | Kind | What the spec asks | Disposition | Anchor |
|---|---|---|---|---|
| §1 Purpose | `out-of-scope` | The dialog reports pending cloud synchronization, multiplayer state, and background transactions. | Reports none of them. | No cloud, network, or multiplayer axis exists in a local single-player app. |
| §2 Quit intents | `out-of-scope` | `QuitIntent` includes `leave_multiplayer_session`. | The intent does not exist. | As above. |
| §2 Quit intents, §3 Conceptual layout | `renamed` | Quitting returns the user to the **Main Menu**. | Returns to the save list. | [Save List](../../../CONTEXT.md) |
| Throughout ("career") | `renamed` | The unit being quit is a **career**. | The unit is a save: one SQLite file, addressed by `SaveId`. | [Save](../../../CONTEXT.md) |
| §3 Conceptual layout | `out-of-scope` | The dialog body shows `Cloud status:` and `Multiplayer status:` lines. | Neither line exists. | No cloud or multiplayer axis. |
| §4 Unsaved-progress model | `contradicted` | An `UnsavedCareerState` model distinguishes current from last-saved revision, with pending local, network, and cloud work. | No such model. Commands are durable when they commit, so there is no unsaved progress to describe. | [Domain-bounded deciders](../../../.agents/notes/implemented/architecture/2026-08-27-domain-bounded-deciders-and-chunked-resimulation.md) — single local SQLite file, single writer, crash-durability outbox rejected. Ticket 08 owns the explicit note. |
| §5 Save and Quit | `contradicted` | A `Save and Quit` action runs the save workflow, waits for a durable save, then shuts down. | The action does not exist; there is nothing to flush before quitting. | As §4. |
| §6 Quit Without Saving | `contradicted` | A `Quit Without Saving` action discards changes since the last save, behind a second confirmation naming the loss. | The action does not exist; nothing is discardable. | As §4. |
| §7 Pending operations | `out-of-scope` | Network command synchronization and cloud conflict resolution can block quitting. | Neither can block. | No cloud or multiplayer axis. |
| §8 Cloud synchronization, §9 Multiplayer behavior, §10 Host warning | `out-of-scope` | Wait-for-sync choices, client and host leave protocols, participant disconnection warnings. | None of it is built. | The multiplayer, network, and cloud axis is removed wholesale from this project. |
| §11 Quit command | `contradicted` | `RequestQuitCommand` carries `saveDecision: "save" \| "discard" \| "not_required"`. | No save decision is offered, so the field has no values to carry. | As §4. |
| §12 Idempotency | `contradicted` | Repeated quit requests must avoid duplicate saves and duplicate multiplayer leave messages. | Neither hazard exists. | As §4, plus no multiplayer axis. |
| §13 Shutdown sequence | `out-of-scope` | The sequence completes cloud sync, closes match and processing workers, and leaves the multiplayer session. | Those steps are absent. | No cloud or multiplayer axis; the app has no configurable worker pool. |
| §14 State model | `out-of-scope` | `QuitConfirmationState` carries `cloudState` and `multiplayerState`. | Neither field exists. | No cloud or multiplayer axis. |
| §14 State model, §15 State transitions | `contradicted` | `unsavedState`, `localSaveState`, and the `SAVE_WORKFLOW` / `CONFIRM_DISCARD` / `REVERTING_RUNTIME` branches. | None exist. The dialog has one question and two answers. | As §4. |
| §16 Failure states | `contradicted` | Messaging for a failed save and a multiplayer session that could not close. | Neither failure is reachable. | As §4, plus no multiplayer axis. |
| §17 Application close without active career | `out-of-scope` | Closing with no career loaded must still consider pending cloud uploads and background downloads. | Neither exists. | No cloud or network axis. |
| §18 Accessibility | `contradicted` | The loss summary must be programmatically associated with `Quit Without Saving`. | There is no loss summary. | As §4. |
| §19 Keyboard interaction | `contradicted` | `Ctrl+S` selects Save and Quit. | Unbound here; there is no save action to select. | As §4. |
| §20 Security and integrity | `out-of-scope` | Enforce host and participant permissions; preserve local durability separately from cloud state. | Neither applies. | No multiplayer or cloud axis. |
| §21 Edge cases | `out-of-scope` | Cloud provider offline, host network loss, host recovery policy. | Not reachable. | As above. |
| §22 Acceptance criteria | `contradicted` | Criteria 2–5 and 7–9 assert save-decision, discard-confirmation, and multiplayer behaviour. | Those criteria do not apply; ticket 08 writes the replacements. | As §4, plus no multiplayer axis. |
| §23 Recommended tests | `contradicted` | Test list covers save failure, discard confirmation, cloud queues, and host and client leave. | Those cases have no referent. | As §4, plus no multiplayer axis. |
