# 03: What team and player instructions CM 03/04 had, and their values

Type: research
Blocked by: None (can start immediately)
Status: resolved

## Question

Findings: [CM 03/04 team and player instructions](../../../docs/research/formations-and-instructions-cm0304-team-and-player-instructions.md)

Establish, from primary or near-primary evidence, the full CM 03/04 instruction set: every team
instruction and every per-player instruction, each with its exact value set and its in-game name.
Label every claim **verified for CM 03/04**, **inherited from CM 01/02 or CM4**, or **later
Football Manager**. Record an unsourced claim as unverified.

The pasted requirements list is a hypothesis to test: Mentality (Ultra Defensive, Defensive,
Normal, Attacking, Gung Ho), Passing Style (Short, Direct, Long, Mixed), Tackling (Easy, Normal,
Hard), Closing Down (Always, Stand Off, Own Half Only), and Offside Trap / Counter Attack / Men
Behind Ball as yes/no. "Mixed" passing and "Own Half Only" closing down are suspect.

Settle:

1. **Team instructions**: each setting, its values, whether it is a slider or discrete, its
   default. Include any the hypothesis misses (tempo, width, marking, playmaker, target man, time
   wasting, and so on) if CM 03/04 had them.
2. **Player instructions**: each setting on the per-player screen (forward runs, run with ball,
   long shots, through balls, crossing, marking, tackling, closing down, free role, holding up the
   ball, passing, and so on), its values, and which were player-level versus team-level overrides.
3. **Interaction**: whether a player instruction overrides or inherits a team instruction, and
   whether "use team setting" exists as a value.
4. **Documented effects**: what the manual or reliable community testing says each setting does in
   the match engine. Mark folklore as folklore.
5. **Live changes**: when during a match the manager could change tactics, and whether changes
   applied instantly or at a stoppage.
6. **AI in-match behaviour**: anything documented about how AI managers changed mentality or shape
   by score and minute.
7. **Differences from CM 01/02 and CM4**, where the evidence shows any.

Deliverable: one findings file under `docs/research/` via the `research` skill, and a context
pointer appended to this ticket. Feeds tickets 06, 07, 08, 09 and 11. Decides nothing about this
codebase.

## Answer

**No sliders anywhere: nine team instructions and fifteen player instructions, where a player
inherits the team value for the five shared settings until he ticks an override.** Team:
Passing (mixed/short/direct/long), Focus Passing (mixed/both flanks/left/right/through the middle),
Tackling (normal/easy/hard), Closing Down (default/own half only/always), Mentality (normal/ultra
defensive/defensive/attacking/gung ho), and Offside Trap, Zonal Marking, Counter Attack and Men
Behind The Ball as on/off. Player overrides: Passing, Closing Down (adds stand off), Tackling,
Marking (zonal/man/specific opponent), Mentality, plus goalkeeper Distribution, Cross From and
Cross Aim. Player frequency flags (normal/often): Cross Ball, Long Shots, Forward Runs, Run With
Ball, Try Through Balls, Free Role, Hold Up Ball. Seven shipped instruction templates (Goalkeeper,
Central Defender, Full Back, Defensive Midfielder, Attacking Midfielder, Winger, Striker) fill the
player screen as a convenience. Tempo, width, time wasting, a playmaker and a target man are not
CM 03/04. Engine effects are community claims only; the manual was not found. Live-change timing
and AI in-match behaviour are in the findings file. No Agent Note: fact-finding only.
