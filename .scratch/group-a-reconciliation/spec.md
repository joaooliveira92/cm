# Group A Reconciliation Spec

Status: ready-for-agent

## Problem Statement

The Group A application shell and game lifecycle remaining feature requires a comprehensive reconciliation of 21 screens against their imported specifications. This involves auditing existing implementations (screens 1–17) and defining new designs for screens 18–21 (Game Status, Manager Status, Retire Manager, and Quit Confirmation). The goal is to ensure all screens meet their documented requirements, align with the established domain model, and maintain consistency across the application shell.

Key conflicts exist between the imported specs and the codebase's existing architectural decisions — these are recorded as rows in the deviation register rather than silently resolved. The imported specs read as generated from a generic template rather than authored against this specific game, and they routinely describe subsystems this project has never decided to build (multiplayer, configurable budgets, etc.).

## Solution

A unified reconciliation spec and deviation register that:
- Provides a `spec.md` covering all 21 Group A screens, stating per screen what the implementation must do
- Records every place the imported spec is knowingly not followed, with mandatory anchors pointing to Agent Notes or CONTEXT.md terms
- Maintains one implementation decision per bullet with gist+link to the source ticket's Agent Note
- Ensures no code changes are required beyond what the reconciliation ledger already captures
- Aligns the new screens (18–21) with the established domain model and architectural decisions

The reconciliation ensures that where the spec and codebase disagree, the codebase's existing decisions win unless a ticket explicitly overturns them, and the disagreement is written into the register rather than silently dropped.

## User Stories

1. As a player, I want to launch the application and navigate from the Save List to start a new career so that I can manage a football club
2. As a player, I want a new game flow that initializes a database, generates the world, and transitions to Club Selection so that I can begin managing my team
3. As a manager, I want to see my manager profile and tenure displayed so that I can track my career progress
4. As a manager, I want the Manager Status screen to show profile identity with an Active/Archived badge so that I can assess my career health
5. As a manager, I want to retire my manager so that my career can be archived as a read-only save
6. As a manager, I want the retirement process to use the `ManagerRetired` event and `archived_cause` column so that the reason for retirement is recorded
7. As a manager, I want retirement to be confirmed by an Irreversibility Disclosure dialog so that I understand the action is permanent
8. As a player, I want to quit the application with a safety confirmation guard so that I don't accidentally close the app
9. As a player, I want the quit confirmation to guard the close_application intent while allowing provisional-career creation to proceed with a warning so that unsaved work is protected
10. As a player, I want the quit dialog to be renderer IPC-mediated with no keyboard shortcut so that accidental keypresses are caught
11. As a player, I want the Save List to provide navigation and actions (Enter to select, C to Continue) so that I can move through the application efficiently
12. As a player, I want the Save List chrome bar at the top with Preferences, Credits, and Quit buttons so that I can access app-level features
13. As a player, I want the Quit button to be a lightweight dialog that reuses the before-quit guard so that the quit flow is consistent
14. As a player, I want the Game Status screen to be ruled out of scope with reasoning recorded so that I understand why it's not built
15. As a developer, I want the deviation register to record all spec-codebase divergences with mandatory anchors so that the audit trail is complete and navigable
16. As a project maintainer, I want every screen's status line (Audited/Reviewed/Not yet audited) to be accurate so that the reconciliation gate is reliable
17. As a contributor, I want new screens added to Group A to follow the same reconciliation pattern so that the process scales beyond the initial 21 screens
18. As a player, I want the application shell to have no way to quit, open settings, or read credits beyond the Save List so that the entry point is consistent
19. As a player, I want the application's persistent state to be durable at commit so that no unsaved progress is ever lost
20. As a manager, I want the manager profile screen to avoid colliding with Board Objective or Verdict vocabulary so that domain terms remain unambiguous

## Implementation Decisions

