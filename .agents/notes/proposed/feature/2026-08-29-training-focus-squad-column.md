# Agent Note: Training Focus becomes an editable Squad column, and Pillar Bindings must be player-reachable

Status: proposed

## Problem

`SetTrainingFocus` is fully shipped server-side - an RPC in `packages/contracts/src/rpc.ts`, a command
handler in `apps/desktop/src/main/training.ts` that upserts `training_focus` and appends
`TrainingFocusSet` to the club stream, a `TRAINING_FOCUS_MULTIPLIER` consumed by
`packages/shared/src/training.ts`, and unit tests - and no renderer file references it. There is no
Training screen, and `SquadScreen.tsx` renders neither Training Focus nor Condition despite
`SquadPlayerView` carrying both.

The binding is not dead in the implementation. Precisely: Technical Coaching has a shipped
deterministic domain binding to Training Focus effectiveness, but the player cannot exercise the
Training Focus input through the renderer, so the binding is **not player-reachable**. This
distinguishes a missing mechanic, a missing integration, and a missing presentation; the defect is
the third.

Onboarding must decide whether that surface is required for an onboarding-complete v1, what discovery
and initial-state contract it must satisfy, and - the question the ticket did not anticipate - who
delivers it.

## The ownership gap

The ticket assumed "the Training effort owns the Training UI". An audit of the efforts found that
false, and the correction is the load-bearing part of this decision.

- **The Training effort is closed.** All five tickets in `.scratch/training/issues/` are resolved,
  its map's **Not yet specified** reads *None*, and its **Out of scope** contains: *"Training screen
  UI layout - this milestone's destination is a domain spec for the two systems, not a per-screen UI;
  layout is implementation detail for the hand-off effort."* It deferred the surface to an unnamed
  downstream effort and cannot receive a new delivery dependency.
- **cm-clone excludes Training entirely.** Its map's Out of scope reads *"Training - cut from v1 scope
  during destination-setting; may return as a later map."* Its locked screen list is six screens with
  no Training screen, and its layout fog is scoped to those six.

No effort owned the Training UI. That, not the absent renderer file, was the real defect.

## Proposal

**A player-reachable Training Focus surface is required for onboarding-complete v1**, delivered as an
**editable per-player Training Focus column on the Squad screen**, owned by onboarding.

Technical Coaching is the only Pillar whose defining v1 mechanic depends on a player decision the
renderer cannot express. Tactical Acumen reads a Tactic the player configures, Influence reads Bids
the player submits, Regimen reads Condition and injury resolution the simulation produces
automatically. Without the surface, Technical Coaching prices a choice that cannot be made - false
agency at the exact point [manager pillars and archetypes](2026-08-29-manager-pillars-and-archetypes.md)
made the creation choice load-bearing. The alternative - binding Technical Coaching to some other
shipped seam - requires building a mechanic, since the survey behind
[manager pillar bindings](2026-08-29-manager-pillar-bindings-v1.md) cut coaching staff, youth and
morale; that is strictly more work than rendering a select.

**Onboarding owns the renderer integration**, because the surface is a column on a screen onboarding
already delivers and no active effort owns Training UI. This is not ownership of the Training domain:
the closed Training effort remains authoritative for Training Focus semantics, `setTrainingFocus`,
persistence, Player Development, and the multiplier. A separate `training-ui` effort would be
justified by a top-level screen, navigation, schedules, coaching assignments, bulk controls, history
or forecasting, and is warranted only if scope later grows into one.

**cm-clone is not reopened.** No seventh screen, no subordinate Training route, no duplicate squad
list, no modal editor. The locked screen list stands.

## Why Squad is the right surface

The shipped command is per-player (`setTrainingFocus(playerId, focus)`, one row per player in
`training_focus`) and `SquadPlayerView.trainingFocus` already carries the value, so the natural
surface is the screen that already renders one row per player. A Training screen would render the same
squad list with one extra column while reopening the locked screen list, the arrival-on-Squad decision
in [new-game flow](2026-08-29-new-game-flow-sequence.md), and cm-clone's exclusion of Training.

This deliberately settles part of cm-clone's Squad-layout fog: **the Squad screen must accommodate an
editable Training Focus column and its Term Disclosure.** It does not settle responsive density,
optional Attribute columns, horizontal scrolling, or column customization. The table is already wide;
[contextual help provenance](../architecture/2026-08-29-contextual-help-mechanical-provenance.md) removing `firstTouch`
and `determination` from player-facing screens frees some width, but the final layout is not
prescribed here.

