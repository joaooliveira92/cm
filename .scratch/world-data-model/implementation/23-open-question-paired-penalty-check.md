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

**Status:** resolved

**Files:** `apps/desktop/src/main/db/schema.ts` (the fixture table definition ticket 09 writes),
`apps/desktop/test/db-schema.test.ts` or `apps/desktop/test/season.test.ts` for whichever form the
answer takes.

- [x] The invariant is assigned to either a constraint or a writer, and the assignment is written
      down next to the schema's other two writer-upheld invariants.
- [x] Ticket 09 is unblocked: it knows whether the fixture table carries the constraint.

## Answer

**It is a `CHECK`.** `fixtures` carries
`CONSTRAINT "fixtures_penalties_paired" CHECK((home_penalties IS NULL) = (away_penalties IS NULL))`,
which admits both-NULL and both-set and rejects exactly one set.

What settled it was reading the two writer-upheld exceptions for what they have in common. Neither is
a statement a `CHECK` is capable of making:

- **A club never plays twice on one date** is cross-row. A `CHECK` sees one row, and the unique
  indexes that could see across rows were rejected as half-covering, since neither club column
  catches a club playing home in a league fixture and away in a cup tie on the same day.
- **A scouting-progress row is never written at zero** is a rule about which rows *exist*. Absence
  means Unscouted, so the invariant is about a write that must not happen rather than about the
  contents of a row that did; `CHECK progress BETWEEN 0 AND 100` admits the very row the rule
  forbids.

So the writers hold those two because nothing else can, not because a constraint was weighed and
passed over. The paired-penalty invariant is the opposite shape: one row, two columns, a relation
between them — the only kind of statement a `CHECK` *can* make, in a schema where raw SQL means the
constraint is the last enforcement before the row lands.

No legitimate write path is refused. The shootout writer sets both columns in the same `UPDATE` — a
shootout is resolved as one value outside the minute loop, so there is no intermediate state where
one score exists without the other — and every league fixture leaves both NULL, which the constraint
admits. Recording a shootout in two statements would be refused, and that is the intended reading
rather than a cost: it would mean a fixture briefly on disk claiming a shootout with one score.

The assignment is recorded in the module docstring of `apps/desktop/src/main/db/schema.ts`, where the
two writer-upheld invariants are now named together and this one is named as the constraint it is, so
a reader meets all three in one place rather than inferring the third from its absence.
