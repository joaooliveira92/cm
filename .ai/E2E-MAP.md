# E2E Map: cm-clone

Snapshot 2026-10-02. One map covering what exists, what is in flight, what is deferred, and the
roadmap from here through M3. This file is derived from `.ai/` plans and ledger state. It goes stale
as tickets resolve — re-derive rather than trust once any linked document moves.

---

## 1. What cm-clone is

A local single-player **Football-management simulation game** (CM 03/04 spiritual successor), built
as an **Electron + React + SQLite** desktop app. Game state is **event-sourced** through **Effect
v4**.

| Layer | Technology | Role |
|---|---|---|
| Renderer | React + Tailwind + shadcn/Base UI | 76 screen files, keyboard-first UI |
| Main process | Effect v4 RPC server | 69+ RPC handlers, SQLite persistence |
| Contracts | `@effect/rpc` schemas | IPC seam between renderer and main |
| Game engine | Pure functions | Match simulation, seeded determinism |
| Shared | Pure domain rules | Ratings, development, scouting, tactics |

**Package graph** (one-way, no cycles):
```
shared ← contracts ← game-engine ← apps/desktop
```

---

## 2. Milestones

| # | Milestone | State |
|---|---|---|
| **M0** | The core loop | **Shipped** |
| **M1** | The world is readable | **Current** — opened 2026-09-18 |
| M2 | A season concludes | Sketched |
| M3 | The club's systems | Sketched |

### M1 — The world is readable (current)

**Goal:** Every routed screen shows real data or is deliberately gone.

**Exit criteria:**
1. No `club*`, `player*`, `staff*`, `competition*` or `nation*` WIP screen — all real or deleted
2. Ledgers exist with complete coverage tables for C, D, E, F, G, H, I, J, K, L, M — **MET**
3. No route, nav entry or g-key binding points at a ruled-out screen
4. `pnpm check:all` green, e2e green — **was MET, check current status**
5. Every shipped read model has a traceability row — **MET**

**M1 sequence:**
1. ~~Ledger durability sweep~~ — **DONE 2026-09-19.** 14/19 groups have durable ledgers
2. ~~Group D remainder — player/staff records~~ — **DONE**
3. ~~Group C remainder — club read models~~ — **DONE** (except any-club squad)
4. ~~Group L remainder — competition/nation read models~~ — **DONE**
5. **Placeholder cull** — partial: player/staff done, match screens are M1 non-goal

**WIP status:** 57 → ~10 remaining, each with a named owner.

---

## 3. Spec Groups — State Summary

### Reconciled with durable ledgers (14 groups)

| Group | Screens | State | Screens shipped | Notes |
|---|---|---|---|---|
| **A** Shell & lifecycle | 1–21 | Reconciled | 18 disposed, 19–21 redesigned | Quit guard, creation flow, Manager Profile |
| **B** Nav & inbox | 22–32 | Reconciled | 29, 32 disposed; 23, 24, 27, 30, 31 reviewed | Continue, News, Calendar, Manager History |
| **C** Club info | 33–49 | Reconciled | 34, 38, 39, 40, 42, 47, 49 shipped; 35 partial | Club-scoped read models; 43–45 follow Q |
| **D** Player/staff | 50–68 | Reconciled | 50, 56, 61 shipped; 51/52/53 satisfied inline | Staff role set closed; 10 others deferred |
| **E** Squad mgmt | 69–79 | Reconciled | 69–72 satisfied by Squad screen; 71 partial | Status filter and attribute filter shipped |
| **F** Tactics prep | 80–90 | Reconciled | 80 shipped (Tactics Overview) | 81–90 not yet audited; set pieces in scope |
| **G** Match day | 91–104 | Reconciled | 9 shipped, 2 parked, 3 deferred | Committed timeline shipped; engine-rule fixes unblocked |
| **H** Training | 105–117 | Reconciled | 6 shipped (Coaching, Workload, Plan, Performance Report, Dev Centre, Overview + Goalkeeping rule) | 7 deferred |
| **I** Scouting | 118–131 | Reconciled | 3 shipped (Assignment, Knowledge, Centre) + knowledge-limited reads shipped across all screens | 11 deferred; decision request 01 answered |
| **J** Transfers | 132–146 | Reconciled | 4 shipped (Renewal, Expiry, Budget Review, History) + Player Contract Offer | 11 deferred; decision request 03 open |
| **K** Board & facilities | 147–160 | Reconciled | — | No screens built, no tickets written |
| **L** Competitions | 161–180 | Reconciled | 4 shipped (Overview, Table, Fixtures, Results) | 176–178 deferred (national teams); 11 deferred |
| **M** Media & press | 181–193 | Reconciled | — | All 13 out of v1 (Influence exclusion) |
| **R** Multiplayer | 250–262 | Disposed | — | All disposed — local single-player game |

