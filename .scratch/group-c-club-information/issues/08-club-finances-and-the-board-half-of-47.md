# 08: Screens 39 and 47 — the halves of each that have a model

**What to build:** the budget half of Club Finances, and the board half of Supporter and Board
Confidence. Each screen is half-modelled, and the ledger is explicit about which half.

## 39 Club Finances — club-scoped

**Transfer Budget** and **Wage Budget** are modelled: `club_budgets`, one row per club. Income,
expenditure and projections have **no model** and are `deferred` — do not invent them.

Two placeholders, `finances/` (save-scoped) and `clubFinancesDetail/` (club-scoped). They are one
screen, club-scoped, per [the club-scoped rule](../../../.agents/notes/proposed/architecture/2026-09-19-a-club-screen-is-club-scoped-unless-only-your-club-has-one.md):
`club_budgets` is keyed on `club_id`, so every club has budgets and there is nothing own-club about
the subject.

`budgetReview/` already ships for the own club. Decide deliberately whether this screen is that
screen generalised or a different one, and say which — the same question ticket 07 answers for
Squad, Fixtures and Transfers.

## 47 Supporter and Board Confidence — save-scoped, and staying that way

**Board Objective** is modelled (`board_objective`, `board_objective_verdict`). **Supporter
confidence is not** — `supporter` and `attendance` appear nowhere — and is `deferred`.

**This screen must not acquire a `club/$clubId/board-confidence` route.** `board_objective` is keyed
on `season_number` and carries the human club's id, so a rival club has no Board Objective at all.
It is ticket 04's one exception, and the reason is subject existence, not secrecy: there is nothing
to hide because there is nothing there.

`boardConfidence/` stays and becomes real.

## Acceptance

- [ ] 39 shows Transfer Budget and Wage Budget for any club, as one club-scoped screen
- [ ] `finances/` is gone; its nav entry resolves the own club
- [ ] The relationship between this screen and `budgetReview/` is decided and written down, not left
      to two screens drifting
- [ ] 47 shows the Board Objective and its verdict, and stays save-scoped with no club-scoped route
- [ ] Neither screen displays income, expenditure, projections or supporter sentiment — the ledger
      says those have no model, and a screen showing an invented number is worse than a placeholder
- [ ] `pnpm check:all` green and e2e green

**Blocked by:** None. Prefer after [06](06-club-general-information.md).

**Status:** ready-for-agent
