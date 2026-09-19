# Decision Request: What does "coach rating" on the Performance Report (Screen 113) show?

## Question

On a player's Performance Report, should "coach rating" show the club Coach's quality (the same 1-20
value Coaching Assignments shows), or a rating the Coach gives this player?

## Why this is blocking

The contract's domain-ambiguity stop condition fired: the two readings put different, player-visible
content on the screen, and nothing in the repo settles which one is meant.

- [spec.md](spec.md) says Screen 113 "shows player's Training Focus, development progress (attribute
  changes), coach rating, and training compliance".
- The same spec calls the Coach's 1-20 value a "quality rating" when describing Screen 111.
- The screen spec [113_training_performance_report.md](113_training_performance_report.md) lists
  "coach ratings" beside attendance and unit ratings, which reads as ratings *of the player*.
- The stub being filled is named `PlayerCoachReportScreen`, which also leans toward a report *about*
  the player.
- [Ticket 03](issues/03-partial-screen-build-sequence.md) does not mention a coach rating for
  Screen 113.

Guessing Option B would invent a player rating with no domain model behind it, which the v1 scope
forbids. Guessing Option A could show the manager a number they read as a judgment of the player
when it is not one.

## What is already settled

- CONTEXT.md **Coach**: one Bound Staff member of role `coach` per club. The Coach scales the passive
  Player Development baseline for the whole squad, never the focused Category.
- [Agent Note: Group H v1 scope](../../.agents/notes/proposed/architecture/2026-09-15-group-h-v1-scope.md):
  no new domain models in v1.
- Ticket 07 ships Training Focus and development progress without coach rating. Its first acceptance
  criterion stays open on this question.

## Options

### Option A — Coach quality

- **What the player experiences**: the report shows the club Coach's name and quality (1-20), with a
  line saying the Coach scales every player's baseline development.
- **What it costs to build**: small. Reuse `CoachCard` and the existing `getCoachingAssignments` read.
- **What it forecloses**: nothing. A per-player rating can be added later under its own name.
- **Save compatibility**: none affected; read-only.

### Option B — A coach's rating of the player

- **What the player experiences**: a per-player rating (for example a training score) from the Coach.
- **What it costs to build**: a new domain model (what the rating measures, how it is derived, whether
  it is deterministic and when it updates), a new CONTEXT.md term, and a projection or event. That is
  outside v1 scope.
- **What it forecloses**: v1 scope, unless the Group H scope note is revised.
- **Save compatibility**: depends on the model; a derived projection needs no migration, a persisted
  rating does.

### Option C — Drop coach rating from Screen 113 in v1

- **What the player experiences**: the report shows Training Focus and development progress only.
- **What it costs to build**: none; update the spec and close ticket 07's first criterion without it.
- **What it forecloses**: nothing.
- **Save compatibility**: none affected.

## Recommendation

Option A. It uses data that already exists and exactly drives this player's baseline development, so
it is a true statement about the player's training. Label it "Coach quality", not "coach rating", so
it cannot be mistaken for a judgment of the player. Option B is a post-v1 feature.

## What is blocked, and what is not

- Blocked: ticket 07's "coach rating" criterion, and the coach-rating part of Screen 105's
  aggregation in ticket 09.
- Proceeding meanwhile: ticket 07's Training Focus and development progress (shipped), ticket 08
  (Player Development Centre), ticket 10.

---

## Answer — Option A, 2026-09-19

**Coach quality, and labelled "Coach quality".** The field shows the club **Coach**'s 1–20 value — the
same one Coaching Assignments shows — because that value drives this player's baseline development, so it
is a true statement about the player's training.

**The relabel is the load-bearing half.** "Coach rating" beside a player's name reads as a judgment of the
player, and the whole reason this request existed is that two readers of the same spec read it two ways.
Use "Coach quality" on Screen 111 too, so one value has one name.

A rating the Coach gives the player is post-v1 and needs a model before it needs a screen.

Settled with request 02 as
[the Performance Report shows what it can prove](../../.agents/notes/proposed/feature/2026-09-19-the-performance-report-shows-what-it-can-prove.md).
Decided under the human's standing delegation ("i need you to solve the decisions").