### Unreconciled (no ledger, never ingested) — 5 groups

| Group | Screens | State |
|---|---|---|
| **N** Jobs & career | 194–207 | Deferred (unscheduled) — sacking stays terminal |
| **O** National teams | 208–221 | Deferred (unscheduled) |
| **P** Statistics | 222–235 | Deferred — needs accumulated stats from G, L, Q |
| **Q** Season transitions | 236–249 | 243 renamed (Season Summary); rest deferred |
| **S** Search & utils | 264–277 | 270/271/272 shipped; rest deferred |

---

## 4. Architecture & Key Decisions

### Engine & data
- **Event-sourced:** Commands → Events → Projections → Read models
- **Seeded determinism:** Same seed → same match, even after resimulation
- **Committed match stores timeline** (2026-09-19): engine-rule changes no longer retroactively alter saved matches
- **Domain-bounded deciders:** Chunked resimulation, not global replay
- **Templated match commentary:** Deterministic prose generation

### Renderer
- **Keyboard-first:** Action registry, binding library, command palette, hash-routed navigation
- **Atom data layer:** Effect Atom for RPC reads, `Atom.family` for scoped reads
- **Club-scoped rule** (2026-09-19): A club screen is club-scoped unless only your club has one
- **Knowledge limits every player read** (2026-09-19): Attribute ranges below Fully Scouted

### Persistence
- **SQLite, one file per save:** Event stream + projections
- **Saves are disposable during development** (2026-09-21): `SAVE_SCHEMA_VERSION` enforced on load
- **No migration path in production:** New-saves-only for schema changes

### Scope
- **Multiplayer:** Removed wholesale
- **Influence systems (morale, media, negotiation):** Excluded from v1
- **National teams:** Deferred, not ruled out
- **Job market:** Deferred, sacking stays terminal

---

## 5. Current State Detail

### Shipped screens (~40 real, 76 total screen files)
Career creation flow (4 steps), Save List, Manager Profile, Squad (interactive lineup, filters,
selection), Squad Instructions/Contract/Sort, Club surfaces (Information, Finances, Staff, Fixtures,
Transfers, Squad, Board Confidence), Competition surfaces (Overview, Table, Fixtures, Results),
Training (Overview, Coaching, Workload, Plan, Performance Report, Development Centre), Scouting
(Centre, Assignment, Knowledge, Team Scout Report), Transfers (Market, Bid composer, History,
Contract Expiry/Review/Renewal, Player Offer), Match (Preview, Commentary, Tactics, Stats,
Ratings, Report, Substitutions), Tactics Overview and editor (formations, roles, set pieces),
Player Profile/Contract/Development, League Table, Season Summary, News Inbox.

### Most recent work (last 10 commits)
- Tactics UI: native select/checkbox → Popover/Command/Checkbox components
- Sweeper pinned to centre column
- Pitch markers in club colours
- Set-piece instruction commentary lines (~190 new lines)
- Free kicks, corners, set-piece roles reaching the engine
- Refactors: AiController extraction, TacticalAdapter, resolver classes, tactical-modifiers/ directory

