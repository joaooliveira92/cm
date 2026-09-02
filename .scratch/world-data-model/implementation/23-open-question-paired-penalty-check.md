# 23: [Open question] Is the paired-penalty invariant a `CHECK`?

**Type:** open question — a decision, not execution. Do not implement an answer from this file; the
answer does not exist yet. Ticket 09 is blocked on it, because that ticket adds the two columns.

**The question, unanswered:** a fixture's two penalty columns are NULL together or set together —
NULL in both means the tie did not go to a shootout, which is every league fixture and most cup ties.
The cup decision states that meaning but names no constraint. Every other pairing invariant in the
schema is explicitly assigned either to a `CHECK` or to a writer, with the two writer-upheld ones
named as such: a club never playing twice on one date, and a scouting-progress row never being
written at zero. This one is assigned to neither.

The map did not reach this. It is recorded here rather than answered because `CHECK` constraints in
this schema are load-bearing — queries go through raw SQL, so a `CHECK` is the last enforcement of a
domain invariant before a row lands on disk — and silently choosing to omit one is a decision
disguised as an oversight.

This is a design call rather than a measurement: it needs no probe run, only a reading of the two
writer-upheld exceptions and a judgement about whether this invariant belongs with them.

**What would settle it:** decide, and record the decision beside the other two exceptions.

- If it is a `CHECK`, write the constraint that admits both-NULL and both-set and rejects one-set,
  and confirm no legitimate write path is refused by it — in particular a shootout being recorded in
  two statements rather than one.
- If it is upheld by the writer, say so in the same list as the other two writer-upheld invariants,
  and require a test that asserts no fixture ever lands with exactly one penalty column set.

**Blocked by:** None (can start immediately).

**Status:** ready-for-human

**Files:** `apps/desktop/src/main/db/schema.ts` (the fixture table definition ticket 09 writes),
`apps/desktop/test/db-schema.test.ts` or `apps/desktop/test/season.test.ts` for whichever form the
answer takes.

- [ ] The invariant is assigned to either a constraint or a writer, and the assignment is written
      down next to the schema's other two writer-upheld invariants.
- [ ] Ticket 09 is unblocked: it knows whether the fixture table carries the constraint.
