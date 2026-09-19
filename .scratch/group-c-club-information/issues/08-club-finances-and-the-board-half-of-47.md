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

- [x] 39 shows Transfer Budget and Wage Budget for any club, as one club-scoped screen
- [~] `finances/` — **not deleted; it became the resolver**, the same correction ticket 06 needed.
      A nav entry needs a destination to point at.
- [x] The relationship between this screen and `budgetReview/` is decided and written down, not left
      to two screens drifting
- [x] 47 shows the Board Objective and its verdict, and stays save-scoped with no club-scoped route
- [x] Neither screen displays income, expenditure, projections or supporter sentiment — the ledger
      says those have no model, and a screen showing an invented number is worse than a placeholder
- [x] `pnpm check:all` green and e2e green

**Blocked by:** None. Prefer after [06](06-club-general-information.md).

**Status:** resolved

## Answer

Both ship. `ClubFinancesDetailScreen` at `club/$clubId/finances`, with `finances/` as its own-club
resolver; `BoardConfidenceScreen` save-scoped and staying that way. `pnpm check:all` green (2059
desktop tests), **e2e 53 passed**.

### 39 Club Finances — club-scoped, and the relationship to Budget Review is settled

It is **not** a different screen from `budgetReview/` (Screen 145) — both show the same four
figures, so both now render a shared `BudgetFigures`. They differ only in where they sit: Budget
Review is a Recruitment sub-surface about the manager's own money, Club Finances is the Club
section's and answers for any club. One grid however you arrive.

`loadClubBudgetRow` and `loadWageBudgetUsed` were already club-parameterised, so the read is a
sibling entry point rather than a second query — the same shape ticket 07 found in
`readTransferHistory`.

Income, expenditure and projections are **absent, not zeroed**, and a test asserts none of those
words appears. A screen showing an invented balance is worse than the placeholder it replaced.

### 47 Board Confidence — save-scoped, and now proven so

The interesting test is not on the screen. `board_objective` is keyed on `season_number` and names
the human's club, so **no rival has a row at all** — and that fact is asserted directly against the
schema, because it is what the whole scoping decision rests on. If a future change gave rival clubs
objectives, that test fails and the exception in the club-scoped rule needs revisiting, which is
exactly when someone should be told.

Supporter confidence is **named as unmodelled** rather than silently omitted. A screen called
"Supporter and Board Confidence" that shows only the board reads as broken; one that says so reads
as deliberate.

### Two small things worth keeping

`getBoardConfidence` folds `toSeasonView`, so it declares `PendingFixtureIntegrityError`.
`getCompetitionTable`'s comment already states the rule — *an error the handler can raise but the
union omits arrives at the renderer raw, which § Boundaries forbids* — and the typechecker enforced
it before the comment was read.

And the objective panel needed `role="region"` explicitly. An `aria-label` on a bare `div` does not
make it a landmark, so it was unaddressable to a screen reader and to the spec that caught it. The
e2e run found it; the unit tests did not, because they query by text.

### One self-inflicted detour

Fixing that role, the comment explaining it was inserted *inside a JSX ternary branch*, where
neither `{/* */}` nor `//` is valid — a branch holds one expression. It broke the build, which
surfaced as a `pretest:e2e` failure rather than a typecheck error. The explanation lives in the
component's docblock instead.
