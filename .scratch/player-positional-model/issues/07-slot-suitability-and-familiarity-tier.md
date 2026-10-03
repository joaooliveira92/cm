# 07: Slot suitability and the fate of the Familiarity Tier

Type: grilling
Blocked by: 01, 03
Status: resolved

## Question

Define the pure rule that turns a player's stored positional ratings into their suitability for
one tactical slot, and decide what becomes of **Familiarity Tier**.

- **The rule.** Adopt what ticket 01 found CM 03/04 did. If the research leaves it open, choose a
  rule and label it this game's own, not CM's.
- **Familiarity Tier.** Options:
  - keep `natural | competent | unfamiliar` as a derived projection of suitability, with stated
    thresholds, so Overall Rating and the Tactics overview keep working unchanged;
  - replace it with numeric suitability everywhere;
  - keep it only at the IPC boundary while consumers migrate.

  The first is the likely answer: it keeps Overall Rating's "strongest Natural Position" definition
  intact. Football Manager's six labels are out of scope for this effort.
- **Overall Rating.** Confirm or restate its definition over the new model.

Glossary impact: **Familiarity Tier**, **Overall Rating**, and whatever names suitability.

## Answer

**suitability = min(line for the row, side for the column), with LC/RC reading C, wide D and DM
reading max(line, WB), M reading max(M, AM − 5); Familiarity Tier derived (natural 18-20, competent
15-17, unfamiliar ≤14); Overall Rating unchanged; a match cost for poor suitability moves to
formations-and-instructions ticket 08.** See [Agent Note](../../../.agents/notes/proposed/architecture/2026-09-29-slot-suitability-min-of-line-and-side.md).
