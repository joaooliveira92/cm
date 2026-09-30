# Agent Note: CM 03/04's nine team instructions replace the three sliders and Tactical Styles

Status: proposed

## Problem

v1 Team Instructions were three three-state sliders (Mentality defensive/balanced/attacking, Tempo
slow/normal/fast, Pressing low/medium/high). Career creation let the manager pick a Tactical Style
(gegenpress, tiki-taka, catenaccio, direct, possession, balanced) that seeded those three axes for
the first Tactic. Championship Manager 03/04, which this game clones, had no sliders, no tempo, no
pressing axis and no styles. Its Team Instructions screen, read from the shipped
`team_instructions.xml` (see the
[instructions research](../../../../docs/research/formations-and-instructions-cm0304-team-and-player-instructions.md)),
had nine tick-box settings.

## Proposal

Team Instructions will be exactly CM 03/04's nine, each defaulting to the game's unticked state:

| Instruction | Values (default first) |
|---|---|
| Passing | mixed, short, direct, long |
| Focus Passing | mixed, both flanks, left flank, right flank, through the middle |
| Tackling | normal, easy, hard |
| Closing Down | default, own half only, always |
| Mentality | normal, ultra defensive, defensive, attacking, gung ho |
| Offside Trap | off, on |
| Zonal Marking | off, on |
| Counter Attack | off, on |
| Men Behind The Ball | off, on |

Tempo and Pressing are removed. Closing Down's `default` is stored as its own value because the game
never defined it; its engine effect is decided with the other effects.

Tactical Style presets (`TACTICAL_STYLE_PRESETS`, `TACTICAL_STYLE_DEFAULTS`,
`manager_profile.preferred_style_id` and the career-creation style picker) are removed. The
manager's tactical identity becomes their preferred formation, a reference to one of the built-in
Tactic Templates, matching CM staff's Preferred Formation attribute. The first Tactic loads that
template.

## Relationship to existing notes

Supersedes in part
[A manager's style and appearance are creation-time preferences](../../implemented/feature/2026-09-27-manager-style-and-appearance.md):
its style half goes, its appearance half stays. That note gets a `> Superseded in part` block when
this one is implemented. The multiplier tables for the old sliders (`MENTALITY_MULTIPLIERS`,
`TEMPO_MULTIPLIERS`, `PRESSING_MULTIPLIERS`) are replaced by the effort's engine-mapping decision.

## Alternatives considered

- **Keep the three sliders and add CM's settings beside them.** Rejected: Tempo and Pressing have no
  CM 03/04 counterpart, and Closing Down would duplicate Pressing.
- **Remap each Tactical Style onto CM instruction values.** Rejected: the style names are
  twenty-first-century vocabulary with no CM counterpart, and the preferred formation already gives
  the manager a tactical identity.
- **Model CM's tick box plus value as two fields.** Rejected: the unticked state is simply the
  default value, so one enum per instruction carries the same information.

## Acceptance criteria

- The Tactic's team instructions are these nine, with these values and defaults, and nothing else.
- No Tempo, Pressing or Tactical Style remains in the domain, contracts, storage or UI.
- A new career's first Tactic is its manager's preferred template.

## Risks

- Removing the style picker changes career creation, which shipped two days before this decision.
- Match balance shifts until the new effects are tuned.
- Reintroduce styles only as a UI shortcut that fills CM instruction values, and only if players ask
  for one.
