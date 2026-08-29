# Update the tactical boundary ADR to name the flat phase-slot resolution

Type: task
Status: resolved

Blocked by: 19

## What to build

The tactical boundary ADR (the three-phase strength / flat tactical interface decision) currently
claims the match engine has "zero knowledge of formations or role names," which the code never fully
honored — the engine's runtime carried the whole Tactic and read raw formation slots to pick event
participants. A preceding refactor closed that by resolving each tactic once at match setup into a
flat, engine-owned phase-to-slots shape. This ticket rewrites the ADR's boundary description to name
exactly what the engine consumes: the five TacticalModifiers numbers plus that resolved shape. It
also states plainly that the engine never reads or mutates formation/role vocabulary, and notes that
the phase-slot resolution is what lets the engine pick a scorer, a booked player, or an injured
player (event participation) without ever seeing a role name.

## Acceptance criteria

- [ ] The ADR's boundary section states precisely which two shapes the engine consumes (the five
      TacticalModifiers numbers and the resolved phase-slot map) instead of the current generic
      "zero knowledge" phrasing.
- [ ] The ADR text matches what the refactor actually shipped — no new aspirational claims about the
      engine that the code does not yet satisfy.
- [ ] No cross-reference elsewhere in the ADR, or to it from the role-rating decision, is left
      contradicting the new boundary wording.

## Answer

Landed. ADR-0002's tactics-boundary paragraph now names exactly the two shapes the engine consumes —
the five `TacticalModifiers` numbers plus the resolved phase-slot map — and explains that Position/
Role vocabulary survives only inside per-slot `fit` closures at resolution, which is what lets the
engine pick event participants without reading a formation or role name. Written against the refactor
in ticket 19, not ahead of it.