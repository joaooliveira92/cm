# 07 — Screen 11 reconciliation update

Type: task
Status: resolved

Blocked by: 03, 04, 05, 06

## Question

Which rows of the Screen 11 reconciliation register does this effort change, and what do they
say afterwards?

`docs/specs/group_a_application_shell_and_game_lifecycle_remaining/RECONCILIATION.md` records
Screen 11 as `Reviewed`, with row 298 marking the mode selector, availability states,
eligibility explanations, accessible row semantics, and autosave grouping as `contradicted`
against an implementation described as "a static `<ul>` of club cards … with no selection
affordance", and row 302 marking keyboard interaction `deferred`.

This effort invalidates the description those rows are built on. The register must be
reconciled in the same effort that changes the code, not in a later pass — a register that
describes a screen that no longer exists is worse than no register.

The work: restate the rows this effort's decisions touch, keep the rows for genuinely
out-of-scope spec sections (search and filter, the eligibility model, the Clubs / National
Teams / Unemployed mode selector, unemployed starts) as deliberate deviations with the reason,
and link the Agent Notes this map produced.

## Answer

The register edit happens **at implement time, in the same commit as the code change** — the
standing decision pairs them ("changing the code without reconciling the register leaves the
register lying"), and writing the new state now would describe an unbuilt screen as shipped.
What this ticket settles is the exact restatement `cm-implement` will transcribe, so the spec
can carry it as a normative instruction.

It touches `docs/specs/group_a_application_shell_and_game_lifecycle_remaining/RECONCILIATION.md`:
the `# Screen 11: Club Selection` status block is appended with a re-audit note, the second audit
table (from the row beginning `§4 Page header, §5 Mode selector` through the trailing paragraph
beginning `The implementation has no selection affordance`) is replaced, and one stale paragraph
in Screen 12's section is updated.

### Untouched

- The multiplayer-trim table above (rows on §29/§30/§35/§11.7/§1/§3/§8, §53 criterion 16/§54,
  draft ownership, §55/§56 scaffolding) and the §9/§28/§32/§33 note stay as they are.
- §18 Appointment reservation is already ruled out of scope by the trim table's §29/§30 row; it
  drops out of the keyboard row rather than being restated.
- The deferred rows for §46/§47/§50/§51/§56/§57 and §58/§59 below are rewritten only where this
  effort changes the facts, not wholesale.

### Status block

> Status: **Reviewed** (group-a-reconciliation ticket 18, 2026-08-31; rows below re-audited by
> the club-selection effort ticket 07, 2026-09-02). The implementation-audit rows restate the
> planned surface — a two-column workspace — and land in the register with the code which builds
> it; until then the register describes the current static list.

### Replacement audit table

| Sections | Kind | What the spec asks | Disposition | Anchor |
|---|---|---|---|---|
| §4 Page header, §6 Club browser row | `contradicted` | A dedicated header with step indicator, and browser rows carrying a club's facts. | The step is framed only by the creation shell's chrome (Cancel, `Next: Review`); there is no dedicated per-screen header or step indicator. The rail row carries name, stature tier, and a six-segment squad-quality meter — not budgets or board objective — with selection coded redundantly (fill, accent bar, badge) against the single focus ring. | [The Club Selection two-column workspace](../../../.agents/notes/implemented/architecture/2026-09-01-club-selection-workspace-shape.md) |
| §15 Accessibility (row semantics, live updates), §27 Club selection behavior, §1 Selection behavior, §67 Keyboard interaction, §66 Accessibility requirements | `contradicted` | Accessible row semantics with live updates, keyboard navigation, selection on Enter/Space, accessible announcements. | Implemented at **level 2**: a bespoke `role="listbox"` on the renderer's roving primitives with `aria-selected` rows, ↑/↓ and Home/End roving, Enter selects, Space toggles, Tab order club list → `Pick a team for me` → Cancel → `Next: Review`, and one polite panel announcer that fires when the shown club changes. | [Club Selection is a level-2 listbox, not a DataTable](../../../.agents/notes/implemented/architecture/2026-09-01-club-selection-keyboard-tier-and-listbox.md) |
| §5 Mode selector, §7 Availability states, §10 Eligibility model, §11 Eligibility factors (§11.1–§11.5), §12 Eligibility explanations | `out-of-scope` | A Clubs / National Teams / Unemployed mode selector, availability state icons, eligibility explanations. | Deliberate deviation. The mode selector, unemployed starts, and the availability/eligibility model are out of this effort's scope: the screen is a single club browser in the one generated League, with every club available. | [club-selection map](../../../.scratch/club-selection/map.md) §Out-of-scope |
| §13 Search behavior, §14 Filter behavior | `out-of-scope` | A search/filter toolbar with nation/competition/financial filters and debounced/cancellable search. | Deliberate deviation. Search and filter over the club list are out of this effort's scope. | [club-selection map](../../../.scratch/club-selection/map.md) §Out-of-scope |
| §17 Pagination and virtualization | `deferred` | Virtualized/paginated long lists. | Twenty rows render eagerly. The threshold is deliberately left open until multi-league generation grows the list; the shared `renderer/table/` layer is the candidate host. | `unscheduled` — owned by the multi-league effort |
| §16 Club overview, §19 Club identity section, §20 Board expectations, §21 Financial summary, §23 Squad summary | `contradicted` | A detailed club overview: identity, board expectations, finances, squad summary. | The detail panel shows a compact squad readout: expectation prose derived from the shared `BOARD_OBJECTIVE_BANDS` band, labelled Transfer/Wage Budget rows in Credits via the shared `formatCredits`, squad size + average age as subordinate figures, and a top-five-by-`overallRating` players row. A league summary (club count, stature-tier distribution) precedes any pick. All rides one widened `ClubSelectionView` payload — no per-club RPC. | [The club detail panel is a compact squad readout over one payload](../../../.agents/notes/implemented/architecture/2026-09-01-club-detail-contract.md) |
| §22 Facilities summary, §24 Staff summary, §25 Recent performance, §26 Full Club Profile | `out-of-scope` | Facilities, staff, recent-performance, and full-profile surfaces. | Deliberate deviation. No facilities readout (the schema has no facilities data); staff summary, recent performance, and a full profile are beyond this effort. | [club detail contract](../../../.agents/notes/implemented/architecture/2026-09-01-club-detail-contract.md) §Problem; [club-selection map](../../../.scratch/club-selection/map.md) §Out-of-scope |
| §23 Autosave groups | `deferred` | Autosave grouping of the selection. | No autosave concept exists on this screen. | `unscheduled` |
| §31 Clear Selection | `deferred` | A Clear Selection action. | Deliberate deviation, recorded by the keyboard decision: single-select with Continue gated on a pick makes rove-then-Enter the clear, and the section serves the out-of-scope multi-select browser. | [Club Selection is a level-2 listbox, not a DataTable](../../../.agents/notes/implemented/architecture/2026-09-01-club-selection-keyboard-tier-and-listbox.md) |
| §52 State model, §53 State transitions | `contradicted` | A schema-validated selection model with explicit state and transitions. | The selection state is the world-bound `clubSelection` record (`clubId`, `clubName`, `provisionalId`) written only through `CreateSessionApi.selectClub` and read only through `selectedClubOf`; it gates Continue, survives back-navigation, and turns into a `null` read on a world mismatch. The screen carries no further state machine. | [The club selection is bound to the world it was picked from](../../../.agents/notes/implemented/architecture/2026-09-01-club-selection-bound-to-its-world.md) |
| §46 Validation errors, §47 Security and integrity requirements, §50 Commands and events, §51 Persistence rules | `deferred` | Schema-validated model, atomic selection/save, commands/events, persistence rules. | `commitCareer`'s error union now rejects an unknown club id with the existing `ClubNotFoundError`; the wider atomic-save, command, and persistence model is not implemented. | [bound to its world](../../../.agents/notes/implemented/architecture/2026-09-01-club-selection-bound-to-its-world.md) |
| §56 Responsive behavior, §57 Localization requirements | `deferred` | Responsive layouts, localization. | Not implemented — the app-wide responsive/localization gap. | `unscheduled` |
| §58 Acceptance criteria (remaining), §59 Recommended tests (remaining) | `deferred` | Criteria 11–14, 16–17, 23–30, 32–35 and their tests. | Unimplemented; the club-selection spec's acceptance criteria supersede the screen-scoped remainder. | [club-selection map](../../../.scratch/club-selection/map.md) |

The final paragraph of Screen 11's audit (the `temp-club-id` no-selection-affordance defect note)
is replaced by:

> Selection is wired: Continue is gated on a picked club, `commitCareer` receives the world-bound
> selection instead of `temp-club-id`, and an id matching no club fails with `ClubNotFoundError`
> (`ReviewPane` gains the club's name). The hardcoded placeholder is gone.

### Screen 12 stales on the same fact

Screen 12's trailing paragraph (`createFlow.tsx` hardcodes `selectedClubId: ClubId.make("temp-club-id")`
making the commit end-to-end unreachable) asserts the same defect this effort fixes. It is updated
to: `Screen 11's selection is wired into commitCareer by the club-selection effort; the placeholder
and the unreachable-commit defect are gone.`

### Note-worthiness

Resolved as a scoping call plus transcription of this map's six decisions into the register and
the spec — the durable propositions (the design, the out-of-scope rulings) already live in the
six Agent Notes and the map's Out-of-scope section, and the restatement's own home is the
register once it ships. Per the note rules' pure-scoping exception, no new Agent Note is written.
