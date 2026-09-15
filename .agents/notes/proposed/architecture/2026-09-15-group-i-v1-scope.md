# Agent Note: Group I v1 scope — scouting screens on the existing Scouting model only

Status: proposed

## Problem

Group I (Scouting and Recruitment) has 14 screen specs, 118 to 131. The screen inventory found four
13-line placeholder stubs and no finished Group I screen. What exists is the Scouting model behind the
Team Scout Report: Scouts, Scouting Assignments to a Player or a Club, Scouting Progress per club and
Player, and the `attributeRange` rule. Most of the specs assume models that do not exist: shortlists,
recruitment focuses, scouting priorities, meetings, squad plans, agents, trials, staff hiring, and
assignment targets wider than a Player or a Club. Several screens also depend on Group J (transfers,
contracts and negotiations), which has no effort yet.

## Proposal

Group I v1 will build three screens, all on the existing Scouting model with no new table:

- **121 Scouting Assignment** as a standalone screen over `getScouting`, `assignScout`,
  `assignScoutToClub` and `unassignScout`. Targets stay a Player or a Club. Duration, cadence,
  travel, priority, and competition, nation or region targets are not built.
- **126 Scouting Knowledge**, the club and Player views only: how far the club's Scouting Progress
  reaches, read from `scouting_progress`. Geographic, competition and tactical knowledge views are not
  built, because no model records knowledge at those levels.
- **118 Scouting Centre** as the landing page: Scouts and what each observes, plus a knowledge summary,
  linking to 121 and 126. Its report, shortlist, focus and transfer-window panels are not built.

The eleven deferred screens and what each lacks:

| Screen | Missing |
|---|---|
| 119 Player Search | a knowledge-limited Player read; blocked on [decision request 01](../../../../.scratch/group-i-scouting-and-recruitment/decision-request-01-knowledge-limited-player-reads.md) |
| 129 Transfer Target Comparison | the same knowledge-limited read, plus Group J's negotiation context |
| 120 Staff Search, 125 Staff Shortlist | staff hiring, and staff roles beyond `coach` and `scout` |
| 122 Scouting Priorities, 123 Recruitment Focus | a priority or focus model that directs Scouts |
| 124 Player Shortlist | a private shortlist model |
| 127 Recruitment Meetings, 128 Squad Planner | a meeting model and a squad-plan model; both lean on Group J budgets and contracts |
| 130 Agent and Intermediary Information | an agent model; Group J |
| 131 Trial and Assessment | a trial model; its contract step is Group J |

## Alternatives considered

- **Include 124 Player Shortlist.** A shortlist is a small private table and would give the Scouting
  Centre something to show. Rejected for v1 because it is still a new domain model, and the Group H
  precedent deferred every screen that needed one. It is the cheapest deferred screen to pick up next.
- **Include 119 Player Search.** Rejected while the transfer market shows exact figures for unscouted
  players: a search built beside it would either copy that leak or contradict the market on the same
  player. It waits for decision request 01.
- **Defer all of Group I.** Rejected: the Scouting model already has three commands with no screen of
  their own, and assignments can only be made from inside a Team Scout Report today.

## Acceptance criteria

- The Group I spec covers only 118, 121 and 126 for v1.
- The deferred screens are listed in the map's Out of scope section with what each lacks.
- Implementation tickets exist only for 118, 121 and 126, and none adds a table.

## Risks

- The Scouting Centre will be thin, with no reports feed, shortlist or recruitment focus. It reads as a
  roster-and-coverage page, not the recruitment dashboard its spec describes.
- Scouting Knowledge without geography cannot show where the club has no coverage, only which clubs
  and Players it has.
