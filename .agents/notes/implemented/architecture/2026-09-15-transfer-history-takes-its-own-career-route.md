# Agent Note: Transfer History takes its own career route, not the club-scoped stub

Status: implemented

## Problem

Screen 146, Transfer History, shows the manager's club's completed transfers. Two placeholder screens
already sit on routes that could plausibly host it:

- `clubTransfersDetail/ClubTransfersDetailScreen.tsx` on `career/$saveId/club/$clubId/transfers` — a
  club-scoped drill-down that takes a `clubId` and works for *any* club in the save.
- `playerHistory/PlayerHistoryScreen.tsx` on `career/$saveId/player/$playerId/history` — a
  player-scoped drill-down, which is one Player's career, not one Club's dealings.

Group J ticket 07 had to decide whether 146 fills the club stub for the manager's club or takes a
route of its own.

## Proposal

Transfer History gets its own save-scoped career route, `career/$saveId/transfer-history`, reached
from the Recruitment submenu. Both stubs are left untouched.

The deciding argument is that the club stub is parameterised by `clubId` and 146 is not. Group J v1's
"own club only" rule ([Group J v1 scope](../../proposed/architecture/2026-09-15-group-j-v1-scope.md)) exists because every screen
showing another club's Players runs into Group I's
[decision request 01](../../../../.scratch/group-i-scouting-and-recruitment/decision-request-01-knowledge-limited-player-reads.md)
on knowledge-limited reads. Filling `club/$clubId/transfers` leaves only two options, and both are
wrong:

- Honour the `clubId` and read any club's transfers — that is the scope Group J v1 deliberately does
  not take, and it prejudges decision request 01.
- Ignore the `clubId` and render the manager's club whatever the URL says — a route parameter the
  screen lies about, which is worse than no screen at all.

It also matches the two screens that shipped immediately before it in the same effort, Contract
Expiry (141) and Budget Review (145), both of which are own-club reads on `career/$saveId/<name>`.

Unlike 141 and 145, 146 is also added to the navbar (`nav-config.ts`, Recruitment section), so a
player can reach it by clicking rather than by typing a URL.

## Alternatives considered

- **Fill `clubTransfersDetail` for the manager's club only.** Rejected for the reason above: a
  `$clubId` route whose screen ignores its own parameter is a trap for the next person to open it,
  and honouring the parameter is out of Group J v1's scope.
- **Fill `playerHistory`.** Rejected as a category error. That stub is one Player's career across
  Clubs; 146 is one Club's transfers across Players. They read the same table and answer different
  questions.
- **Build both now — the club-scoped screen with the own-club one as a special case.** Rejected as
  scope: the club-scoped read is blocked on decision request 01, so it would ship a shape nobody can
  fill in yet.

## Acceptance criteria

- `career/$saveId/transfer-history` renders the manager's club's transfers, newest first.
- `clubTransfersDetail` and `playerHistory` still render their placeholders, unchanged.
- The screen is reachable from the Recruitment submenu, covered by a Playwright spec.

## Risks

- When the club-scoped Transfers Detail screen is eventually built, two screens will read
  `player_transfers` over nearly the same query. The reader in `main/transfers/transferHistory.ts`
  already takes a `clubId`, so the seam for sharing it is in place; the duplication would be in the
  view, not the read.
- A second Recruitment entry for what a player may think of as "transfers" sits beside the existing
  Transfers screen. They answer different questions — the market now versus what already happened —
  but the labels are close.
