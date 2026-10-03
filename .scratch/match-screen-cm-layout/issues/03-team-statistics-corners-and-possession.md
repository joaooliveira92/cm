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
share drives the footer bar; possession stays unavailable.** See [Agent Note](../../../.agents/notes/proposed/feature/2026-10-03-the-possession-bar-shows-attack-share.md).
