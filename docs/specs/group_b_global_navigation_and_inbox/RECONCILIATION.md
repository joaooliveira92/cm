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
and, as in Group A, a blanket scope trim ran across the whole group before any screen was audited. So a
screen can carry rows without anyone having read it; the status line is what says which.

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

A screen carrying rows is therefore not the same as an audited screen. The **blanket sweeps**
(group-b-blanket-disposals, 2026-09-07) applied rulings settled at charting or inherited from Group A
across every surviving screen at once, before any of them was read. Those rows narrow what an audit has
to cover; they do not make the screen audited, and its status stays `Not yet audited` until a session
reads it.

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

## The multiplayer axis

Group A removed the multiplayer, network, cloud and multi-manager axis wholesale. Every Group B import
file carries that axis anyway, and mostly in identical words, because the files share a template: all
nine surviving screens have the same `## 10. Permissions and multiplayer behavior`, the same
manager-scoped navigation-history bullet in §9, and the same §17 persistence sentence. The rows on each
screen below dispose of it screen by screen, and their repetition is the import's, not the ledger's.

Three phrases carry the axis in disguise and account for most of its spread outside §10. Each is
disposed of once here so a screen audit can cite the disposal instead of deriving it again.

### The active manager

The import treats "the active manager" as a scope: an identity that decides what private data may be
displayed, whose drafts and navigation history are kept apart from another's, and whose control is
handed over at a switch. There is no scope, because there is nothing to scope against — [`CONTEXT.md`](../../../CONTEXT.md)'s
**Save** entry fixes exactly one human manager per Save. Every occurrence resolves to *the* manager, so
a query scoped to them is the unscoped query, and a clause about protecting one manager's data from
another disposes of itself. Nothing switches, so nothing is cleared at a switch. AI-managed clubs are
simulated, not viewers.

### The career revision

The import carries a monotonic `revision` on requests and responses so a client can detect that
somebody else has written since it read, discard stale responses, and refuse to act on a superseded
view. There is no somebody else. Persistence is one local SQLite file with a single writer, and it is
durable at commit — see [Durable at commit](../../../.agents/notes/proposed/architecture/2026-08-30-durable-at-commit-persistence.md)
and [Domain-bounded Deciders](../../../.agents/notes/implemented/architecture/2026-08-27-domain-bounded-deciders-and-chunked-resimulation.md).
With no concurrent writer, a revision has nothing to detect and a conflict has nothing to be between.
Screen 23's rows dispose of the same model where it appears there.

### The permission context

Permissions in the import partition one career among participants holding different rights: a trusted
layer decides them, a client may not grant them, and the UI degrades to `permission_denied` when they
are missing. One participant holds every right, so there is no partition to enforce, no denial to
render, and no permission decision that can go stale. `permission-denied` as a *state* is therefore not
a state this application has.

These three, plus the network clauses they travel with — `offline`, `conflicted`, the authoritative
host or server, remote refresh, host disconnect and migration — are what the per-screen rows below
dispose of. Their anchor is this section, which rests on [`CONTEXT.md`](../../../CONTEXT.md)'s **Save** entry and on the Group A
removal recorded in the [Group A ledger](../group_a_application_shell_and_game_lifecycle_remaining/RECONCILIATION.md).

## Screen 22: Global Application Shell

Status: **Not yet audited**. The rows below come from the blanket sweeps; nobody has read this
screen.

