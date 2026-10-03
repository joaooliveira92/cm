# Agent Note: Generation reads the League Selection Snapshot

Status: proposed

## Problem

`worldGeneration.ts` iterates a hard-coded twenty-club `LEAGUE_CLUBS` array and ignores the League
Selection Snapshot entirely. `beginCareer` takes no snapshot argument — the RPC handler passes only
the saves directory — so the scope the player chose on the League and Nation Selection screen is
recorded, shown on the Review step, and then discarded at the moment a world is made. `CONTEXT.md`
records this as a standing generation boundary.

Every other decision in the world-data-model map fixes the *shape* of persisted data. This one is
about the single function that has to produce it, and it has to answer four things the shape
decisions leave open: what generation is handed and whether it trusts it, what a club's seed and
canonical id are keyed on once `clubs.name` is deleted, whether the same world seed under a broader
selection reproduces the narrower world plus extra, and how a three-value Stature Tier describes club
strength across a four-tier pyramid in seven nations.

The last of these is a direct handoff. The world-catalogue decision left `LEAGUE_CLUBS` as an
ordinal-to-stature list for one competition and stated in as many words that a multi-nation world
needs stature distributions per competition, which it did not shape.

## Proposal

Generation will be handed a `SnapshotId`, will re-resolve that snapshot's intents against the live
catalogue rather than trusting its recorded output, and will derive every generated value from
canonical ids alone, so that widening a selection extends a world rather than replacing it. Club
strength will become a function of the competition's tier and its nation's prior, with Stature Tier
demoted to a spread *within* a competition.

### Generation re-resolves the intents; it does not trust the recorded selection

`beginCareer` will take a `SnapshotId`. The main process will load the snapshot from
`league-snapshots.json`, compare its `databaseFingerprint` against `LEAGUE_SETUP_INDEX.fingerprint`,
and refuse a mismatch with the existing `PresetFingerprintMismatchError` shape. On a match it will
re-run dependency closure over the snapshot's `intents` and generate from *that* result, not from the
snapshot's stored `selections`.

The snapshot's recorded `selections` are therefore display and audit data, never a generation input.
This follows the rule `leagueSelection.ts` already enforces on every other path: nothing the renderer
sends is trusted, and every RPC re-resolves from intents so that a forged, stale, or replayed payload
produces blocking issues rather than a career whose scope nobody validated. A snapshot file is
user-editable JSON in Electron `userData`, so generating from its stored `selections` would be the
same trust failure one step removed — a world built from a scope that never passed validation.

Under a matching fingerprint, resolution is a pure function of the intents, so re-resolution must
reproduce the stored selection exactly. A divergence is a generator or resolver defect, not a
condition to migrate around.

The refusal happens before any file is created, so a fingerprint mismatch costs the player a message
rather than a half-written save.

### Seeds and ids are keyed on canonical ids, and nothing else

`deriveSeed(worldSeed, "club", clubDef.name)` loses its key when `clubs.name` is deleted. It becomes
`deriveSeed(worldSeed, "club", clubId)`, where `clubId` is the canonical id. The id is the stable
identity the name was standing in for, and it is stable across selections in a way a display name
never was.

Nations, competitions, and cities get **no** `generation_seed` column. They are resolved from code
catalogues rather than generated, so they have no randomness to reproduce and such a column would be
a column nothing reads. `clubs.generation_seed` and `players.generation_seed` stay, because a club's
stadium and a player's attributes are genuinely generated.

A generated club's canonical id is **minted from its competition id and its ordinal within that
competition**: the seventh club of `comp_eng_1` is `club_eng_1_07`. Nothing new enters the catalogue,
because `clubCount` already fixes the ordinal range, and the content pack receives a predictable,
mechanically enumerable key space — the whole catalogue is 382 clubs across nineteen leagues, so a
pack author can generate the key list rather than hand-maintaining a second copy of it.

Promotion moves a club out of the competition its id names, so `club_eng_2_03` can end up in the first
division. That is correct and deliberate: an id is an identity, not a description. Rewriting it on
promotion would break every foreign key, every transfer event, and every scouting row pointing at it.

### A broader selection reproduces the narrower world, plus extra

The same world seed with a superset selection produces a world in which every previously present club
and player is **byte-identical**, and the additions are new rows. This holds both for adding a nation
and for widening one nation's League Scope Option: the top-division-only English world is a strict
subset of the full-pyramid English world.

This is an invariant with a test, not an incidental property, and it costs exactly one rule:

