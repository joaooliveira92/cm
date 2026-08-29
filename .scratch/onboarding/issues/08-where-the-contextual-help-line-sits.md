# Where the contextual-help line sits

Type: grilling
Status: resolved
Blocked by: 05, 07, 10 (all resolved — unblocked)

## Ticket 10 has resolved: what it supplies

**This ticket is now unblocked.** Ticket 10 chose an explicit pre-match boundary, so the surface this
ticket places help against now exists and is named:

- **The pre-match boundary is the help surface.** Continue stops at the human's scheduled Fixture
  before resolving any of the Matchday, with readiness derived and recomputed on every read. This is
  where "you have no Tactic" is stated, and it is a normal career state rather than an error.
- **Two player-facing actions exist at that boundary**, Play and Quick result, both unavailable until
  blocking readiness passes. Their unavailability is one of the things this ticket must explain.
- **The causal-explanation surface for Tactical Acumen is Match day or its full-time beat**, reachable
  under both modes because both produce the same `PersistedMatchStarted` stream.
- **A new explanation burden ticket 10 created and deliberately handed here:** the match seed derives
  from `SeasonStarted.seed` + `fixtureId`, so a lost match cannot be retried into a different result.
  Nothing currently tells the player this, and discovering it by failed experiment is exactly the
  section-13 failure mode this ticket exists to prevent.
- **The first Continue was deliberately not decomposed**, so press one carries the Transfer Window
  close, AI transfer activity, arrival at the Matchday 1 boundary, and the no-Tactic blocker together.
  Ticket 10 requires all of it reach one structured durable surface separating what happened, what is
  next, what is unresolved, and what the player can do. That surface is this ticket's.

See [Agent Note: The human Fixture's pre-match boundary](../../../.agents/notes/proposed/architecture/2026-08-29-human-fixture-pre-match-boundary.md).

## Original blocking rationale (ticket 10)

Added after ticket 07's audit. This ticket needs four things before it can draw the help line, and
ticket 10 supplies two of them: the actual pre-match boundary and the chosen player-facing surface for
the human's Fixture. The other two — the blocker inventory and the causal result shape — come from
ticket 07 (resolved) and ticket 06 (resolved). Contextual help cannot be placed against a surface whose
existence is still undecided.

## Question

The map keeps 03/04's simulation-first spine and rejects its section-13 failures, which are mostly
failures of explanation: information overload, poor explanation of consequences, and a hard
dependence on pre-existing football knowledge. 03/04 solved these outside the game, via a printed
manual and forums. We do not get that option.

Ruled out already: a scripted first-run tutorial (out of scope on the map). Ruled in: contextual
help. This ticket draws the line between them precisely.

Open questions:

- **What forms of explanation are permitted?** Candidates, roughly in order of intrusiveness:
  tooltips on Attributes; a per-Position hint of which Attributes matter; inline explanation of what a
  tactical instruction changes; an empty-state on each screen explaining what it is for; a "what
  should I do now?" affordance; an in-app manual page. Which of these are in, and what is the
  principle that separates in from out — so the spec can answer cases nobody has thought of yet?
- **The dependence on football knowledge** is the hardest of the section-13 problems. A player who
  does not know what a defensive midfielder does cannot be helped by a tooltip on `Positioning`. Is
  that dependence accepted as inherent to the genre, or is there a floor of explanation below which
  the game does not go?
- **Consequences** are the doc's sharpest complaint: it was never obvious how training intensity,
  tactical instructions, or staff quality interacted. With manager pillars (ticket 01) adding another
  invisible multiplier layer, does this effort owe the player any visibility into *why* an outcome
  happened?
- Does help **taper**? Something shown on every save forever is a different artifact from something
  shown only in a first career — and the latter edges toward the scripted tutorial that is out of
  scope.
- Ticket 07's findings bound this: whatever a fresh save leaves unconfigured is precisely where a
  new player gets stuck, and is the strongest candidate for explanation.

## Inherited constraint: Manager Pillar legibility

From [ticket 02](02-which-pillar-effects-bind-in-v1.md). Ticket 02 owns the causal contract - passing
the Pillar into resolution, applying the modifier, and emitting structured causal information tied to
the actual calculation. **This ticket owns the surface**: where the explanation appears, when, in what
copy, and whether it is automatic or inspectable (post-match summary, match report, tooltip,
tactical analysis - ticket 02 deliberately does not choose; ticket 05 removed "inbox message" from
that list).

The constraint it inherits:

- Tactical Acumen's causal contribution must be legible no later than completion of the player's
  first match.
- The surface must consume causal information produced by the actual tactical resolver. It must not
  infer a contribution from the manager's Tactical Acumen value alone, and must not show generic
  Pillar flavour when Tactical Acumen did not materially affect the resolved modifier.
- Creation-time disclosure must distinguish the Pillars that pay out immediately (Tactical Acumen,
  Influence) from those that accumulate over a season (Regimen, Technical Coaching), so a slow Pillar
  is never read as an inert one.

This adds no dependency: ticket 02 is complete without it, and this ticket was already blocked on 05
and 07.

## Constraints from ticket 05

- **No inbox means no message-shaped help.** Every candidate surface this ticket weighs has to live on
  one of the six existing screens or on the Continue affordance. A message the player marks read is
  not available, which also removes the easiest way to make help taper.
- **The taper question is narrower than it looks.** Ticket 05 rejected the tapering-guidance branch of
  the inbox as the scripted tutorial in a diegetic costume. The same reasoning applies to any help that
  stops appearing once the player is judged experienced, whatever surface it sits on.
- **The strongest concrete case is already known.** The human's club starts with no Tactic
  (`aiClubs.test.ts`: "the user's club gets none"), and the game never says so. Ticket 05 argues this
  needs a persistent readiness affordance rather than a dismissible notice, because the condition
  outlives any single dismissal. This ticket owns its copy, ticket 06 owns where it sits.

See [Agent Note: No onboarding inbox](../../../.agents/notes/proposed/architecture/2026-08-29-no-onboarding-inbox.md).

## Answer

**Contextual help is a typed projection of the simulation model: help may make a mechanical claim
only where that claim traces to authoritative game data, derived state, or structured resolver
output, with one bounded Irreversibility Disclosure exception; it teaches the game's model rather
than real football, never tapers, and is delivered through one keyboard-reachable Term Disclosure
with decision-critical values kept inline.** See [Agent Note](../../../.agents/notes/proposed/architecture/2026-08-29-contextual-help-mechanical-provenance.md).
