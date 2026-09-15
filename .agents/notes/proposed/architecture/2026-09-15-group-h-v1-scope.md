# Agent Note: Group H v1 scope — screens deferred for domain-model gaps

Status: proposed

## Problem

Group H (Training and Player Development) has 13 screen specs. After the screen inventory survey (ticket 01), only 7 screens have even partial backend support. The remaining 6 screens require entirely new domain models (training calendar, training units, position/role training, trait system, mentoring, youth intake generation, training camp mechanics) that do not exist in the codebase. Building all 13 screens in one effort would require chartering multiple new sub-domains.

## Proposal

Split Group H into two phases:

**Group H v1 (6 screens, in scope):** Build UI surfaces that can leverage existing backend models:
- 105 Training Overview (aggregate view over existing data)
- 108 Individual Training Plan (enhance existing Training Focus)
- 111 Coaching Assignments (UI on existing coach model)
- 112 Workload/Recovery (UI on existing condition/recovery engine)
- 113 Performance Report (populate existing coach report stub)
- 114 Player Development Centre (squad-wide view on existing domain)

**Deferred to post-v1 (7 screens):**
- 106 Training Calendar, 107 Training Unit Assignment, 117 Training Camp — grouped as "Training Schedule and Workload Management"
- 109 Position/Role Training, 110 Additional Focus/Traits — grouped as "Skill Development and Specialisation"
- 115 Mentoring Groups — its own effort
- 116 Youth Intake — its own effort

## Alternatives considered

- **Build all 13 screens in Group H**: Rejected because 6 screens would each require a new domain model from scratch, making the effort unbounded.
- **Defer everything to v2**: Rejected because the 6 in-scope screens provide the most immediate value (Training Focus display, coaching visibility, dev centre overview) with minimal new backend work.

## Acceptance criteria

- Group H spec covers only the 6 in-scope screens for v1 implementation
- Deferred screens are documented in the map's Out of scope section
- Implementation tickets exist only for the 6 in-scope screens

## Risks

- Deferring calendar/units/position-training means the Training Overview (105) cannot show schedule or group-level data yet — it will be a simpler screen in v1.