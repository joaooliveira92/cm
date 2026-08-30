# 13-adoption-sequencing

Type: grilling
Status: open
Blocked by: 08, 09, 10, 11, 12

## Question

In what order does this get built, and what does the codebase look like at each intermediate stop?

The spec is the handoff artifact, so it must sequence the work into stages that each leave the app
working. Three large changes are in flight at once — a data layer, a router, and a keyboard layer —
and they touch the same nine screens.

Decide:

- **The stage sequence**, and the rationale. The obvious ordering is data layer first (it deletes
  the most code and is the least coupled), then router (which dissolves `App.tsx`), then the
  keyboard layer on top of both. Argue it or overturn it against what the earlier tickets concluded
  — in particular, if the Action model wants to own navigation, the router may need to land first.
- **Big-bang versus screen-by-screen**: whether all nine screens migrate together per stage or one
  at a time, and if incrementally, what the mixed intermediate state is allowed to look like.
- **Where `App.tsx`'s state machine dies**, and whether any of its four state variables survive.
- **What "done" means per stage**, as observable criteria the implement tickets can be checked
  against.
- **Gate compatibility**: `pnpm check:all` must pass at every stage. Note anything in typecheck,
  `oxlint`, `scripts/effect-lint.ts`, or the unit suites that a partial migration would trip.
- **Anything the map deferred** that the sequence must leave room for: TanStack Form, Virtual and
  Pacer are deferred rather than rejected, and the fog lists renderer-side lint rules and user
  rebinding as open.