| Sections | Kind | What the spec asks | Disposition | Anchor |
|---|---|---|---|---|
| §10 Permissions and multiplayer behavior | `out-of-scope` | An active manager whose identity scopes what private data may be displayed, shared career data from an authoritative host or server revision, client rendering state that never grants permissions, private transient content cleared before the next manager gains control, and remote changes refreshing content without overwriting local drafts. | None of the five bullets has a referent. One manager, so nothing is scoped and nothing is handed over; no host and no server; no permission for rendering state to grant or withhold; no remote to push a change. | The multiplayer, network and multi-manager axis, removed wholesale at Group A. Disposed in full under *The multiplayer axis* above, which rests on [`CONTEXT.md`](../../../CONTEXT.md)'s **Save** entry. |
| §3 Position in the navigation model, §6 Core data model (`networkState: MultiplayerConnectionState`, `revision`, network-boundary validation), §7 Principal interactions (Back and Forward through manager-scoped routes), §8 Screen and operation states (`offline`, `permission_changed`, stale responses discarded by revision or request fingerprint), §9 Navigation behavior (manager-scoped navigation history), §11 Validation and error handling (revision validation; `permission-denied`, `offline` and `conflicted` states), §17 Persistence rules (manager-scoped drafts, authoritative career state, stale permission decisions), §18 Observability (revision conflicts), §19 Edge cases (the active manager changes, the career revision advances, the host disconnects or migrates), §20 criteria 1, 6 and 7, §21 Recommended tests (Manager switch privacy, Network disconnection) | `out-of-scope` | The active manager as a display scope, a career revision guarding against a concurrent writer, and a permission context threaded through navigation, validation, persistence and observability — plus the offline, conflicted, remote-refresh and host-migration states that go with them. | Every clause named resolves to nothing: one manager to scope to, one writer so no revision is carried or compared, one participant so no permission is checked or denied, and no network to be offline from, conflict with, or lose a host on. The sections themselves are not disposed of — the rest of §9's navigation contract, §11's validation, §17's persistence list and §19's remaining edge cases stay for this screen's audit. | All three disguises — the active manager, the career revision, the permission context — plus the network clauses they travel with. Disposed under *The multiplayer axis* above; not re-argued here. |
| §16 Security and privacy requirements (control switching, active-manager search scoping, inactive manager IDs) | `out-of-scope` | Private manager content hidden during control switching, global search results restricted by active-manager knowledge and permission, and events rejected for an inactive career or manager ID. | Control never switches, search has one knower whose permission set is total, and the one manager ID is always the active one. §16's trusted-layer route and command validation and its keep-secrets-out-of-history bullet are ordinary local hardening and stay for this screen's audit. | All three disguises — the active manager, the career revision, the permission context — plus the network clauses they travel with. Disposed under *The multiplayer axis* above; not re-argued here. |
| §22 Condensed LLM implementation brief, §23 Next planned item | `out-of-scope` | A restatement of the whole file and a pointer to the next file the import author intended to write. | Not audited. Auditing the brief would double-count every section it summarizes. | Non-normative import scaffolding — the [Group A ruling](../group_a_application_shell_and_game_lifecycle_remaining/RECONCILIATION.md), applied unchanged. |

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

The blanket multiplayer sweep found almost nothing left to do here: this screen's own audit had already
disposed of §9, §10, §11, §16, §17 and §19 on the rows below. Only §3 was outstanding, and it is added
rather than duplicated.

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
| §3 Position in the navigation model | `out-of-scope` | The screen preserves the active manager, the career revision, and the permission context across navigation. | None of the three exists to preserve. Navigation history, the fourth item in the same sentence, is real and is not disposed of here. | All three disguises — the active manager, the career revision, the permission context — plus the network clauses they travel with. Disposed under *The multiplayer axis* above; not re-argued here. |
| §22 Condensed LLM implementation brief, §23 Next planned item, Suggested Git commit | `out-of-scope` | A prose restatement of the whole file, the next screen in the import's order, and a commit message. | Not audited. Auditing the brief would double-count every section it summarizes. | Non-normative import scaffolding — an artifact of how the import was generated, not a requirement. |
| §20 criterion 1, §7 Principal interactions, §21 Recommended tests (Blocked decision) | `deferred` | Mandatory decisions cannot be skipped: the advance stops before them and offers to open them. | The advance does not stop before the human club's Fixture — it resolves that Fixture headlessly and reports a count — so the one mandatory decision in the game is skippable today. | [The human Fixture's pre-match boundary](../../../.agents/notes/implemented/architecture/2026-08-29-human-fixture-pre-match-boundary.md), ticketed as its own effort. |

## Screen 24: News Inbox

Status: **Not yet audited**. The rows below come from the blanket sweeps; nobody has read this
screen.

