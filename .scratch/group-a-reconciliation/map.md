# Map: Group A reconciliation

Label: `wayfinder:map`

## Destination

A Group A spec and deviation register: a `spec.md` covering all 21 Group A screens that states, per
screen, what the implementation must do — plus an explicit record of every place the imported spec at
[docs/specs/group_a_application_shell_and_game_lifecycle_remaining/](../../docs/specs/group_a_application_shell_and_game_lifecycle_remaining/)
is knowingly not followed, and why. Ready to hand to `/to-spec` → `/to-tickets`.

Screens 01–17 have an implementation to audit against their spec. Screens 18–21 have none and are new
design. Both halves land in the same spec.

## Notes

**Domain**: local single-player football-management sim, Electron + Effect, event-sourced into one
SQLite file per save. Vocabulary lives in [CONTEXT.md](../../CONTEXT.md).

**Skills every session should consult**: `grilling` and `domain-modeling` by default; `doc-standards`
for anything written under `docs/`; `effect-code` for any session that touches source.

**The imported specs are not requirements.** They read as generated from a generic template rather
than authored against this game, and they routinely describe subsystems this project has never decided
to build. A session treats them as a checklist to reconcile against, not a contract to satisfy. Where
the spec and this codebase disagree, the codebase's existing decisions win unless a ticket explicitly
overturns them — and the disagreement gets written into the register rather than silently dropped.

**Standing decisions from charting** (settled 2026-08-30, before any ticket opened):

- The multiplayer / network / cloud / multi-manager axis is removed wholesale (see Out of scope).
- Screen 19 "Manager Status" is redefined as the single-manager profile-and-tenure screen, absorbing
  the meaning already carried by the `manager_status` table — one name, one concept.
- Retirement is voluntary termination reusing the existing sacked-archive path, differing in cause and
  messaging only. No interim-manager or club-continuity machinery.
- Quit confirmation is an accidental-keypress guard on closing the application, never an unsaved-progress
  warning: commands are durable at commit, so there is no unsaved progress to lose.
- The twelve numbered ADRs were deliberately deleted and are not coming back. Agent Notes under
  `.agents/notes/` are the repo's sole decision record from here.

**The import duplicates Screen 2.** `01_app_sheell.md` contains Screen 1, a screen-inventory preamble,
*and* a full copy of Screen 2 with the same 29 sections as `02_new_game.md`. `02_new_game.md` is
canonical; file 01's copy is not audited separately, and `## N.` numbering is not unique inside file 01.

**Execution posture**: this map plans. Ticket 01 is the one exception — it performs a documentation
repair, because `pnpm check:all` is red until it lands and every later session inherits that red gate.

## Decisions so far

<!-- one line per closed ticket -->

- [01 — Decision-record layer after ADR removal](issues/01-decision-record-layer-after-adr-removal.md):
  Agent Notes are the sole decision record; ten ADRs migrated to `implemented/` notes, two absorbed by
  existing notes, `docs/adr/` deleted, two vendored skills forked, `check:all` green.

- [02 — Deviation register: format and home](issues/02-deviation-register-format.md): a
  *reconciliation ledger* per spec group at `docs/specs/<group>/RECONCILIATION.md` — one row per
  `## N.` section, four kinds (`out-of-scope`/`contradicted`/`deferred`/`renamed`) each with a
  mandatory anchor, silence meaning "followed" only under an `Audited` status line, imports never
  edited. Screen 21 written out as the worked example.

- [03 — Blanket scope trim across the Group A specs](issues/03-blanket-scope-trim.md): the trim is
  narrow — screens 2, 3, 4, 6, 8, 9, 10, 12 and 17 lose only scaffolding and a few clauses, screens 13
  to 16 lose about a quarter each, and screen 7 disappears entirely. ~25,000 lines survive across
  sixteen screens, so the audit does not merge. Two new axes found (off-device telemetry, non-normative
  import scaffolding); recorded as `out-of-scope` rows on every screen in the ledger.

- [05 — Screen 18: what a local Game Status screen contains](issues/05-screen-18-game-status.md):
  removed; survivors (season/save-name orientation, sacked badge, app version) redistribute into
  CareerChrome, Save List, and a new About dialog.

