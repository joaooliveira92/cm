# Map: Group B reconciliation

Label: `wayfinder:map`

## Destination

A Group B spec and deviation register: a `spec.md` covering all 11 Group B screens that states, per
screen, what the implementation must do — plus a completed
[reconciliation ledger](../../docs/specs/group_b_global_navigation_and_inbox/RECONCILIATION.md)
recording every place the import at
[docs/specs/group_b_global_navigation_and_inbox/](../../docs/specs/group_b_global_navigation_and_inbox/)
is knowingly not followed, and why. Every screen off `Not yet audited`. Ready to hand to
`/to-spec` → `/to-tickets`.

## Notes

**Domain**: local single-player football-management sim, Electron + Effect, event-sourced into one
SQLite file per save. Vocabulary lives in [CONTEXT.md](../../CONTEXT.md), which already defines
**News Message**, **News Inbox**, **Main Menu**, **Load Career**, and **Save** — screens 22, 24 and 31
audit against real vocabulary, not fog.

**Skills every session should consult**: `grilling` and `domain-modeling` by default; `doc-standards`
for anything written under `docs/`; `effect-code` for any session that touches source.

**The imported specs are not requirements.** All eleven files are the same generated 24-section
template (~2,400 lines total, ~260 sections — a tenth of Group A). A session treats them as a
checklist to reconcile against, not a contract to satisfy. Where the import and this codebase
disagree, the codebase's existing decisions win unless a ticket explicitly overturns them, and the
disagreement becomes a ledger row rather than a silent drop.

**This map inherits Group A's rulings.** The
[Group A map](../group-a-reconciliation/map.md) settled the multiplayer / network / multi-manager
axis, worker pools and memory budgets, off-device telemetry, non-normative import scaffolding, and
resignation-and-job-market. Those are not re-litigated here; they are cited.

**Run the blanket disposals first.** [group-b-blanket-disposals](../group-b-blanket-disposals/README.md)
is a three-ticket prefactor that applies the already-settled rulings — screens 29 and 32 in full, the
import scaffolding, the multiplayer axis — across the whole group. It strips roughly a third of the
import's 261 sections, so every audit ticket here opens a smaller file. It writes to the same ledger,
so an audit session should not run concurrently with one of its tickets.

**Execution posture**: this map plans, with no exception. Screens 22, 24–26 and 31 have live code and
an audit will find bugs in it. Findings become ledger rows and spec statements; fixes go through
`/to-tickets` afterwards.

**Screen 23 is done and is not re-opened.** It is `Reviewed` in the ledger, its design lives in two
`implemented` Agent Notes, and its remaining work is execution owned by
[`.scratch/continue-and-advance-time/`](../continue-and-advance-time/map.md). The Group B spec cites it.

**Standing decisions from charting** (settled 2026-09-07, before any ticket opened):

- Screen 32 (Manager Chat and Multiplayer Communication) is out of scope in full — it is nothing but
  the axis Group A already removed.
- Screen 29 (Manager Notebook) is out of scope in full — an import invention with no referent here.
- Screens 24, 25 and 26 are three specs over one implementation and are audited as one ticket.
- Screen 31 is a thin complement to a decision Group A already made, not a fresh audit.

## Decisions so far

<!-- one line per closed ticket -->

- **The blanket disposals ran and the ledger absorbed them** (group-b-blanket-disposals, all three
  tickets, 2026-09-07). Screens 29 and 32 are `Disposed in full` under a fourth ledger status added for
  whole-file rulings; the import scaffolding is disposed across all nine surviving screens; and the
  multiplayer axis is disposed per screen, with its three recurring disguises — the active manager, the
  career revision, the permission context — stated once under *The multiplayer axis* in the ledger for
  the remaining tickets to cite.

