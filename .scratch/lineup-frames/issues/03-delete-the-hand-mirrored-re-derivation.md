# 03: Delete the hand-mirrored re-derivation

Source: [spec.md](../spec.md).

**What to build:** Remove the machinery that re-derived what the engine now records: the
stand-in/halftime classification, the lineup-facts fold, the command-ordering machinery (emitted-by,
minute-start, applied-at), the window-ledger re-enactment, the cap-refusal re-enactment, and the
benchless and force-off-applied inference. Rewrite the engine's own classification and lineup-facts
specs against frames and the journal. Retire the sweep's oracle and keep a permanent golden guard
over the frame projections — committed expected outputs — so a future drift in recording fails a
gate. No production behaviour changes. Update the keeper-leaving Agent Note, whose account of the
deleted classification is now stale, and promote the new architecture note to implemented.

The slice keeps the projection edge unchanged; only implementation disappears.

**Blocked by:** 02.

**Status:** resolved

- [x] The deleted machinery has no production caller and no export.
- [x] The command-outcome read (whether a submitted substitution took effect) and the bring-off
      applied feedback remain, the latter now a recorded fact.
- [x] The engine's classification and lineup-facts specs are rewritten against frames and the
      journal, not the deleted helpers.
- [x] The equivalence sweep's oracle is retired and replaced by a committed golden guard over the
      frame projections.
- [x] The group-g desktop read specs are unmodified and pass.
- [x] The keeper-leaving Agent Note is updated; the new architecture note is promoted to
      implemented.
- [x] `pnpm check:all` is green; small Conventional Commits on `dev`.