### Uncommitted changes
9 e2e spec files modified (club-fixtures-and-transfers, club-information, club-squad, club-staff-nav,
performance-report, scouting-centre, training-plan, training-schedule, training-workload)

### Open decision requests
| Effort | Request | State |
|---|---|---|
| group-f | 01 Are set pieces in scope? | **Answered** — in scope |
| group-g | 01–08 | **All answered** (2026-09-19) |
| group-h | 01 Coach rating for Performance Report | |
| group-h | 02 Development baseline in events | |
| group-j | 01 When a contract may be renewed | **Answered** |
| group-j | 02 Club-scoped transfer history index | |
| group-j | 03 Wage offered inside a knowledge band | **Open** |
| group-l | 01 RPC error channel unification | |
| gate-red-on-dev | 01 Squad decay has no floor | |
| desktop-suite-red | 01 What makes a career destination top-level | |

---

## 6. In-Flight Efforts

### Active (open tickets remaining)
| Effort | Tickets | State |
|---|---|---|
| **group-j** | 10/10 | **10** ready-for-agent (Make offer from Player Profile) |
| **training-schedule-and-delegation** | 04/05 | **04** ready-for-agent (Schedule moves condition) |
| **player-positional-model** | 01–19 | **19** ready-for-agent, blocked on 14–17 (Contract legacy projection) |
| **squad-instructions** | 01–05 | 03 stale claimed lock; 04, 05 resolved |
| **desktop-suite-red** | 01–20 | 20 resolved (build staleness detection); 03 claimed-and-abandoned |

### Stale locks (need resolution)
- `desktop-suite-red` 03: claimed-and-abandoned
- `squad-instructions` 03: claimed since 2026-09-28, work apparently shipped

### Needs a decision
- `.scratch/game-status-survivors/` — map.md only, decisions exist nowhere else
- `.scratch/vendor-quarantine/` — 19 ts/tsx files, no markdown

---

## 7. Immediate Next Steps

From `.ai/SPRINT-PLAN.md`:

1. **group-j 10** — Make offer from the player profile. `ready-for-agent`, unblocked.
2. **training-schedule-and-delegation 04** — Schedule moves condition. `ready-for-agent`, unblocked.
3. **player-positional-model 19** — Contract the legacy projection. `ready-for-agent`, blocked by 14/15/16/17.

