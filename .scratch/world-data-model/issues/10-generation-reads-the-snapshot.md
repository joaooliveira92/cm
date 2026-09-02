# 10 - Generation reads the League Selection Snapshot

Type: grilling
Status: open
Blocked by: 02, 03, 07

## Question

`worldGeneration.ts` iterates a hard-coded `LEAGUE_CLUBS` array and ignores the League Selection
Snapshot entirely. `CONTEXT.md` records this as a standing "generation boundary". Everything else in
this map is about the shape of the data; this ticket is about the one function that has to produce it.

- What generation consumes: the Effective Selection from the snapshot, or the snapshot plus a
  re-resolution against the Setup Catalogue at generation time? The catalogue fingerprint exists
  precisely so a mismatch is refused rather than guessed at.
- How seed derivation stays reproducible for a variable world. `deriveSeed(worldSeed, "club", name)`
  keys off a club's *name*, which ticket 03 is replacing with a canonical id — and a world whose club
  set depends on the selection must derive its seeds from something stable across selections.
- Whether the same seed with a *broader* selection reproduces the narrower world plus extra, or a
  wholly different world. The first is a much stronger property and constrains derivation.
- What the generation order becomes: nations, then competitions, then clubs, then squads, then staff —
  and where the reference material's "generate squad demand before players" idea lands, if at all.
- What `generation_manifest` must record so a save's world can be regenerated: it currently holds a
  seed, two versions, and a reference year. Does the snapshot itself need to be persisted?
- How generation is chunked so a large world does not block the UI, and whether that is a schema
  concern at all.

Reconcile the generation-boundary paragraph in `CONTEXT.md` once this lands.
