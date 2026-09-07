# 02: One function answers who works at this club

Type: grilling
Blocked by: 01
Status: claimed

## Question

Charting settled that the `staff` rows are a materialisation of a derivation, not a separate answer:
one function tells you who works at a club, for **any** club, and the stored rows exist only because
a scouting assignment needs a stable id to point at. This ticket turns that into a seam.

Settle:

- **The composition.** `generateStaff` stays byte-identical — its stream is load-bearing for every
  existing save — and a new presence derivation runs on its own seed. Something above them returns
  the whole club's people. Decide where that composing function lives, what it is called, and
  whether it takes a club record or the three fields it actually reads (Stature Tier, nation, club
  id).
- **What crosses the wire.** The renderer needs a view of four people grouped by department. Decide
  the contract schema, and specifically whether the bound two are read from the `staff` table when
  rows exist or always re-derived — they must agree by construction, so this is a question about
  which path is the one that ships, not about which is correct.
- **What happens for the human's own club**, where rows do exist. The page must not show a coach
  twice, and it must not show a *different* coach than the one the scouting screen names.
- **Whether the read is a main-process query or a pure renderer call.** The derivation is pure and
  lives in `packages/shared`, so the renderer could call it directly — but every other club-scoped
  read in this app goes through the RPC surface, and the club's Stature Tier and nation come from
  the database either way.

This is the ticket that decides whether "stored is a cache of derived" is a real property or just a
sentence in the map.

Settled by ticket 01 and not reopened here: the presence derivation lives in
`packages/shared/src/rules/staff.ts` beside `generateStaff`, each presence person derives from their
own seed, and both tiers return `{ role, firstName, lastName }` — so this ticket inherits one shape
of person and owes only the grouping, the wire format, and the read path.
