# Agent Note: Group S v1 scope — shipped modals stand in for their screens; the rest deferred

Status: proposed

## Problem

Group S (Search, Utilities and Reference) has 14 screen specs, 264 to 277. [Ticket 01](../../../../.scratch/group-s-search-utilities-and-reference/issues/01-screen-inventory.md)
found three shipped as modals rather than screens (270 Command Palette, 271 Keyboard Shortcuts, 272
Contextual Help), one partial (277, the version footer and Credits dialog), and ten absent.

## Proposal

| Screens | Ruling | Why |
|---|---|---|
| 270, 271, 272 | renamed | the modal forms do the job; a route-addressable copy adds nothing mechanical |
| 277 | renamed | the version footer and Credits dialog cover application information |
| 264, 265, 266 | deferred | global search pays off only once the entity screens of Groups D–L exist |
| 267, 268, 269, 273, 274, 275 | deferred | each needs a new model (recents, favourites, saved views, glossary) or a decision about the News Inbox |
| 276 | deferred | overlaps Group F Screen 88; Group F owns the reconciliation |

Decided under the human's standing delegation (2026-09-21).

## Alternatives considered

- **Promote 270–272 to full screens.** Rejected: cosmetic, with no mechanical difference.

## Acceptance criteria

- The Group S deviation register records each screen with the ruling above.
- No Group S implementation ticket exists for v1.
