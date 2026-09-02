# 05 — `Pick a team for me` semantics

Type: grilling
Status: resolved

Blocked by: 02

## Question

What exactly does `Pick a team for me` do?

Settled at charting: **uniform random** across clubs, and **select-and-stay** — it highlights a
club and leaves the user to press Continue, rather than advancing the step. Weighting the pick
by Pillars or Archetype is out of scope; no manager-to-club fit model exists.

Decisions this ticket owns:

- **Determinism.** Every club carries a `generation_seed` and the world is seed-reproducible.
  Should the random pick be seeded from the world too, so the same save always suggests the same
  club, or is a fresh `Math.random()` per press the point?
- **Repeat presses.** Does pressing it again re-roll, and may it return the club already
  selected? A one-in-twenty no-op reads as a broken button.
- **Interaction with the league selector.** Does the pick draw from the filtered league or from
  every club in the world? (See
  [04 — League selector options source](04-league-selector-options-source.md).)
- **Announcement.** The pick moves selection without the user's pointer or keyboard doing it, so
  the detail panel changes under them. What is announced, and does focus move to the picked row?
- **Label and placement.** The button sits below the list per the layout intent; whether it
  reads as a primary or a subdued action depends on how the screen wants to be used.

## Answer

**The pick is an unseeded, exclusion-rolled assist: one press of `Math.random()` over the loaded
clubs, excluding the currently selected one.** See [Agent Note](/.agents/notes/implemented/architecture/2026-09-01-pick-a-team-for-me-semantics.md).
