# 03: Screen 7 reconciliation update

**What to build:** The reconciliation ledger stops asserting that nothing of Screen 7 survives, and
starts recording what was built, what is ruled out, and why.

The ledger's Screen 7 section is four sentences and no rows. It reads "Nothing of Screen 7
survives," which was true when it was written and is not true once tickets 01 and 02 ship: §21's
non-silent discard and §22's Career Setup Summary both acquire implementations. A ledger that
describes a screen in a state the code has left is worse than no ledger, so this reconciliation
lands with the code rather than in a later pass.

The section gains a status block recording the re-audit and a row table in the ledger's own shape.
The rows fall into three groups. The multiplayer, network, ownership, permission, and invitation
sections stay `out-of-scope` against the blanket scope trim. The manager-roster sections — slots,
capacity policy, manager drafts and their resume and removal, the managerless career, the
start-unemployed path, and the slot-list semantics and keyboard model that depend on a list — are
`contradicted` against the new-game flow sequence and the one-manager-per-career shape of this game,
each row naming which of the two carries it. The two sections tickets 01 and 02 implement get rows
describing what now holds, or no row at all if the section is followed as written.

The section also records that the import file carries an edit — the removal of `Invite Network
Manager` and `Multiplayer Settings` from §6.4 — against a preamble that says import files are never
edited. The ledger states the edit and its date rather than the edit being reverted or left silent,
so the divergence from its own convention is visible to the next reader.

**Blocked by:** 01 (Leaving career creation confirms before discarding the generated world) and 02
(The Review step becomes the Career Setup Summary) — the rows describe what those tickets build, so
writing them first would describe an unbuilt screen as shipped.

**Status:** ready-for-agent

- [ ] Screen 7's ledger section carries a status block naming this effort and the re-audit date, and
      no longer claims that nothing of the screen survives.
- [ ] Every section of the import is accounted for: a row, or coverage by the status line's silence
      rule at the status the section claims.
- [ ] Each row's Anchor points at a decision that exists — an Agent Note, a `CONTEXT.md` term, an
      owning spec group, or `unscheduled` — and no row asserts a disposition without one.
- [ ] The rows for the sections tickets 01 and 02 implement describe the shipped behaviour.
- [ ] The edit to the import file is recorded in the section, with its date and what it removed.
- [ ] `pnpm check:all` is green, including the markdown link check.
