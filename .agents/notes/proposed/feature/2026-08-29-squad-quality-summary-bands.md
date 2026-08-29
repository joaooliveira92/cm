# Agent Note: Squad Quality as formation-aware best-XI strength, in absolute bands

Status: proposed

## Problem

Club selection at new game shows a **derived qualitative** squad summary rather than a hardcoded
label, because `generateSquad(statureTier)` is unseeded and two saves of the same club differ
materially. The banding rule that turns a generated squad into words was left unfixed: what statistic
over the squad feeds it, what thresholds map that statistic to a label, what "depth" means when squad
*size* was already ruled out as a headline metric, and whether a lucky `mid` squad outranking an
unlucky `big` one is shown honestly or smoothed away.

The binding constraint is that the field must carry **independent information**. Stature Tier, both
budgets, and the Board Objective are three views of one club-level structural category. If the squad
summary always agrees with them it contributes nothing, and the screen shows four columns of one
fact. Within a Stature Tier the objective and both budgets are identical, so the squad summary is the
only field that can distinguish eight otherwise-identical `mid` clubs.

## What generation actually produces

The decision rests on measurements of the shipped generator, not on assumption. Sampling
`generateSquad` (2000 squads per tier, ratings via `positionRating`):

| tier | formation-aware best-XI mean | whole-squad mean |
|---|---|---|
| big | 60.8 (sd 3.6) | 52.8 (sd 2.4) |
| mid | 48.5 (sd 3.2) | 40.7 (sd 2.2) |
| small | 38.7 (sd 3.0) | 31.6 (sd 1.9) |

Three findings follow, each of which changes a decision:

- **Positional cover is constant by construction.** `SQUAD_COMPOSITION` in
  `packages/shared/src/generation.ts` is a fixed record — every club gets 3 GK, 4 DC, 2 DL, 2 DR,
  2 DM, 3 MC, 2 ML, 2 MR, 2 AMC, 3 ST, exactly 25 players. There is no per-club variation to report.
  The strongest alternative reading of depth, recomputing the best XI with each starter removed,
  gives a worst single-absence drop of 2.3 rating points for `big`, 2.3 for `mid` and 2.0 for
  `small` (sd ~0.7) — indistinguishable across tiers and within them.
- **Cross-tier inversion is rare per pair but common per league.** A given `mid` squad outranks a
  given `big` squad about 0.5% of the time on the formation-aware best XI. Across a whole 20-club
  league, **36%** of generated leagues contain at least one cross-tier inversion somewhere, and
  **12%** have a non-`big` club among the four strongest squads.
- **The choice of statistic changes the ordering.** Formation-aware best XI and position-blind top
  eleven disagree on the ordering of the eight `mid` clubs in **93%** of leagues. Formation awareness
  is not an implementation detail.

## Proposal

**Squad Quality is the mean Position Rating of the strongest formation-valid XI**, banded by absolute
thresholds shared across the codebase, derived on read and never persisted. **Squad Depth is
removed.**

### The statistic

For each of the five supported Formations, fill every slot greedily by Position Rating, assigning
each player at most once, and take the completed XI's mean Position Rating. The highest such mean
across the five Formations is the club's raw Squad Quality score. It answers the question the player
is actually asking: *how strong is the best team this club can field within a supported Formation?*

Whole-squad mean is rejected because it gives substantial weight to fourteen reserves who may never
appear, blurring first-team quality with reserve quality — and with positional composition fixed,
those fourteen carry too little independent information to justify diluting the first-team signal.
Position-blind top eleven is rejected because it may describe a team that cannot be fielded: four
centre-backs, no viable goalkeeper, nobody in the wide slots. The 93% ordering disagreement measured
above is the cost of getting this wrong.

### Absolute bands, six of them

Thresholds apply to the raw score directly, with no normalisation, clamping or smoothing by Stature
Tier, budget or Board Objective:

| score | band |
|---|---|
| < 35 | Very Weak |
| 35 – 41 | Weak |
| 42 – 48 | Competitive |
| 49 – 55 | Strong |
| 56 – 62 | Very Strong |
| ≥ 63 | Elite |