| Sections | Kind | What the spec asks | Disposition | Anchor |
|---|---|---|---|---|
| §10 Permissions and multiplayer behavior | `out-of-scope` | An active manager whose identity scopes what private data may be displayed, shared career data from an authoritative host or server revision, client rendering state that never grants permissions, private transient content cleared before the next manager gains control, and remote changes refreshing content without overwriting local drafts. | None of the five bullets has a referent. One manager, so nothing is scoped and nothing is handed over; no host and no server; no permission for rendering state to grant or withhold; no remote to push a change. | The multiplayer, network and multi-manager axis, removed wholesale at Group A. Disposed in full under *The multiplayer axis* above, which rests on [`CONTEXT.md`](../../../CONTEXT.md)'s **Save** entry. |
| §3 Position in the navigation model, §6 Core data model (`revision`, network-boundary validation), §8 Screen and operation states (`offline`, `permission_changed`, stale responses discarded by revision or request fingerprint), §9 Navigation behavior (manager-scoped navigation history), §11 Validation and error handling (revision validation; `permission-denied`, `offline` and `conflicted` states), §17 Persistence rules (manager-scoped drafts, authoritative career state, stale permission decisions), §18 Observability (revision conflicts), §19 Edge cases (the active manager changes, the career revision advances, the host disconnects or migrates), §20 criterion 6, §21 Recommended tests (Manager switching) | `out-of-scope` | The active manager as a display scope, a career revision guarding against a concurrent writer, and a permission context threaded through navigation, validation, persistence and observability — plus the offline, conflicted, remote-refresh and host-migration states that go with them. | Every clause named resolves to nothing: one manager to scope to, one writer so no revision is carried or compared, one participant so no permission is checked or denied, and no network to be offline from, conflict with, or lose a host on. The sections themselves are not disposed of — the rest of §9's navigation contract, §11's validation, §17's persistence list and §19's remaining edge cases stay for this screen's audit. | All three disguises — the active manager, the career revision, the permission context — plus the network clauses they travel with. Disposed under *The multiplayer axis* above; not re-argued here. |
| §16 Security and privacy requirements (inbox query scoping, hot-seat inbox leakage) | `out-of-scope` | Every inbox query scoped to the active manager, and another hot-seat manager's inbox never revealed. | There is one inbox because there is one manager, so the scoped query is the unscoped query and there is no second inbox to leak. §16's untrusted-text rendering, entity-link and action-token validation, and replay prevention are local and stay for this screen's audit. | All three disguises — the active manager, the career revision, the permission context — plus the network clauses they travel with. Disposed under *The multiplayer axis* above; not re-argued here. |
| §22 Condensed LLM implementation brief, §23 Next planned item, `Suggested Git commit` | `out-of-scope` | A restatement of the whole file, a pointer to the next file the import author intended to write, and a commit message. | Not audited. Auditing the brief would double-count every section it summarizes. | Non-normative import scaffolding — the [Group A ruling](../group_a_application_shell_and_game_lifecycle_remaining/RECONCILIATION.md), applied unchanged. |

## Screen 25: Individual News Message

Status: **Not yet audited**. The rows below come from the blanket sweeps; nobody has read this
screen.

