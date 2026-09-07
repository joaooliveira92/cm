# 02: Team Scout Report wire shape

Type: task

**What to build:** The validated, serializable, per-revision wire shape for a Team Scout Report, plus its failure channel. A renderer caller can decode a report across the process boundary and observe a closed set of failures — the report itself is immutable per revision and validated at the boundary, never trusted from the renderer. This ticket defines the `Effect<TeamScoutReport, E>` edge every later ticket inherits: which failures a caller can observe and what the success payload carries. No services are in `R` yet; the shape is pure data.

The report carries: `reportId`, `targetClubId`, `scout`, `observedAt`, `knowledgeConfidence`, `predictedFormation` (optional), `strengths`, `weaknesses`, `keyPlayers`, `setPieceFindings`, and `freshness`. The failure channel covers save-not-found, save-archived, club-not-found, and a not-scouted state (no scouted knowledge for the target club yet). Round-trip encoding is proven by test.

**Blocked by:** None (can start immediately).

**Status:** ready-for-agent

- [ ] A `TeamScoutReport` schema carries every field listed above, each validated at the process boundary (IDs are stable entity IDs, confidence and freshness are closed enumerations, findings and key players are bounded lists).
- [ ] The failure channel is a closed union covering save-not-found, save-archived, club-not-found, and not-scouted.
- [ ] Round-trip encode/decode is proven by test, and the schema is exported from the shared contract surface so both processes import the same shape.
- [ ] Nothing in the shape leaks a hidden exact attribute: key players and findings carry knowledge-gated summaries, never exact values a scouted player would not be shown.