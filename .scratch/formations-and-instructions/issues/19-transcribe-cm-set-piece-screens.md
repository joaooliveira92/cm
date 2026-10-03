# 19: Transcribe CM's set-piece screens

Type: task
Blocked by: 18
Status: resolved

## Question

Nothing to decide: record the exact options of CM 03/04's set-piece screens, from the shipped
`team_sp_instructions.xml`, `player_sp_instructions.xml` and the Set Priorities panels of
`tactics.xml`, obtained as in
[the formations research](../../../docs/research/formations-and-instructions-cm0304-formations-and-tactic-files.md)
(its Reproducing section). For each: every setting, its values, its default ("(default)" or
unticked), whether it is per side (left and right), and for priorities how many ordered entries each
list holds. Flag anything that does not map onto [ticket 18](18-the-set-piece-model.md)'s model. The
answer is the tables; no game file is copied into the repo.

## Answer

Read from the retail 4.0 files in `Data1.cab` (`team_sp_instructions.xml`,
`player_sp_instructions.xml`, `tactics.xml`, `set_piece_takers.xml`) and, for list lengths, from
`cm0304.exe` itself, since the XML leaves the taker lists to a native widget. Values are in screen
order.

**How a setting defaults.** Every row on both instruction screens is a checkbox linked to a popup
button whose caption is "(default)". Unticked, the row shows "(default)" and the player or team
follows the AI's behaviour. Ticking it enables the popup, preselected on the first value in the list
(the `slct` flag). So each setting is effectively *(default)* plus the values below. The item ids
leave one unlisted id before each group (0, 6, 12, 19, 26, 30 on the team screen), which fits
"(default)" being stored as a value of its own. That last point is an inference from the numbering.

### Team Set Piece Instructions

One table, six rows. All three set pieces are per side.

| Setting | Values | Default | Per side |
|---|---|---|---|
| Corners, Left / Corners, Right | Short, Near Post, Far Post, Edge Of Area, Edge Of Six Yard Box | unticked "(default)"; ticking selects Short | yes |
| Free Kicks, Left / Free Kicks, Right | Short, Long, Cross Near, Cross Far, Cross Centre, Aim For Best Header | unticked "(default)"; ticking selects Short | yes |
| Throw Ins, Left / Throw Ins, Right | Short, Long, Quick | unticked "(default)"; ticking selects Short | yes |

### Player Set Piece Instructions

One table per player ("Set Piece Instructions for <player>"), six rows.

| Setting | Values | Default | Per side |
|---|---|---|---|
| Defend Free Kick | Back, Forward, Man Mark, Form Wall, Near Post, Far Post | unticked "(default)"; ticking selects Back | no |
| Attack Free Kick | Always Stay Back, Stay Back If Needed, Forward, Disrupt Wall, Disrupt Goalkeeper, Stand With Taker, Run Over Ball | unticked "(default)"; ticking selects Always Stay Back | no |
| Defend Corner | Back, Stay Forward, Mark Man, Near Post, Far Post, Mark Tall Player, Mark Small Player, Close Down | unticked "(default)"; ticking selects Back | no |
| Attack Corner | Always Stay Back, Stay Back If Needed, Go Forward, Attack Near Post, Attack Far Post, Near Post Flick On, Stand On Far Post, Attack Ball From Edge Of Area, Challenge Goalkeeper, Lurk Outside Area, Offer Short Option | unticked "(default)"; ticking selects Always Stay Back | no |
| Attacking Throw Ins (L) / (R) | Stay Back, Come Short, Lurk Outside Area, Near Post, Go Forward | unticked "(default)"; ticking selects Stay Back | yes |

There is no defending throw-in role and no penalty role.

### Set Priorities

The Set Priorities menu opens five panels: Captains, Penalty Takers, Free Kick Takers, Corner Takers,
Throw In Takers. They hold eight lists. Each is a `set_piece_takers.xml` table with columns "No."
(hint "Order to take set pieces") and Player, filled by dragging players onto it ("Drag and drop a
player onto the list").

| List | Per side | Entries |
|---|---|---|
| Captains | no | ordered, no fixed length |
| Penalty Takers | no | ordered, no fixed length |
| Free Kick Takers (Left), (Right) | yes | ordered, no fixed length |
| Corner Kick Takers (Left), (Right) | yes | ordered, no fixed length |
| Throw In Takers (Left), (Right) | yes | ordered, no fixed length |

**List length, from the executable.** The club object holds the eight lists as growable arrays with
a 16-bit count. The internal order is FK left, FK right, corner left, corner right, throw-in left,
throw-in right, penalty, captain. The load routine reads each count from the save and appends that
many players. The add routine appends or inserts at a position and drops any earlier copy of the
same player. The drag-and-drop handler adds without checking a limit. I found no cap: a list holds
any number of distinct players, so the squad is the only bound. At the match, a lookup walks the
list for the first nominee on the pitch, which is the model's "next in the list". When a nominated
taker is not in the first eleven the game warns but does not block ("... has been specified as a
set piece taker, but is not in the first eleven"). With no captain chosen, it picks one and says so
("You have not selected a captain. <player> will be selected as captain").

### Where this doesn't map cleanly onto ticket 18's model

1. **"(default)" is a value.** None of the note's lists includes it, but every CM setting starts
   unticked at "(default)". The template needs an explicit "no instruction" state for each team
   setting and each slot role.
2. **Player roles are not symmetric.** The note says "attacking and defending set-piece roles". CM
   has four roles for free kicks and corners (attack and defend for each, with no sides), plus
   attacking throw-in roles for left and right. There is no defending throw-in role and no penalty
   role.
3. **Throw-ins versus the engine rule.** The note has only a long throw in the attacking third
   produce an event. That leaves the team values Short and Quick, four of the five player throw-in
   roles, and the choice of throw-in taker except for long throws with nothing to affect. That is
   the "dead setting" the note's alternatives reject.
4. **Roles are per player in CM.** The Player screen is titled for a person. Filing them under the
   template's slots follows the `.tac` evidence (per-slot bytes in the formations research), not the
   screen.
5. **The fallback after the list is not verified.** CM warns about benched nominees and
   auto-picks a captain. Nothing I found shows the "best relevant attribute" fallback for other
   takers.
6. **A labelling bug, for the record.** The executable has no "Throw In Taker(L)" string. Both
   throw-in lists use the "Throw In Taker(R)" header.
