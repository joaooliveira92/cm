# Group P: Statistics, Records and Analytics

## Package contents

- [Screen 222: Analytics Centre](222_analytics_centre.md)
- [Screen 223: Team Performance Dashboard](223_team_performance_dashboard.md)
- [Screen 224: Player Performance Dashboard](224_player_performance_dashboard.md)
- [Screen 225: Match Analysis](225_match_analysis.md)
- [Screen 226: Tactical Analysis](226_tactical_analysis.md)
- [Screen 227: Form and Trend Analysis](227_form_and_trend_analysis.md)
- [Screen 228: Expected Performance and Chance Quality](228_expected_performance_and_chance_quality.md)
- [Screen 229: Squad Depth and Availability Analysis](229_squad_depth_and_availability_analysis.md)
- [Screen 230: Recruitment Analytics](230_recruitment_analytics.md)
- [Screen 231: Financial Analytics](231_financial_analytics.md)
- [Screen 232: Historical Statistics Explorer](232_historical_statistics_explorer.md)
- [Screen 233: Records Centre](233_records_centre.md)
- [Screen 234: Custom Report Builder](234_custom_report_builder.md)
- [Screen 235: Analytics Export and Scheduled Reports](235_analytics_export_and_scheduled_reports.md)

## Functional flow

```text
Analytics Centre
  -> Team and Player Performance Dashboards
  -> Match and Tactical Analysis
  -> Form, Trend, and Expected Performance
  -> Squad Depth and Availability
  -> Recruitment and Financial Analytics
  -> Historical Statistics Explorer
  -> Records Centre
  -> Custom Report Builder
      -> Analytics Export and Scheduled Reports
```

## Shared requirements

- Versioned metric definitions, units, denominators, coverage, and uncertainty.
- Trusted aggregation, modeling, ranking, record detection, and export services.
- Bounded cancellable queries and accessible visualization alternatives.
- Permission-safe saved reports, schedules, and exports.
- Explicit separation of missing values from zero and correlation from causation.

## Suggested Git commit

```text
docs(game-ui): add statistics records and analytics specifications
```
