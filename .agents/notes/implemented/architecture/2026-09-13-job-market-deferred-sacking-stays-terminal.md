# Agent Note: The job market is deferred; a sacking still ends the career

Status: implemented

## Problem

Group N (Jobs, Employment and Manager Career, 194–207) assumes a sacked or resigning manager finds
another job. The shipped design ends the career instead: **Manager Sacked** archives the save, and
every guard keys off **Archived Save** (note `2026-08-27-board-objectives-and-manager-sacking`, with
proving tests `board-objectives.test.ts` and `archived-guard.test.ts`). Building Group N as imported
would overturn that.

## Decision

**Deferred, unscheduled. Sacking stays terminal.** When Group N is reconciled, its rows are `deferred`
with the anchor `unscheduled`, and nothing in the Archived Save guard changes. The question is worth
reopening once Group K (board) and Group Q (season transitions) are reconciled, because a job market
depends on both.

The decision was made by the agent on 2026-09-13 under the human's explicit delegation.

## Alternatives considered

- **Build a job market now.** It needs vacancies for AI clubs, applications, an unemployed state in
  place of archiving, and rebinding a Save to a new club. It also overturns a tested, recorded design,
  before the board and season-transition groups it depends on exist.
- **Dispose of Group N in full.** Rejected. Continuing a career elsewhere is a plausible later feature,
  and nothing forces a permanent no.

## Consequences

- CONTEXT.md's **Manager Sacked** entry now says no job market exists yet, so a reader does not take
  archiving for an unfinished stub.
- Screens 202 (Resign) and 203 (Dismissal) may still survive a later reconciliation as views of the
  existing outcome. 207 (Employment History) overlaps Manager History (Screen 30).
