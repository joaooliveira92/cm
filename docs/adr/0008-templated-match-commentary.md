# Templated match commentary, no generation engine

Match day commentary turns each Match Event into a Commentary Line by picking a random fixed
Commentary Template from that event type's pool and filling its slots (player name, team name,
scoreline where relevant) from the event payload. We considered a lightweight composition/generation
approach (assembling lines from interchangeable phrase fragments for more combinatorial variety) and
rejected it: for a single-player, text-only v1 feed, a generous template pool per event type gets most
of the perceived variety at a fraction of the engineering cost. Per-match repetition is mitigated
cheaply by excluding the last-used template index per event type from the next pick, rather than by
building a bigger generation system.

Quiet Minute-Slices with no Match Event produce no Commentary Line — there is no ambient/filler
commentary. This keeps the feed's density identical to the event timeline's density, and avoids
needing a large filler-phrase pool just to avoid repetition across ~90 minutes of mostly-quiet slices.

Commentary Templates live in `packages/shared` as fixed game-design data, parallel to Position Weights
and Role Weights (ADR-0001) — never event-sourced state, and never assembled by the match engine or
game-engine package itself.
