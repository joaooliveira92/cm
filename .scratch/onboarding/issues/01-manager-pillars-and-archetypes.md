# Manager pillars & archetype set

Type: grilling
Status: resolved

## Question

Lock the manager as a mechanical entity: the pillar model, the archetype presets, and how a manager
is persisted. This is the root ticket of the map — nearly everything else hangs off it.

The brief, as given during charting, to be stress-tested rather than transcribed:

- **Four pillars**, 1–5: **Tactical IQ** (tactical knowledge and flexibility, scouting evaluation,
  opponent analysis), **Man-Management** (loyalty, motivation, media handling, board negotiation,
  dressing-room harmony), **Training Intensity** (fitness training, coaching workload, disciplinary
  style, long-term squad stamina), **Technical Coaching** (attacking/defending training, technical
  development, youth promotion).
- **Three preset archetypes**, each summing to 12: **The Professor** (5/1/2/4), **The Motivator**
  (1/5/4/2), **The Sergeant** (1/2/5/4).
- **Custom**: distribute 12 points across the four pillars.

Open questions:

- Is 12 the right budget, and is 1–5 the right scale? All three presets sit at exactly 12 with two
  strengths and one severe weakness — is that a deliberate invariant Custom must also obey, or may a
  Custom manager spread 3/3/3/3 and be uniformly mediocre? Is 3/3/3/3 a legitimate strategy or a
  trap?
- What are the per-pillar bounds on Custom (min 1, max 5)? Does the UI prevent a 5/5/1/1 split, or
  is any distribution summing to 12 legal?
- Are pillar values **visible** to the player after creation, and if so where? The presets advertise
  their numbers, so hiding them post-creation would be strange — but visible numbers invite
  optimisation in a way visible attributes already do for players.
- Are the preset archetypes just named starting distributions, or do they carry anything a Custom
  manager cannot have (a label the fiction uses, flavour text, distinct AI/board reactions)?
- **Persistence shape.** Does the manager become a new event-sourced Decider, a row on an existing
  one, or plain `save_meta`-adjacent state alongside `manager_status`? Manager pillars are set once
  at creation and (per the map's fog) may never change — which argues against a Decider. Confirm
  against [ADR-0007](../../../docs/adr/0007-domain-bounded-deciders-and-chunked-match-resimulation.md).
- **Vocabulary.** "Pillar", "Archetype", and each pillar name need entries in
  [CONTEXT.md](../../../CONTEXT.md). Note the collision risk: **Attribute** is already defined as a
  player's 1–20 skill dimension, so manager pillars must not be called Attributes. Likewise
  **Training Intensity** must be distinguished from the existing **Training Focus**, and Technical
  Coaching from the **Technical** Category.

Not this ticket: which effects actually bind to the simulation (ticket 02), or how strong each
binding is (fog).

## Answer

**Four Manager Pillars (Tactical Acumen, Man-Management, Regimen, Technical Coaching), 1-5, summing
to exactly 12; four curated Archetypes as examples not constraints; visible forever; a plain
immutable `manager_profile` row, not a Decider.** See [Agent Note](../../../.agents/notes/proposed/feature/2026-08-29-manager-pillars-and-archetypes.md).

## Superseded in part by ticket 02

The second Manager Pillar was resolved here as **Man-Management**. Resolving
[ticket 02](02-which-pillar-effects-bind-in-v1.md) established that its only honest v1 binding is
club-to-club seller negotiation (`decideAiSellerResponse`): the shipped transfer system contains no
player negotiation, agent, wage, dressing-room, media, or board persuasion. The authoritative Pillar
name is therefore **Influence**.

This ticket keeps the original term as a record of the route taken. All living vocabulary -
[CONTEXT.md](../../../CONTEXT.md), this ticket's Agent Note, and every implementation artifact - uses
Influence.

Ticket 02 also amends this ticket's "no snapshot needed" reasoning: Pillars stay immutable and
`manager_profile` stays authoritative, but the full Pillar Distribution is snapshotted into
`PersistedMatchStarted` so replay never depends on that immutability assumption holding in future.
No Manager Decider and no `ManagerCreated` event is introduced. See
[Agent Note: Manager Pillar bindings in v1](../../../.agents/notes/proposed/feature/2026-08-29-manager-pillar-bindings-v1.md).
