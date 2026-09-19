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

- [ ] Twelve rows, one per screen, each with Kind, what the spec asks, disposition and Anchor
- [ ] No row is `out-of-scope` for a reason that is really a missing model
- [ ] Every Anchor resolves to something that exists — checked, not assumed
- [ ] No row in Group C's coverage table reads `Not yet audited`
- [ ] The follow-on build tickets and the placeholder-cull ticket are filed, not merely mentioned
- [ ] `pnpm check:all` green, including the markdown link check

**Blocked by:** [03](03-screen-inventory-and-the-stale-49-row.md) and
[04](04-one-screen-per-subject-or-two.md) — a disposition table written before the survey and the
own-club ruling gets rewritten by both.

Status: ready-for-agent