## None is a first-class value

Player Development reads `training_focus` at `SeasonConcluded` and passes `row.focus ?? undefined`
into `developPlayer`, so no-focus is a legal configuration that resolves normally with no Category
receiving the multiplier. The column renders it as the named, selectable value **None** - never blank,
`-`, "Not set", "Unset", or "Choose a Focus", each of which asserts incomplete setup that does not
exist.

Training Focus therefore never appears in match-readiness blockers, new-career completion
requirements, Continue blockers, pre-match unresolved-state lists, or action-required indicators. The
readiness audit found exactly one unset-and-configurable blocking condition - the absent Tactic - and
the two are not the same kind of thing: no Tactic means the match cannot be played, no Focus means
development proceeds unmodified.

## Resolution timing is disclosed in full

`developClubPlayers` joins `training_focus` at the moment `SeasonConcluded` fires. It does not
accumulate time under a Focus, average choices over the season, replay `TrainingFocusSet` events,
award partial credit, or snapshot at season start. Consequences:

- A Focus set on the final matchday is worth exactly as much as one set on day one.
- A Focus held all season and cleared before conclusion is worth nothing.

The Term Disclosure states this plainly: *"Player Development resolves once at the end of each season,
applying whichever Focus is set at that moment."* Withholding it teaches the player to infer a
duration-based system that does not exist, which is the CM 03/04 under-explanation failure the
onboarding map refuses to reproduce. The line between permitted and prohibited is mechanical
description versus strategic conclusion: the resolver's rule may be stated; "wait until the final
matchday to maximize development" may not. Changing Focus is reversible and needs no Irreversibility
Disclosure, and no "takes effect next season" language appears - a successful change replaces the
standing value immediately.

## Only applicable Categories are offered

`developPlayer` skips any attribute whose current value is `undefined`, and `PlayerAttributes` types
goalkeeping attributes as `Partial`. An outfield player has none, so **Goalkeeping Focus on an outfield
player is a silent no-op**: the command accepts it, persists it, emits the event, and the multiplier
applies to zero attributes forever.

A Focus option is offerable for a player only when its Category contains at least one Attribute
present on that player and processed by Player Development. The rule derives from the player's
authoritative Attribute shape and the Category definitions `developPlayer` consumes, not from a
nominal Position check - `player.position === "GK"` would encode the wrong reason for the right answer
in the common case and the wrong answer in any case where the two diverge.

Renderer filtering alone is insufficient. The command boundary must reject an ineligible Focus even
when invoked by a stale or bypassed client, through a typed error carrying `playerId` and the
requested focus (conceptually `TrainingFocusNotApplicable`, named to existing conventions). This is a
narrow dependency on the Training domain despite onboarding owning the control. Any pre-release save
already holding an ineligible value is rejected during validation or normalized to None by a
documented migration; a renderer-only correction that leaves the invalid row persisted is not
acceptable.

## Confirmed updates, not optimistic

The cell keeps rendering the last authoritative Focus while the command is pending and changes only
when `setTrainingFocus` returns, rendering `TrainingFocusView.focus` - the persisted value, not the
requested candidate. The candidate may appear inside an open selector during the interaction; the
closed cell must not present it as committed.

The write is a local SQLite transaction with no network, so optimism buys negligible latency while
introducing rollback presentation, competing rapid changes, stale request completion, false
confirmation on an ended career, and ambiguity about which Focus will resolve at season conclusion.

While pending, the row's control is disabled and duplicate submissions for that player are prevented;
the rest of the Squad screen stays live. If the screen unmounts mid-request, remounting reloads
authoritative row state rather than trusting abandoned local state. Failure preserves or reloads the
last authoritative value and surfaces typed persistent text associated with the control - not a toast,
per [Continue as the global career loop](2026-08-29-continue-as-global-career-loop.md) - translated
into player-facing language that never exposes raw error class names. Success needs no toast: the
returned value appearing and the pending indicator ending is the confirmation.

`SaveSackedError` is not a cell-level problem. It means the career can no longer accept ordinary
management commands, so the column ends its pending state, preserves or refreshes the authoritative
value, and delegates to application-level career-outcome handling rather than rendering "Training
Focus failed because you were sacked".

## The Technical Coaching clause is gated on its own implementation

`technicalCoaching` appears nowhere in `packages` or `apps`. `developPlayer(attributes, age,
potentialAbility, focus)` takes no Pillar parameter and `TRAINING_FOCUS_MULTIPLIER` is a flat,
unmodulated `1.5`. The Pillars are proposed decisions, not shipped code.

