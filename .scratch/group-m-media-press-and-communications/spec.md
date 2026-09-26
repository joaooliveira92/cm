# Spec: Group M — Media, Press and Communications

Status: resolved — no implementation work follows from this spec.

## Summary

**Group M is out of v1.** All thirteen screens (181–193) are excluded. This document is the
deviation register the map set out to produce; it is not a build spec, because there is nothing to
build.

The decision is [ticket 02](issues/02-v1-scope.md); the evidence is
[ticket 01](issues/01-screen-inventory.md).

## Why

CONTEXT.md — binding for domain language per ENGINEERING-CONTRACT — already excluded this group
before the spec was imported, in two places:

> It does not govern player contracts, wage negotiation, promised playing time, dressing-room
> relationships, **media handling**, or board relations - none of those systems ship in v1.
> — CONTEXT.md:751-753 (**Influence**)

> There is no training or **press content** to occupy a date with no Fixture, so a finer-grained
> clock would have nothing to display.
> — CONTEXT.md:445-447 (**Calendar**)

The second is load-bearing rather than incidental: the Calendar advances only between Matchdays and
Transfer Window boundaries, and the absence of press content is the stated reason a finer clock would
have nothing to show. Screens 184 and 185 assume a clock that stops on dates this game deliberately
skips.

Ticket 01 confirmed the supporting model is absent too: no manager reputation, no player or squad
morale, no board opinion that moves (one annual verdict from league position plus a consecutive-miss
counter), no relationship model, and no command in the game that produces text.

## Deviation register

Every screen carries the same deviation, for the same reason, so the register is stated once rather
than repeated thirteen times.

| Screens | Deviation | Reason |
|---|---|---|
| 181–193 | **Out of scope** — not built, not routed, not stubbed | CONTEXT.md:751-753 excludes media handling from v1; no supporting data model exists |

Per-screen notes where the imported spec asserts something that contradicts this game specifically:

| Screen | Contradiction with the shipped game |
|---|---|
| 181 Media Centre | Would collide with the shipped **News Inbox** (Screen 24), which CONTEXT.md:915-921 defines as "a career record, not a work queue", listing News feed / Message centre / Notification centre as _Avoid_. A second inbox-shaped surface would put two names on one idea. |
| 184, 185 Pre-/Post-Match Media Briefing | Assume a Calendar that stops on non-Fixture dates. It does not, by design (CONTEXT.md:443-453). |
| 189 Media Rumours, 192 Public Reaction | Imply generated content. The game generates prose only through Commentary Templates and the News copy table, both deterministic and neither a generator — CONTEXT.md:188-204 lists *Generator* as an _Avoid_ term. |
| 190 Journalist and Media Outlet Profile | Requires a named person with no mechanical quality. The nearest existing concept is Presence Staff (CONTEXT.md:578-592), justified only because a shipped surface reads them. No shipped surface would read a journalist. |
| 191 Media Relationships | Requires a stored relationship between manager and another party. None exists; the nearest thing is the Influence Pillar as a per-transaction modifier on one Bid response. |
| 193 Communication History and Transcript | Requires manager-authored output. No command in the game produces text. |

## What would reverse this

A human deciding the game wants a media system. That is a programme rather than a group — at minimum
a manager reputation model, a morale or opinion model, a consequence decider, persistence and
migration, balance numbers, and a Calendar that stops on non-Fixture dates. Each is its own effort.
It would begin by amending CONTEXT.md in the same commit as the first code, per
ENGINEERING-CONTRACT: a recorded decision is overturned by a new decision record, never by drift.
