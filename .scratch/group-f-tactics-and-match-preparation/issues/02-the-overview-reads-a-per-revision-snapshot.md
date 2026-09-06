# 02: The overview reads one per-revision tactical snapshot

**What to build:** A read command — consumed by the Tactics Overview and nothing else to begin with — returns a single immutable snapshot of the active club's tactical preparation, every value bound to one club revision and one tactic revision as a pair.

The snapshot carries: the formation summary (name plus its preview slots), the three team-instruction values, the eleven player assignments with their trusted position and role ratings, a derived familiarity summary, the selection summary (the eleven starters named in the active tactic's slots; everyone else registered with the club as substitutes), the set-piece status (no set pieces configured until Screen 86 lands), and the issues list — every blocking and advisory readiness finding, each with the screen that owns fixing it.

Ratings are computed at the trusted boundary, never in the renderer: the renderer receives numbers it displays, not attributes it converts. The familiarity summary is derived, never assigned — read from each named starter's existing position-familiarity tier and the tactic's own usage. Selection stays distinct from squad membership and player registration: starters are exactly the players named in the tactic's slots, substitutes are the registered players not named; an explicit starters-and-bench selection model is Screen 89's effort, and this ticket records that mapping rather than inventing one.

The snapshot is internally consistent: every value inside it reads from the same tactic-and-club revision pair, so a requester that later learns a newer revision exists knows the snapshot is stale and discards it whole rather than rendering a mix of old and new.

Seam: read of one club's tactical preparation. A caller observes one fresh snapshot for a stated revision pair, or the underlying not-found / archived-save failures; staleness is observable through the revisions the snapshot declares, not through partial reads. It needs the tactic, squad, and fixture-readiness persistence the club already has, plus the shared rating and familiarity derivations — no renderer-calculated suitability crosses this edge.

**Decisions:**

- Position and role ratings are derived at the trusted boundary before the match boundary, never recomputed inside the renderer. See [Agent Note](../../../.agents/notes/implemented/architecture/2026-08-27-role-rating-outside-match-engine.md).
- Starters are the players named in the active tactic's slots and substitutes are the remaining registered players, keeping the plan distinct from squad membership; an explicit bench/selection model is Screen 89's. See [Agent Note](../../../.agents/notes/implemented/architecture/2026-08-29-human-fixture-pre-match-boundary.md).
- The issues list reports blockers and advisories together, each carrying the screen that owns its fix, so resolving one never unmasks a second surprise. See [Agent Note](../../../.agents/notes/implemented/architecture/2026-09-03-the-first-pending-decision.md).
- Familiarity is derived from training and usage, never assigned directly; the v1 summary reads the per-player position-familiarity tier plus tactic usage, deferring formation- and instruction-level familiarity to the training domain. See [Agent Note](../../../.agents/notes/proposed/feature/2026-08-29-training-focus-squad-column.md).

**Blocked by:** 01 (Tactic saves carry revisions and refuse stale or duplicate writes) — the snapshot binds to the club tactic revision that ticket introduces; there is nothing to bind to before it.

**Status:** ready-for-agent

- [ ] The snapshot's every value reads from one tactic-and-club revision pair, returned together so a stale snapshot can be discarded whole.
- [ ] Formation, instruction, assignment, familiarity, selection, set-piece, and issue sections are all present in one response.
- [ ] Selection sum is consistent: starters equal the players named in the tactic's slots and substitutes equal the rest of the registered squad, never an overlapping or missing set.
- [ ] Ratings and familiarity arrive computed: the renderer receives derived numbers and derives nothing tactical itself.
- [ ] The issues list includes both blocking and advisory findings, each with the screen that owns its fix.
- [ ] Set-piece status reports no set pieces configured; the snapshot neither invents nor reveals hidden opposition or scouting data.
- [ ] `pnpm check:all` is green.