- **Ticket 01 — Screen 22 is `Reviewed`.** "Prior safe screen" disposes to "the previous screen":
  Back and Forward are the router's own unfiltered history, and no career route names an entity, so no
  stack entry can go stale. That one fact also disposes of the deleted-entity fallback and §19's stale
  selection cases. `GlobalShellState` has no counterpart and should not — the chrome composes five
  independently-failing reads and a compile-time navbar. Two real gaps recorded `deferred`: a failed
  header read is indistinguishable from one in flight, and back navigation restores the screen wrapper
  rather than the region the player left. See
  [issues/01-screen-22-career-chrome.md](issues/01-screen-22-career-chrome.md).

- **Ticket 02 — Screens 24, 25, 26 (News Inbox, Message, Filters) are `Reviewed`.** Audited as one
  ticket per the charting spec. All three screens move off `Not yet audited` to `Reviewed`. The
  implementation handles all three as one list-and-detail route — Screen 25 is an inline pane rather
  than a separate route, and Screen 26 is an inline filter bar. Main gaps recorded `deferred`: saved
  filter presets, date-range/sender-type/priority criteria, sender summary and entity links on
  messages, content blocks and attachments, virtualization, and the full filter lifecycle. No News
  Message taxonomy hole was found. See
  [issues/02-screens-24-26-news.md](issues/02-screens-24-26-news.md).

The charting-time rulings above are written up as a spec at [charting-spec.md](charting-spec.md). It covers this effort's method and scope only; the Group B
screens spec is `spec.md`, produced by ticket 07.

## Not yet specified

- **Where new Group B surfaces land in the navigation model.** If the Calendar question (ticket 05) or
  the career-record question (ticket 06) produces a new screen, it needs a navbar slot, a keyboard
  tier, and a command-palette decision — the shape Group A's ticket 09 took. Can't be phrased sharply
  until it's known whether either screen exists.

- **The News Message taxonomy.** Which simulated events produce a News Message, and who decides. The
  news audit (ticket 02) will either find this already settled by the implementation or expose it as
  a design hole; only then is it a ticket.

- **Navigation history and focus restoration as a design question.** The chrome audit (ticket 01)
  reads what exists. Whether the gap between it and the import's model is worth its own decision
  depends on what that audit finds.

## Out of scope

- **Screen 32, Manager Chat and Multiplayer Communication, in full.** Ruled at charting. The file is
  entirely the multiplayer / network / multi-manager axis Group A removed wholesale; there is exactly
  one human manager per Save, so there is nobody to communicate with. The whole-file disposal was
  written into the ledger by group-b-blanket-disposals ticket 01, not by ticket 07 as originally
  planned, so the silence is recorded rather than assumed. Both screens are `Disposed in full`.

- **Screen 29, Manager Notebook, in full.** Ruled at charting. Manager-private notes, tags, pinning,
  entity-linked annotations, and note-to-reminder conversion are an import invention: no note concept
  exists in the codebase, in `CONTEXT.md`, or in any recorded decision, and nothing in the game asks
  the player to keep private prose. Also carries the multi-manager privacy model as its premise.
  Ledger row written by group-b-blanket-disposals ticket 01.

- **Multiplayer, network sessions, participant reconnect, ownership transfer, cloud synchronization,
  and multiple human managers per career.** Inherited from Group A. Consumes §10 of all eleven files.

- **Worker pools, memory budgets, and resource-policy tuning.** Inherited from Group A. Consumes most
  of screen 27, which is why that screen is a disposal ticket rather than a design one.

- **Off-device telemetry, crash reporting, and product analytics.** Inherited from Group A. Local
  structured logging is unaffected and stays in scope.

- **Non-normative import scaffolding.** Inherited from Group A: the `Condensed LLM implementation
  brief`, `Next planned item`, and `Suggested Git commit` sections are authoring artifacts, not
  requirements. Three sections per file, thirty-three across this group.

- **Resignation and the unemployed-manager job market.** Inherited from Group A, and the reason
  screen 30's career timeline has at most one appointment on it. Belongs to Group N.

- **Screen 23's remaining execution.** Owned by [continue-and-advance-time](../continue-and-advance-time/map.md).
  This map cites screen 23's reconciliation; it does not carry its build.

- **The other spec groups.** Group A was the pilot, Group B is the second application of its method.
  Widening to the remaining seventeen is a different effort.
