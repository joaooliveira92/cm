# Agent Note: Names resolve through every licensed league a save contains

Status: implemented

## Problem

Step 3 of a career that plays both Brazilian Série A and the Premier League listed the English
league as `comp_eng_1` and its clubs as raw ids, while Série A showed real names. The manifest
records one pack, and `contentPackForWorld` picks it by tier and then id, so `comp_bra_1` wins.
`savePack` resolved every name through that pack alone. The Série A pack does not name English ids,
and nothing fell back to another pack.

[The 2026-09-05 note](2026-09-05-saves-generated-under-the-worlds-content-pack.md) accepted this gap
until saves had multi-pack provenance.

## Decision

The manifest keeps recording one pack. Resolution stops depending on it alone.
`resolutionPackForWorld(recorded, competitions)` in `packages/shared/src/content/contentPack.ts`
builds the pack `savePack` returns. Layers are checked in this order, first match wins:

1. the licensed pack of every league in the save's `competitions` table, in tier-then-id order;
2. the recorded pack, so a save re-recorded to another pack still resolves against it;
3. the fictional base pack.

The result keeps the recorded pack's `id` and `version`. The league-to-pack map (`LEAGUE_PACKS`) is
shared with `contentPackForWorld`, so adding a pack still takes one entry.

The rule is applied when names are read, with no schema change, so saves created before this change
are fixed as well.

## Alternatives considered

**Recording every pack in the manifest.** This needs a schema change, and it would not fix existing
saves. The set of packs follows from the save's competitions, so storing it adds nothing.

**Leaving out the base-pack layer.** Without it, a cup such as `comp_bra_cup` and any unlicensed
league (`comp_deu_1`) would still show raw ids. The earlier note kept licensed and fictional names
apart, but that rule applied to clubs. The base pack names only the twenty `comp_eng_1` clubs, and
whenever `comp_eng_1` is in a save the Premier League layer ranks above the base pack. Competition
names in the base pack are structural descriptions, not fictional brands.

## Consequences

- Structurally unnamed ids are the only coverage gaps left. `reportPackCoverage` no longer reports
  `comp_bra_cup` or `comp_eng_cup`, because the base pack names both. Clubs outside the licensed
  leagues' key space are still reported.
- Colours, badges, stadiums, and home cities follow the same layers.
- The merged pack's `contentSource` is `LICENSED` if any layer is licensed.

## Proving tests

- `packages/shared/test/content/contentPack.test.ts`: "the pack a save resolves names through".
- `apps/desktop/test/main/world/display-names.test.ts`: a Brazil + England career lists both
  leagues' names and all 40 clubs' names, and reports no gaps.
