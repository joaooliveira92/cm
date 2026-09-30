# Agent Note: CM 03/04 player instructions, per slot, with no fit rating

Status: proposed

## Problem

With Roles removed (see
[Roles give way to CM 03/04 player instructions](../architecture/2026-09-29-roles-give-way-to-cm-player-instructions.md)),
the Tactic needs CM 03/04's per-player instructions: which ones, with which values, how they inherit
from the team, what a slot starts with, and what takes over Role Rating's job of nudging
`TacticalModifiers` by up to ±0.05 for a well-cast player. The set is read from the shipped
`player_instructions.xml` (see the
[instructions research](../../../../docs/research/formations-and-instructions-cm0304-team-and-player-instructions.md)).

## Proposal

Each slot of a Tactic or Tactic Template will carry these Player Instructions:

| Kind | Instruction | Values (default first) |
|---|---|---|
| Override of a team instruction | Passing | team, mixed, short, direct, long |
| | Closing Down | team, stand off, own half only, always |
| | Tackling | team, easy, normal, hard |
| | Marking | team, zonal, man (plus specific, match-time only) |
| | Mentality | team, ultra defensive, defensive, normal, attacking, gung ho |
| No team counterpart | Distribution (GK slot only) | default, long kick, ask defenders to collect |
| | Cross From | default, deep, touchline |
| | Cross Aim | default, near post, centre, far post, man |
| Frequency switch | Cross Ball, Long Shots, Forward Runs, Run With Ball, Try Through Balls, Free Role, Hold Up Ball | normal, often |

- `team` is CM's unticked "(same as team)" state: the slot takes the Team Instruction's value.
  There is no team-level crossing instruction, because CM showed none.
- Distribution is valid only on the GK slot; validation rejects a non-default value elsewhere.
- **Specific marking** names an opposing player, so it is a match-time setting stored with that
  match's tactic application and dropped at full time. Templates and the stored Tactic allow only
  `team`, zonal and man.
- **Per-slot defaults.** Built-in templates seed each slot from the CM instruction template matching
  its cell (GK → Goalkeeper; SW and central D → Central Defender; D L/R → Full Back; DM → Defensive
  Midfielder; AM C → Attacking Midfielder; wide M and AM → Winger; F → Striker; central M → no
  template), but only for the instructions with no team counterpart: Distribution, Cross From, Cross
  Aim and the seven switches. The five override instructions start at `team` on every slot. CM's
  templates set Passing, Tackling and Mentality explicitly, so seeding those too would stop the Team
  Instructions reaching almost every slot of a built-in preset. The values come from the shipped
  `tactical_templates.xml`, transcribed in the effort's ticket 14.
- **`default`** on Distribution, Cross From and Cross Aim means the engine's own behaviour with no
  instruction. There is no team value to inherit; the engine-mapping decision defines it.
- **Set To Preset.** The seven CM instruction templates also appear on the player panel as a UI
  shortcut that fills in values, as CM's own button did. They are never stored or read as a concept.
- **No fit rating.** Role Rating and its ±0.05 bump are not replaced. Instruction effects will read
  the executing player's attributes, so an instruction that suits the player pays off and one that
  does not costs. Free Role's effect scales with the player's Free Role rating if the positional
  model keeps one, and with attributes otherwise. Where the Tactics screen showed Role Rating it
  shows positional suitability.

## Alternatives considered

- **An instruction-fit rating in place of Role Rating.** Rejected: CM showed no such rating, and it
  would be a second rating system beside attribute-dependent effects that already make a bad
  instruction hurt.
- **Specific marking stored on the Tactic.** Rejected: the stored Tactic would name last week's
  opponent's players.
- **Every slot defaults to `team`, `default` and normal.** Rejected: a new manager's players would
  start undifferentiated by position.
- **Seed every instruction from the CM template.** Rejected: all seven templates set Passing,
  Tackling and Mentality explicitly, so Team Instructions would reach only central-M slots. In CM a
  template applied only through Set To Preset.
- **Invent a central-midfielder instruction template.** Rejected: CM had none; that slot starts at
  the defaults.

## Acceptance criteria

- Every slot carries exactly these instructions with these value sets; validation enforces the GK
  rule and rejects specific marking in a stored Tactic or template.
- On built-in templates, every slot's five override instructions are `team`, and its other
  instructions equal the transcribed CM template for its cell.
- No fit rating remains; the Tactics screen shows positional suitability.

## Risks

- Removing the ±0.05 bump changes balance until instruction effects are tuned.
- The transcription of `tactical_templates.xml` is only as good as the decoding of its documented
  encoding; mismatches are corrected in data, not code.
