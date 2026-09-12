# Agent Note: A save is generated under the content pack its playable league is licensed for

Status: implemented

## Problem

Step 3 of the creation flow ("Club") lists a Brazilian career's clubs as raw canonical ids —
`club_bra_1_09` instead of Flamengo. The licensed Série A pack that would name them had been
shipped months earlier, yet no save ever recorded it: `generateWorld` hardcodes the fictional
`BASE_CONTENT_PACK` into `generation_manifest.content_pack_id/version`, and `savePack` — the single
read seam that resolves a save's display names — keys off that manifest value.

Nothing else was needed to make Brazil names work. `PACKS` already registered the licensed pack,
and `getClubSelection` already resolved names through `savePack`; the manifest column said the save
was generated under the base pack, so that is what Step 3 showed.

## Decision

**The pack a save is generated under is a pure function of the world it contains.** `generateWorld`
no longer hardcodes the base pack; it calls `contentPackForWorld(world.competitions)` and records
that pack's id/version in the manifest. The rule lives in `packages/shared/src/content/contentPack.ts`
beside the pack definitions it may return — content-pack policy with content-pack data — and reads a
structural `WorldCompetitionShape` (id, kind, tier, depth) so it is decided by what a world *is*
rather than by a specific world type.

The map is keyed to **the league the career is played in**: the full-depth league the world contains
that `getClubSelection` would list, tie-broken by tier then id exactly as that query reads it. If that
league is Brazilian Série A (`comp_bra_1`), the save is generated under `BRAZIL_SERIES_A_PACK`; every
other league keeps the fictional base pack. Fictional and licensed names never mix: one manifest one
pack, and the pack is chosen by the one league a player actually manages.

**The pack is provenance, not a promise of coverage.** The single-pack manifest cannot both name a
real league and stay honest about the ids the pack does not name. A Brazil career also loads
`comp_bra_cup` (the structural dependency of `comp_bra_1`), which the Série A pack does not name; and
a wider scope — Série B, or a world with two playable nations — loads leagues no pack names. Those
ids resolve through the normal fallback (shown raw) and are reported by coverage reporting
(`reportPackCoverage` / `packCoverageGaps`) on save, exactly as a partially-covered pack is. The
alternative would be hiding the gap, which is what turns a missing name into a silent degradation.
This is a deliberate, tested, reported composition of "play the league in real names" with "know the
hub".

## Alternatives considered

**Hand-authoring club names into the base pack.** Rejected out of hand: it is the licensed content
work the packs exist to keep out of the codebase — "naming 382 clubs" is explicitly deferred as
content in `world-data-model`'s map — and it would stop being reversible the day a licence changes.

**Recording every pack whose league the world loads (Série A + Série B together).** The manifest has
a single content-pack identity and `savePack` resolves a single pack; a multi-pack save is a schema
change with no consumer yet. The two-division scope keeps the pack of the league the career is played
in and reports the rest.

**Keying off nation instead of league.** A nation would drag Série B and the state championships into
a pack licensed for one league; keying to the playable-league's id keeps the map honest about exactly
what each pack names.

**A general id→pack algorithm instead of an explicit map.** The pack set grew so far by one hand-
authored entry per league; an id-prefix algorithm would silently mint licensed expectations for ids
no pack names. The map is one entry per authored pack and fails to compile before a pack is wired in.

## Consequences

- A Brazilian Série A career now opens Step 3 with thirteen real clubs around Flamengo's ten-word
  description; the manifest provenance test in `saves.test.ts` stays valid for the default England
  save, which still records the base pack.
- `reportPackCoverage` on a Série A save reports `comp_bra_cup` until someone authors it. That
  warning is the designed, visible edge of the "provenance, not coverage" rule — a future ticket may
  record a second pack, but a one-line entry in `contentPackForWorld` is all a new league's names
  require.
- A multi-playable-nation world (England + Brazil) is generated under Série A because it is the
  primary playable league by the tie-break; England's clubs resolve raw and are reported. Acceptable
  today because the single-pack manifest cannot do better; revisit with multi-pack provenance.
- The pack becomes selection-dependent, so `generation_manifest` is no longer byte-identical across
  all saves from one ruleset — the manifest row's other columns remain so; only the pack varies with
  the chosen league. `worldGeneration`'s docstring now says so.

## Proving tests

- `packages/shared/test/content/contentPack.test.ts` — the map: Série A full → licensed pack;
  base pack for anything else; depth and tie-break behaviour.
- `apps/desktop/test/main/world/display-names.test.ts` — a real `scope_bra_top` career records
  `BRAZIL_SERIES_A_PACK` in its manifest, resolves "Flamengo" through `getClubSelection`, and
  `reportPackCoverage` reports `comp_bra_cup`.