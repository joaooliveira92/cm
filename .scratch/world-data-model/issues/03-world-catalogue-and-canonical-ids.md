# 03 - The world catalogue: nations, cities, stadiums, and canonical-id enforcement

Type: grilling
Status: resolved

## Question

Nations exist today only as code constants in `packages/shared/src/nations.ts`; no save contains a
nation row. `clubs.name` stores a display name directly, which contradicts the rule stated in
`packages/shared/src/contentPack.ts` that a canonical id is never a display name. Cities do not exist
at all. Charting settled that cities are real and persisted, stadiums are generated, and every one of
these entities carries a canonical id.

Decide the catalogue layer:

- Which of Nation, City, Stadium become per-save rows, and which stay code. Nations must become rows
  if cities have a nation parent — but does a save persist *all* nations, or only the ones its League
  Selection Snapshot activated?
- Where the Nation Profile lives. It is gameplay priors read at generation time; if generation is
  reproducible from a seed, does the profile need to be in the save at all, or is the manifest's
  `ruleset_version` enough to pin it?
- What a City row holds and where the real data comes from: which cities, at what population
  threshold, sourced how. Note the licensing boundary `CONTEXT.md` draws — "Nations are the only
  real-world data the simulation depends on" — which this ticket moves, and which needs the note to
  be reconciled.
- What a Stadium row holds, and whether it belongs to a club or to a city (ground-sharing exists; MVP
  may not care).
- How the canonical-id correction lands: `clubs.name` becomes a canonical id, display names resolve
  through the content pack at read time. What does that break — every test fixture asserting a club
  name, every UI read path — and is the content pack a table in the save or a code-level asset?

Reconcile the real-geography note and `CONTEXT.md`'s Nation entry in the same change.

## Handoff from ticket 02

[02](02-competition-graph-and-promotion.md) gives `competitions` a nation reference pointing at this
ticket's nations table, and keeps the setup catalogue (`LEAGUE_SETUP_INDEX`) in code rather than
persisting it — a competition row reuses the catalogue's own canonical id so the two join, and
`generation_manifest` records the catalogue fingerprint the save was generated against.

## Answer

**Nations are unconditional referent rows and thin, cities are curated real geography resolved per
activated nation, no stadium table, and the canonical-id rule lands everywhere at once — `clubs.name`
deleted, competition names moved to the pack, one underscore id convention.** See
[Agent Note](../../../.agents/notes/proposed/architecture/2026-09-01-world-catalogue-and-canonical-ids.md).
