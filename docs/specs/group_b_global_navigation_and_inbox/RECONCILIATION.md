# Group B reconciliation ledger

The specs in this directory are an **import**, not a set of requirements. They read as generated from a
generic template rather than authored against this game, and they routinely describe subsystems this
project has never decided to build. This ledger records, per spec section, every place the import is
knowingly not followed, and why.

It is an index, not a store. A row states the divergence in one line and points at the decision that
carries it. Anything needing more than a line belongs in an Agent Note under
[.agents/notes/](../../../.agents/notes/), with the row's Anchor linking to it.

The import files are never edited. Their value is that you can always see what arrived.

The format is the one the [Group A ledger](../group_a_application_shell_and_game_lifecycle_remaining/RECONCILIATION.md)
pilots; that file is the fuller worked example. Group B adopts it screen by screen as each is audited,
so unlike Group A there is no blanket scope trim behind these rows — a screen with no section below has
been read by nobody.

## How to read a row

| Field | Meaning |
|---|---|
| Sections | The cited import sections: file, `§N`, and the heading text. Heading text is carried because this import's numbering is not trusted to be stable. |
| Kind | One of the four below. |
| What the spec asks | One line, so the ledger is readable without opening the import. |
| Disposition | What this project does instead, or nothing. |
| Anchor | Meaning set by Kind — the mandatory field that stops an entry being an unsupported assertion. |

### Kinds

| Kind | Meaning | Anchor holds | Can it return? |
|---|---|---|---|
| `out-of-scope` | Ruled permanently outside this game. | The reason. | No. |
| `contradicted` | This codebase already made an incompatible decision. | The Agent Note or `CONTEXT.md` term carrying that decision. | Only if that decision is overturned. |
| `deferred` | Wanted, in scope, not built. | The owning spec group, or `unscheduled`. | Yes. |
| `renamed` | The concept exists here under different vocabulary; behaviour agrees. | The `CONTEXT.md` term. | N/A — this row asserts agreement. |

Sections followed as written get **no row**. What that silence means depends on the screen's status
line:

| Status | What silence asserts |
|---|---|
| `Audited` | Everything not listed below is followed. A section-by-section pass was made. |
| `Reviewed` | Nothing. The rows are the material conflicts a single-session pass found; unlisted sections were not individually checked. |
| `Not yet audited` | Nothing. |
| `Disposed in full` | Nothing is left silent. The screen was ruled out of scope as a whole file, and its one row below disposes of every section at once. No section-by-section pass was made and none is owed. |

Those four are the whole vocabulary. Every screen in the Coverage table carries exactly one of them,
and a screen moves between them only by a ticket that says so.

## Coverage

| Screen | Import file | Status |
|---|---|---|
| 22 Global Application Shell | [22_global_application_shell.md](22_global_application_shell.md) | Not yet audited |
| 23 Continue and Advance Time | [23_continue_and_advance_time.md](23_continue_and_advance_time.md) | Reviewed |
| 24 News Inbox | [24_news_inbox.md](24_news_inbox.md) | Not yet audited |
| 25 Individual News Message | [25_individual_news_message.md](25_individual_news_message.md) | Not yet audited |
| 26 News Filters | [26_news_filters.md](26_news_filters.md) | Not yet audited |
| 27 Background Processing and Updating Game | [27_background_processing_and_updating_game.md](27_background_processing_and_updating_game.md) | Not yet audited |
| 28 Calendar and Schedule | [28_calendar_and_schedule.md](28_calendar_and_schedule.md) | Not yet audited |
| 29 Manager Notebook | [29_manager_notebook.md](29_manager_notebook.md) | Disposed in full |
| 30 Manager History | [30_manager_history.md](30_manager_history.md) | Not yet audited |
| 31 Manager Profile | [31_manager_profile.md](31_manager_profile.md) | Not yet audited |
| 32 Manager Chat and Multiplayer Communication | [32_manager_chat_and_multiplayer_communication.md](32_manager_chat_and_multiplayer_communication.md) | Disposed in full |

## Screen 23: Continue and Advance Time

Status: **Reviewed** (continue-and-advance-time ticket 01, 2026-09-06).

The screen the import describes is a dialog for configuring an advance. This game's counterpart is a
single control in the career chrome and the one command behind it: the player presses Continue and the
Calendar jumps to the next scheduled event. That difference disposes of most of the file, and the rows
below say which decision each disposal rests on.

