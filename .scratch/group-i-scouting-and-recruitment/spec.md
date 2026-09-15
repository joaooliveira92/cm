# Group I: Scouting and Recruitment — Reconciled Spec

Status: ready-for-slicing

## Problem Statement

The Scouting and Recruitment screens (118-131) describe a full recruitment workflow. The codebase has
four placeholder stubs and the Scouting model behind the Team Scout Report: Scouts, Scouting
Assignments to a Player or a Club, and Scouting Progress. A manager can only assign a Scout from inside
a Team Scout Report, and cannot see what the club already knows.

## Solution

Build the three screens the existing Scouting model supports, in dependency order: Scouting Assignment
(121), Scouting Knowledge (126), then the Scouting Centre (118) as their landing page. Eleven screens
are deferred because each needs a model that does not exist. See
[Agent Note: Group I v1 scope](../../.agents/notes/proposed/architecture/2026-09-15-group-i-v1-scope.md).

## User Stories

1. As a manager, I want to see every Scout, what each is observing and how far that has got, and to
   start or end a Club assignment, so I can direct scouting without opening a report first. (Screen 121)
2. As a manager, I want to see which Clubs and Players my club has scouted and how complete that
   knowledge is, so I know where scouting is still thin. (Screen 126)
3. As a manager, I want one scouting page that summarises Scouts and coverage and leads to the rest.
   (Screen 118)

## Implementation Decisions

- **No new table.** All three screens read `scouting_assignments` and `scouting_progress` and use the
  existing commands. (Ticket 02.)
- **Build order**: 121, 126, 118. (Ticket 03.)
- **Screen 121 targets a Club or a Player, as the schema does.** Clubs are chosen from the League Table
  read. A new Player target is not offered in v1: no list of other clubs' Players is knowledge-limited
  yet ([decision request 01](decision-request-01-knowledge-limited-player-reads.md)). A Scout already
  observing a Player shows that target and can be unassigned. Duration, cadence, travel, priority and
  wider targets are not built. Shipped in ticket 04 at `/career/$saveId/scouting-assignment`: a Club
  assignment takes `expectedReportId` from that Club's `getTeamScoutReport` (a delivered report's id, or
  `currentReportId` from `ClubNotScoutedError`), and a Club target reads "Tracked per Player".
- **Screen 126 shows coverage, never figures.** A new read-only RPC returns, per Club with scouted
  Players, the count scouted, `squadCoverage` and Knowledge Confidence from `rules/teamScoutReport.ts`;
  and per scouted Player, name, Club and Scouting Progress. It returns no Attribute, Attribute Range or
  Transfer Value. Own-squad Players never appear: they carry no Scouting Progress.
- **Screen 118 aggregates.** Scout roster from `getScouting`, a coverage summary from 126's read, links
  to 121 and 126. No reports feed, shortlist, recruitment focus or transfer-window panel.
- **Shared components**: Scout roster row (121, 118) and coverage summary (126, 118).

## Testing Decisions

- Main-process tests for the new knowledge read in `apps/desktop/test/main/club/`, including a save with
  no scouting (empty, not an error) and proof that own-squad Players are excluded.
- RPC roundtrip tests in `packages/contracts/test/` for the new read.
- Renderer tests per screen following `test/renderer/training/`, and a Playwright spec per reachable
  screen in `apps/desktop/e2e/`.
- Prior art: `renderer/scouting/AssignScoutPanel.tsx` and its tests for assignment feedback.

## Out of Scope

- Screens 119, 120, 122-125, 127-131, deferred per ticket 02.
- Knowledge-limiting the transfer market (decision request 01).
- Assignment duration, cadence, travel, priority, and competition, nation or region targets.

## Further Notes

- `renderer/scouting/ScoutingScreen.tsx` on route `scouting` becomes the Scouting Centre.
- `getScouting` is already wired in `renderer/rpc/queries.ts` with no consumer.
