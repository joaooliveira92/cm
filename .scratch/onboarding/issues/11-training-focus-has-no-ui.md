# Onboarding's integration contract for the shipped Training system

Type: grilling
Status: open
Blocked by: 07

## Question

Ticket 07's audit found `SetTrainingFocus` fully implemented server-side — an RPC in
`packages/contracts/src/rpc.ts`, a command handler in `apps/desktop/src/main/training.ts` that upserts
`training_focus` and appends `TrainingFocusSet` to the club stream, a Focus multiplier consumed by
`development.ts`, and unit tests — and **no renderer file that references it**. There is no Training
screen, and `SquadScreen.tsx` renders neither Training Focus nor Condition despite `SquadPlayerView`
carrying both.

**This ticket does not build the Training UI.** It decides how onboarding exposes and routes to the
shipped Training system, and declares the dependency on the effort that does build it.

## Ownership split

**This ticket owns:**

- Recording that Training Focus currently lacks a player-facing surface.
- Deciding whether that surface is required for an onboarding-complete v1.
- The onboarding contract for exposing it: where the player discovers or reaches Training, and which
  locked v1 screen provides the route.
- The initial unset/default Training Focus behaviour a new save presents.
- Declaring the dependency on the Training effort.
- Preventing ticket 02 from claiming a fully usable Technical Coaching binding before the UI exists.

**The Training effort owns:** the Training UI itself — reading current Training Focus, selecting and
changing it, calling the existing RPC, rendering success and failure, accessibility and keyboard
behaviour, Training-specific explanatory copy, interaction tests, the navigation route or embedded
panel, and consistency with the already-resolved Training specification.

This ticket may not redesign the Training model or pick tuning numbers owned elsewhere.

## Say "not player-reachable", not "dead"

The binding is not dead in the implementation. Precise language:

> Technical Coaching has a shipped deterministic domain binding to Training Focus effectiveness, but
> the player cannot currently exercise the Training Focus input through the renderer. The binding is
> therefore **not player-reachable** and cannot satisfy the onboarding acceptance contract until the
> Training effort supplies its UI.

This distinguishes a missing mechanic, a missing integration, and a missing presentation. The current
defect is the third.

The principle at stake, refined by this finding: **a player-facing creation choice must bind to a
player-reachable shipped mechanic** — reachable, not merely present in the domain layer. Ticket 02
established the five bindings on "shipped systems only"; this adds reachability to what "shipped" has
to mean.

## Dependency declaration

> Onboarding completion depends on a player-reachable Training Focus surface delivered by the Training
> effort. This ticket does not implement that surface; it specifies the discovery, reachability, and
> initial-state constraints the surface must satisfy.

**If the Training UI will not ship in v1, ticket 02 must be amended.** It cannot continue presenting
Technical Coaching as a complete v1 Pillar Binding. Two honest options at that point: move Technical
Coaching's player-facing binding out of v1, or add another reachable shipped binding for it. Leaving
the current claim unchanged would produce false agency.

## Integration questions to resolve

- Is Training a new top-level screen, an embedded section, or a subordinate route? A seventh tab
  reopens ticket 05's locked six-screen list and ticket 04's arrival-on-Squad decision; a per-player
  control on the Squad screen collides with ticket 08's contextual-help line.
- Which locked v1 screen provides the route to it?
- Is a Training Focus initially selected, or unset? Ticket 07 confirms unset is the shipped default
  (0 rows at save creation).
- If unset, is that informational, recommended, or required? Ticket 07 classified it as informational
  and not actionable while no UI exists.
- When can the Focus be changed? (`training.ts` imposes no window or season-boundary restriction today.)
- What immediate feedback confirms the selection was recorded?
- Where is Technical Coaching's magnitude effect explained?
- Does selecting a Focus affect the current season, the next development resolution, or both?
  (`developPlayersForSeason` runs once per `SeasonConcluded`.)
- What happens if the player never opens Training?
- Which ticket owns the final copy and first-use guidance?
