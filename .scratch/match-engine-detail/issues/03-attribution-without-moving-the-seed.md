# Attribution without moving the seed

Type: grilling
Status: ready-for-agent
Blocked by: 02

## Question

Naming a player for a team-level fact (who made the block, who won the header) needs a weighted pick,
and a pick from the match's random source shifts every later draw, so every seed produces a different
match. Should attribution draw from a second random stream derived from the match seed (for example
`deriveSeed(seed, "attribution")`), so outcomes stay byte-identical and only the new events are added,
or from the main stream, accepting new results for every seed? Weigh it against
[the three-phase engine and deterministic seed](../../../.agents/notes/implemented/architecture/2026-08-27-match-engine-three-phase-and-deterministic-seed.md), [the deterministic match seed seam](../../../.agents/notes/proposed/testing/2026-09-06-deterministic-match-seed-seam.md),
the command-journal replay of live matches, and `calibrate.test.ts`.
