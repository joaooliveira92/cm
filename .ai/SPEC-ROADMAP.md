# Spec Roadmap

The order in which to take the 19 imported spec groups under [docs/specs/](../docs/specs/manifest.md)
from import to shipped screens, and what already stands in the way of each one.

Snapshot date 2026-09-13. It is derived from the group indexes, the three reconciliation ledgers,
[CONTEXT.md](../CONTEXT.md), and the `.scratch/` efforts that cite a screen number. Group and ticket
status moves on without this file. Before acting on a row, check the ledger and the effort named in it.
The ticket queue itself stays in [SPRINT-PLAN.md](SPRINT-PLAN.md).

## Read this first

- **The specs are an import, not requirements.** Each group's `RECONCILIATION.md` says so, and this
  file follows it. A group's first effort reconciles the group. It does not implement the import as
  written.
- **One ruling already cuts across every group.** Apply it before anyone reads a screen.
  *The multiplayer axis*: there is one human manager per **Save**, so active-manager scoping, career
  revisions, permission contexts, hosts and hot-seat are all `out-of-scope`. The disposal lives under
  *The multiplayer axis* in the
  [Group B ledger](../docs/specs/group_b_global_navigation_and_inbox/RECONCILIATION.md).
- **National teams and the job market are deferred, not ruled out** (decided 2026-09-13). Reconcile
  Group O, Group L 176–178 and Group N as `deferred` / `unscheduled`, never `out-of-scope`. See
  [national teams](../.agents/notes/implemented/architecture/2026-09-13-national-teams-deferred-not-ruled-out.md) and [job market](../.agents/notes/implemented/architecture/2026-09-13-job-market-deferred-sacking-stays-terminal.md).
- **Likely dispositions below are candidates, not rulings.** A row that says a screen "looks
  out-of-scope" means a v1 exclusion in CONTEXT.md points that way. The group's reconciliation effort
  makes the actual ruling and records it in that group's ledger.

## Starting a group

Every group has followed the same path. Run it through [ORCHESTRATION.md](ORCHESTRATION.md):

1. Chart a `group-<x>-reconciliation` effort with `cm-wayfinder`.
2. Create `docs/specs/group_<x>_*/RECONCILIATION.md` in the Group A ledger's format. Its coverage
   table starts with every screen at `Not yet audited`.
3. Run a blanket sweep that applies the cross-cutting multiplayer ruling, as `group-b-blanket-disposals` did.
4. Review or audit screen by screen, dispose whole files where warranted, and slice the survivors
   into implementation tickets.

Placeholder skeletons exist for most destinations (effort `placeholder-wip-screens`, commit
`bfa2204`). "Placeholder" in the tables below means a routed, focusable WIP screen with no domain
logic. A placeholder is a slot waiting for a screen, not evidence that the screen was decided.

## Where each group stands

| Group | Screens | State | Ledger |
|---|---|---|---|
| A Application shell and lifecycle | 1–21 | Reconciled. 18 removed; 19–21 redesigned (group-a-reconciliation). | Yes |
| B Global navigation and inbox | 22–32 | Reconciled. 27 Audited, 29 and 32 Disposed in full, the rest Reviewed. | Yes |
| C Club information | 33–49 | 38 Audited (club-staff-presence). 49 shipped in full (`team-scout-report`, 8/8). The other 15 are unreconciled. | 38 only |
| F Tactics and match preparation | 80–90 | 80 shipped (`group-f-tactics-and-match-preparation`, 3/3; no map or spec). 81–90 unreconciled. | No |
| R Multiplayer administration | 250–262 | Disposed in full under the multiplayer axis, 2026-09-13. | Yes |
| D–E, G–Q, S | 50–79, 91–249, 264–277 | Unreconciled. | No |

## Sequence

Each tier needs the domain that the tier before it exposes. Within a tier, groups can run in parallel.

### Tier 1 — finish what is open

Done 2026-09-13: `team-scout-report` completed (the report screen, Club scouting, and kept readings), the Screen 18 and 32
placeholders removed from routes and navigation, and Group R disposed in full.

| Work | Why now |
|---|---|
| Charter the squad work from `.scratch/squad-instructions.md` | It overlaps Group E (Screen 69) and has no effort yet (SPRINT-PLAN § Loose instructions). Whether to charter it is a human call. Its match-day bar is one of the two team-sheet editors [the team-sheet note](../.agents/notes/proposed/architecture/2026-09-13-the-team-sheet-is-the-tactic.md) names. |

### Tier 2 — the player and the team sheet

The core loop runs from player to squad to tactic to match. Most later groups link into these screens.

| Group | Depends on | Existing domain to build on | Reconciliation questions to expect |
|---|---|---|---|
| **D** Player and staff records (50–68) | — | **Attribute**, **Position Rating**, **Contract**, **Injury**, **Condition**, **Knowledge Confidence**, **Staff**. Placeholders exist for profile, attributes, form, history, contract, injuries, coach and scout report, and five staff screens. | 58 Happiness and 60 Discipline: morale and dressing-room relationships do not ship in v1 (**Influence**). 57 Transfer Status maps onto **Listed**. |
| **E** Squad management (69–79) | D | Squad screen and lineup edits (uncommitted work under `renderer/squad/` in the worktree). | 69, 82, 89 and 92 follow [the team sheet is the Tactic](../.agents/notes/proposed/architecture/2026-09-13-the-team-sheet-is-the-tactic.md): Squad's match-day bar and the tactics editor both edit it, and 89 and 92 are views. 76 Registration and 77 Eligibility have no domain term. 78 Grievance and 79 Team Meeting look out-of-scope for the same reason as 58. |
| **F** remainder (81–90) | E (selection) | **Formation**, **Role**, **Team Instructions**, **Tactic**, **Expected Revision**, **Match Readiness**, **Readiness Blocker**. | 86 Set Pieces: the Screen 80 snapshot reports "no set pieces configured until Screen 86 lands." 88 Import touches Group S's 276. 90 Opposition Scout Report likely reuses **Team Scout Report**. |