> Generation never draws from a running stream, and no generated value may depend on the set of
> entities being generated. Every entity's randomness comes from `deriveSeed(worldSeed, kind,
> canonicalId)` alone.

The rule binds hardest on club-to-city assignment. Shuffling a nation's cities and dealing them to
that nation's clubs would make every club's home town depend on how many clubs that nation loaded,
breaking the property the moment a scope option widens. Instead each club derives its city
independently from its own id, weighted by population band, with **collisions allowed**. Two clubs
sharing a city is realistic rather than a defect.

The property is worth the constraint on two counts. A bug report becomes reproducible from a seed plus
a scope, and "add a nation to an existing career" becomes a coherent future feature rather than a
regeneration.

### Club strength comes from the competition; Stature Tier is a spread within it

`generateSquad(statureTier)` is currently the entire strength model, and `STATURE_TIERS` has three
values. Across a four-tier pyramid that model asserts a `big` club in the English fourth division has
the same squad as a `big` club in the first, which is plainly wrong.

Stature Tier stays a three-value spread **relative to its own competition**, and squad quality becomes
a function of the competition's tier, the nation's strength prior from `nations.ts`, and the club's
Stature Tier. The vertical information lives on the competition row, which already carries `tier` and
`nation_id`.

Nothing changes on disk. `clubs.stature_tier` keeps its column, its three values, and its meaning as a
club's permanent standing among its peers, so the staff-headcount binding and every existing consumer
keep working untouched.

The nation prior is consumed under the rule `nations.ts` already states: a prior shifts a
distribution, never sets a value, and individual variance must exceed the national modifier.

### Results Strength needs the competition too

The simulation-depth decision derives Results Strength from seed, Stature Tier, and season. Under a
per-competition stature spread that formula is under-determined: every `results-only` division in a
pyramid would come out equally strong, because the only vertical term is missing.

Results Strength therefore takes the competition's tier and nation prior as further inputs. This
refines that formula and does not overturn its decision — Results Strength remains one derived 1-100
number, computed on read, never a stored column.

### The save records a snapshot pointer and nothing more

The competitions table already persists the Effective Selection with one row per activated
competition, and `generation_manifest` already gains the catalogue fingerprint. The intents — each
nation's Simulation Mode and chosen League Scope Option — will **not** be persisted into the save.

Nothing after generation asks which scope option produced a competition set, and the set itself is
already on disk. A stored copy of the intents would be a second, non-authoritative answer to a
question the competitions table answers, and the two diverge the first time promotion moves a club
across a division boundary.

`generation_manifest` gains `snapshot_id`: a diagnostic pointer, explicitly not a foreign key, because
the snapshot file is machine-local and will not exist beside a save copied to another machine. Without
it a save carries no trace at all of the selection that shaped it.

### Generation order, and what is not `beginCareer`'s

Because no output depends on ordering, order is constrained only by foreign keys. The spec fixes it
anyway, so the implementation does not rediscover it: nations, then cities, then competitions, then
clubs (id, stature, city, stadium), then squads — all inside the single transaction `beginCareer`
already uses.

Squad demand already precedes players: `generateSquad` takes a stature tier, produces slots, and fills
each through `randomForSlot`. The reference material's "generate squad demand before players" idea
needs no new decision.

Staff generation belongs to `commitCareer`, not `beginCareer`. Staff rows exist only for the human's
club, and which club that is remains unknown until the career is committed.

### Chunking is not a schema concern

A 400k-player world costs roughly 22 seconds of generation. That buys no shape on disk. Generation
stays all-or-nothing: `beginCareer` already produces a provisional save with no `save_meta` row, so a
crashed generation is invisible to `listSaves` and the recovery is to delete the file and begin again.
Progress reporting to the interface is a stream over the existing RPC and touches no table.

A resume marker would pay off only if that 22 seconds were re-entered often, and it would introduce a
partially-valid world state that every later query would have to defend against.

## Relationship to existing notes

This note **partially supersedes** the deterministic-generation decision, which states that each club
derives its seed from the world seed and its canonical *name*, and which assumes a fixed twenty-club
league. The derivation key changes to the canonical id and the club set becomes selection-dependent.
Everything else in that note stands unchanged: seeds are still derived rather than shared, generation
is still a pure function of a world seed, and Drizzle still owns the save schema. Both notes stay
active.

It closes the generation boundary recorded in the League and Nation Selection note, which gated
generation on a snapshot existing without letting generation read one.

## Alternatives considered

- **Generate from the snapshot's recorded `selections`.** Rejected: the snapshot is user-editable JSON
  in `userData`, so this trusts a scope that never passed validation — the same failure the rest of
  `leagueSelection.ts` is built to prevent, displaced by one hop. Re-resolution is pure and cheap under
  a matching fingerprint.
- **Pass the resolved selection from the renderer to `beginCareer`.** Rejected outright by the
  module's stated trust boundary: nothing the renderer sends is trusted, and every other RPC already
  re-resolves from intents.
- **Enumerate every club id in the catalogue beside `clubCount`.** Rejected: it is the same list
  written twice, and the two copies drift the first time a club count changes. Minting from
  competition id and ordinal derives one from the other.
- **Hash the club's seed into an opaque canonical id.** Rejected: an opaque id is unnameable by a
  content-pack author and unreadable in a bug report, defeating both the pack layer and the
  reproducibility the seed exists for.
- **Accept only the weak determinism property** — any scope change may reshuffle the world. Rejected:
  it costs nothing to avoid, since keying on canonical ids is required anyway, and giving it up would
  make "reproduce this bug at a wider scope" impossible and foreclose ever adding a nation to a
  running career.
- **Deal cities to clubs from a shuffled per-nation pool.** Rejected: it makes a club's home town
  depend on the nation's loaded club set, which is the one construction that breaks the superset
  property. Independent derivation with collisions allowed is both simpler and more realistic.
- **Widen `STATURE_TIERS` into an absolute world-wide scale.** Rejected: it forces a schema change on
  a column three already-resolved decisions depend on, and choosing how many values span every tier of
  every nation is a tuning argument with no natural stopping point.
- **Replace Stature Tier with a numeric club reputation.** Rejected as a larger model than MVP needs,
  obsoleting the staff, depth, and club-selection decisions that read the enum.
- **Persist the snapshot's intents into the save.** Rejected: a second, non-authoritative copy of a
  scope the competitions table already answers, guaranteed to drift at the first promotion.
- **A resumable-generation marker on disk.** Rejected: it adds a partially-valid world state to every
  query's burden to buy a recovery from a 22-second operation that a delete-and-retry already covers.

## Acceptance criteria

- `beginCareer` takes a `SnapshotId`; no code path generates a world without one.
- A snapshot whose `databaseFingerprint` differs from the live catalogue fingerprint is refused before
  any save file is created, with the fingerprint-mismatch error shape.
- Generation consumes the re-resolved closure over the snapshot's `intents`; the snapshot's stored
  `selections` are read by no generation code path.
- No call to `deriveSeed` anywhere in generation takes a display name; every key is a canonical id or a
  slot ordinal.
- Generating with a fixed world seed under selection A, and again under a superset selection B,
  produces identical rows for every club and player present in A — asserted by a test that covers both
  an added nation and a widened League Scope Option.
- No generated value is computed from a count, a collection length, or an iteration position over the
  set of entities being generated.
- Two clubs in the same nation may share a `city_id`, and no constraint forbids it.
- `nations`, `competitions`, and `cities` have no `generation_seed` column.
- `generation_manifest` carries `snapshot_id`; no table stores the snapshot's intents.
- Club canonical ids match the competition-plus-ordinal form, and the base content pack names every id
  the catalogue's `clubCount` values imply.
- Staff rows are written by `commitCareer`, not `generateWorld`.
- The generation-boundary paragraph in `CONTEXT.md` is gone, replaced by the boundary this note draws.

## Risks

- **The content pack must name 382 clubs before a multi-nation world is playable.** The key space is
  mechanically enumerable, but the names are human work, and a missing key surfaces as a raw
  `club_eng_2_11` in the interface. The manifest's content-pack record makes incomplete coverage a
  reported condition rather than a silent one, but it does not write the names.
- **The superset invariant is easy to break and its test is slow.** Any future generator change that
  reaches for an index, a count, or an array position violates it silently, and the test that catches
  it generates two worlds. If it becomes too slow to run per commit, the invariant will erode.
- **Club strength gains a formula with no calibration.** Tier and nation prior enter squad generation
  as tuning terms chosen by judgement, and a four-tier pyramid whose divisions feel wrongly spaced will
  not be visible until worlds are played. The decision knowingly ships an uncalibrated curve.
- **`snapshot_id` points at a file that is often absent.** It is diagnostic only, so the cost is a dead
  pointer rather than a broken read, but anyone reading the manifest must know not to rely on it.
- **Re-resolution is asserted to be pure, and nothing enforces it.** If a resolver ever acquires a
  clock, a machine-capability read, or any other ambient input, generation would diverge from the
  recorded selection under a matching fingerprint, and the mismatch would surface as a world that does
  not match its own Review step.
