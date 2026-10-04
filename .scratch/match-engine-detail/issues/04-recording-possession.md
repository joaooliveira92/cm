# Recording possession

Type: grilling
Status: resolved
Blocked by: 01

## Question

The engine rolls which side has the ball once per minute-slice, about 92 times a match. What event
records it: one per slice, one only when possession changes, or a running tally on an existing event?
How does the live statistics cut (by revealed-event position, not minute) read it so the figure is
right mid-match? Is 92 coin flips a fine enough grain to show as a percentage, or does the figure need
a stated precision? Once recorded, the "Attacks" bar from
[attack share is a statistics row](../../../.agents/notes/implemented/feature/2026-10-03-attack-share-is-a-statistics-row.md)
either becomes a possession bar or stays beside one; which?

## Answer

**Possession is the share of minute-slices with the ball, carried as a cumulative `PossessionTally`
event; it replaces Attacks on the bar, and Attacks stays as a Statistics row.** See [Agent Note](../../../.agents/notes/implemented/feature/2026-10-03-possession-is-the-share-of-minutes-with-the-ball.md).