Every interval is occupied under current generation, and each tier normally spans two of them —
`big` runs Strong 9% / Very Strong 66% / Elite 25%, `mid` runs Weak 3% / Competitive 56% /
Strong 40%, `small` runs Very Weak 9% / Weak 81% / Competitive 10%. So the bands separate clubs
*inside* a tier, which is the job, while tier overlap stays real but rare, which is the constraint.
Collapsing to five bands would merge one of the two extremes into a neighbour and flatten exactly the
tier boundaries that are most distinct.

Bands communicate meaningful ranges, not unique rankings. They must not be redesigned to guarantee
that all eight `mid` clubs receive different labels.

Vocabulary is neutral about outcomes: **Very Strong**, not *Contender*, and never *Title contender*,
*Guaranteed champion* or *Relegation certainty*. The score measures XI strength, not league position,
win probability or board success, and the label must not imply otherwise. This keeps four concepts
distinct — Stature Tier (structural category), Board Objective (institutional expectation), Squad
Quality (measured XI strength), and expected outcome (not calculated by this feature at all).

### Cross-tier inversions are displayed, not corrected

A strong `mid` squad may read a band above a weak `big` one while its tier, both budgets and its
Board Objective still say `mid`. That is not an invalid state needing warning copy or reconciliation:
it says that stature does not perfectly determine generated playing strength, and it is exactly the
information that distinguishes the eight `mid` clubs from each other. Banding *within* tier was
rejected for the opposite reason — it answers "how strong is this club relative to clubs sharing its
structural tier", which is not what the field claims, and it would label a `small` club *Elite* for
being the best of a weak group.

### Squad Depth is removed

Positional cover is constant by construction and the absence-drop alternative differentiates nothing,
so a Depth field would repeat the generation template twenty times. A selection field earns its place
by helping distinguish clubs; this one cannot, and showing it adds comparison effort against the
onboarding requirement to avoid information overload. The prerequisite for Depth returning is not a
better formula but **meaningful variation in squad construction** — a world-generation change, owned
by whoever owns the generator, not introduced here.

### The Challenge label is removed

Board Objective already derives from Stature Tier through `BOARD_OBJECTIVE_BANDS`, so a Challenge
label derived from tier plus Squad Quality would compress two adjacent visible values into a third
adjacent value. Its vocabulary also overclaims: *Rebuild* implies a state, strategy or board mandate
the simulation does not model, and *Title Contender* both predicts a league outcome and collides with
the band vocabulary. The compact row becomes club identity, Stature Tier, Board Objective and Squad
Quality band — with the band as the one column that differs between two clubs of the same tier. The
short prose challenge description goes with it, removing the surface where outcome-guaranteeing copy
would most easily creep in.

### The band only, no raw score

Selection shows `Squad Quality: Strong`, never `Strong (52)`. The score is the mean of one greedily
selected XI: useful for comparison, but not a win probability, a difficulty rating, a projected
points total, or a guarantee that 52 outplays 51. Exposing the integer would invite the
optimisation-table reading that the qualitative band exists to refuse, on the first screen a new
player meets. Several `mid` clubs sharing a band is acceptable — their squads may genuinely fall in
the same range, and club identity, Board Objective and the budgets remain as separators. If the
screen under-differentiates in play, revisit the thresholds or the band count before exposing the
number. The raw score stays available internally for band selection, tests, diagnostics, generation
analysis and AI Formation selection.

### Derived on read, never persisted

Squad Quality is a deterministic function of current squad membership, current Attribute values,
Position Rating, the supported Formations and the shared thresholds. It needs no column and no event,
matching the treatment `CONTEXT.md` already gives Position Rating and Transfer Value. At selection it
reads the freshly generated squad. In-career movement is correct behaviour, not drift: improving the
strongest XI *should* raise the band, and a creation-time snapshot would turn a truthful derived
measure into stale metadata. Five Formations across twenty clubs at selection time is acceptable
without profiling; a cache may be added later only if the pure function stays authoritative,
invalidation covers squad and Attribute changes, cached values are never treated as persistent domain
facts, and tests compare cached against uncached.

### v1 measures structural strength, not availability

Squad Quality evaluates the strongest formation-valid XI from the club's current registered squad
**without** temporary availability filtering. No general availability model exists — injury severity
only modulates recovery — and introducing one through a summary field would be the wrong place for
it. Structural squad quality ("how strong is this squad when available") and currently-available XI
quality ("what can I field for the next match") are distinct measures that must not share one
ambiguous label.

## Shared implementation

