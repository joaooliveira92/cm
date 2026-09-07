# 02: Team Scout Report wire shape

Type: task

**What to build:** The validated, serializable, per-revision wire shape for a Team Scout Report, plus its failure channel. A renderer caller can decode a report across the process boundary and observe a closed set of failures — the report itself is immutable per revision and validated at the boundary, never trusted from the renderer. This ticket defines the `Effect<TeamScoutReport, E>` edge every later ticket inherits: which failures a caller can observe and what the success payload carries. No services are in `R` yet; the shape is pure data.

The report carries: `reportId`, `targetClubId`, `scout`, `observedAt`, `knowledgeConfidence`, `predictedFormation` (optional), `strengths`, `weaknesses`, `keyPlayers`, `setPieceFindings`, and `freshness`. The failure channel covers save-not-found, save-archived, club-not-found, and a not-scouted state (no scouted knowledge for the target club yet). Round-trip encoding is proven by test.

**Blocked by:** None (can start immediately).

**Status:** resolved

- [x] A `TeamScoutReport` schema carries every field listed above, each validated at the process boundary (IDs are stable entity IDs, confidence and freshness are closed enumerations, findings and key players are bounded lists).
- [x] The failure channel is a closed union covering save-not-found, save-archived, club-not-found, and not-scouted.
- [x] Round-trip encode/decode is proven by test, and the schema is exported from the shared contract surface so both processes import the same shape.
- [x] Nothing in the shape leaks a hidden exact attribute: key players and findings carry knowledge-gated summaries, never exact values a scouted player would not be shown.

## Notes

**`SaveArchivedError` is not in the failure channel**, though this ticket listed it. An Archived
Save is read-only, not unreadable: every pure read in this repo omits the guard, and only mutating
commands call `assertSaveNotArchived`. Carrying it here would make the report *fail* on a finished
career, which is the opposite of what the archived-save rule intends. Recorded in the schema's doc
comment and asserted in `packages/contracts/test/team-scout-report.test.ts`.
