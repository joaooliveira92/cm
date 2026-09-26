# Agent Note: Group P v1 scope — nothing built; analytics deferred, three screens out of scope

Status: proposed

## Problem

Group P (Statistics, Records and Analytics) has 14 screen specs, 222 to 235. [Ticket 01](../../../../.scratch/group-p-statistics-records-and-analytics/issues/01-screen-inventory.md)
found all of them absent, and the data under them absent too: no season-level or player-level
statistics, no charting library, no analytics model. Four match statistics are Unavailable by an
earlier decision.

## Proposal

Group P builds no screen in v1.

| Screens | Ruling | Why |
|---|---|---|
| 222, 223, 225 | deferred | read match data, but need a dashboard and season aggregation that do not exist |
| 224, 227, 229 | deferred | need per-player season statistics, which Group P will own when they are built |
| 226, 230, 231, 232, 233 | deferred | need per-match tactical records or several seasons of accumulated stats |
| 228 | out of scope | needs a chance-quality model; building one changes match simulation |
| 234, 235 | out of scope | a report builder and scheduled exports suit a multi-user analytics workflow, not a local single-player game |

Decided under the human's standing delegation (2026-09-21).

## Alternatives considered

- **Add a charting library and build 222 and 224.** Rejected for v1: it needs season- and player-level
  aggregation first, and that store is the real work, not the charts.
- **Defer all 14.** Rejected: it would leave 228, 234 and 235 looking like future work when they are not.

## Acceptance criteria

- The Group P deviation register records each screen with the ruling above.
- No Group P implementation ticket exists for v1.
