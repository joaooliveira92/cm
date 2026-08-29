# Map: Onboarding

Label: wayfinder:map

## Destination

A written **spec document** (`.scratch/onboarding/spec.md`), mirroring cm-clone's and Scouting's
shape, for the game's **onboarding**: everything from launching the app to a new player finishing
their first match knowing what to do. Two halves, deliberately kept as one effort because they are
the same experience — **pre-career setup** (manager creation on an archetype/pillar system, club
selection as implicit difficulty) and the **in-career first-hours teaching layer** (event-driven
learning, the Continue rhythm, useful defaults, contextual help). Ready to hand off to a separate
implementation effort.

## Notes

- Seeded by [docs/game-onboarding.md](../../docs/game-onboarding.md), a retrospective analysis of
  Championship Manager 03/04's onboarding. It is a **reference, not a target**: keep the
  simulation-first spine (immediate agency, event-driven learning, useful defaults, no scripted
  tutorial) and treat its section 13 ("What made it difficult") as a list of problems to solve
  rather than reproduce. Faithfully reproducing "the game explained too little" is not a goal.
- Its sections 2 (nations/leagues/full-detail) are structurally inapplicable: v1 is a single
  fictional league with a fixed 20-club world. See Out of scope.
- **Manager identity is mechanically load-bearing**, overriding the doc's purely-representational
  03/04 model. Four manager pillars — Tactical IQ, Man-Management, Training Intensity, Technical
  Coaching — on a 1–5 scale, chosen via three preset archetypes (The Professor, The Motivator, The
  Sergeant) or a Custom 12-point distribution. Exact model is ticket 01's to lock.
- **Charting-time survey, load-bearing for ticket 02**: of the effects those pillars claim to
  control, the codebase today has *no* morale, loyalty, youth, discipline/fines, dressing-room, press
  conference, or coaching-staff system. What does exist: transfer negotiation
  (`apps/desktop/src/main/transfers.ts`, `aiClubs.ts`), Condition/fitness/stamina
  (`packages/game-engine/src/match/condition.ts`), tactics, and Player Development / Training Focus.
  Two of four pillars have real surfaces; the other two would need systems built first.
- Existing mechanisms this effort should reuse rather than reinvent: `manager_status` /
  board expectations and sacking ([ADR-0006](../../docs/adr/0006-board-objectives-and-manager-sacking.md)),
  Stature Tier as the per-club difficulty gradient, `advanceCalendar` as the Continue command.
- Skills every session should consult: `grilling` and `domain-modeling`. Manager-pillar vocabulary
  lands in [CONTEXT.md](../../CONTEXT.md) as it is decided, not in a batch at the end.
- Planning only. This map produces decisions and a spec, not code.

## Decisions so far

<!-- one line per resolved ticket; the ticket holds the detail -->

_None yet — map charted, no tickets resolved._

## Not yet specified

- **Per-pillar magnitude and tuning** — once ticket 02 fixes *which* pillar effects bind in v1, the
  actual numbers (what a Tactical IQ of 5 vs 1 is worth at each binding site) are a further round.
  Likely several tickets, one per bound system; can't be sliced until 02 lands.
- **What "catastrophic, game-breaking flaw" means at a pillar value of 1.** The archetype brief
  promises this; nothing in the codebase can currently deliver it. Whether it survives as a real
  mechanic, softens to a strong penalty, or is cut depends entirely on 02.
- **Whether manager pillars change over a career** (rise with success, drift with age). Adjacent to
  onboarding rather than part of it; revisit once 01 fixes whether pillar values are even visible.
- **Inbox message catalog** — which simulation events project into messages, and what an early-career
  message sequence looks like. Blocked behind ticket 05; collapses to nothing if 05 says no inbox.
- **Squad-screen legibility** — teaching which Attributes matter for which Position without a
  role-recommendation system. Shape depends on where ticket 08 draws the contextual-help line.
- **Interaction with in-flight efforts.** Tactical IQ reaches into Scouting (`.scratch/scouting/`),
  Training Intensity into the injury system (`.scratch/injury-system/`), Technical Coaching into
  Training Focus (`.scratch/training/`). All three are mid-design; coordination can't be specified
  until 02 says which bindings are real.
- **E2E coverage for the onboarding flow**, in the shape the wave-1/wave-2 specs established.

## Out of scope

- **World configuration** — nation/league selection, full-detail toggles, a world seed, squad-generation
  variance. The doc's section 2 has no counterpart in a single fixed fictional league. A seed is
  genuinely useful, but it serves testing and world-sharing, not onboarding; it belongs to whoever
  owns world generation.
- **Manager reputation gating which clubs you may take.** A career-progression feature wearing an
  onboarding costume. Club selection stays free across all 20 clubs (ticket 03).
- **A scripted first-run tutorial** — overlay sequences, forced click-throughs, a staged first week.
  Directly contradicts the simulation-first spine this effort keeps.
- **Real-world data packs, multiple leagues, multiple simultaneous saves.** Settled in cm-clone's v1
  scope; not reopened here.
