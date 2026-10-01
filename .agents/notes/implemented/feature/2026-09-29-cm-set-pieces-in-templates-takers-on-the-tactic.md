# Agent Note: CM 03/04 set pieces: instructions and roles in templates, takers on the Tactic, used by the engine

Status: implemented

## Problem

[Set pieces ship, as a Tactic field](../../implemented/feature/2026-09-29-cm-set-pieces-in-templates-takers-on-the-tactic.md (this note supersedes it)) put set-piece
takers on the Tactic and left open whether the match engine uses a nomination. Championship Manager
03/04 had a fuller model (see the
[instructions research](../../../../docs/research/formations-and-instructions-cm0304-team-and-player-instructions.md)):
team set-piece instructions, per-player set-piece roles, and Set Priorities. The rebuilt Tactic
separates templates (no players) from the live Tactic (players), so each part needs a home, and the
engine needs set-piece events to act on.

## Proposal

- **In the Tactic Template:** team set-piece instructions per side (left and right), each with CM's
  values plus a first, default value `default` meaning the engine decides: corners (short, near post,
  far post, edge of area, edge of six-yard box), free kicks (short, long, cross near, cross far, cross
  centre, aim for best header), throw-ins (short, long, quick). And, per slot as CM's tactic files
  store them, CM's five set-piece roles, each also with `default`: Attack Free Kick, Defend Free Kick,
  Attack Corner, Defend Corner, and Attacking Throw-Ins per side (stay back, come short, lurk outside
  area, near post, go forward). There is no penalty role. Values are transcribed in the effort's
  ticket 19.
- **On the live Tactic only:** the priorities, which name players: captain, and penalty, free-kick
  (left and right), corner (left and right) and throw-in (left and right) takers, each an ordered list
  with no length cap and each player at most once per list.
- **The engine uses them.** Corner events arise from saved or blocked shots and cleared crosses;
  Free Kick events from fouls, becoming chances in the attacking third; Penalty events from a small
  share of fouls on attacking-phase players; throw-ins in the attacking third resolve without a visible event: short raises possession retention,
  quick raises the chance of a quick attack and lowers retention, long becomes a cross-like chance with
  the taker's strength as the closest attribute for distance; come short raises short-throw retention,
  near post and go forward are long-throw targets, lurk outside area takes knock-downs as long-shot
  chances, stay back lowers counter-attack risk. The nominated taker delivers, scaled by crossing (corners
  and crossed free kicks) or shooting and composure (direct free kicks, penalties). Team set-piece
  instructions choose the chance type; attacking roles choose the target; defending roles weigh the
  marking. All of it runs through the chance pipeline of
  [the engine framework note](../architecture/2026-09-29-tactics-resolve-to-behaviour-vectors-for-a-chance-pipeline.md).
- **Fallbacks.** As in CM, the first nominee on the pitch takes it, and a nominee outside the XI only
  warns. When no nominee is on the pitch, this game's own rule (not CM's, which is unknown) picks the
  on-pitch player with the best relevant attribute. With no captain set, one is picked automatically,
  as CM did. The captaincy passes down the order the same way. The captain shows on
  the team sheet and in commentary and has no effect on morale or the match.

## Relationship to existing notes

Answers the open question of
[Set pieces ship, as a Tactic field](../../implemented/feature/2026-09-29-cm-set-pieces-in-templates-takers-on-the-tactic.md (this note supersedes it)) and extends
it; that note stands.

## Alternatives considered

- **Takers stored in templates.** Rejected: templates hold no players, as CM's tactic files held
  none.
- **Record nominations without engine use.** Rejected: a taker who changes nothing is a dead setting.
- **Simulate every throw-in as an event.** Rejected: most throw-ins change nothing visible; the
  attacking-third throw-in resolution gives every throw-in setting a real effect without that.
- **Only long throws matter.** Rejected: short and quick throws, four of five throw-in roles and most
  throw-in takers would be dead settings.
- **A captain effect on morale.** Rejected: no morale model to feed, and nothing verified for CM
  03/04.

## Acceptance criteria

- Changing a penalty taker changes who takes penalties, and conversion follows his attributes.
- Directional tests for each team set-piece instruction.
- A captain substituted off passes the armband to the next nominee on the pitch.

## Risks

- More events shift the calibration targets; set-piece goals should be about a quarter to a third of
  all goals.
