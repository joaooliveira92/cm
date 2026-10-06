# 09: The Group L cull, where a placeholder is not automatically a lie

**What to build:** nothing. The largest single block M1 step 5 has to rule on — and the one where
the rule that worked for Groups C and D does not transfer unchanged.

## Why this one is different

Group D's cull was simple: the screens were disposed, so the placeholders were lies. **Group L's
eleven are `deferred`** — wanted, in scope, waiting on a model — and the ledger says so explicitly:

> the cull must distinguish a deferred screen's placeholder from a disposed screen's.

Group C already met this and answered it twice, in opposite directions:

- `clubReservesDetail/` and `clubYouthDetail/` were `deferred` and **went**, because their model is
  excluded from v1 and nothing is arriving.
- `clubSquadDetail/` is `deferred` and **stayed**, because its screen is blocked on a decision that
  is live, so the placeholder describes something arriving rather than something absent.

**That is the discriminator this ticket needs**: is the screen *waiting on a live piece of work*, or
merely wanted some day? The first keeps its stub; the second loses it and keeps its ledger row.

Most of Group L's eleven are the second kind — `unscheduled`, with Group P or Group S owning the
model. Check each rather than assuming, and record the answer per screen.

## The inventory

Eleven `deferred` screens with placeholders, plus **seven that never had a route at all** — which
is itself worth a row, because M1 step 5 has nothing to cull for those and a future reader should
not go looking.

`competitions/`, `nations/` and `nationClubs/` are the World section's browse entries, and
`clubs/` is one too — group-c ticket 09 ruled `clubs/` to be **this group's**, not Group C's, so the
four should be ruled together here.

## Acceptance

- [x] Every Group L placeholder has an explicit ruling: kept because its screen is arriving, or
      removed with its route, nav entry and screen-scope entries
- [x] The kept/removed discriminator is stated once and applied consistently, not decided per screen
      by feel
- [x] The seven screens that never had a route carry a row saying so
- [x] `clubs/`, `competitions/`, `nations/` and `nationClubs/` are ruled together
- [x] The Group L ledger records the cull
- [x] `grep -rl "WIP" apps/desktop/src/renderer --include "*.tsx"` returns no `competition*` or
      `nation*` screen this ticket removed
- [x] `pnpm check:all` green and e2e green

**Blocked by:** [07](07-competition-results.md) and [08](08-competition-overview.md) — both replace
placeholders this ticket would otherwise delete out from under them.

**Status:** resolved

## Answer

**Eighteen deleted, three kept.** `pnpm check:all` green (2081 desktop tests), **e2e 55 passed**.
WIP placeholders across the renderer are down from 33 to 13.

### The discriminator, stated once

> A `deferred` screen keeps its stub when it is **waiting on a live piece of work**, and loses it
> when it is merely wanted some day.

Not one of the eighteen was waiting on anything in progress: statistics wait on Group P, history on
Group Q, national teams on Group O, and none of those is started. Group C had already set the rule
in both directions — `clubSquadDetail` kept its stub because a decision request is live,
`clubReservesDetail` lost its because a v1 exclusion is not work in progress.

Eight competition drill-downs went, and **the whole ten-screen nation branch**. Nothing was left to
route to there, so `nationRoute`, `CareerNationChildView` and the nation URL-segment map went with
it — the same one-level-further finish the staff branch needed in group-d ticket 10.

One thing the pattern missed and the typechecker caught: `nationCompetitions` was imported under an
*alias* (`NationCompetitionsScreen as NationCompetitionsDetailScreen`), so a regex keyed on the
component name skipped it. Worth remembering for the next cull — an aliased import survives a
name-based sweep.

### Three kept, for a reason the other eighteen did not have

`competitions/`, `nations/` and `clubs/` are the World section's **live nav destinations**, not
URL-only stubs. Deleting them would take three entries out of the navbar and leave the section
empty. Filed as [ticket 10](10-the-world-section-lands-on-three-placeholders.md).

That ticket matters more than its size suggests. [Ticket 08](08-competition-overview.md) built
Screen 161 as the competition branch's landing page — and **nothing links to it**, because
`competitions/` is the entry that should. Four competition screens, three of them shipped weeks ago,
remain reachable only by typing a URL until it is built.

The ticket also says Nations may be worth *removing* rather than building: every nation screen Group
L charted is `deferred`, so the list would link to nothing but dead ends.

### Where the remaining thirteen live

Every one now has a named owner, which is the point of a cull:

- `clubSquadDetail/` — [group-c ticket 10](../../group-c-club-information/issues/10-the-any-club-squad.md), blocked on a decision request
- `clubs/`, `competitions/`, `nations/` — [ticket 10](10-the-world-section-lands-on-three-placeholders.md)
- six `match*` screens — Group G's live-match remainder, an explicit **M1 non-goal**
- `playerSearch/`, `shortlist/`, `staffSearch/` — Group I's