- [04 — Audit: application shell (spec 01)](issues/04-audit-application-shell.md): Screen 1 audited
  against the shell; 28 ledger rows, no code changed. The entry point is the Save List, not a Main
  Menu; the shell has no way to quit, open settings, or read credits; the Save List declares no
  Actions and has no keyboard tier; a failing save repository is swallowed silently. Two new
  out-of-scope rulings (mod indicator, online update check).

- [06 — Screen 19: Manager Status redefined, and the name collision](issues/06-screen-19-manager-status-redefinition.md):
  Screen is "Manager Profile", showing profile identity (name, archetype, pillars, club, tenure) with
  a passive Active/Archived badge; all sacking/outcome detail stays exclusive to Season Summary;
  "Manager Status" retired as domain term; CONTEXT.md and reconciliation ledger updated.

- [07 — Screen 20: Retire Manager](issues/07-screen-20-retire-manager.md): retirement is the second cause
  of an **Archived Save**; a `ManagerRetired` event and a nullable `archived_cause` column replace the
  `sacked` boolean, `assertSaveNotSacked` becomes `assertSaveNotArchived`, and the action is a dialog on
  Manager Profile confirmed by an Irreversibility Disclosure. Breaks the save format with no migration path.

- [08 — Screen 21: Quit confirmation as an accident guard](issues/08-screen-21-quit-confirmation.md):
  one intent (close_application), one provisional-career exception, before-quit guard with renderer IPC,
  dialog-only (no keyboard shortcut). Durable-at-commit note written and re-anchors the reconciliation
  ledger's contradicted rows.

- [09 — Navigation surface for the new shell screens](issues/09-navigation-surface-for-new-screens.md):
  Save List tiered at level 2; app-chrome bar (Preferences, Credits, Quit) on the Save List as
  lightweight dialogs; no command-palette entries for boot-screen destinations.

- [11 — Slice the screen 2–17 audit into tickets](issues/11-slice-the-screen-2-17-audit.md):
  Nine absent screens grouped into three cheap "confirm absence" tickets; six with implementation
  audited as individual, flow, or complement tickets; Screen 13 as a thin complement to the shell
  audit. Eight tickets sized to one session each, all blocked against ticket 10.

- [12 — Absence: Screens 3, 4, 5 (creation-form screens)](issues/12-absence-creation-screens.md):
  Three creation-form screens (league/nation selection, competition detail, database size/performance)
  have no routes, components, or screens. All surviving sections classified `contradicted` — the
  fixed single 20-club league (CONTEXT.md) and three-step Manager→Club→Review creation flow leave
  no room for any of them.

- [13 — Absence: Screens 9, 10 (identity screens)](issues/13-absence-identity-screens.md):
  Two identity screens (nationality/languages, background) have no routes or components — no
  nationality/languages or background concept exists in the codebase. All 91 surviving sections
  classified `contradicted` against the three-step creation flow and the Archetype/Pillar identity
  model (CONTEXT.md).
- [14 — Absence: Screens 14, 15, 16, 17 (management screens)](issues/14-absence-management-screens.md):
  Four management screens (Save/Save As, Delete Saved Game, Game Preferences, Display/Sound Options)
  have no routes, components, or UI of any kind. All surviving sections of all four screens classified
  `contradicted` — the codebase has no user-invoked save, no delete-save path, no preferences surface,
  and no display/audio configuration UI.

- [15 — Screen 2: New Game, Database Initialization](issues/15-screen-2-new-game.md):
  Screen 2 audited and reconciled; all 28 content sections `contradicted` by the three-step creation
  flow with invisible world generation. No cache, progress UI, or validation stages exist.

- [16 — Screen 6: Game Loading and World Generation](issues/16-screen-6-world-gen.md):
  Screen 6 audited against the creation flow implementation. All 40 surviving sections `contradicted`:
  generation is a masked wait with no progress bar, no task checklist, no cancellation, no retry, no
  validation, no checkpoint, no completion summary. Transitions to Club Selection, not Add Manager.

