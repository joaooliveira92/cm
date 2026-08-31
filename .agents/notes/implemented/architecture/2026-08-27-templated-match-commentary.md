# Agent Note: Templated match commentary, no generation engine

Status: implemented

> Migrated from ADR-0008 when the numbered ADR layer was retired.

## Problem

Match day needs commentary from the event timeline. The range runs from a fixed template pool to a
composition engine assembling lines from interchangeable phrase fragments, and the choice sets how much
engineering the feed costs for how much perceived variety.

## Decision

Each Match Event becomes a Commentary Line by picking a random fixed Commentary Template from that event
type's pool and filling its slots — player name, team name, scoreline where relevant — from the event
payload.

A lightweight composition or generation approach was considered and rejected: for a single-player,
text-only v1 feed, a generous template pool per event type gets most of the perceived variety at a
fraction of the engineering cost. Per-match repetition is mitigated cheaply by excluding the last-used
template index per event type from the next pick, rather than by building a bigger generation system.

Quiet Minute-Slices with no Match Event produce no Commentary Line. There is no ambient or filler
commentary. This keeps the feed's density identical to the event timeline's density, and avoids needing a
large filler-phrase pool purely to avoid repetition across roughly 90 mostly-quiet slices.

Commentary Templates live in `packages/shared` as fixed game-design data, parallel to Position Weights and
Role Weights. They are never event-sourced state, and never assembled by the match engine or the
game-engine package itself.

## Alternatives considered

- **A phrase-fragment composition engine.** Rejected: substantially more engineering for variety a large
  enough template pool already delivers at this scale.
- **Ambient commentary on quiet minutes.** Rejected: it requires a large filler pool to avoid obvious
  repetition, and decouples feed density from event density for no informational gain.

## Consequences

- Adding commentary variety means adding template strings, not touching code.
- The feed is sparse by design; a quiet match reads as quiet.
- Commentary can never introduce information the event timeline does not carry.
