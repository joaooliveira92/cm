# 02 — Deviation register: format and home

Type: grilling
Status: resolved

## Question

The destination is a spec *and a register of where the imported spec is knowingly not followed*. What
shape does that register take?

Open sub-questions:

- **Where it lives**: inside `spec.md` per screen, one register file for Group A, or a section appended
  to each imported spec file in `docs/specs/`.
- **What one entry records**: at minimum the spec section, the deviation, and the reason. Candidates for
  more: whether it is permanent or deferred, what would reopen it, which Agent Note or CONTEXT.md term
  carries the rationale.
- **How a reader distinguishes the three kinds of "not followed"**: ruled out of scope permanently
  (multiplayer), contradicted by an existing decision the codebase already made (durable-at-commit
  persistence vs `UnsavedCareerState`), and simply not built yet.
- **Granularity**: one entry per spec section, or one per screen summarizing the trim.

That third distinction is the one that carries weight — "we will never do this" and "we have not done
this yet" read identically in a flat list, and conflating them is how the register decays into noise.

This ticket shapes every audit ticket downstream, so it goes early.

## Done when

A worked example exists: the register entries for one screen, written out in the chosen format.

## Answer

**Reconciliation ledger, one per spec group, four kinds each with a mandatory anchor.** See [Agent Note](../../../.agents/notes/proposed/process/2026-08-30-spec-reconciliation-ledger.md).
