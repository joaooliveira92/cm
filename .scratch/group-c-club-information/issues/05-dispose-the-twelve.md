# 05: Dispose all twelve, in the ledger's own shape

Type: task

The disposition table: one row per screen for 33–37, 39–42, 46–48, in
[RECONCILIATION.md](../../../docs/specs/group_c_club_information/RECONCILIATION.md), using the four
kinds the Group A ledger pilots. When this closes, no row in Group C's coverage table reads
`Not yet audited` — which is milestone [M1](../../../.ai/MILESTONES.md) exit criterion 2.

## The rule that is easiest to get wrong

**Absence of a model is `deferred`, not `out-of-scope`.** `out-of-scope` needs a reason the thing
should not be in the game; "we have not built the model" is not one. Three of the four corrections
M1 step 1 found were this error, and it was re-made twice more inside Group D. Screens 36, 37, 46 and
48 are all shaped to attract it.

The converse holds too: Group D's staff screens are genuinely `out-of-scope`, because `CONTEXT.md`
says what Staff *are* and the screens ask for something else. That is a ruling about the game, not an
observation about the schema.

## Anchors are mandatory

Every row names the decision that carries it — an Agent Note, a `CONTEXT.md` term, an owning spec
group, or `unscheduled`. A row without one is an unsupported assertion, which is the failure mode the
ledger format exists to prevent.

For 43–45 the anchor is Group Q; for anything waiting on persisted season history, say so, because
that store serves six screens across three groups and its dependents should be findable.

## What follows, and is not this ticket

Two things fall out and belong in their own tickets, filed from here:

- **Build tickets** for whatever is `needs-design` or satisfiable now. Group D's shape — survey,
  dispose, then one build ticket per surviving screen — is the precedent.
- **The placeholder cull** for everything disposed, which is M1 step 5. Group D owed this ticket and
  never filed it, and the debt sat in its ledger for five days. File it here as the dispositions
  land, not after.

## Acceptance

- [x] Twelve rows, one per screen, each with Kind, what the spec asks, disposition and Anchor
- [x] No row is `out-of-scope` for a reason that is really a missing model
- [x] Every Anchor resolves to something that exists — checked, not assumed
- [x] No row in Group C's coverage table reads `Not yet audited`
- [x] The follow-on build tickets and the placeholder-cull ticket are filed, not merely mentioned
- [x] `pnpm check:all` green, including the markdown link check

**Blocked by:** [03](03-screen-inventory-and-the-stale-49-row.md) and
[04](04-one-screen-per-subject-or-two.md) — a disposition table written before the survey and the
own-club ruling gets rewritten by both.

Status: resolved

## Answer

Twelve rows in [RECONCILIATION.md](../../../docs/specs/group_c_club_information/RECONCILIATION.md).
**No coverage row reads `Not yet audited`, which is M1 exit criterion 2 met for Group C.**

### Not one row is `out-of-scope`, and that is the finding

The ticket warned about mis-kinding a missing model. The result went further than expected: **none**
of the twelve is ruled out by a statement that the thing should not exist in this game. Nine are
`deferred` — a version boundary for 36 and 37, a missing model for the rest — and three are
`renamed`, because Squad, Fixtures and Transfers already ship for the own club.

That is worth saying plainly, because Group C is the group where `out-of-scope` would have been
easiest to reach for. Compare Group D's staff screens, which *are* `out-of-scope`: `CONTEXT.md` says
what Staff **are**, and the screens ask for something else. Nothing in Group C has that shape.

### Two halves, and why the halving matters

- **39 Club Finances** — Transfer Budget and Wage Budget are modelled; income, expenditure and
  projections are not. A single `deferred` would have hidden a buildable screen.
- **47 Supporter and Board Confidence** — Board Objective is modelled; supporter confidence is not.
  And 47 is ticket 04's one exception: `board_objective` is keyed on `season_number`, so a rival has
  none at all and the screen stays save-scoped.

A screen that is half-modelled needs its halves named, or the build ticket invents the missing one.

### Three screens never had a placeholder

33, 41 and 48. Their absence is a finding: M1 step 5 has nothing to cull for them, and 33 is not a
screen with a missing model but a *composition* of the other eleven — so it is the last to build,
not the first.

### Filed, not merely mentioned

- **[06](06-club-general-information.md)** — Screen 34 as one club-scoped screen, collapsing
  `clubInfo/` and `clubInformation/`.
- **[07](07-any-club-squad-fixtures-and-transfers.md)** — the any-club views of 35, 40 and 42, with
  an explicit warning against building three read-only twins.
- **[08](08-club-finances-and-the-board-half-of-47.md)** — the modelled halves of 39 and 47.
- **[09](09-cull-the-group-c-placeholders.md)** — M1 step 5 for Group C, blocked on 06–08 because
  each absorbs placeholders 09 would otherwise delete out from under them.

09 was filed **with** the dispositions rather than after, which is the one process lesson Group D
paid for: ticket 04 there said to file the cull, nobody did, and the debt sat in the ledger for five
days.