- The application shell (Screen 1) serves as the primary navigation entry point and must declare no way to quit, open settings, or read credits; the Save List is the only accessible menu (source: `issues/04-audit-application-shell.md`)
- Screen 1 audited against imported spec 01 with 28 ledger rows, no code changed; the entry point is the Save List, not a Main Menu (source: `issues/04-audit-application-shell.md`)
- Screen 2 (New Game) canonical file is `02_new_game.md`; the copy in `01_app_shell.md` is redundant and not audited separately (source: `issues/04-audit-application-shell.md`, `issues/15-screen-2-new-game.md`)
- Screen 18 (Game Status) ruled out of scope; survivors (career date/season, save identity, world entity counts, app version, save schema version, sacked-and-archived status) redistributed into CareerChrome, Save List, and About dialog (source: `issues/05-screen-18-game-status.md`)
- Screen 19 becomes the single-manager "Manager Profile" screen showing profile identity (name, archetype, pillars, club, tenure) with a passive Active/Archived badge; all sacking/outcome detail stays exclusive to Season Summary; "Manager Status" retired as domain term (source: `issues/06-screen-19-manager-status-redefinition.md`)
- Screen 20 (Retire Manager) treats retirement as a second cause of Archived Save: a `ManagerRetired` event and nullable `archived_cause` column replacing the `sacked` boolean, guard renamed to `assertSaveNotArchived`, confirmed by an Irreversibility Disclosure (source: `issues/07-screen-20-retire-manager.md`)
- Screen 21 (Quit Confirmation) guards one intent (close_application) with one provisional-career exception; before-quit guard with renderer IPC; dialog-only (no keyboard shortcut for quit) (source: `issues/08-screen-21-quit-confirmation.md`)
- Save List keyboard tier at Level 2; Enter to select focused save row; C to Continue on most-recent save (source: `issues/09-navigation-surface-for-new-screens.md`)
- Boot-screen chrome: app-chrome bar at top of Save List with three icon-only buttons — Preferences, Credits, Quit — all lightweight dialogs matching Retire and Quit patterns (source: `issues/09-navigation-surface-for-new-screens.md`)
- Command palette: no entries for boot-screen destinations; palette is for career-mode navigation and screen-local actions only (source: `issues/09-navigation-surface-for-new-screens.md`)
- Blanket scope trim across Group A: screens 2, 3, 4, 6, 8, 9, 10, 12 and 17 lose only scaffolding and a few clauses; screens 13–16 lose about a quarter each; screen 7 disappears entirely (~25,000 lines survive across sixteen screens) (source: `issues/03-blanket-scope-trim.md`)
- Multiplayer / network / cloud / multi-manager axis removed wholesale from this project (source: `issues/03-blanket-scope-trim.md`, `issues/04-audit-application-shell.md`)
- Agent Notes are the sole decision record; ten ADRs migrated to `implemented/` notes, two absorbed by existing notes, `docs/adr/` deleted, two vendored skills forked, `check:all` green (source: `issues/01-decision-record-layer-after-adr-removal.md`)
- Deviation register format and home: per spec group at `docs/specs/<group>/RECONCILIATION.md` — one row per `## N.` section, four kinds (`out-of-scope`/`contradicted`/`deferred`/`renamed`) each with a mandatory anchor (source: `issues/02-deviation-register-format.md`)
- Screen 1 declared Audited against shell implementation; 28 ledger rows, no code changed; entry point is Save List (source: `issues/04-audit-application-shell.md`)
- Screen 2 status: Reviewed (ticket 15, 2026-08-31) with 28 content sections all contradicted by the three-step creation flow with invisible world generation (source: `issues/15-screen-2-new-game.md`)
- Screen 13 as a thin complement to the shell audit (source: `issues/11-slice-the-screen-2-17-audit.md`)
- Screens 3, 4, 5 have no routes, components, or screens; all surviving sections classified `contradicted` — fixed single 20-club league and three-step Manager→Club→Review creation flow leave no room (source: `issues/12-absence-creation-screens.md`)
- Screens 9, 10 have no routes or components — no nationality/languages or background concept exists in the codebase; all 91 surviving sections classified `contradicted` against the three-step creation flow and the Archetype/Pillar identity model (source: `issues/13-absence-identity-screens.md`)
- Screens 14, 15, 16, 17 have no routes, components, or UI of any kind; all surviving sections classified `contradicted` — no user-invoked save, no delete-save path, no preferences surface, no display/audio configuration UI (source: `issues/14-absence-management-screens.md`)
- Quit confirmation is an accidental-keypress guard on closing the application, never an unsaved-progress warning: commands are durable at commit, so there is no unsaved progress to lose (source: `issues/08-screen-21-quit-confirmation.md`, `issues/01-decision-record-layer-after-adr-removal.md`)
- Retirement is voluntary termination reusing the existing sacked-archive path, differing in cause and messaging only; no interim-manager or club-continuity machinery (source: `issues/07-screen-20-retire-manager.md`, `issues/03-blanket-scope-trim.md`)
- Screen 19 "Manager Status" retired as domain term; collides with the `manager_status` technical table and the imported spec's multiplayer screen (source: `issues/06-screen-19-manager-status-redefinition.md`, `issues/03-blanket-scope-trim.md`)
- Save is durable at commit — every Command that succeeds has already been written — so a Save is never "unsaved" and there is no save action for the player to invoke (source: `CONTEXT.md`, `issues/04-audit-application-shell.md`)
- Two new axes found during audit (off-device telemetry, non-normative import scaffolding); recorded as `out-of-scope` rows on every screen in the ledger (source: `issues/03-blanket-scope-trim.md`)

