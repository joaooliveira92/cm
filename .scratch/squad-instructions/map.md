# Map: squad-instructions — the Squad screen instruction's remainder

Label: `wayfinder:map`

## Destination

The parts of [`.scratch/squad-instructions.md`](../squad-instructions.md) that the shipped Squad
screen does not meet, that rest on an existing model, and that no later decision supersedes. They
are built on the existing `renderer/squad/` screen, never as a second one.

## Decisions so far

- [01 — Reconcile the instruction](issues/01-reconcile-the-loose-squad-instruction.md): charter a
  remainder. The visual target and shell are superseded. Views, position list, lineup slots and
  filters are satisfied. Squad status, offer options, the Team filter and the listed/wanted/loan
  badges are deferred on absent models. Build three things: a Contract view (02), the match-day
  column in the table (03), and a Sort control for the position list (04).

## Not yet specified

- Whether an empty lineup slot filters the roster to compatible players. See 01's open question.

## Out of scope

- Anything resting on a model the engine does not produce: squad status, offer options,
  reserves/youth teams, transfer-list and loan state.
- The 2003-era visual treatment and a Squad-owned shell.