| Sections | Kind | What the spec asks | Disposition | Anchor |
|---|---|---|---|---|
| §10 Permissions and multiplayer behavior | `out-of-scope` | An active manager whose identity scopes what private data may be displayed, shared career data from an authoritative host or server revision, client rendering state that never grants permissions, private transient content cleared before the next manager gains control, and remote changes refreshing content without overwriting local drafts. | None of the five bullets has a referent. One manager, so nothing is scoped and nothing is handed over; no host and no server; no permission for rendering state to grant or withhold; no remote to push a change. | The multiplayer, network and multi-manager axis, removed wholesale at Group A. Disposed in full under *The multiplayer axis* above, which rests on [`CONTEXT.md`](../../../CONTEXT.md)'s **Save** entry. |
| §1 Purpose (a manager-scoped message), §3 Position in the navigation model, §6 Core data model (`revision`, network-boundary validation), §7 Principal interactions (refresh when the action state changes remotely), §8 Screen and operation states (`permission_denied`, stale responses discarded by revision or request fingerprint), §9 Navigation behavior (manager-scoped navigation history), §11 Validation and error handling (revision validation; `permission-denied`, `offline` and `conflicted` states), §17 Persistence rules (manager-scoped drafts, authoritative career state, stale permission decisions), §18 Observability (revision conflicts), §19 Edge cases (the active manager changes, the career revision advances, the host disconnects or migrates), §20 criterion 2 (the permission clause), §21 Recommended tests (Permission loss) | `out-of-scope` | The active manager as a display scope, a career revision guarding against a concurrent writer, and a permission context threaded through navigation, validation, persistence and observability — plus the offline, conflicted, remote-refresh and host-migration states that go with them. | Every clause named resolves to nothing: one manager to scope to, one writer so no revision is carried or compared, one participant so no permission is checked or denied, and no network to be offline from, conflict with, or lose a host on. The sections themselves are not disposed of — the rest of §9's navigation contract, §11's validation, §17's persistence list and §19's remaining edge cases stay for this screen's audit. | All three disguises — the active manager, the career revision, the permission context — plus the network clauses they travel with. Disposed under *The multiplayer axis* above; not re-argued here. |
| §16 Security and privacy requirements (revision validation of actions) | `out-of-scope` | Every action validated against the current career revision. | There is no revision to validate against. §16's constrained block schema, idempotency keys, attachment restrictions and telemetry exclusion are separate concerns and stay for this screen's audit. | All three disguises — the active manager, the career revision, the permission context — plus the network clauses they travel with. Disposed under *The multiplayer axis* above; not re-argued here. |
| §22 Condensed LLM implementation brief, §23 Next planned item, `Suggested Git commit` | `out-of-scope` | A restatement of the whole file, a pointer to the next file the import author intended to write, and a commit message. | Not audited. Auditing the brief would double-count every section it summarizes. | Non-normative import scaffolding — the [Group A ruling](../group_a_application_shell_and_game_lifecycle_remaining/RECONCILIATION.md), applied unchanged. |

## Screen 26: News Filters

Status: **Not yet audited**. The rows below come from the blanket sweeps; nobody has read this
screen.

| Sections | Kind | What the spec asks | Disposition | Anchor |
|---|---|---|---|---|
| §10 Permissions and multiplayer behavior | `out-of-scope` | An active manager whose identity scopes what private data may be displayed, shared career data from an authoritative host or server revision, client rendering state that never grants permissions, private transient content cleared before the next manager gains control, and remote changes refreshing content without overwriting local drafts. | None of the five bullets has a referent. One manager, so nothing is scoped and nothing is handed over; no host and no server; no permission for rendering state to grant or withhold; no remote to push a change. | The multiplayer, network and multi-manager axis, removed wholesale at Group A. Disposed in full under *The multiplayer axis* above, which rests on [`CONTEXT.md`](../../../CONTEXT.md)'s **Save** entry. |
| §1 Purpose (manager-scoped inbox queries), §3 Position in the navigation model, §6 Core data model (`revision`, network-boundary validation), §8 Screen and operation states (`conflicted`, stale responses discarded by revision or request fingerprint), §9 Navigation behavior (manager-scoped navigation history), §11 Validation and error handling (revision validation; `permission-denied`, `offline` and `conflicted` states), §17 Persistence rules (manager-scoped drafts, authoritative career state, stale permission decisions), §18 Observability (revision conflicts), §19 Edge cases (the active manager changes, the career revision advances, the host disconnects or migrates), §20 criterion 3 | `out-of-scope` | The active manager as a display scope, a career revision guarding against a concurrent writer, and a permission context threaded through navigation, validation, persistence and observability — plus the offline, conflicted, remote-refresh and host-migration states that go with them. | Every clause named resolves to nothing: one manager to scope to, one writer so no revision is carried or compared, one participant so no permission is checked or denied, and no network to be offline from, conflict with, or lose a host on. The sections themselves are not disposed of — the rest of §9's navigation contract, §11's validation, §17's persistence list and §19's remaining edge cases stay for this screen's audit. | All three disguises — the active manager, the career revision, the permission context — plus the network clauses they travel with. Disposed under *The multiplayer axis* above; not re-argued here. |
| §16 Security and privacy requirements (preset scoping) | `out-of-scope` | Presets scoped to the manager or the account according to policy. | There is one manager and no account, so a preset is scoped to the only person who can have one. §16's trusted-layer validation, side-channel and bounding bullets stay for this screen's audit. | All three disguises — the active manager, the career revision, the permission context — plus the network clauses they travel with. Disposed under *The multiplayer axis* above; not re-argued here. |
| §22 Condensed LLM implementation brief | `out-of-scope` | A restatement of the whole file. | Not audited. Auditing the brief would double-count every section it summarizes. | Non-normative import scaffolding — the [Group A ruling](../group_a_application_shell_and_game_lifecycle_remaining/RECONCILIATION.md), applied unchanged. |

