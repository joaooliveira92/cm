# 01: What the CM 03/04 editor stores about a player's positions

Type: research
Blocked by: None (can start immediately)
Status: resolved

## Question

Findings: [What the CM 03/04 database stores about a player's positions](../../../docs/research/player-positional-model-cm0304-positional-fields.md)

Establish, from primary or near-primary evidence, how Championship Manager 03/04 represents where a
player can play. The representation this effort chooses rests on the answer, so every claim must be
labelled **verified for CM 03/04**, **inherited from CM 01/02** (true there, assumed unchanged), or
**later Football Manager** (not CM behaviour at all). An unsourced claim is recorded as unverified,
not smoothed over.

Evidence worth seeking: the official CM 03/04 pre-game editor and its documentation, community
editor tools that read the `.dat` database format (field layouts), the Championship Manager
fan-site archives (champman0102.net and similar), and archived player-data dumps.

Settle:

1. **Line and side storage.** Are positional lines and sides stored as independent ratings on a
   player, or is there one value per atomic position cell? What scale (1-20 or other)?
2. **The line set.** Exactly which lines exist: Goalkeeper, Sweeper, Defender, Wing Back, Defensive
   Midfielder, Midfielder, Attacking Midfielder, Forward/Striker, and any others. What each is
   called in the editor versus in the in-game label (`F` or `S` for the striker line).
3. **The side set.** Left, Right, Centre, confirmed or corrected. Whether GK and SW use side values
   at all, and how the label treats them.
4. **Free Role.** Is it a positional line, a separate numeric attribute, a boolean flag, or only a
   tactical instruction? Where is it stored and what reads it?
5. **Slot suitability.** How the game turns a line rating and a side rating into fitness for one
   slot: minimum, weighted combination, threshold intersection, or something else. Record `min` as
   a candidate only if nothing better is found.
6. **Compact labels.** The rendering rules for labels like `D/WB L`, `AM/F RC`, `D/DM RC`: the
   rating threshold for a line or side to appear, line and side ordering, slash placement, how
   centre and GK/SW are special-cased, and what happens when the ratings do not form a clean grid.
7. **In-game consequence.** What the match engine does with a player in a slot he is poorly rated
   for, as far as it is documented.
8. **Differences from CM 01/02 and CM4**, where the evidence shows any.

Deliverable: a findings file captured with the `research` skill, on a throwaway
`research/cm-0304-positional-fields` branch, with a context pointer appended to this ticket. The
findings feed tickets 03, 04, 05, 07 and 08; this ticket decides nothing about this codebase.

## Answer

**Nine independent 0-20 line ratings (GK, SW, D, DM, M, AM, Attacker, WB, Free Role) and three side
ratings (R, L, C), no per-cell value; how a line and a side combine into slot fit is unverified for
CM 03/04.** Labels show a line or side at 15 or above, `F`/`S` is derived from the Attacker line,
Wing Back never appears in a label, Free Role is simultaneously a hidden rating and a per-player
instruction, and the out-of-position penalty is documented only for CM 01/02 (tactical attributes
cut, scaled by Versatility). Full detail, labels and sources in the findings file linked above. No
Agent Note: fact-finding only.
