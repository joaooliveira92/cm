# Spec: Set-piece instructions reach the match engine

Status: ready-for-agent

## Problem

Tactics lets the manager set CM 03/04's set-piece instructions: per side, how corners, free kicks and
throw-ins are delivered (`teamSetPieces`), and for every slot six roles (attack and defend corners, attack
and defend free kicks, attacking throw-ins left and right). None of it reaches the engine. A corner is
headed by the best header on the pitch whatever the roles say, its delivery is recorded and ignored, and
every free kick is a direct shot. The player sets things the game silently ignores.

CM 03/04 players used these to make set pieces a weapon: a player challenging the goalkeeper, near-post
flick-ons, attackers sent to the far post, a long-shot specialist lurking outside the area, a short-corner
option, a wall, zonal and man-marking defenders.

## Decisions

Recorded in [the proposed Agent Note](../../.agents/notes/proposed/feature/2026-10-02-set-piece-instructions-shape-who-and-how.md).

- **Defaults change nothing.** With every role and delivery at `default`, a match plays bit for bit as
  before: same random draws, same events. Instructions only take effect when set, so pinned seeds and the
  calibration hold, and the change is safe for saved matches still being played.
- **Roles decide who; delivery decides how.** At a corner the attacking side's `attackCorner` roles decide
  who is in the box and where; the delivery picks the target among them. Defending roles change how well
  the defence deals with that delivery. Effects are bounded multipliers on the existing outcome formula,
  not new probability tables.
- **No new attributes.** Heading stands in for height in `markTallPlayer`/`markSmallPlayer`.
- **Throw-ins stay out.** The engine has no throw-in events, so throw-in delivery and roles still have no
  effect. Tactics keeps them; a later effort that models throw-ins picks them up.

## Out of scope

Throw-ins; new player attributes; set-piece routines beyond CM's menus; changing the base rates of corners,
free kicks or penalties.