## Screen 27: Background Processing and Updating Game

Status: **Not yet audited**. The rows below come from the blanket sweeps; nobody has read this
screen.

This screen's §16 is the one Security and privacy section in the group that names no manager, no
revision and no permission, so the multiplayer sweep leaves it whole. Its locks and idempotency keys
guard duplicate processing, which is a question about this application's own concurrency and belongs to
this screen's audit rather than to the axis.

| Sections | Kind | What the spec asks | Disposition | Anchor |
|---|---|---|---|---|
| §10 Permissions and multiplayer behavior | `out-of-scope` | An active manager whose identity scopes what private data may be displayed, shared career data from an authoritative host or server revision, client rendering state that never grants permissions, private transient content cleared before the next manager gains control, and remote changes refreshing content without overwriting local drafts. | None of the five bullets has a referent. One manager, so nothing is scoped and nothing is handed over; no host and no server; no permission for rendering state to grant or withhold; no remote to push a change. | The multiplayer, network and multi-manager axis, removed wholesale at Group A. Disposed in full under *The multiplayer axis* above, which rests on [`CONTEXT.md`](../../../CONTEXT.md)'s **Save** entry. |
| §1 Purpose (network state synchronizes), §3 Position in the navigation model, §6 Core data model (`startRevision`, network-boundary validation), §8 Screen and operation states (stale responses discarded by revision or request fingerprint), §9 Navigation behavior (manager-scoped navigation history), §11 Validation and error handling (revision validation; `permission-denied`, `offline` and `conflicted` states), §17 Persistence rules (manager-scoped drafts, authoritative career state, stale permission decisions), §18 Observability (revision conflicts), §19 Edge cases (the active manager changes, the career revision advances, the host disconnects or migrates), §20 criterion 4, §21 Recommended tests (Host migration) | `out-of-scope` | The active manager as a display scope, a career revision guarding against a concurrent writer, and a permission context threaded through navigation, validation, persistence and observability — plus the offline, conflicted, remote-refresh and host-migration states that go with them. | Every clause named resolves to nothing: one manager to scope to, one writer so no revision is carried or compared, one participant so no permission is checked or denied, and no network to be offline from, conflict with, or lose a host on. The sections themselves are not disposed of — the rest of §9's navigation contract, §11's validation, §17's persistence list and §19's remaining edge cases stay for this screen's audit. | All three disguises — the active manager, the career revision, the permission context — plus the network clauses they travel with. Disposed under *The multiplayer axis* above; not re-argued here. |
| §22 Condensed LLM implementation brief, §23 Next planned item, `Suggested Git commit` | `out-of-scope` | A restatement of the whole file, a pointer to the next file the import author intended to write, and a commit message. | Not audited. Auditing the brief would double-count every section it summarizes. | Non-normative import scaffolding — the [Group A ruling](../group_a_application_shell_and_game_lifecycle_remaining/RECONCILIATION.md), applied unchanged. |

## Screen 28: Calendar and Schedule

Status: **Not yet audited**. The rows below come from the blanket sweeps; nobody has read this
screen.

