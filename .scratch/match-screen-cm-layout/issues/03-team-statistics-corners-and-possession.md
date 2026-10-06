# Team statistics: corners, possession and the footer bar

Type: grilling
Status: resolved
Blocked by: 01

## Question

CM runs a Possession bar under every match tab. The statistics read names possession and corners as
unavailable, yet the engine now emits a `Corner` event, and `statistics.ts` already computes a
possession figure from attack counts (`computePossession`), which the standing rule forbids. What does
the footer bar show, what happens to the shipped proxy, and do corners become a counted statistic?

## Answer

**Corners become counted; the possession proxy is renamed to what it measures, "Attacks", and that
share drives the footer bar; possession stays unavailable.** See [Agent Note](../../../.agents/notes/implemented/feature/2026-10-03-attack-share-is-a-statistics-row.md).

**Superseded on the bar.** The engine-detail work later recorded real possession, so the footer bar
shows possession and Attacks stays a Statistics row. See [possession is the share of minutes with the
ball](../../../.agents/notes/implemented/feature/2026-10-03-possession-is-the-share-of-minutes-with-the-ball.md).