### M1 finishing work
- Remaining WIP screens: `staffSearch` and `shortlist` (both waiting on models), plus 6 `match*` screens
  (M1 non-goal — blocked on Group G's open decision requests, which are answered but need builds)
- `group-c-club-information` ticket 10 — any-club squad (Screen 35), unblocked since knowledge-limited
  reads shipped

---

## 8. Roadmap

```
M0 ─ The core loop ────────────────────────────────────────────────── SHIPPED
 │
 │  Career setup → Leagues → Calendar → Pre-match boundary → Match → Results
 │  Squad, Tactics, Training, Scouting, Transfers around it
 │
 ├─M1 ─ The world is readable ───────────────────────────────────── CURRENT
 │  │
 │  ├─ Step 1: Ledger durability sweep ────────────────────────────── DONE
 │  ├─ Step 2: Group D (player/staff records) ─────────────────────── DONE
 │  ├─ Step 3: Group C remainder (club read models) ───────────────── DONE
 │  ├─ Step 4: Group L remainder (competition/nation reads) ───────── DONE
 │  └─ Step 5: Placeholder cull ───────────────────────────────────── PARTIAL
 │       │
 │       └── M1 blocks: staffSearch (model), shortlist (model), then gate green
 │
 ├─M2 ─ A season concludes ──────────────────────────────────────── SKETCHED
 │  │
 │  ├─ Group G live-match remainder ── 6 match placeholders remain
 │  ├─ Group Q ── Season rollover, awards, board verdict
 │  ├─ Pre-requisite: Group G decision requests (all answered, need builds)
 │  └─ Key: Season transitions flow into each other
 │
 └─M3 ─ The club's systems ──────────────────────────────────────── SKETCHED
    │
    ├─ H remainder ── Training depth (deferred screens)
    ├─ I remainder ── Recruitment depth (deferred screens)
    ├─ J remainder ── Transfer/contract depth (deferred screens)
    ├─ K ── Board and facilities (needs charting)
    ├─ P ── Statistics (needs accumulated data)
    │
    ├─ Deferred groups (N, O) ── Gate future content
    └─ Late groups (S, M) ── Search, utilities, media
```

### Tiered build order (from SPEC-ROADMAP)

| Tier | Groups | Rationale |
|---|---|---|
| **Tier 1** | Finish open work | Squad instructions, stale locks |
| **Tier 2** | D, E, F — Player → Squad → Tactics | Core loop links; most later groups link into these |
| **Tier 3** | G, L, C — Match, World, Club | Remaining read models over existing data |
| **Tier 4** | H, I, J, K — Training, Scouting, Transfers, Board | Club's systems (M3) |
| **Tier 5** | Q, N, P — Season, Jobs, Stats | Depends on accumulated data |
| **Tier 6** | S, M, O, R — Search, Media, National teams, Multiplayer | Late or out of scope |

---

## 9. Test Infrastructure

| Suite | Count | Gate |
|---|---|---|
| Desktop unit | ~2,423 tests | `pnpm check:all` |
| Renderer unit | Part of desktop suite | `pnpm check:all` |
| Shared package | 58 tests | `pnpm check:all` |
| Game engine | 19 tests | `pnpm check:all` |
| **E2E (Playwright)** | **39 specs** | **Separate: `test:e2e`** |

**Quality gates** (all in `pnpm check:all`):
1. Typecheck — 0 errors across all packages
2. Lint (oxlint) — stricter ruleset
3. Effect-lint — custom anti-pattern detection
4. Verify markdown links — no broken links
5. Verify DB schema — drizzle artifacts match source
6. Unit tests — all pass

**Note:** e2e is outside `check:all` — a green gate can have red e2e specs.

---

## 10. Repository Layout

```
.ai/                    Autonomous sprint governance
  ├── MILESTONES.md      Current and future milestones
  ├── SPEC-ROADMAP.md    Full order to ship all 19 spec groups
  ├── SPRINT-PLAN.md     Live work queue and detailed narrative
  ├── TRACEABILITY.md    Shipped capabilities → tests
  ├── ENGINEERING-CONTRACT.md  Binding standards
  ├── ORCHESTRATION.md   Pipeline: chart → ground → spec → slice → implement → review → gate
  └── E2E-MAP.md         ← This file

.agents/                Skills and decision records
  ├── skills/           42 skills (cm-wayfinder, effect-code, code-review, etc.)
  └── notes/
      ├── implemented/  ~104 durable Agent Notes
      └── proposed/     ~55 proposed notes

.scratch/               Issue tracker
  ├── group-*/          Screen reconciliation efforts (A–S)
  ├── desktop-suite-red/ Desktop suite stability
  ├── player-positional-model/ Position ratings
  └── ...               50+ effort directories

docs/
  ├── specs/            Imported screen specs + 14 reconciliation ledgers
  ├── agents/           Workflow documentation
  └── roadmap.md        Point-in-time snapshot

apps/desktop/           The Electron app
  ├── src/main/         RPC server, SQLite, wiring
  ├── src/renderer/     76 screen files
  ├── e2e/              39 Playwright specs
  └── test/             315+ test files

packages/               Library packages
  ├── shared/           Pure domain rules
  ├── contracts/        RPC schemas
  └── game-engine/      Match simulation
```