| Sections | Kind | What the spec asks | Disposition | Anchor |
|---|---|---|---|---|
| §10 Permissions and multiplayer behavior | `out-of-scope` | An active manager whose identity scopes what private data may be displayed, shared career data from an authoritative host or server revision, client rendering state that never grants permissions, private transient content cleared before the next manager gains control, and remote changes refreshing content without overwriting local drafts. | None of the five bullets has a referent. One manager, so nothing is scoped and nothing is handed over; no host and no server; no permission for rendering state to grant or withhold; no remote to push a change. | The multiplayer, network and multi-manager axis, removed wholesale at Group A. Disposed in full under *The multiplayer axis* above, which rests on [`CONTEXT.md`](../../../CONTEXT.md)'s **Save** entry. |
| §3 Position in the navigation model, §6 Core data model (`revision`, network-boundary validation), §8 Screen and operation states (`conflicted`, stale responses discarded by revision or request fingerprint), §9 Navigation behavior (manager-scoped navigation history), §11 Validation and error handling (revision validation; `permission-denied`, `offline` and `conflicted` states), §17 Persistence rules (manager-scoped drafts, authoritative career state, stale permission decisions), §18 Observability (revision conflicts), §19 Edge cases (the active manager changes, the career revision advances, the host disconnects or migrates), §21 Recommended tests (Manager switch privacy) | `out-of-scope` | The active manager as a display scope, a career revision guarding against a concurrent writer, and a permission context threaded through navigation, validation, persistence and observability — plus the offline, conflicted, remote-refresh and host-migration states that go with them. | Every clause named resolves to nothing: one manager to scope to, one writer so no revision is carried or compared, one participant so no permission is checked or denied, and no network to be offline from, conflict with, or lose a host on. The sections themselves are not disposed of — the rest of §9's navigation contract, §11's validation, §17's persistence list and §19's remaining edge cases stay for this screen's audit. | All three disguises — the active manager, the career revision, the permission context — plus the network clauses they travel with. Disposed under *The multiplayer axis* above; not re-argued here. |
| §16 Security and privacy requirements (reminder scoping, revision checks) | `out-of-scope` | Private reminders scoped to the active manager, and revision checks on rescheduling and multiplayer updates. | One manager, so a private reminder is private to nobody in particular; no revision and no multiplayer update to check against. Whether reminders exist at all is this screen's audit to settle — this row disposes only of their scoping. §16's date and entity-ID validation, markup injection and mandatory-event precedence bullets stay for that audit. | All three disguises — the active manager, the career revision, the permission context — plus the network clauses they travel with. Disposed under *The multiplayer axis* above; not re-argued here. |
| §22 Condensed LLM implementation brief, §23 Next planned item, `Suggested Git commit` | `out-of-scope` | A restatement of the whole file, a pointer to the next file the import author intended to write, and a commit message. | Not audited. Auditing the brief would double-count every section it summarizes. | Non-normative import scaffolding — the [Group A ruling](../group_a_application_shell_and_game_lifecycle_remaining/RECONCILIATION.md), applied unchanged. |

## Screen 29: Manager Notebook

Status: **Disposed in full** (ruled at charting, group-b-blanket-disposals ticket 01, 2026-09-07).

The screen was ruled out of scope as a whole file before any Group B ticket opened, on two grounds that
hold independently: the notebook itself has no referent in this game, and the privacy model it is built
on is the multi-manager one Group A removed. Either alone disposes of the file. The single row below
covers every section, so nothing here is silent and no audit of this screen is owed.

| Sections | Kind | What the spec asks | Disposition | Anchor |
|---|---|---|---|---|
| §1–§23 and Suggested Git commit — the whole file | `out-of-scope` | A manager-private notebook: free-prose notes with tags and pinning, annotations linked to players, staff, clubs, competitions, fixtures and dates, search and filter over them, note-to-reminder conversion, and export or deletion under a privacy policy. | Nothing exists and nothing is planned. There is no note, tag, pin, annotation, or reminder anywhere in the domain. | Two independent grounds. **First**, the note concept is an import invention: it appears in no code, in no `CONTEXT.md` term, and in no recorded decision, and nothing in the game asks the player to keep private prose — the player's record of a career is the career state itself. **Second**, the screen takes manager-private data as its premise, and privacy between managers presupposes more than one; [`CONTEXT.md`](../../../CONTEXT.md)'s **Save** entry fixes exactly one human manager per Save, and the multiplayer, network and multi-manager axis was removed wholesale from this project at Group A. Returns only if this game acquires a reason for the player to write prose the game itself does not model — a new effort against a redrawn scope, not a resumption of this one. Overturning the multiplayer ruling alone would not bring it back, because the first ground would still stand. |

