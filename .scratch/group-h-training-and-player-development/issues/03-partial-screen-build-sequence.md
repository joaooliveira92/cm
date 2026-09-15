# 03: Build sequence

Type: grilling
Status: resolved

## Question

Given the screen inventory (01) and scope decisions (02), what is the dependency-ordered build sequence for the 6 in-scope screens? Prioritize screens that build on existing domain logic over those requiring new surfaces.

## Answer

### Build sequence (6 in-scope screens)

| Priority | Screen | Rationale |
|---|---|---|
| 1 | 111 Coaching Assignments | Simplest: read-only UI over existing coach model. No new domain logic, no new RPCs. Coach data already flows through staff/DB. |
| 2 | 112 Workload/Recovery | Read player condition from existing engine; show training load indicator. Existing RPCs for player state. |
| 3 | 108 Individual Training Plan | Enhance existing Training Focus picker (already in PlayerDevelopmentScreen) into a richer per-player plan card. One existing RPC (`setTrainingFocus`). |
| 4 | 113 Performance Report | Populate coach report stub with real data: training focus, development progress, attribute changes. Reads existing data; no new RPCs needed. |
| 5 | 114 Player Dev Centre | Squad-wide development overview: player cards with training focus, development trajectory indicators. References per-player dev screen pattern. Needs squad-scoped read RPC possibly. |
| 6 | 105 Training Overview | Landing page aggregating the above 5 screens: coach card, workload summary, plan status, dev centre quick-look. Built last when all sub-screens exist. |

### Shared components

- **Workload gauge** — reused across 112 (Workload), 105 (Overview), and possibly 114 (Dev Centre)
- **Coach assignment card** — reused across 111 (Assignments) and 105 (Overview)
- **Training plan summary** — reused across 108 (Individual), 105 (Overview), 114 (Dev Centre)

### Follow-up after charting

Once sequence is settled, produce the reconciled spec (cm-to-spec) and slice into implementation tickets (cm-to-tickets).