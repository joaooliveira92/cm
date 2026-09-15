# 02: Scope decision for missing systems

Type: grilling
Status: resolved

## Answer

### In scope for Group H v1

| Screen | Rationale |
|---|---|
| 105 Training Overview | Aggregate view over existing data; no new domain logic |
| 108 Individual Training Plan | Enhance existing Training Focus into a richer per-player plan UI (still one toggle, but with schedule context) |
| 111 Coaching Assignments | UI on existing coach model; no new backend |
| 112 Workload/Recovery | Training workload UI leveraging existing condition/recovery engine |
| 113 Performance Report | Populate coach report stub with real data from existing player state |
| 114 Player Dev Centre | Squad-wide development overview on existing domain; per-player view already built |

### Deferred from Group H v1 (require new domain models)

| Screen | What's missing |
|---|---|
| 106 Training Calendar | Scheduling model; training sessions as first-class domain objects |
| 107 Training Unit Assignment | Unit/group model; player-to-cohort assignment |
| 109 Position/Role Training | Position-specific training plan; links to Familiarity Tier |
| 110 Additional Focus/Traits | Trait system; additional focus model beyond single Category |
| 115 Mentoring Groups | Mentoring relationship model; senior/junior pairing logic |
| 116 Youth Intake | Youth player generation; academy infrastructure; contract/status model |
| 117 Training Camp/Pre-Season Plan | Training camp mechanics; pre-season scheduling UI |

### Follow-up note

Screens 106-107 and 117 could form a single "Training Schedule and Workload Management" sub-effort post-v1. Screens 109-110 belong together as "Skill Development and Specialisation." Screens 115-116 are the largest deferred items and may each need their own map.

See [Agent Note: deferred group-h screens] for full rationale on each deferral.