Under the provenance rule in
[contextual help provenance](../architecture/2026-08-29-contextual-help-mechanical-provenance.md) - a mechanical claim
is permitted only where it traces to authoritative data or resolver output, and a Pillar value is
never evidence - a Technical Coaching sentence written today traces to nothing. So the disclosure
describes only shipped behaviour, and the clause *"Your manager's Technical Coaching changes the
magnitude of the focused contribution"* becomes **required** only once Technical Coaching is an
authoritative parameter of the Player Development resolver, its effect is deterministic and
magnitude-only, the effective focused multiplier stays above 1.0 at every legal Pillar value, tests
establish the modifier, and shared presentation provenance identifies the binding.

The column is independently useful before then: Training Focus already changes Player Development.
Only the Pillar sentence waits.

## No improvement language

The development step is `current + (ceiling - current) * fraction`, with `fraction` 0.65 unfocused and
0.975 focused. Where the age-ceiling sits *below* the current value - Physical Attributes past 30, per
the Player Development curve - focusing that Category closes 97.5% of the downward gap instead of 65%.
**Training Focus accelerates decline as readily as growth.**

So copy avoids "improves", "gets stronger", "develops faster", "gains", "boosts", "increases ability",
and uses "biases development toward", "increases the season-end development step applied to the
selected Category", or "moves focused Attributes toward their resolved season-end values". A fuller
disclosure may say the step "may represent growth or decline depending on the player's age and
development curve"; progressive disclosure is permitted provided nothing implies guaranteed
improvement.

## Copy: Training owns truth, onboarding owns authorship

The Training domain is the source of truth for Focus identifiers, Category membership, the legal None
state, per-player command semantics, the persisted value, season-end resolution timing, multiplier
behaviour, the development formula, and validation categories. It does not author renderer strings and
does not need to in order to remain authoritative.

