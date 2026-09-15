# 02: One function answers who works at this club

Type: grilling
Blocked by: 01
Status: resolved

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

## Answer

**`deriveClubStaff` in `packages/shared/src/rules/staff.ts` composes the whole club from pure
inputs, and the renderer reaches it through the RPC surface like every other club-scoped read.**

- **The composing function.** `deriveClubStaff({ clubId, statureTier, clubNation, worldSeed })` —
  pure, in `rules/staff.ts` beside `generateStaff` and the presence derivation, taking the four
  values it actually reads rather than a DB-shaped club record (shared has no Entity). It returns
  the uniform person shape the note fixed — `{ role, firstName, lastName }` for all four people,
  quality dropped at the composing boundary — grouped by department through a `ROLE_DEPARTMENT`
  map (`executive`, `coaching`, `recruitment`, `medical`). `generateStaff` is unchanged; the
  presence pair derives per-person from `deriveSeed(worldSeed, "presence", "<clubId>:president")`
  and the same for the physio, per ticket 01.
- **What crosses the wire.** A new RPC `getClubStaff(saveId, clubId)` returns `ClubStaffView`
  `{ club: ClubSummary, groups: [{ department, members: [{ role, firstName, lastName }] }] }`. The
  bound two are **always re-derived**, never read from the `staff` table: deriving is the path that
  ships because it is the one path that answers for every club (`results-only` clubs have no rows),
  and agreement with the rows is by construction — the rows were materialised from the same
  derivation, so the same seed, tier, and nation return the same people. The existing
  `ClubNotFoundError` (contracts `clubs.ts`) joins `SaveNotFoundError` on the RPC error union.
- **The human's own club.** The page shows the derived four and never touches the rows, so it
  cannot show a coach twice — exactly one coach is derived for the club — and cannot show a
  *different* coach than the scouting screen names, because the row that screen reads was
  materialised from this same call. Identity on the page is `(role, name)` by determinism; the page
  links nowhere, so it needs no ids.
- **Main-process query, not a pure renderer call.** The renderer never derives directly: it lacks
  all four inputs (the world seed lives in the main process's `generation_manifest`; Stature Tier
  and nation are DB reads), and every other club-scoped read in this app goes through the RPC
  surface. The handler reads tier and nation (the same nation join `materialiseStaff` runs),
  calls `deriveClubStaff`, and returns the view — one cheap RPC per club page view, matching the
  note's cheap-to-read risk.
