# Group I: Scouting and Recruitment

## Package contents

- [Screen 118: Scouting Centre](118_scouting_centre.md)
- [Screen 119: Player Search](119_player_search.md)
- [Screen 120: Staff Search](120_staff_search.md)
- [Screen 121: Scouting Assignment](121_scouting_assignment.md)
- [Screen 122: Scouting Priorities](122_scouting_priorities.md)
- [Screen 123: Recruitment Focus](123_recruitment_focus.md)
- [Screen 124: Player Shortlist](124_player_shortlist.md)
- [Screen 125: Staff Shortlist](125_staff_shortlist.md)
- [Screen 126: Scouting Knowledge](126_scouting_knowledge.md)
- [Screen 127: Recruitment Meetings](127_recruitment_meetings.md)
- [Screen 128: Squad Planner](128_squad_planner.md)
- [Screen 129: Transfer Target Comparison](129_transfer_target_comparison.md)
- [Screen 130: Agent and Intermediary Information](130_agent_and_intermediary_information.md)
- [Screen 131: Trial and Assessment](131_trial_and_assessment.md)

## Functional flow

```text
Scouting Centre
  -> Player Search and Staff Search
  -> Scouting Assignments and Priorities
  -> Recruitment Focus
  -> Player and Staff Shortlists
  -> Scouting Knowledge
  -> Recruitment Meetings
  -> Squad Planner
      -> Transfer Target Comparison
  -> Agent and Intermediary Information
  -> Trial and Assessment
```

## Shared requirements

- Explicit knowledge, confidence, source, and freshness.
- Knowledge-limited search and comparison.
- Authoritative scout workload, permission, budget, and timing rules.
- Explainable recommendations and revision-bound drafts.
- Private notes, shortlists, and searches.
- Full keyboard, screen-reader, localization, scaling, and RTL support.

## Suggested Git commit

```text
docs(game-ui): add scouting and recruitment specifications
```