## Screen 30: Manager History

Status: **Not yet audited**. The rows below come from the blanket sweeps; nobody has read this
screen.

| Sections | Kind | What the spec asks | Disposition | Anchor |
|---|---|---|---|---|
| §10 Permissions and multiplayer behavior | `out-of-scope` | An active manager whose identity scopes what private data may be displayed, shared career data from an authoritative host or server revision, client rendering state that never grants permissions, private transient content cleared before the next manager gains control, and remote changes refreshing content without overwriting local drafts. | None of the five bullets has a referent. One manager, so nothing is scoped and nothing is handed over; no host and no server; no permission for rendering state to grant or withhold; no remote to push a change. | The multiplayer, network and multi-manager axis, removed wholesale at Group A. Disposed in full under *The multiplayer axis* above, which rests on [`CONTEXT.md`](../../../CONTEXT.md)'s **Save** entry. |
| §3 Position in the navigation model, §6 Core data model (revision-immutable models, network-boundary validation), §8 Screen and operation states (stale responses discarded by revision or request fingerprint), §9 Navigation behavior (manager-scoped navigation history), §11 Validation and error handling (revision validation; `permission-denied`, `offline` and `conflicted` states), §17 Persistence rules (manager-scoped drafts, authoritative career state, stale permission decisions), §18 Observability (revision conflicts), §19 Edge cases (the active manager changes, the career revision advances, the host disconnects or migrates) | `out-of-scope` | The active manager as a display scope, a career revision guarding against a concurrent writer, and a permission context threaded through navigation, validation, persistence and observability — plus the offline, conflicted, remote-refresh and host-migration states that go with them. | Every clause named resolves to nothing: one manager to scope to, one writer so no revision is carried or compared, one participant so no permission is checked or denied, and no network to be offline from, conflict with, or lose a host on. The sections themselves are not disposed of — the rest of §9's navigation contract, §11's validation, §17's persistence list and §19's remaining edge cases stay for this screen's audit. | All three disguises — the active manager, the career revision, the permission context — plus the network clauses they travel with. Disposed under *The multiplayer axis* above; not re-argued here. |
| §16 Security and privacy requirements (private versus public history), §20 criterion 4, §21 Recommended tests (Export privacy) | `out-of-scope` | Private inbox and disciplinary notes kept out of public history, retirement visible without private data, and a test that export respects the split. | The private-versus-public split presupposes a second reader to keep things from. There is one reader and everything the game holds is shown to them, so there is no public view to redact into. §16's append-only, entity-visibility, safe-text and no-client-editing bullets stay for this screen's audit. | All three disguises — the active manager, the career revision, the permission context — plus the network clauses they travel with. Disposed under *The multiplayer axis* above; not re-argued here. |
| §22 Condensed LLM implementation brief, §23 Next planned item, `Suggested Git commit` | `out-of-scope` | A restatement of the whole file, a pointer to the next file the import author intended to write, and a commit message. | Not audited. Auditing the brief would double-count every section it summarizes. | Non-normative import scaffolding — the [Group A ruling](../group_a_application_shell_and_game_lifecycle_remaining/RECONCILIATION.md), applied unchanged. |

## Screen 31: Manager Profile

Status: **Not yet audited**. The rows below come from the blanket sweeps; nobody has read this
screen.

