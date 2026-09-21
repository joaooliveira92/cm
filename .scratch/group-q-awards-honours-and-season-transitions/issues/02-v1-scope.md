# 02: Which screens of Group Q are in v1 scope?

Type: grilling
Status: resolved

Blocked by: 01

## Question

[Ticket 01](01-screen-inventory.md) confirmed no Group Q screen has a dedicated route or component.
Some have partial data-layer overlap with shipped infrastructure (season_summary, rollover, budgets);
most are entirely absent with no supporting data model.

Group Q is Tier 5 — depends on Groups G and L. The job-market note says reopening Group N should
wait until Group Q is reconciled.

The screens group into three bands:

### Band 1 — Overlapping shipped infrastructure

Screens that are partially supported by existing code:

| Screen | Shipped overlap |
|--------|----------------|
| 243 End of Season Review | `getSeasonSummary` returns standings, board verdict, manager outcome. No screen. |
| 244 Promotion/Relegation Confirmation | Rollover processes Exchange Links. No confirmation screen. |
| 246 Season Transition / Competition Rollover | One-transaction rollover in `advance.ts`. No transition screen. |
| 248 New Season Expectations / Budgets | Budget derivation from Stature Tier exists. No expectation-setting screen. |

**Recommendation: deferred.** The infrastructure exists but no screen does. A later effort could
build screens without new data models.

### Band 2 — Awards and honours (no infrastructure)

| Screen | Problem |
|--------|---------|
| 236 Awards Centre | No awards model, no DB tables, no event tags |
| 237 Player Awards | No player-season stats |
| 238 Manager Awards | No manager honours model |
| 239 Team/Club Awards | No club honour tracking |
| 240 Team of the Season | No selection model |
| 241 Goal/Moment Awards | No highlight model |
| 242 Honours Summary | No honours accumulation |
| 245 Season Awards Ceremony | Depends on all of the above |
| 247 Off-Season / Holiday Planning | No holiday/inactivity model |
| 249 Pre-Season Readiness Checklist | Pre-season exists as a phase but no checklist |

**Recommendation: deferred.** Building any of these requires an awards infrastructure that does not
exist. The off-season and holiday screens (247, 249) would need the Calendar to stop on non-Fixture
dates — the same blocker as Group M's pre-/post-match briefings.

### Options

**A — Accept the recommendations.** Band 1 and Band 2 all deferred. Group Q is entirely unbuilt but
preserves a path for later season-transition screens and awards.

**B — Build Band 1 now.** Ships End of Season Review (243) and Season Transition (246) using the
existing `season_summary` read model and rollover. These are the screens the job-market note depends
on. Would be the first Group Q implementation work.

**C — Defer everything, including partial-overlap screens.** Records everything as deferred including
the screens with existing infrastructure, since no route or component exists.

## Recommendation

**Option A.** The partial-overlap screens (Band 1) are easier to build later than to spec and test
now without a full picture of what a season-transition flow should feel like. Band 2 needs a design
decision about awards — entirely absent from the shipped game, and adding them is a product call
about what kind of feedback loop the game offers.

## Answer

**Option A, with one correction to ticket 01.** Screen 243 End of Season Review already ships as the
Season Summary screen (`renderer/seasonSummary/SeasonSummaryScreen.tsx`, destination `seasonSummary`),
which the inventory missed; it is recorded as renamed. Every other screen is deferred. Option B was
considered and dropped: 243 exists, and 246 on its own has no design to build from. Decided under the
human's standing delegation (2026-09-21). Recorded as [Group Q v1 scope](../../../.agents/notes/proposed/architecture/2026-09-21-group-q-v1-scope.md);
the per-screen register is in [spec.md](../spec.md).