`selectBestFormationXI` lives in `packages/shared/src/bestXi.ts` as a pure, deterministic function
taking the smallest shape the algorithm needs — player id plus precomputed `positionRatings`, no raw
Attribute access, since `SquadPlayerView` already precomputes a rating for every Position. It returns
the chosen Formation, the slot assignments, and the mean Position Rating. Being Effect-free and
IO-free, it sits squarely inside the pure-packages posture (see
[pure packages stay pure](../architecture/2026-08-28-pure-packages-posture.md)).

This is an **extraction, not a redesign**. The behaviour already in `bestXiForFormation` /
`pickBestFormationTactic` is preserved exactly: all five Formations evaluated, greedy slot filling,
each player used at most once, player ties broken by stable id comparison, Formation ties by the
declared order of `FORMATIONS`. Both consumers — AI Tactic assignment and player-facing Squad
Quality — call the one implementation, so no second approximation can appear in the renderer and the
two cannot drift.

The function is **pure and partial**, not total: with fewer than eleven usable candidates it has no
valid result, and a documented precondition does not make it total unless the shortfall is
represented in its input or return type. Both callers validate before invoking. `pickBestFormationTactic`
stays in `apps/desktop/src/main/aiClubs.ts` as a thin application-layer wrapper owning the
Effect-level squad-size check and `SquadTooSmallError`, plus Role assignment via `POSITION_ROLES` and
the default AI instructions (balanced / normal / medium); the shared function never constructs a
`Tactic`, which is what keeps it reusable from club selection without importing AI policy. Club
selection operates on freshly generated 25-player squads and enforces the generation invariant before
calling. If the shared function must later accept arbitrary career squads directly, the honest change
is an explicit result union rather than a widened precondition — not required now.

Banding stays out of the algorithm file: `packages/shared/src/squadQuality.ts` owns the
`SquadQualityBand` union, the absolute thresholds and the exhaustive label registry, separating
tuning data that will move after balancing from algorithmic behaviour that will not. The registry
form satisfies the rule from
[contextual help as a projection of the model](../architecture/2026-08-29-contextual-help-mechanical-provenance.md)
that labels and provenance live in `packages/shared` as exhaustive typed registries so drift fails
`check:all`. Squad Quality has clean provenance under that same note: it is built from supported
Formations, Position Rating, and the selection logic the AI clubs already use. Its disclosure may say
that Squad Quality reflects the average Position Rating of the strongest eleven the club can field
across the supported Formations, and may not imply that the label predicts league finish, board
success or match results.

## Relationship to earlier decisions

Partially supersedes
[club selection at new game](2026-08-29-club-selection-at-new-game.md), which remains active for
everything else it decided. Three of its requirements are withdrawn here: the squad **depth** summary
in the detail panel, the derived **Challenge label** on the row, and the short prose **challenge
description**. That note anticipated the risk, recording that squad-quality labels were being
asserted before their thresholds existed; the measurements above supply the thresholds and retire the
two fields the label vocabulary was carrying.

## Alternatives considered

- **Whole-squad mean Overall Rating.** Rejected: fourteen of twenty-five players never appear in the
  first team, and with positional composition fixed they add no independent signal, so including them
  only dilutes the first-team measure the player is asking about.
- **Position-blind best eleven by Overall Rating.** Rejected: it can describe an unfieldable team, and
  it reorders the eight `mid` clubs differently from the formation-aware measure in 93% of leagues —
  a materially different answer, not a cheaper approximation of the same one.
- **Banding within Stature Tier.** Rejected: it makes the label a restatement of rank-inside-tier,
  forces absurdities like an *Elite* `small` club, and destroys the cross-tier comparison the field
  exists to provide. It was the proposed fix for tier-boundary contradictions; the contradictions
  turned out to be rare and worth showing.
- **Smoothing, clamping, or forcing agreement with Stature Tier / budgets / Board Objective.**
  Rejected by the ticket's own constraint: a field that always agrees with the tier carries no
  information the tier did not already give.
- **Keeping Squad Depth with an absence-drop formula.** Rejected: measured at 2.0–2.3 points across
  all three tiers, it would print near-identically for all twenty clubs — the four-columns-of-one-fact
  failure in a new costume.
- **Changing `SQUAD_COMPOSITION` so depth becomes real.** Rejected *here*, not on merit: it alters
  every generated squad's shape and belongs to whoever owns world generation. Recorded as fog, and
  it is the prerequisite for any future Depth field.
