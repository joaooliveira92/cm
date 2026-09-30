# 16: Best XI, Overall Rating and AI squad needs read suitability directly

**What to build:** Best XI fills each slot with the player whose suitability-adjusted Position
Rating is highest; Overall Rating is the player's best Position Rating among cells where he is
Natural, still feeding Transfer Value; AI clubs judge squad needs and transfer targets by line and
side coverage (which cells the squad can fill at competent or better) instead of by counting stored
Positions. These consumers stop reading the transitional (Position, tier) projection.

Seam: the shared Best XI and rating rules, and the main-process transfer and AI-club logic. No new
failure channel; the existing squad-too-small failure of Best XI is unchanged.

**Decisions:**

- **suitability = min(line for the row, side for the column), with LC/RC reading C, wide D and DM reading max(line, WB), M reading max(M, AM − 5); Familiarity Tier derived (natural 18-20, competent 15-17, unfamiliar ≤14); Overall Rating unchanged; a match cost for poor suitability moves to formations-and-instructions ticket 08.** See [Agent Note](../../../.agents/notes/proposed/architecture/2026-09-29-slot-suitability-min-of-line-and-side.md).

**Blocked by:** 13

**Status:** ready-for-agent

- [ ] Best XI picks a natural full-back over an unfamiliar one of higher raw attributes when the suitability-adjusted rating says so.
- [ ] Overall Rating equals the best Position Rating among Natural cells for a table of fixture players.
- [ ] An AI club missing any competent left-sided defender targets one before a fourth centre-back.
- [ ] None of these consumers reads the transitional projection.
- [ ] `pnpm check:all` is green.
