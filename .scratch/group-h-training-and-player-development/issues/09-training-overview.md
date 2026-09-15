# 09: Training Overview screen (Screen 105)

**What to build:** The Training Overview landing page aggregating the 5 sub-screens: coaching assignments card, workload summary, training plans overview, development centre quick-look, performance report highlights. Built last when all sub-screens exist. Replaces the existing stub `TrainingScreen.tsx`.

**Decisions:**

- Group H v1 scope: 6 screens in scope for v1, 7 deferred. See [Agent Note](../../../.agents/notes/proposed/architecture/2026-09-15-group-h-v1-scope.md).

**Blocked by:** 04 (Coaching Assignments), 05 (Workload and Recovery), 06 (Individual Training Plan), 07 (Performance Report), 08 (Player Development Centre)

**Status:** resolved

- [x] Training overview renders all sub-screen summary cards
- [x] Reuses coach assignment card, workload gauge, plan summary, dev centre card components
- [x] Links to each sub-screen for detail