- [17 — Screen 8: Manager Personal Details](issues/17-screen-8-personal-details.md):
  Screen 8 `Reviewed` against the implementation (CreationStep1.tsx): only a single Manager name `<input>`
  exists; date of birth, place of birth, portrait, hot-seat privacy, name normalization, structured name
  components, and all form behaviors are absent. Reconciliation ledger updated with `contradicted` rows
  covering 9 audit categories. Status changed from `Not yet audited` to `Reviewed` (ticket 17, 2026-08-31).## Not yet specified

<!-- none — every question resolved, fog cleared, map complete. -->

## Out of scope

- **Multiplayer, network sessions, participant reconnect, ownership transfer, cloud synchronization,
  and multiple human managers per career.** Authorized for removal by the user during charting. This
  is the single largest axis in the imported specs and it has no referent in a local single-player
  app. Also rules out all of `docs/specs/group_r_multiplayer_administration/` as an inheritor.
- **Worker pools, memory budgets, and resource-policy tuning.** The app has no worker profile or
  configurable memory budget to expose, tune, or report on. Wider than charting assumed: it consumes
  spec 5 §18 in full plus its warnings, spec 6 §33–§34, spec 16 §26–§27, and spec 18 §4 Runtime. It
  does *not* cover internal threading, which stays a design question for the audit tickets.
- **Human manager slots, capacity, reservations, and roster.** A sharpening of the multi-manager axis
  above, recorded separately because of how much it consumes: essentially all of spec 7 (Add Manager),
  most of spec 19, and the reservation and conflict machinery in spec 11 §29–§30 and §35. It also
  removes the recurring "revalidate draft ownership" clause threaded through specs 8–12, which has no
  referent with a single local user.
- **Off-device telemetry, crash reporting, and product analytics** (spec 16 §40). Missed during
  charting. The app has no backend to receive them, so there is no consent to collect and no privacy
  policy to link. Local structured logging is unaffected and stays in scope.
- **Non-normative import scaffolding.** The `Condensed LLM implementation brief`, `Next planned item`,
  and `Suggested Git commit` sections, spec 1 §15 Clean-room constraints, and spec 1's screen-inventory
  preamble are authoring artifacts of the import, not requirements. Fifty-three sections across the
  group. The briefs in particular restate their own file, so auditing them would double-count every
  section they summarize.
- **Resignation and the unemployed-manager job market.** Spec 20 §2 wants "Resign instead" as an
  alternative to retiring. Resignation only means something with somewhere to go afterwards, which is
  Group N (jobs and manager career), not the application shell.
- **Restoring the twelve deleted ADRs.** Decided against during charting. Their 151 citations and the
  21 broken links they leave behind are in scope (ticket 01); reversing the deletion is not.
- **Introducing genuine unsaved career state** so that spec 21's `UnsavedCareerState` model becomes
  true. That is an architectural regression against durable-at-commit persistence.
- **Game Status screen (Screen 18).** Decided via ticket 05. The survivors (career/season orientation,
  sacked badge, app version) redistribute into existing real estate; no route, component, or
  `GameStatusSnapshot` type is built.
- **Save-format migration machinery.** Ticket 07's `archived_cause` column is the second Group A decision
  to break existing saves, and the repo has no migration layer to carry them across. Building one is a
  project-wide architectural effort with its own versioning and upgrade-path questions; it sits past this
  map's destination. Recorded here so the need is visible rather than lost — see the risk in
  [Retire Manager](../../.agents/notes/proposed/feature/2026-08-30-retire-manager.md).
- **The other eighteen spec groups.** Group A is the pilot. If a reusable trimming method falls out, it
  is captured as a `process` Agent Note — widening this map to 19 groups is a different effort.
- **An enabled-mods indicator.** Ruled by ticket 04 while auditing spec 1 §4.2 and §8. Nothing in the
  app loads third-party content, so there is nothing to enable, list, or indicate.
- **The main menu's online update check** (spec 1 §8 `updateStatus`). Ruled by ticket 04. A sharpening
  of the off-device-telemetry axis above: the app has no backend to query and no update channel.
- **ADR-000x citation rewrites in source comments.** Ticket 01 provided the mechanism (rewrite to note path, reword, or drop); the 151 mentions are a source-comment hygiene pass that sits past this map's destination (a Group A spec and deviation register). No screen's reconciliation depends on the outcome.
