# CM 03/04 team and player instructions

**Question.** What team and per-player instructions did Championship Manager: Season 03/04 ship,
with what values, how did they interact, what did they do, when could they change mid-match, and
how did AI managers change tactics in a match? Answers
[ticket 03](../../.scratch/formations-and-instructions/issues/03-cm-0304-team-and-player-instructions.md).
Decides nothing about this codebase.

**Labels.** Every claim carries one of:

- **Verified (CM 03/04).** Read directly from the shipped game files, or from Sports Interactive's
  own patch notes.
- **Inherited (CM 01/02 / CM4).** Seen in the predecessor's shipped files.
- **Later FM.** Belongs to Football Manager, not CM 03/04.
- **Community.** Stated by a contemporary player guide. Useful for intent, not proof of engine
  behaviour.
- **Folklore.** A community claim about engine effects that no first-party source backs.
- **Unverified.** No source found.

## Sources

The primary source is the game itself. The retail CD is preserved on the Internet Archive, and its
UI is data-driven: each screen is an XML file inside `Data1.cab`, and the executable carries the
string table. So the option lists below are the shipped screens, not anyone's recollection.

| Source | What it gives |
|--------|---------------|
| [CM 03/04 retail ISO](https://archive.org/details/championship-manager-season-0304), files dated 31 Oct 2003 | `team_instructions.xml`, `player_instructions.xml`, `tactical_templates.xml`, `team_sp_instructions.xml`, `player_sp_instructions.xml`, `tactics.xml`, `events.cfg` (match commentary, headed "cm4 event file"), and the `cm0304.exe` string table |
| Patch 4.1.4 and 4.1.5 executables, same archive item | 4.1.4 carries a byte-identical `tactical_templates.xml`; neither patch replaces the instruction screens, and the 4.1.5 executable keeps the same instruction strings |
| [SI v4.1.3 patch notes, via Worthplaying, 21 Dec 2003](https://worthplaying.com/article/2003/12/21/news/14363-championship-manager-03-04-update-patch-available-now/) | First-party changelog with match and AI lines |
| [CM 01/02 patch 3.9.68](https://archive.org/details/championship-manager-0102-game-patch-version-3.9.68), `update.dat` string table | CM 01/02 tactics strings, for the comparison |
| [thy451, "CM 03/04 FAQ and Player Guide" v1.00, GameFAQs (Wayback copy)](https://web.archive.org/web/20151230011640/http://www.gamefaqs.com/pc/918869-championship-manager-season-03-04/faqs/30572) | Community. Lists both instruction screens and says the manual describes each one |
| [cairo140, "Tactical Guide to CM 03/04", GameFAQs (Wayback copy)](https://web.archive.org/web/20151230004151/http://www.gamefaqs.com/pc/918869-championship-manager-season-03-04/faqs/32186) | Community. Effect descriptions for each team instruction; the archived copy stops after Men Behind The Ball |

Not found: the CM 03/04 printed or PDF manual. It is not on the disc and I found no scan. Any
first-party prose on effects beyond the in-game hints would live there.

CM4 comparison: see [Differences from CM 01/02 and CM4](#differences-from-cm-0102-and-cm4).

## 1. Team instructions

**Verified (CM 03/04)**, from `team_instructions.xml`. Screen title "Team Instructions", reached
from the Tactics screen's "Set Instructions > Team" menu.

Every setting is a tick box. Unticked means the engine's default; the value popup next to it
shows a placeholder in brackets. Ticking the box enables the popup. There are **no sliders**
anywhere on this screen or the player screen.

| Setting | Unticked placeholder | Values when ticked | Hint text |
|---------|----------------------|--------------------|-----------|
| Passing | "(mixed)" | Short, Direct, Long | "Tick to specify passing type" |
| Focus Passing | "(mixed)" | Down Both Flanks, Down Left Flank, Down Right Flank, Through The Middle | "Tick to specify where to focus passes" |
| Tackling | "(normal)" | Easy, Hard | "Tick to specify tackling type" |
| Closing Down | "(default)" | Own Half Only, Always | "Tick to set pressing level." |
| Mentality | "(default)" | Ultra Defensive, Defensive, Attacking, Gung Ho | "Tick to set attacking or defensive mentality" |
| Offside Trap | off | tick only; label "(Will play the offside trap)" | "Tick to play the offside trap" |
| Zonal Marking | off | tick only; label "(Players will not man mark)" | "Tick to play zonal marking" |
| Counter Attack | off | tick only; label "(Exploit any break for quick attacks)" | "Tick to play a counter-attacking style" |
| Men Behind The Ball | off | tick only; label "(Everyone sit in front of your area)" | "Tick to put everyone behind the ball when the opponents have it" |

So the effective value sets, counting the unticked state as a value:

- Passing: Mixed (default), Short, Direct, Long.
- Focus Passing: mixed (default), Both Flanks, Left Flank, Right Flank, Through The Middle.
- Tackling: Normal (default), Easy, Hard.
- Closing Down: default, Own Half Only, Always. **No Stand Off at team level.**
- Mentality: Normal (default), Ultra Defensive, Defensive, Attacking, Gung Ho. The executable
  spells the in-match short form "Gung-Ho"; the screen says "Gung Ho".
- Four booleans, all default off.

What "(default)" closing down means is not stated anywhere I found. The player screen's Stand Off
value suggests the team default sits between Stand Off and Own Half Only, but that is inference.
**Unverified.**

Each popup XML carries a `slct` flag naming one item (Direct for passing, Easy for tackling, Own
Half Only for closing down, Ultra Defensive for mentality). It is most likely the item highlighted
when the box is first ticked. I did not run the game to confirm, and it is not a default in the
football sense.

**Against the hypothesis:**

| Hypothesis item | Finding |
|-----------------|---------|
| Mentality: Ultra Defensive, Defensive, Normal, Attacking, Gung Ho | Correct. Normal is the unticked state at team level and a listed value at player level |
| Passing: Short, Direct, Long, Mixed | Correct in effect. "Mixed" is the team's unticked placeholder, and an explicit value only on the player screen |
| Tackling: Easy, Normal, Hard | Correct. Normal is the unticked state at team level |
| Closing Down: Always, Stand Off, Own Half Only | Half right. Team level offers Own Half Only and Always only. Stand Off exists only per player. "Own Half Only" is real, not suspect |
| Offside Trap, Counter Attack, Men Behind Ball as yes/no | Correct. The exact label is "Men Behind The Ball" |
| Missing | Focus Passing and Zonal Marking are team instructions the hypothesis omits |

**Not in CM 03/04.** Tempo, Width, Time Wasting, a team Playmaker, and a Target Man. None appears
in `team_instructions.xml`, `player_instructions.xml` or `tactics.xml`, and the executable's
string table has no tactics string for them ("playmaker" appears only in news and scouting text).
Tempo, width and time wasting are **later FM**; I did not establish which FM version introduced
each. A Playmaker designation is **inherited from CM 01/02 and dropped** (see the comparison).

## 2. Player instructions

**Verified (CM 03/04)**, from `player_instructions.xml`. Screen title "Instructions for
<surname>", reached from "Set Instructions > Player". Two kinds of row.

### Override rows

Tick box, hint "Tick to override team instructions", popup placeholder "(same as team)". The
string table has "Team (<value>)", commented "player instruction text if using team
instruction", which is what the tactics screen's instruction columns show for a player who
inherits.

| Setting | Values | Team-level counterpart |
|---------|--------|------------------------|
| Passing | Mixed, Short, Direct, Long | Passing |
| Closing Down | Stand Off, Own Half Only, Always | Closing Down |
| Tackling | Easy, Normal, Hard | Tackling |
| Marking | Zonal, Man, Specific | Zonal Marking |
| Mentality | Ultra Defensive, Defensive, Normal, Attacking, Gung Ho | Mentality |
| Distribution | Long Kick, Ask Defenders To Collect | none on the team screen; goalkeeper only per `tactical_templates.xml`. A third value, "Quick Throw", is commented out in the XML |
| Cross From | Deep, Touchline | none on the team screen. Its hint reads "Tick to override normal setting" |
| Cross Aim | Near Post, Centre, Far Post, Man | none on the team screen |

"Specific" marking opens a sub-list of opposing players (the XML leaves it empty for the game to
fill), and the string table glosses it "marking 'specific' opponent". This is the only
opposition-directed instruction on either screen. There is no separate opposition-instructions
screen.

Cross From and Cross Aim say "(same as team)" but the team screen has no crossing row. The
string table does have "Far Post" commented "team crossing instruction", so a hidden team crossing
default probably exists. **Unverified.** The string table also has "From Byline" and "Byline" as
crossing values; the shipped screen shows "Touchline". Whether those are the same engine value is
unverified.

### Frequency flags

Tick box only, no popup. Ticking means "more often".

| Setting | Label when ticked | Hint |
|---------|-------------------|------|
| Cross Ball | "(Player will attempt more crosses)" | "Tick to cross ball frequently" |
| Long Shots | "(Encourage shots from long range)" | "Tick to entice frequent long shots" |
| Forward Runs | "(Encourage attacking runs)" | "Tick to entice more forward runs" |
| Run With Ball | "(Player will run with the ball more)" | "Tick to urge player to keep the ball more than normal" |
| Try Through Balls | "(Encourage more through balls)" | "Tick to attempt more through balls" |
| Free Role | "(Player will roam around the pitch)" | "Tick to give free role" |
| Hold Up Ball | "(Player will hold up ball more)" | "Tick for the player to hold the ball up more frequently" |

The string table names the two states: "Normal" (commented "try through balls type", "run with
ball type", "forward runs type") and "Often". So each flag is Normal/Often, not never/always.
thy451 says the same from play: unticked players "will do less", not none. None of the seven has
a team-level counterpart.

### Presets

A "Set To Preset" button fills the screen from `tactical_templates.xml`, which ships seven
templates: Goalkeeper, Central Defender, Full Back, Defensive Midfielder, Attacking Midfielder,
Winger, Striker. The file's header comment documents the stored encoding and says a value of 0
or an omitted field means "team default, or false". The values are shipped game data; I record
the template names here and leave the numbers in the file rather than copy them into this repo.

### Runs

The tactics screen hint "Right drag to adjust runs the player will make" puts run arrows on the
formation pitch, not on this screen. That belongs to the slot grid; see the leads section.

## 3. How player and team instructions interact

**Verified (CM 03/04).** For the five shared settings (passing, closing down, tackling,
marking, mentality) a player inherits the team value until his override box is ticked. The hint
says so in words ("Tick to override team instructions"), the placeholder says "(same as team)",
and the display string "Team (<value>)" shows the inherited value. "Use team setting" is
therefore not a menu value; it is the unticked state of the override box.

Two value-set asymmetries follow from the XML. A player can Stand Off while the team cannot, and
a player can be set to explicit Normal mentality or Normal tackling, which at team level is only
the unticked state. Community advice relies on the override: cairo140 tells readers to set the
goalkeeper and centre-backs to Normal so they stay put when team mentality goes to Attacking or
Gung Ho, and thy451 gives the example of a defender on Defensive inside a Gung Ho team.

Whether the four team booleans (offside trap, counter attack, men behind the ball) can be
overridden per player: no row exists, so no. Zonal Marking is the exception, since Marking is an
override row.

## 4. Documented effects

First-party text on effects is thin: the hint and label strings quoted above, SI's patch notes,
and the match commentary events that name what the engine thinks a team is doing. Everything
else is community.

**First-party.**

- The hint and label strings in sections 1 and 2 are the only in-game descriptions. "Men Behind
  The Ball" is described as "Everyone sit in front of your area" and "put everyone behind the ball
  when the opponents have it". "Counter Attack" is "Exploit any break for quick attacks". "Zonal
  Marking" is "Players will not man mark".
- `events.cfg` has start-of-match commentary keyed to mentality: EVENT_START_GAME_ULTRA_DEFENSIVE
  ("<team> are starting extremely cautiously. They look happy to get men behind the ball..."),
  EVENT_START_GAME_DEFENSIVE ("happy to sit back and defend"), EVENT_START_GAME_ATTACKING ("have
  set their stall out to attack"). There are goal events EVENT_COUNTER_ATTACK_GOAL and
  EVENT_GOOD_COUNTER_ATTACK_GOAL, and "breaks the offside trap. He's clean through on goal".
- SI v4.1.3 notes, "Match AI ( v220 )": "Discouraged certain cases of defenders all flocking
  towards the player with ball on a counter attack and leaving a man spare alongside". "Improved
  computer team decision making regarding setting the 'forward runs' option for players".
  "Lessened influence of player 'decision making' stat on play".

**Community, plausible but untested.** thy451: Hard tackling "will win you more balls but get
you more cards and injuries"; closing down "will make your player more tired" and counters
short-passing sides; Counter Attack means "one or two players up front waiting for the counter";
Hold Up Ball "delays passing the ball forward and allows players to move up front". cairo140
agrees on hard tackling and cards, and says Men Behind The Ball is "roughly equivalent to playing
ultra defensive".

**Folklore.** Claims with specific mechanics and no source: cairo140's "Giveaways ... 2-3 times
more" with long passing; that Men Behind The Ball makes players "avoid tackling if there are
fewer than 3 defenders behind them"; that Counter Attack "forces your players to draw back to
about a quarter of the field"; that offside trap and a sweeper cancel out; that Attacking
mentality "is pointless". thy451's claim that Free Role is backed by "a free role attribute ...
hidden" matters to the sibling positional effort; see the leads section. Treat all of these as
player lore.

No source gives numbers for any effect, and I have authored none.

## 5. Live changes during a match

**Verified (CM 03/04).**

- The manager can open the tactics screen during a match by clicking the club button at the
  bottom right of the match screen (thy451). The in-match tactics screen has Confirm, Undo Last
  and Cancel buttons (`tactics.xml`), and on leaving it the game asks "Do you want to keep these
  changes and return to the match?"
- SI v4.1.3 fixed two in-match access bugs: "Should be able to go to tactics after goal" and
  "Team tactics buttons now keep their state after a replay is shown". So access was meant to be
  available at any point, including right after a goal.
- The in-match tactics screen is the same one used before the match, with both instruction
  screens, set pieces and priorities. There are no touchline shouts: no shout screen, and no
  shout strings in the executable. Shouts are **later FM**.
- Substitutions go through the same screen. Commentary events ("<team> are ready to make a
  substitution...", "<team> are going to make some substitutions...") suggest a substitution is
  announced and then made at a break.

**Unverified: whether a tactical change applies at once or waits for a stoppage.** No source
says. The executable's debug strings hint at the mechanism: "MATCH_SESSION::show_match_seeds_error()
- match after tactics change differs to match before", "match has diverged at time <n>", and
"Manager making tactical change..." (a network-game wait message). That reads as a seeded engine
that re-runs from the moment of the change, which would make changes effective as soon as play
resumes. This is inference from debug strings, not a documented rule.

## 6. AI in-match behaviour

**Verified (CM 03/04) that AI managers change style and formation during a match.** The
commentary file has events for it, written in the third person and so usable for either side:

| Event | Sample commentary |
|-------|-------------------|
| EVENT_GONE_DEFENSIVE_STYLE | "<team> go to a defensive style" |
| EVENT_GONE_ATTACKING_STYLE | "<team> change to a more attacking style of play" |
| EVENT_GONE_ATTACKING_STYLE_NOW | "They start to push forward in numbers..." |
| EVENT_GONE_NORMAL_STYLE_FROM_DEFENSIVE | "They've abandoned their defensive stance a little" |
| EVENT_GONE_NORMAL_STYLE_FROM_ATTACKING | "<team> seem to be taking fewer risks now..." |
| EVENT_GONE_DEFENSIVE_STYLE_FROM_ATTACKING | "They seem happy to defend now" |
| EVENT_GONE_DEFENSIVE_STYLE_FROM_ATTACKING_BUT_NOT_WINNING | "<team> are being forced back... They've abandoned their attacking shape" |
| EVENT_SITTING_BACK | "<team> look content to play out time..." |
| EVENT_CHANGE_FORMATION | "<team> change formation" |
| EVENT_MAKING_CHANGES | "<team> are going to change things around..." |

The event names imply three mentality bands (defensive, normal, attacking) for commentary
purposes and a separate "sitting back" state, and "play out time" implies a late-game,
protecting-a-lead trigger. The executable carries a debug trace for the AI's change routine:
"Start of Tactical Change", "Changed Tactics", "Changed Tactics v2", "Repicked eleven to fit
tactics", "Set Attacking Bias".

**Verified that the AI's choices draw on staff preferences, as attributes.** Managers and coaches
have "Playing Mentality" (Attacking, Adventurous, Cautious, Sitting Back), "Pressing Style"
(Mixed, Stand Off, Closing Down), "Playing Style" (Mixed, Passing, Direct, Long), "Marking Style"
(Mixed, Zonal, Man) and "Preferred Formation". That these feed AI tactic selection is inference
from their existence. The pasted hypothesis's "Mixed" passing and "Stand Off" pressing may come
from these staff attributes rather than the tactics screen.

SI v4.1.3 also says "Default and computer team tactics refined" and improved AI setting of
"forward runs".

**Unverified.** The score and minute thresholds that trigger an AI change, how far it moves
mentality, and whether it changes the other instructions. No source documents them; they are in
compiled code.

## Differences from CM 01/02 and CM4

**CM 01/02 (inherited or dropped), from the 3.9.68 string table.** These are strings from the
CM3-engine tactics code (`tactics_screens.cpp` in the embedded build path), so the labels are
reliable but the screen layout is reconstructed.

| CM 01/02 | CM 03/04 |
|----------|----------|
| Per-player Passing: Team, Mixed, Short, Direct, Long | Same values; "Team" became the unticked override box |
| Per-player Tackling: Team, Normal, Easy, Hard | Same |
| Per-player **Pressing**: Team, Yes, No | Renamed **Closing Down**, three levels: Stand Off, Own Half Only, Always |
| Marking: Man, Man (named opponent), Zonal, None | Zonal, Man, Specific |
| **Pass To**: Left, Centre, Right | Became team-level **Focus Passing**, with both flanks as a fourth option |
| Flags: Cross Ball, Try Through Balls, Long Shots, Hold Up Ball, Run With Ball, Forward Runs, Free Role | The same seven |
| Mentality, commented "playing style": Attacking, Defensive, Normal | Five levels, adding Ultra Defensive and Gung Ho |
| Team: Men Behind Ball, Counter Attack, Offside Trap | Same, plus Zonal Marking as a team tick |
| **Playmaker** designation beside set-piece takers | Gone |
| Set-piece positions: Forward, Back, Normal | Replaced by the much larger set-piece menus |

**CM4.** CM 03/04 is built on the CM4 engine: its commentary file is headed "cm4 event file", and
the tactics code rejects saving over "CM4 pre-defined tactics". COMPARISON_PENDING

## Leads for sibling tickets

- **Ticket 02 (presets, slot grid, .tac).** Twenty-seven `.tac` files ship in `Data1.cab`
  (`__4_4_2.tac` style names, including 3-5-2 Attacking, Defensive and Sweeper variants, 4-4-2
  Diamond, 4-1-2 and 4-2-1). The tactics screen hint "Right drag to adjust runs the player will
  make" confirms per-slot run arrows. thy451's position grid is five columns by five rows of
  Defender, Midfielder, Attacking Midfielder and Forward plus a Sweeper row and Goalkeeper. SI
  v4.1.3 added presets 4411 and 4231. The executable names 4-3-1-2 as a match-manager fallback.
  "You cannot write CM4 pre-defined tactics" says presets are write-protected. Whether a `.tac`
  stores the instruction settings above is for ticket 02.
- **Player-positional-model ticket 01.** Free Role is a player instruction flag here, and thy451
  says there is also a hidden "free role attribute". The executable's attribute abbreviations do
  not include one, so that claim needs checking against the database. A player guide lists
  "F = Free Role (Max Value: 20)" in its attribute key.
- **Set pieces, open in the map.** Team set-piece instructions per side: Corners (Short, Near
  Post, Far Post, Edge Of Area, Edge Of Six Yard Box), Free Kicks (Short, Long, Cross Near, Cross
  Far, Cross Centre, Aim For Best Header), Throw Ins (Short, Long, Quick). Player set-piece roles
  for defending free kicks and corners and attacking free kicks, corners and throw-ins, each with
  "(default)". Priorities: Captain, Penalty Takers, Free Kick, Corner and Throw In Takers split
  left and right. All in `team_sp_instructions.xml`, `player_sp_instructions.xml` and `tactics.xml`.
