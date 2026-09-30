# 18: The set-piece model

Type: grilling
Blocked by: 04, 08
Status: resolved

## Question

Set pieces are already in scope as Tactic fields
([set pieces ship, as a Tactic field](../../../.agents/notes/proposed/feature/2026-09-19-set-pieces-ship-as-a-tactic-field.md),
answering group-f's decision request 01 with Option A on 2026-09-19). That decision left open
whether the match engine uses a nomination. Extend it to CM 03/04's full set-piece model, as found in
[the instructions research](../../../docs/research/formations-and-instructions-cm0304-team-and-player-instructions.md):
team set-piece instructions for corners, free kicks and throw-ins; per-player set-piece roles for
attacking and defending; and the Set Priorities (captain, penalty, free-kick, corner and throw-in
takers, left and right). Decide which parts live in a Tactic Template and which only on the live
Tactic, how set pieces arise in the chance pipeline (Corner, Free Kick and Penalty events), how
takers and roles act, the fallback when a nominee is off the pitch, and what the captain does.

## Answer

**Team set-piece instructions and per-slot set-piece roles live in the Tactic Template; the captain
and ordered taker lists live only on the live Tactic; the engine uses them through Corner, Free Kick
and Penalty events and long throws in the chance pipeline; absent nominees fall back down the list,
then to the best relevant attribute; the captain has no match effect.** Values for the roles and
priorities are transcribed in [ticket 19](19-transcribe-cm-set-piece-screens.md). See
[Agent Note](../../../.agents/notes/proposed/feature/2026-09-29-cm-set-pieces-in-templates-takers-on-the-tactic.md).