| Sections | Kind | What the spec asks | Disposition | Anchor |
|---|---|---|---|---|
| §10 Permissions and multiplayer behavior | `out-of-scope` | An active manager whose identity scopes what private data may be displayed, shared career data from an authoritative host or server revision, client rendering state that never grants permissions, private transient content cleared before the next manager gains control, and remote changes refreshing content without overwriting local drafts. | None of the five bullets has a referent. One manager, so nothing is scoped and nothing is handed over; no host and no server; no permission for rendering state to grant or withhold; no remote to push a change. | The multiplayer, network and multi-manager axis, removed wholesale at Group A. Disposed in full under *The multiplayer axis* above, which rests on [`CONTEXT.md`](../../../CONTEXT.md)'s **Save** entry. |
| §3 Position in the navigation model, §6 Core data model (revision-immutable models, network-boundary validation), §8 Screen and operation states (stale responses discarded by revision or request fingerprint), §9 Navigation behavior (manager-scoped navigation history), §11 Validation and error handling (revision validation; `permission-denied`, `offline` and `conflicted` states), §17 Persistence rules (manager-scoped drafts, authoritative career state, stale permission decisions), §18 Observability (revision conflicts), §19 Edge cases (the active manager changes, the career revision advances, the host disconnects or migrates) | `out-of-scope` | The active manager as a display scope, a career revision guarding against a concurrent writer, and a permission context threaded through navigation, validation, persistence and observability — plus the offline, conflicted, remote-refresh and host-migration states that go with them. | Every clause named resolves to nothing: one manager to scope to, one writer so no revision is carried or compared, one participant so no permission is checked or denied, and no network to be offline from, conflict with, or lose a host on. The sections themselves are not disposed of — the rest of §9's navigation contract, §11's validation, §17's persistence list and §19's remaining edge cases stay for this screen's audit. | All three disguises — the active manager, the career revision, the permission context — plus the network clauses they travel with. Disposed under *The multiplayer axis* above; not re-argued here. |
| §16 Security and privacy requirements (private and public profile views, protected details, lifecycle permissions), §20 criterion 5, §21 Recommended tests (Active manager, Permission-limited viewer) | `out-of-scope` | Private and public profile views computed in a trusted layer, relationships, notes, inbox and ownership details protected, lifecycle action permissions validated authoritatively, and tests for an active manager and a permission-limited viewer. | There is no permission-limited viewer to compute a public view for, and no second manager for ownership or relationships to be protected from. §16's hidden-attribute bullet is the knowledge model rather than a permission model and stays for this screen's audit, which Screen 31's complement ticket owns. | All three disguises — the active manager, the career revision, the permission context — plus the network clauses they travel with. Disposed under *The multiplayer axis* above; not re-argued here. |
| §22 Condensed LLM implementation brief, §23 Next planned item, `Suggested Git commit` | `out-of-scope` | A restatement of the whole file, a pointer to the next file the import author intended to write, and a commit message. | Not audited. Auditing the brief would double-count every section it summarizes. | Non-normative import scaffolding — the [Group A ruling](../group_a_application_shell_and_game_lifecycle_remaining/RECONCILIATION.md), applied unchanged. |

## Screen 32: Manager Chat and Multiplayer Communication

Status: **Disposed in full** (ruled at charting, group-b-blanket-disposals ticket 01, 2026-09-07).

The screen was ruled out of scope as a whole file before any Group B ticket opened. It is the
multiplayer, network and multi-manager axis end to end, with no residue on any other axis, so a
section-by-section pass would restate the same disposal twenty-three times. The single row below
covers every section, so nothing here is silent and no audit of this screen is owed.

| Sections | Kind | What the spec asks | Disposition | Anchor |
|---|---|---|---|---|
| §1–§23 and Suggested Git commit — the whole file | `out-of-scope` | Career-scoped communication between participants: a lobby with manager presence, public, team, direct and system channels, message send and receive, mute, block and report, connection and delivery state, and shared entity links that leak no private knowledge. | Nothing exists and nothing is planned. There is no chat surface, no channel, no participant list, and no transport for a message to cross. | Every section rests on there being a second human manager to talk to, and there is not one: [`CONTEXT.md`](../../../CONTEXT.md)'s **Save** entry fixes exactly one human manager per Save, and the multiplayer, network and host axis was removed wholesale from this project at Group A. AI-managed clubs are simulated, not correspondents. Returns only if a Save gains multiple human managers, which would be a new effort against a redrawn scope, not a resumption of this one. |