## Testing Decisions

- Tests should focus on external behavior rather than implementation details, verifying that screens behave according to their reconciled specs
- Unit tests for the `MatchEngine` and `GameLoading` modules should validate phase transitions and match resolution logic against Position Ratings and Tactical Modifiers
- Integration tests for the `ApplicationShell` should confirm navigation between screens and proper state management, particularly the Save List as the entry point
- E2E tests for the new screens (Manager Profile, Retire Manager, Quit Confirmation) should simulate user flows and verify UI correctness and Irreversibility Disclosure behavior
- Regression tests should ensure existing screens (1–17) continue to function after any modifications, particularly that the deviation register entries remain valid
- Test coverage should target the `Decider` streams (Club Decider, Match Decider, Season/Calendar Decider) to validate business logic integrity and durable-at-commit persistence guarantees
- Good test: only test external behavior, not implementation details; assertions should fail on the intended regression and observe external state, logs, events, or disposal — not the implementation or an agent's report
- Prior art: similar flow and complement tickets exist (e.g., ticket 11 slicing screen 2–17 audit, tickets 12–14 absence classifications)

## Out of Scope

- Multiplayer, network sessions, participant reconnect, ownership transfer, and cloud synchronization (whole axis removed per standing decision)
- Worker pools, memory budgets, and resource-policy tuning (no configurable memory budget or worker profile exists)
- Human manager slots, capacity, reservations, and roster management (sharpening of multi-manager axis; removed wholesale)
- Off-device telemetry, crash reporting, and product analytics (no backend to receive them, no consent to collect)
- Non-normative import scaffolding (Condensed LLM implementation brief, Next planned item, Suggested Git commit, screen-inventory preamble, Clean-room constraints)
- Resignation and the unemployed-manager job market (Group N concept; this game has no referent for it)
- Restoring the twelve deleted ADRs (already removed in ticket 01; reversing deletion is not in scope)
- Genuine unsaved career state (architectural regression against durable-at-commit persistence)
- Game Status screen (already ruled out of scope in ticket 05; survivors redistributed)
- Save-format migration machinery (project-wide architectural effort beyond this map's destination; no migration layer exists)
- Enabled-mods indicator (ruled by ticket 04; game has no third-party content loading)
- Main menu's online update check (sharpened by ticket 04; app has no backend to query and no update channel)
- ADR-000x citation rewrites in source comments (handled by ticket 01; 151 citations are a source-comment hygiene pass past this map's destination)
- Any concept requiring multiple human managers per career (removed wholesale from the project)
- Any concept requiring configurable memory budgets or worker profiles (ruled out by ticket 03)

## Further Notes

The reconciliation aligns with the established domain model in `CONTEXT.md` which defines player attributes, positions, ratings, and the event-sourced game engine. The decision-record layer has been removed (ticket 01), and the deviation register format is maintained per `docs/specs/group_a_application_shell_and_game_lifecycle_remaining/RECONCILIATION.md`. All existing screens 1–17 have been audited against their respective specs, with deviations recorded in the reconciliation ledger. The new screens 18–21 are designed to integrate seamlessly with the existing `ApplicationShell` and `MatchEngine` components, preserving the single-player focus and durable-at-commit persistence guarantees. The architecture avoids introducing new seams by leveraging existing modules (ApplicationShell, MatchEngine, ClubDecider) and extending them minimally where needed. Every screen's status line in the reconciliation ledger accurately reflects its audit state, and the map has nothing open — all tickets are resolved or blocked as appropriate.

The spec and deviation register are designed to be handable to `/to-spec` without a reader needing this map to understand them. Ticket 10 (assemble-spec-and-register) remains the final assembly ticket that will produce the definitive `spec.md` and `RECONCILIATION.md` at the effort root.