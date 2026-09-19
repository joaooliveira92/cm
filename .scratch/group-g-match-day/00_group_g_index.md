# Group G: Match Day and Match Review

## Package contents

- [Screen 91: Match Preview](091_match_preview.md)
- [Screen 92: Match Day Team Sheet](092_match_day_team_sheet.md)
- [Screen 93: Live Match Overview](093_live_match_overview.md)
- [Screen 94: Live Match Commentary](094_live_match_commentary.md)
- [Screen 95: Live Match Statistics](095_live_match_statistics.md)
- [Screen 96: Live Match Player Ratings](096_live_match_player_ratings.md)
- [Screen 97: Live Match Tactics and Substitutions](097_live_match_tactics_and_substitutions.md)
- [Screen 98: Half-Time Team Talk](098_half_time_team_talk.md)
- [Screen 99: Post-Match Summary](099_post_match_summary.md)
- [Screen 100: Post-Match Statistics](100_post_match_statistics.md)
- [Screen 101: Post-Match Player Ratings](101_post_match_player_ratings.md)
- [Screen 102: Post-Match Team Talk](102_post_match_team_talk.md)
- [Screen 103: Match Report](103_match_report.md)
- [Screen 104: Match Incidents and Disciplinary Review](104_match_incidents_and_disciplinary_review.md)

## Functional flow

```text
Match Preview
  -> Match Day Team Sheet
  -> Live Match Overview
      -> Commentary, Statistics, Ratings, Tactics and Substitutions
      -> Half-Time Team Talk
  -> Post-Match Summary
      -> Statistics, Ratings, Team Talk, Report, Incidents
```

## Shared requirements

- One canonical ordered match-event stream.
- Authoritative match phases and revision-bound commands.
- Knowledge-limited opposition information.
- Accessible live updates, captions, reduced motion, and update pacing.
- Original commentary templates, visuals, and media.

## Suggested Git commit

```text
docs(game-ui): add match day and match review specifications
```
