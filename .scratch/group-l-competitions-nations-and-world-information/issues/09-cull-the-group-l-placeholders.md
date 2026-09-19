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

- [ ] Every Group L placeholder has an explicit ruling: kept because its screen is arriving, or
      removed with its route, nav entry and screen-scope entries
- [ ] The kept/removed discriminator is stated once and applied consistently, not decided per screen
      by feel
- [ ] The seven screens that never had a route carry a row saying so
- [ ] `clubs/`, `competitions/`, `nations/` and `nationClubs/` are ruled together
- [ ] The Group L ledger records the cull
- [ ] `grep -rl "WIP" apps/desktop/src/renderer --include "*.tsx"` returns no `competition*` or
      `nation*` screen this ticket removed
- [ ] `pnpm check:all` green and e2e green

**Blocked by:** [07](07-competition-results.md) and [08](08-competition-overview.md) — both replace
placeholders this ticket would otherwise delete out from under them.

**Status:** ready-for-agent