- **Keeping the Challenge label, redefined as tier-versus-quality divergence.** Rejected: it reads a
  relationship between two fields already visible side by side and asserts a third word over it,
  while its vocabulary names mechanics (*Rebuild*) that nothing implements.
- **Showing the raw score beside the band.** Rejected: it differentiates clustered `mid` clubs at the
  cost of turning the first screen a new player meets into a comparison-shopping table and implying
  precision the statistic does not have. Adjusting thresholds or band count is the cheaper first fix.
- **Five bands instead of six.** Rejected: it requires merging `< 35` or `≥ 63` into a neighbour,
  both of which are occupied, flattening the extremes of `small` and `big`.
- **Persisting the band at creation.** Rejected: it goes stale the moment a player develops or is
  sold, converting a truthful derived measure into metadata that lies.
- **Filtering injured players out of the v1 measure.** Rejected: no availability concept exists, and
  a summary field is the wrong place to introduce one. Deferred under a distinct name.

## Acceptance criteria

- Squad Quality is the mean Position Rating of the formation-aware best XI: all five supported
  Formations evaluated, each slot filled greedily by Position Rating, no player filling two slots,
  the highest completed-XI mean winning.
- Player ties break on stable player id, Formation ties on the canonical `FORMATIONS` order; input
  ordering does not change the result.
- `selectBestFormationXI` is a pure function in `packages/shared/src/bestXi.ts`, taking player id and
  precomputed Position Ratings, and is the only best-XI implementation — AI club setup and Squad
  Quality do not maintain separate algorithms, and the renderer holds no approximation.
- It is documented as pure and deterministic over validated inputs, and is not described as total
  unless its input or return type represents insufficient squads. `SquadTooSmallError` stays owned by
  the Effect-level wrapper in `aiClubs.ts`, which also constructs the AI `Tactic`.
- Bands and labels live in `packages/shared/src/squadQuality.ts` as exhaustive typed registries, with
  boundary tests at 35, 42, 49, 56 and 63 written against values the implementation can actually
  produce.
- Six bands exist — Very Weak, Weak, Competitive, Strong, Very Strong, Elite. "Contender" is not used.
- Band selection is never normalised, clamped or smoothed by Stature Tier, budget or Board Objective;
  cross-tier inversions remain visible when generated data produces them; labels never guarantee a
  league outcome.
- The club-selection row shows club identity, Stature Tier, Board Objective and the Squad Quality
  band. The Challenge label, the challenge prose, Squad Depth and the raw score are all absent.
- Squad Quality is computed from current authoritative squad state, never persisted, and reads the
  freshly generated squad at selection. It does not appear on the in-career Squad screen in v1.
- The v1 measure does not exclude players for temporary injury or availability, and any future
  availability-aware measure takes a distinct name.
- `SQUAD_COMPOSITION` is unchanged by this work.

## Risks

- **The thresholds are calibrated against today's generator.** They are read off measured
  distributions of `generateSquad`, `POTENTIAL_ABILITY_RANGE` and the attribute curve. Any tuning
  change to those silently shifts band occupancy — a narrowed `mid` range could empty a band, a
  widened one could put `small` clubs in *Strong*. The thresholds are tuning data and must be
  re-measured whenever generation changes, not treated as fixed constants.
- **Clustering may under-differentiate in play.** Four or five of the eight `mid` clubs will often
  share a band, and with the Challenge label and Depth both removed, the row carries fewer distinct
  fields than ticket 03 envisaged. The accepted mitigation is more bands or moved thresholds, not the
  raw score; if that proves insufficient the information-design question genuinely reopens.
- **Honest inversions may read as a bug.** In 36% of leagues some `mid` squad outranks some `big`
  squad while every structural field disagrees. This is deliberate, but without the removed prose to
  frame it, a player may read it as inconsistency.
- **Extraction touches a shipped path.** `pickBestFormationTactic` currently assigns every AI club's
  season Tactic. A behavioural difference introduced during the move would change AI team selection
  league-wide and would not be caught by the club-selection tests; the preserved tie-breaks and the
  ordering-independence test exist to guard exactly this.
- **The measure ignores tactical fit and Condition.** It reports the strongest XI by Position Rating
  alone, so it cannot see that a squad's strength is concentrated in one line or that its best players
  are ageing. Two clubs sharing a band may play quite differently.
