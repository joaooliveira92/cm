# Agent Note: Group Q v1 scope — Season Summary stands in for 243; everything else deferred

Status: proposed

## Problem

Group Q (Awards, Honours and Season Transitions) has 14 screen specs, 236 to 249. [Ticket 01](../../../../.scratch/group-q-awards-honours-and-season-transitions/issues/01-screen-inventory.md)
reported no Group Q screen with a route or component. That missed one: the Season Summary screen
(`renderer/seasonSummary/SeasonSummaryScreen.tsx`, destination `seasonSummary`) already shows
standings, the board verdict and the manager outcome from `getSeasonSummary`, which is what Screen 243
End of Season Review asks for.

## Proposal

| Screens | Ruling | Why |
|---|---|---|
| 243 End of Season Review | renamed | shipped as Season Summary |
| 244, 246, 248 | deferred | the rollover and budget derivation exist, but a confirmation or transition screen needs a design for how a season hand-over should feel |
| 236–242, 245 | deferred | no awards or honours model exists; adding one is a product decision about the game's feedback loop |
| 247, 249 | deferred | need the Calendar to stop on non-Fixture dates, the same blocker as Group M's briefings |

Decided under the human's standing delegation (2026-09-21).

## Alternatives considered

- **Build 243 and 246 now.** 243 already exists; 246 alone has no design to build from. Rejected.
- **Defer everything including 243.** Rejected: it would register a shipped screen as missing.

## Acceptance criteria

- The Group Q deviation register records 243 as renamed to Season Summary and the rest as deferred.
- No Group Q implementation ticket exists for v1.
