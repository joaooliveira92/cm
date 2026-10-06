# 16: Player instruction effects

Type: grilling
Blocked by: 08
Status: resolved

## Question

For each Player Instruction and value (the five overrides beyond what ticket 15 covers, Distribution,
Cross From, Cross Aim and the seven normal/often switches), fix its effect on the slot's behaviour
vector within [the engine framework note](../../../.agents/notes/implemented/architecture/2026-09-29-tactics-resolve-to-behaviour-vectors-for-a-chance-pipeline.md), which attributes scale it (using the closest-attribute table), and how Free
Role scales with the Free Role Rating. Include what `default` means for Distribution, Cross From and
Cross Aim. The agent drafts the table; the human approves or amends it.

## Answer

**Approved table.** "Normal" is the engine's baseline, not "never" (CM's hint text says unticked
players do less); "often" roughly doubles that behaviour's weight for the slot. Sizes are relative,
numbers are tuning constants, attribute names use the closest-attribute mapping of
[the engine framework note](../../../.agents/notes/implemented/architecture/2026-09-29-tactics-resolve-to-behaviour-vectors-for-a-chance-pipeline.md).

| Instruction | Effect on the slot | Scaled by |
|---|---|---|
| Passing, Closing Down, Tackling, Marking, Mentality overrides | as [ticket 15](15-team-instruction-effects.md), for this slot only; stand off (player only): pressing, fouls and fatigue ↓; mentality moves this slot's forward-run weight and defensive share | as ticket 15 |
| Marking: specific (match-time) | the named opponent is picked less as finisher and converts less; the marker's own attacking share ↓ | positioning, tackling, pace against the target's |
| Distribution (GK) | long kick: attempt rate ↑ (S), retention ↓ (M); ask defenders to collect: the reverse; default: the engine mix | gkKicking, passing |
| Cross From | deep: crosses more often, lower quality; touchline: higher quality, less often; default: a mix | crossing; touchline also dribbling, pace |
| Cross Aim | near post favours quick finishers; far post favours heading and strength; centre neutral; man aims at our best header; default: centre | heading, strength, pace of the target |
| Cross Ball: often | cross weight when this slot creates ↑ | crossing |
| Long Shots: often | long-shot weight when this slot finishes ↑; low base conversion; a miss ends the attack | shooting, composure |
| Forward Runs: often | finisher selection ↑, offside risk ↑, defensive share after a turnover ↓, fatigue ↑ | positioning, pace, stamina |
| Run With Ball: often | dribble weight ↑, fouls drawn ↑, a failure is a turnover | dribbling, pace, acceleration, agility, flair |
| Try Through Balls: often | through-ball weight when this slot creates ↑, turnovers ↑, receiver offside risk ↑ | passing, decisions, flair |
| Free Role: often | counts partly in neighbouring rows in possession, creator weight ↑, defensive share ↓; with a low Free Role Rating the team loses shape (midfield ↓ slightly) | Free Role Rating, flair, decisions |
| Hold Up Ball: often | hold-up weight when this slot is the pivot ↑, the next finisher comes from midfield more often, attempt rate ↓ (S) | strength, firstTouch, composure |

No Agent Note: design detail under the framework note; this answer is its record.