Onboarding authors every player-facing string on Squad: column heading, the None label, the Term
Disclosure, the timing explanation, pending wording, typed failure translations, accessible names
(each carrying the affected player's identity, e.g. "Training Focus for D. Silva"), Goalkeeping
eligibility presentation, the conditional Technical Coaching clause, and any caution needed to avoid
promising improvement. Every mechanical statement is constrained by Training-domain facts.

Canonical labels and mechanically grounded descriptions live in `packages/shared` as exhaustive typed
registries so drift fails `check:all`, per the contextual-help decision - separating canonical label,
mechanical description, eligibility, timing, and the conditional Pillar clause. The registry's type
must account for the null/None case rather than leaving ad-hoc conditionals spread across the
renderer, and eligibility is derived from the player's authoritative Attribute shape, not
hand-maintained renderer flags.

**This partially supersedes** the contextual-help decision's statement that the Training effort owns
Training Focus help and Technical Coaching's presentation: for the Squad surface, onboarding owns it,
because that effort is closed and the surface landed on an onboarding-owned screen. The rest of that
note's help architecture stands unchanged, and Player Development itself does not transfer to
onboarding.

## Corrective obligations back into the closed Training specification

Two, recorded together. Neither is onboarding work; both constrain what onboarding may truthfully say,
and both are delivered durably into `.scratch/training/` for whoever next owns or maintains Training.

1. **Orphaned-Attribute allocation** (already established by the contextual-help decision):
   `developPlayer` develops every entry in `ALL_ATTRIBUTES` while a Focus biases a whole Category, so
   Technical or Mental focus spends part of its multiplier on `firstTouch` and `determination`, which
   no shipped table or resolver reads. Give those Attributes a shipped consumer, or exclude them from
   the mechanically active development set.
2. **Focus-accelerated decline** (new here): the Training spec and its user stories describe Focus as
   purely additive and without downside. That holds for the *other three* Categories, not for the
   focused one on a declining player. The future owner must either accept accelerated decline as
   intended and amend the spec so "purely additive" and "no downside" stop overstating the mechanic,
   or stop applying the multiplier to a negative development gap.

Leaving the second undocumented would leave a closed specification asserting something its own formula
contradicts. The onboarding copy constraint is necessary but not sufficient.

## Alternatives considered

- **Rule the surface out of v1 and amend the Pillar bindings** so Technical Coaching loses its
  player-facing binding or gains another. Rejected: no other shipped Technical-Coaching seam exists,
  so "another binding" means building a mechanic - strictly more work than rendering a select over a
  command that already ships.
- **A seventh top-level Training screen.** Rejected: it would largely duplicate the Squad list with one
  editable field while reopening the locked screen list, the arrival-on-Squad decision, the distributed
  notification model, and cm-clone's exclusion of Training. An embedded Training route off Squad is the
  same cost plus navigation.
- **A new `training-ui` effort.** Rejected as ceremony for a single table column. Reconsider if scope
  grows to a distinct screen or materially broader Training workflow.
- **Graduate it into cm-clone's per-screen layout fog.** Rejected: cm-clone has Training out of scope
  and its fog is scoped to the six locked screens, so this reopens a scoping decision to gain the same
  column.
- **Offer all four Categories uniformly and disclose that Goalkeeping does nothing for outfielders.**
  Rejected: it spends a disclosure explaining why an offered option is useless. Offering a choice
  guaranteed to have no effect is the same false-agency defect this note exists to fix, one layer down.
- **Optimistic updates with rollback.** Rejected: negligible latency to hide, several avoidable
  divergent states to introduce.
- **Ship the Technical Coaching clause now**, ahead of the resolver. Rejected: it traces to a proposed
  decision, which is precisely what the provenance rule forbids.
- **Stay vague about timing** to avoid teaching the player to set Focus late. Rejected: it reproduces
  the under-explanation failure the onboarding map treats as a problem to solve, and the resolver's
  rule is a mechanical fact, not a strategy.
- **Fix the decline behaviour or the orphaned Attributes here.** Rejected: the map is planning-only and
  forbids onboarding changing development behaviour.

## Acceptance criteria

- Squad renders an editable per-player Training Focus column; no Training screen or subordinate route
  exists and the locked screen list is unchanged.
- Each row shows the player's current authoritative Focus and invokes `setTrainingFocus` with that
  row's player identity.
- None is displayed as a normal selectable value, never as blank, unset, incomplete, or action
  required, and Training Focus appears in no readiness or completion requirement.
- The offered option set for a player contains only Categories capable of affecting that player's
  development; Goalkeeping is absent for a player with no developable goalkeeping Attributes; the
  command boundary enforces the same rule with a typed error.
- The cell renders `TrainingFocusView.focus` after success, holds the last authoritative value while
  pending, and on failure preserves or reloads it and shows typed persistent feedback at the control.
  `SaveSackedError` is delegated to career-outcome handling.
- A keyboard-reachable, non-modal, non-hover Term Disclosure explains Training Focus, states that
  Player Development resolves once at season conclusion using the Focus set at that moment, and does
  not imply duration or history contributes.
- The disclosure omits the Technical Coaching clause until that Pillar is an authoritative parameter of
  the resolver with tests establishing its effect, and includes it once that holds.
- No copy promises improvement, faster growth, a stronger player, guaranteed development, youth
  bonuses, or an optimal Focus.
- Controls expose accessible names containing the affected player's identity.
- Canonical labels and descriptions live in exhaustive typed registries in `packages/shared`.
- Both Training corrective obligations are recorded durably in `.scratch/training/`.

## Risks

- **Onboarding owning renderer delivery blurs the map's planning-only posture.** The map still produces
  a spec, not code, but this ticket names an implementation owner rather than deferring to one. The
  mitigation is the narrowness of the contract: if the work grows past a column, it becomes its own
  effort.
- **The eligibility rule may need a domain-side fact onboarding does not own.** If "has developable
  goalkeeping Attributes" cannot be derived from `SquadPlayerView`, the read model or the command
  boundary must change - a genuine dependency on Training-domain code from an effort that owns only
  the surface.
- **Command-boundary eligibility enforcement is a behaviour change to a shipped, tested command.**
  `setTrainingFocus` currently accepts any Category for any owned player. Adding a typed rejection can
  break existing tests and any pre-release save holding an ineligible value.
- **The gated Technical Coaching clause can be forgotten.** Nothing mechanical fires when the Pillar
  lands in the resolver, so the disclosure may sit permanently incomplete. The typed registry helps
  only if it models the clause as conditional rather than omitting it.
- **Settling part of the Squad layout by side effect.** The column is now a fixed requirement on a
  screen whose layout is otherwise unresolved, on an already-wide table. Whoever designs that layout
  inherits a constraint they did not set.
- **Both corrective obligations land on a closed effort with no owner.** They are recorded, not
  scheduled. Until one is resolved, onboarding copy stays neutral, which is honest but describes a
  mechanic the spec still misdescribes.
