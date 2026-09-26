# add-manager-screen-7 ticket 03 — Screen 7 reconciliation update

**Outcome:** resolved. add-manager-screen-7 is complete — all three tickets.

## Why it mattered more than a docs chore

The ledger's Screen 7 section read "Nothing of Screen 7 survives." That was true when ticket 16 wrote
it on 2026-08-31 and stopped being true when tickets 01 and 02 shipped. A published ledger asserting
a state the code has left is the exact failure this ticket was written to prevent, and it had already
been claimed and abandoned once — the lock was released on 2026-09-18 with no trace of the work.

## What the section says now

Status moves **Reviewed → Audited**, and the ledger's Coverage table moves with it. Every one of the
import's 41 sections plus `Suggested Git commit` carries a row, so nothing rests on the silence rule
— which is what `Audited` claims and what makes the claim checkable.

Two of the screen's behaviours survive, and neither is the screen:

- **§21 Back behavior** (`renamed`) — this project does not retain managerless careers, so §21's
  second branch applies, and ticket 01 shipped that confirmation. The row also records what did
  *not* survive: §21's three Back destinations have no referent.
- **§22 Career Setup Summary** (`renamed`) — ticket 02 shipped it as the Review stage. Three of §22's
  nine lines are dropped for lacking a referent; a fourth is answered differently.

The rest divides as the ticket charted. The network, ownership, permission and invitation sections go
`out-of-scope` against the blanket trim. The roster sections go `contradicted`, each row naming its
carrier: the new-game flow note where the conflict is about *where the screen sits*, `CONTEXT.md` §
Manager Profile where it is about *there being one manager*.

§30 is split rather than disposed of whole. §30.1/§30.3/§30.5 are about a list that does not exist;
§30.2 and §30.4 are satisfied by ticket 01's confirmation dialog. The difference between "there is no
list" and "accessibility does not apply here" is worth a row.

## Two conventions bent, both recorded in the ledger

- **`renamed`'s Anchor** is defined as a `CONTEXT.md` term. §21 and §22 hold effort tickets, because
  the concept was relocated rather than renamed and the ticket is what carries it. Minting a glossary
  term for "the confirmation you get when you leave creation" to satisfy the column would add a term
  nothing else uses.
- **The import edit.** §6.4 had `Invite Network Manager` and `Multiplayer Settings` removed, against
  a preamble saying import files are never edited. Recorded, not reverted — and recorded as
  *partial*: §5's layout still draws `[Invite Network Manager]` and §40's brief still lists both, so
  the file disagrees with itself. That is the clearest argument for the convention it broke.

## Validation

- `pnpm check:all` green, including `verify-md-links` (1243 files).
- Every anchor checked to exist: the new-game flow note (still `proposed`, and the rows say so),
  `CONTEXT.md` § Manager Profile, and tickets 01 and 02.
- The `unemployed` claim in the §19/§20 row was verified against the tree, not assumed: the word
  appears nowhere in `apps/desktop/src`, `packages/*/src`, or `CONTEXT.md`.