### Tier 3 — match and world

| Group | Depends on | Existing domain to build on | Reconciliation questions to expect |
|---|---|---|---|
| **G** Match day and review (91–104) | F | **Match Event**, **Minute-Slice**, **Commentary Template**, **Pre-match Boundary**, **Quick result**. There are 13 match sub-screen placeholders. | 98 and 102 Team Talks have no morale model to act on. 104 Disciplinary Review needs a discipline model (see D 60). The match-composition effort touches the same screens. |
| **L** Competitions, nations and world (161–180) | — (data exists) | **Competition**, **League**, **League Table**, **Cup Tie**, **Round**, **Nation**, **Nation Profile**, **Simulation Depth**. There are 12 competition and 10 nation placeholders. | 176–178 national team screens are `deferred` ([note](../.agents/notes/implemented/architecture/2026-09-13-national-teams-deferred-not-ruled-out.md)). 179 World Rankings has no referent. Background-depth leagues must not fabricate stats (index: "without fabricated information"). |
| **C** remainder (33–37, 39–48) | D, L | Finances, fixtures, results and transfers are read models over data that already exists. Placeholders exist for nine club detail views. | 43–45 History, Records and Honours need persisted season history, so either take them after Q or carve out a history store here. 46–47 overlap K. |

### Tier 4 — the club's systems

| Group | Depends on | Existing domain to build on | Reconciliation questions to expect |
|---|---|---|---|
| **H** Training and development (105–117) | D | **Player Development**, **Training Focus**, **Regimen**, **Technical Coaching**, **Coach**. The training screen is a placeholder. | 110 Traits and 115 Mentoring have no domain term. 116 Youth Intake needs a player-generation decision. 117 Pre-season interacts with Q's rollover. |
| **I** Scouting and recruitment (118–131) | D | **Scout**, **Scouting Assignment**, **Scouting Progress**, **Attribute Range**, **Fully Scouted**, **Freshness**. Search, shortlist and scouting centre are placeholders. | 127 Recruitment Meetings, 130 Agents and 131 Trials have no referent. 128 Squad Planner overlaps E and P. |
| **J** Transfers and contracts (132–146) | D, I | **Bid**, **Transfer Window**, **Transfer Budget**, **Wage Budget**, **Free Agent**, **Transfer Inbox**, and the `formula-driven-transfer-economy` note. | 137–140 contract and wage negotiation do not ship in v1 (**Influence**). 136 Loans and 144 Clauses and Installments are unmodelled. |
| **K** Board and facilities (147–160) | C | **Board Objective**, **Verdict**, **Manager Warned** and **Manager Sacked**, **President**. `boardConfidence` is a placeholder. | Board relations do not ship in v1 (**Influence**), so 149–150 Requests and 160 Meetings are in question. 155 Stadium, 156 Affiliates and 157 Commercial have no model. |

### Tier 5 — season boundary and career

| Group | Depends on | Existing domain to build on | Reconciliation questions to expect |
|---|---|---|---|
| **Q** Awards and season transitions (236–249) | G, L | **Season Concluded**, **Board Objective Judged**, and the `season-rollover-skips-conclusion` effort. | 244 and 246 are the load-bearing screens because rollover already exists, while the awards screens (236–241) are new. The index's "resumable, checkpointed" rollover conflicts with the one-transaction advance recorded in the B ledger for Screen 23. |
| **N** Jobs and manager career (194–207) | K, Q | **Manager Sacked**, **Manager Retired**, **Archived Save**, **Manager Profile**. | Deferred: sacking stays terminal in an **Archived Save** ([note](../.agents/notes/implemented/architecture/2026-09-13-job-market-deferred-sacking-stays-terminal.md)). Reopen after K and Q are reconciled. 206 Qualifications was already excluded from Screen 31 in the B ledger. |
| **P** Statistics and analytics (222–235) | G, L, Q | Needs accumulated match and season stats, so it comes last among the gameplay groups. | 228 Expected Performance needs a chance-quality model the engine does not produce. 234–235 Report Builder and Scheduled Exports are heavy for a local single-player game. |

### Tier 6 — late or likely out

| Group | Position |
|---|---|
| **S** Search, utilities and reference (264–277) | Partly shipped under other names. 270 Command Palette and 271 Shortcuts came from `keyboard-first-renderer` (TRACEABILITY rows); 272 matches **Contextual Help**. Global search (264–266) and favorites (267–269) only pay off once D–L exist. 276 Import and Export overlaps F 88. |
| **M** Media and press (181–193) | Media handling does not ship in v1 (**Influence**). Reconcile as a probable whole-group deferral rather than slicing it. |
| **O** National team management (208–221) | Deferred, unscheduled ([note](../.agents/notes/implemented/architecture/2026-09-13-national-teams-deferred-not-ruled-out.md)). When reconciled, its rows are `deferred`, not disposed of the way R was. |
| **R** Multiplayer administration (250–262) | Disposed in full. See the [Group R ledger](../docs/specs/group_r_multiplayer_administration/RECONCILIATION.md). |

## Keeping this current

When a group's reconciliation effort charters or closes, update its row in *Where each group stands*
and move or strike its tier row in the same commit. Record shipped screens in
[TRACEABILITY.md](TRACEABILITY.md), not here.
