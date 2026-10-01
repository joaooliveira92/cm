# 04: The saved schedule changes how recovered the squad is at kickoff

**What to build:** the schedule the manager saved in 03 now matters. When the Calendar advances past
the club's Matchday, the human club's players recover toward full Condition by the usual step,
multiplied by the saved schedule's recovery modifier: a Recovery week leaves them fresher at the next
kickoff, a Heavy week less fresh. The Training Schedule screen shows each player's projected
Condition at the next Fixture under the draft next to the saved schedule, so the manager sees the
trade-off before saving. Balanced changes nothing, so a career that never opens the screen plays
exactly as before.

The slice's edge: the modifier is a pure function of the schedule and cannot fail. Recovery reads the
club's saved schedule inside the existing Calendar advance and needs no new service; a missing
schedule reads as Balanced. The projection is computed by the same pure functions recovery uses, so
the screen and the advance cannot disagree.

**Decisions:**

- The schedule moves between-match Condition recovery only, bounded inside Regimen's range, never Player Development. See [Agent Note](../../../.agents/notes/proposed/feature/2026-09-28-training-schedule-moves-condition-only.md).

**Blocked by:** None. 03 is resolved, and the human club's recovery step it multiplies landed in `923ec6d1` ([human-club-recovery 01](../../human-club-recovery/issues/01-human-club-recovers-before-each-kickoff.md)).

**Status:** claimed

- [ ] The schedule's recovery modifier is a pure function in the shared rules package: Balanced gives exactly 1, and every schedule's modifier lies within 0.9 to 1.1.
- [ ] Between-match recovery multiplies the existing seven-day step's gain by the human club's modifier; AI clubs recover at a modifier of 1.
- [ ] A season advanced with no schedule saved produces exactly the Condition values it did before this change.
- [ ] From the same starting state, a Recovery schedule leaves a player at a higher Condition at the next kickoff than a Heavy schedule.
- [ ] Player Development's output for a Season is unchanged by any schedule, and a test pins that.
- [ ] The schedule read returns each player's projected Condition at the next Fixture, and the screen shows it for the draft and the saved schedule.
- [ ] `CONTEXT.md`'s Condition and Regimen entries name the schedule recovery modifier and its band.
