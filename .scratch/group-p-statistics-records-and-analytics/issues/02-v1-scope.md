# 02: Which screens of Group P are in v1 scope?

Type: grilling
Status: ready-for-human

Blocked by: 01

## Question

[Ticket 01](01-screen-inventory.md) confirmed all 14 Group P screens (222–235) are absent and the
underlying data infrastructure does not exist: no season-level or player-level statistics, no
charting library, no analytics model. Four match statistics are explicitly Unavailable (possession,
corners, fouls, offsides) per a prior decision.

Group P is Tier 5 in the roadmap — last among gameplay groups, depending on G (match day),
L (competitions), and Q (season transitions).

The screens group into four bands:

### Band 1 — Match-view extensions (deferred on match infrastructure)

Screens that would read data the match engine already produces, but no screen exists:

| Screen | Overlap with shipped code |
|--------|--------------------------|
| 222 Analytics Centre | Aggregate dashboard. No dashboard component exists. |
| 223 Team Performance Dashboard | Per-match and per-season team stats. No season-level stats exist. |
| 225 Match Analysis | Deep match dissection. Shipped Match Statistics and Match Report cover basics. |

**Recommendation: deferred.** These could be built once match infrastructure settles, but no
screen exists and no model supports a dashboard view.

### Band 2 — Player-statistics-dependent (deferred on per-player stats)

Screens that need per-player season statistics. Per-player stats are themselves deferred (Group P
owns the store per the per-player-statistics-deferred note):

| Screen | Dependency |
|--------|-----------|
| 224 Player Performance Dashboard | Player-season stats (goals, assists, ratings, etc.) |
| 227 Form and Trend Analysis | Player-season stats across a rolling window |
| 229 Squad Depth and Availability Analysis | Player-season stats plus Condition/Injury history |

**Recommendation: deferred.** Per-player statistics are deferred, and these screens depend on them.

### Band 3 — Missing engine data (possibly out of scope)

| Screen | Problem |
|--------|---------|
| 228 Expected Performance and Chance Quality | Needs a chance-quality model the engine does not produce. Building one is an engine change. |

**Recommendation: out of scope.** The engine does not produce chance quality, and inventing it
changes match simulation behaviour — not a decision to fold into a screen reconciliation.

### Band 4 — Season-accumulated analytics (deferred on season infrastructure)

| Screen | Dependency |
|--------|-----------|
| 226 Tactical Analysis | Needs per-match tactical record storage |
| 230 Recruitment Analytics | Needs scouting data cross-referenced with performance |
| 231 Financial Analytics | Needs financial data |
| 232 Historical Statistics Explorer | Needs multiple seasons of accumulated stats |
| 233 Records Centre | Needs multiple seasons of accumulated stats |

**Recommendation: deferred.** These need the season-level aggregation infrastructure that does not
exist. They follow the same pattern as per-player statistics.

### Band 5 — Heavy features (possibly out of scope)

| Screen | Concern |
|--------|---------|
| 234 Custom Report Builder | Full report-builder UI with filters, columns, export. Heavy for local single-player. |
| 235 Analytics Export and Scheduled Reports | File export and scheduling. Over-engineered for a single-player desktop app. |

**Recommendation: out of scope.** These are the kind of features the roadmap flags as heavy for a
local single-player game. They assume a multi-user analytics workflow that does not exist.

## Options

### A — Accept the recommendations above

Band 1, 2, 4 → deferred. Band 3, 5 → out of scope. Group P stays unbuilt, split between deferred
screens waiting on match/player infrastructure and two out-of-scope screens that do not fit a
single-player desktop game.

### B — Add a charting library, build a subset of screens

Introduce a charting dependency (recharts or similar), build Analytics Centre (222) and Player
Performance Dashboard (224) as read surfaces over match data, defer the rest. This is the minimum
honest v1 scope for analytics. Requires: adding a charting library, building season-level and
player-level stat aggregation, and at least one new RPC.

### C — Defer the whole group

All 14 screens deferred, nothing out of scope. The heavy screens could still arrive if a later
effort builds them. Downside: the four explicitly unavailable match statistics remain invisible to
the reconciliation, recorded only in the schema rather than in a deviation register.

## Recommendation

**Option A:** it aligns with the roadmap's Tier 5 placement and acknowledges that the heavy screens
do not fit a local single-player game — `out-of-scope` reserves the right not to build them, while
`deferred` preserves a path for the infrastructure-dependent screens.