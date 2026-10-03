# Event volume: individual events or tallies?

Type: grilling
Status: ready-for-agent
Blocked by: 02

## Question

A match today emits on the order of a hundred Match Events. Passes alone run to several hundred per
side. Are high-volume actions individual events (`Pass`, `Tackle`), or per-slice tallies per player
(one event carrying counts), or both, with individual events only for the notable ones? The answer
sets the size of every stored timeline, the cost of simulating every AI fixture each Matchday, the
cost of the live re-derivation on each command, and how the revealed-event cut behaves. Include a
measured budget: current timeline size and Matchday commit time, and the ceiling this effort may
reach.
