# 05 - The staff entity and its two bindings

Type: grilling
Status: claimed

## Question

The project has no staff system, and `CONTEXT.md` records staff generation as a "future slot, not a
modeled option". Charting settled that staff ship in MVP with exactly two mechanical bindings — the
Scout resource, and Player Development — and that everything else about a staff member is presence.

Decide the staff model:

- What a Staff row holds. Do staff have attributes on the 1-20 scale like players, a smaller set of
  ratings, or a single competence number per role? The repo's Manager Pillar discipline says a stored
  value that nothing reads is not a real thing, so the attribute set should be derived from the two
  bindings, not from the reference material's list.
- What roles exist in MVP. Coach and Scout are implied by the bindings; is there a Director of
  Football, an Assistant Manager, a Physio? Each needs a binding or it does not ship.
- How a coach reaches Player Development. Technical Coaching (a Manager Pillar) already scales the
  focused Category's development. Does a coach scale the same term, a different one, or the passive
  baseline? Two multipliers on one number is a design smell worth resolving explicitly.
- Whether staff have contracts, wages, and a transfer/hiring market, or are fixed at generation. A
  wage that counts against Wage Budget is a real interaction with an existing invariant.
- Whether AI clubs have staff, and what it costs at world scale.
- Whether staff are generated per club at world generation, and what happens to a club in a
  `results-only` competition.

Adds vocabulary to `CONTEXT.md`: Staff, and whatever roles survive.