The design this screen is built to is not the import. It is
[Continue as the global career loop](../../../.agents/notes/implemented/feature/2026-08-29-continue-as-global-career-loop.md)
and [The human Fixture's pre-match boundary](../../../.agents/notes/implemented/architecture/2026-08-29-human-fixture-pre-match-boundary.md),
which are more specific than the import on every point where they overlap it.

| Sections | Kind | What the spec asks | Disposition | Anchor |
|---|---|---|---|---|
| §2 Primary user goals, §7 Principal interactions, §10 Permissions and multiplayer behavior, §19 Edge cases, §20 criterion 5, §21 Recommended tests | `out-of-scope` | Coordinated advancement across participants, mark-ready and withdraw-readiness, host policies, host disconnect and migration, and tests for each. | None of it exists. | The multiplayer, network, and host axis is removed wholesale from this project: there is exactly one human manager per Save. |
| §9 Navigation behavior, §10 Permissions and multiplayer behavior, §17 Persistence rules | `out-of-scope` | An active manager whose identity scopes which private data may be displayed, manager-scoped navigation history and drafts, and transient private content cleared before another manager gains control. | There is one manager, so nothing is scoped to them and nothing is cleared between them. | Same axis. `CONTEXT.md`'s **Save** entry fixes one human manager per Save. |
| §6 Core data model, §8 Screen and operation states, §11 Validation and error handling, §15 Performance requirements, §16 Security and privacy requirements | `out-of-scope` | A career revision carried on the request, stale responses discarded by revision or request fingerprint, and advancement only from an authoritative canonical revision. | The advance is one local command against one SQLite file. No revision is carried, and there is no second writer for one to guard against. | The revision model belongs to the client-server architecture ruled out with the multiplayer axis. Single-writer local persistence is the premise of the Decider model — see [Domain-bounded Deciders](../../../.agents/notes/implemented/architecture/2026-08-27-domain-bounded-deciders-and-chunked-resimulation.md). |
| §4 Conceptual layout (`Stop at`), §2 Primary user goals, §7 Principal interactions, §20 criterion 3, §21 Recommended tests | `contradicted` | A stop-policy selector and advancement to a user-chosen future date, validated as in the future. | Neither exists. One press advances to the next scheduled event and stops there; the player chooses when to press, never where to stop. | [Calendar](../../../CONTEXT.md) — the career advances only by jumping to the next scheduled event, never by a day-by-day clock, so there is no set of dates to choose between. A date-bearing view of the schedule belongs to [Screen 28](28_calendar_and_schedule.md). |
| §4 Conceptual layout (`Next mandatory event`) | `deferred` | The control names the next mandatory event and the date it falls on, beside the current date. | The chrome carries the current date — `Season 3 · 17 Oct 2026` — but nothing names what is coming. Naming the next event means knowing which Fixture the human club plays next, which no query answers today. | [The human Fixture's pre-match boundary](../../../.agents/notes/implemented/architecture/2026-08-29-human-fixture-pre-match-boundary.md) is what gives the chrome a pending Fixture to name. |
| §2 Primary user goals, §7 Principal interactions, §8 Screen and operation states, §20 criterion 4 | `contradicted` | Cancel long processing at a safe boundary, with `queued`, `processing`, and `cancellation_requested` states and progress events. | An advance is one command that reaches the next boundary and commits, or does not. There is no queue, no progress stream, and nothing to cancel into. | [Durable at commit](../../../.agents/notes/proposed/architecture/2026-08-30-durable-at-commit-persistence.md) — every Command that succeeds has already been written, so a half-advanced Calendar is not a state the domain has. |
| §4 Conceptual layout, §7 Principal interactions | `contradicted` | A dedicated Advance Time screen holding the control, the stop policy, and the blocking list. | There is no such screen. Continue is a control in the chrome, present on every career route, and what it has to say is said beside it. | [Continue as the global career loop](../../../.agents/notes/implemented/feature/2026-08-29-continue-as-global-career-loop.md) — Continue belongs to the career, not to a screen, and a screen the player must navigate to in order to advance time is the failure that note removed. |
| §18 Observability | `out-of-scope` | Operation duration, result category, and diagnostic codes recorded as telemetry. | Nothing leaves the device. Local structured logging is unaffected and stays in scope. | The app has no backend to receive telemetry, no consent surface, and no privacy policy to link. Same axis as Group A. |
| §15 Performance requirements (virtualization, debounced search, stable row identity, scroll position) | `out-of-scope` | Virtualized long lists, debounced filters, preserved scroll position. | The control is one button and a short list of outstanding items. There is no data-heavy list on this surface to virtualize. | Template scaffolding: §15's list requirements are repeated verbatim across the group's screens and have no referent on a control that renders at most a handful of rows. |
| §13 Localization requirements, §12 Accessibility (RTL, 200 percent scaling) | `deferred` | Localized labels, dates, durations and plural forms; right-to-left layout; text scaling to 200 percent. | No i18n layer exists; every string is a hard-coded English literal, and the window is fixed-size. | `unscheduled` — the same row Group A Screen 1 carries. Localization has an obvious referent and is not an auditor's to rule out. |
| §14 Responsive behavior | `deferred` | Wide, standard, narrow and ultrawide layouts, with the primary action preserved under high text scaling. | The chrome lays out for one window size. Nothing degrades, because nothing can yet be resized. | Group A [Screen 17 Display and Sound Options](../group_a_application_shell_and_game_lifecycle_remaining/17_display_and_sound_options.md) owns resizing. |
| §11 Validation and error handling (offline, conflicted) | `out-of-scope` | Distinguish offline and conflicted states from empty, unavailable, and failed. | Neither exists to distinguish. The renderer's only remote is the main process in the same application. | Same axis as the revision model: there is no network to be offline from and no second writer to conflict with. |
| §22 Condensed LLM implementation brief, §23 Next planned item, Suggested Git commit | `out-of-scope` | A prose restatement of the whole file, the next screen in the import's order, and a commit message. | Not audited. Auditing the brief would double-count every section it summarizes. | Non-normative import scaffolding — an artifact of how the import was generated, not a requirement. |
| §20 criterion 1, §7 Principal interactions, §21 Recommended tests (Blocked decision) | `deferred` | Mandatory decisions cannot be skipped: the advance stops before them and offers to open them. | The advance does not stop before the human club's Fixture — it resolves that Fixture headlessly and reports a count — so the one mandatory decision in the game is skippable today. | [The human Fixture's pre-match boundary](../../../.agents/notes/implemented/architecture/2026-08-29-human-fixture-pre-match-boundary.md), ticketed as its own effort. |

## Screen 29: Manager Notebook

Status: **Disposed in full** (ruled at charting, group-b-blanket-disposals ticket 01, 2026-09-07).

The screen was ruled out of scope as a whole file before any Group B ticket opened, on two grounds that
hold independently: the notebook itself has no referent in this game, and the privacy model it is built
on is the multi-manager one Group A removed. Either alone disposes of the file. The single row below
covers every section, so nothing here is silent and no audit of this screen is owed.

| Sections | Kind | What the spec asks | Disposition | Anchor |
|---|---|---|---|---|
| §1–§23 and Suggested Git commit — the whole file | `out-of-scope` | A manager-private notebook: free-prose notes with tags and pinning, annotations linked to players, staff, clubs, competitions, fixtures and dates, search and filter over them, note-to-reminder conversion, and export or deletion under a privacy policy. | Nothing exists and nothing is planned. There is no note, tag, pin, annotation, or reminder anywhere in the domain. | Two independent grounds. **First**, the note concept is an import invention: it appears in no code, in no `CONTEXT.md` term, and in no recorded decision, and nothing in the game asks the player to keep private prose — the player's record of a career is the career state itself. **Second**, the screen takes manager-private data as its premise, and privacy between managers presupposes more than one; [`CONTEXT.md`](../../../CONTEXT.md)'s **Save** entry fixes exactly one human manager per Save, and the multiplayer, network and multi-manager axis was removed wholesale from this project at Group A. Returns only if this game acquires a reason for the player to write prose the game itself does not model — a new effort against a redrawn scope, not a resumption of this one. Overturning the multiplayer ruling alone would not bring it back, because the first ground would still stand. |

## Screen 32: Manager Chat and Multiplayer Communication

Status: **Disposed in full** (ruled at charting, group-b-blanket-disposals ticket 01, 2026-09-07).

The screen was ruled out of scope as a whole file before any Group B ticket opened. It is the
multiplayer, network and multi-manager axis end to end, with no residue on any other axis, so a
section-by-section pass would restate the same disposal twenty-three times. The single row below
covers every section, so nothing here is silent and no audit of this screen is owed.

| Sections | Kind | What the spec asks | Disposition | Anchor |
|---|---|---|---|---|
| §1–§23 and Suggested Git commit — the whole file | `out-of-scope` | Career-scoped communication between participants: a lobby with manager presence, public, team, direct and system channels, message send and receive, mute, block and report, connection and delivery state, and shared entity links that leak no private knowledge. | Nothing exists and nothing is planned. There is no chat surface, no channel, no participant list, and no transport for a message to cross. | Every section rests on there being a second human manager to talk to, and there is not one: [`CONTEXT.md`](../../../CONTEXT.md)'s **Save** entry fixes exactly one human manager per Save, and the multiplayer, network and host axis was removed wholesale from this project at Group A. AI-managed clubs are simulated, not correspondents. Returns only if a Save gains multiple human managers, which would be a new effort against a redrawn scope, not a resumption of this one. |
