# Group Q: Awards, Honours and Season Transitions

## Package contents

- [Screen 236: Awards Centre](236_awards_centre.md)
- [Screen 237: Player Awards](237_player_awards.md)
- [Screen 238: Manager Awards](238_manager_awards.md)
- [Screen 239: Team and Club Awards](239_team_and_club_awards.md)
- [Screen 240: Team of the Season](240_team_of_the_season.md)
- [Screen 241: Goal and Moment Awards](241_goal_and_moment_awards.md)
- [Screen 242: Honours Summary](242_honours_summary.md)
- [Screen 243: End of Season Review](243_end_of_season_review.md)
- [Screen 244: Promotion Relegation and Qualification Confirmation](244_promotion_relegation_and_qualification_confirmation.md)
- [Screen 245: Season Awards Ceremony](245_season_awards_ceremony.md)
- [Screen 246: Season Transition and Competition Rollover](246_season_transition_and_competition_rollover.md)
- [Screen 247: Off-Season and Holiday Planning](247_off_season_and_holiday_planning.md)
- [Screen 248: New Season Expectations and Budgets](248_new_season_expectations_and_budgets.md)
- [Screen 249: Pre-Season Readiness Checklist](249_pre_season_readiness_checklist.md)

## Functional flow

```text
Awards Centre
  -> Player, Manager, Team, Goal, and Moment Awards
  -> Team of the Season
  -> Honours Summary
  -> End of Season Review
  -> Promotion, Relegation, and Qualification Confirmation
  -> Season Awards Ceremony
  -> Season Transition and Competition Rollover
      -> Off-Season and Holiday Planning
      -> New Season Expectations and Budgets
      -> Pre-Season Readiness Checklist
```

## Shared requirements

- Trusted evidence-based award and honour selection.
- Explicit provisional and confirmed competition movement.
- Resumable, checkpointed, atomic, and idempotent season rollover.
- Accessible, pausable, skippable, reduced-motion presentations.
- Distinct review, confirmation, rollover, planning, and readiness phases.

## Suggested Git commit

```text
docs(game-ui): add awards honours and season transition specifications
```
