# Agent Note: The world catalogue — nations, cities, stadiums, and canonical ids

Status: proposed

> **Partially supersedes** [real geography, replaceable identities](../../implemented/architecture/2026-09-01-real-geography-with-replaceable-identities.md).
> Three of that note's consequences move here: competition display names leave `leagueSetup.ts` for the
> content pack (it recorded them as structural descriptions safe to keep in code), nation and
> competition ids migrate from `nation-eng` to `nation_eng` (it recorded the hyphen form as settled,
> flagging it as "the place to look first if `code` ever becomes load-bearing" — it now is), and the
> real-geography boundary widens from nations to nations *and cities*. The rest of that note — the
> geography/identity split itself, priors as priors, asymmetric migration links, the rejection of the
> spec's 1-200 ability model — is untouched and remains the authority on all of it.

## Problem

Nations exist only as code constants in `packages/shared/src/nations.ts`; no save contains a nation
row. `clubs.name` stores a display name directly, contradicting the rule `packages/shared/src/contentPack.ts`
states in as many words: **a canonical id is never a display name**. Cities do not exist at all, so a
club has no hometown and a player has no birthplace. Charting settled that cities are real and
persisted, that stadiums are generated, and that nations, cities, competitions, and clubs all carry
canonical ids.

Two contradictions run wider than the ticket's framing. The catalogue commits the same violation the
schema does — `leagueSetup.ts` carries `name: "English First Division"` inline — so correcting only
`clubs.name` would fix one instance of the rule while leaving its twin standing, which is how a rule
stops being believed. And two id conventions are live at once: the catalogue mints `nation-eng` and
`comp-eng-1`, while `contentPack.ts` mints `club_eng_01` and `comp_eng_slug`. Ticket 02 requires a
competition row to reuse the catalogue's own id so the two join, so one convention has to lose.

## Proposal

### Nations are rows, and every nation the ruleset ships gets one

`nations` carries one row per member of `NATION_CODES`, unconditionally — not only the nations the
League Selection Snapshot activated. Ticket 02's activated-only rule was an argument about volume:
competition rows scale with the chosen scope, and a catalogue of hundreds copied into every save earns
nothing. Nations do not scale that way; the table is exactly as large as `NATION_CODES`, currently
eight rows.

The deeper reason is that a nation is a **referent**, not only a participant. `MIGRATION_LINKS`
deliberately produces Brazilians in English squads when Brazil is not loaded, and ticket 08 gives
players a nationality. Activated-only would force a choice between a dangling nationality reference
and a rule that a player may only be born somewhere the human could have chosen to manage — a rule
nothing in the design wants.

Activation itself is stored nowhere. It is `SELECT DISTINCT nation_id FROM competitions`, and a
boolean beside that query is a second home for one fact.

### The nation row is thin, and the Nation Profile stays in code

The row carries its canonical id and nothing else. It does not mirror the factual columns — continent,
confederation, currency, languages — and it does not carry the 0-1 priors.

Nothing reads a Nation Profile after generation. The only runtime consumer,
`activeLeaguesConsequences.ts`, reads `MIGRATION_LINKS` at career-setup time, before a save exists.
`generation_manifest.ruleset_version` already pins which `nations.ts` a save was generated against, so
a factual mirror would be identical data copied into every save file with no reader — the precise shape
ticket 02 rejected for dependency edges. The table's job is referential integrity for cities, clubs,
and player nationality; storage is not part of it.

**Reintroduction condition, and it is specific:** the first time a system reads a prior *during* a
career rather than at generation, the profile must be snapshotted into the save. Until then a ruleset
upgrade only changes how future worlds are generated; after then it would silently change the
behaviour of saves already in progress, which is a reproducibility hole rather than an inconvenience.
Do not pre-build for this — a snapshot table with no reader is the same waste in the other direction.

### Cities are real, curated in code, and resolved into the save

A city is `(canonical id, nation code, name, population band)`. Roughly sixty per nation, hand-cut from
a CC0 or public-domain source, enough to give every club in a full pyramid a distinct plausible
hometown without repeating one across divisions.

Population is a **band** — `major`, `large`, `mid`, `small` — not a figure. The only consumer is
club-stature plausibility at generation time, which needs an ordering and not a number, and a real
population figure is a factual claim that goes stale while nothing in the simulation notices.
Coordinates are not carried: no system computes distance, and travel is not modelled.

The code list is the catalogue; the save records the resolved subset. City rows are written only for
nations that have competitions in this save, which is the same catalogue-in-code, resolved-world-on-disk
shape ticket 02 established for competitions. This is narrower than the nations table on purpose: cities
are per-nation and numerous, nations are eight.

### City names are real data, not content-pack data

Geography is factual and licence-free. The content pack exists for club and competition identities,
which are the licensed commercial assets; a city name carries no more legal weight than a country name,
and country names already sit in code unresolved. So a city row holds `"London"` under the id
`city_eng_london`, and the pack never sees it.

This moves a boundary `CONTEXT.md` currently draws. Its Nation entry states that nations are the *only*
real-world data the simulation depends on; the foundation is now nations **and cities**, and the entry
is corrected in the same change.

### No stadium table

`clubs` gains `stadium_name` and `stadium_capacity`, both generated. There is no stadium entity.

A table would buy ground-sharing and a city parent for the ground distinct from the club's own. Neither
is read by anything in MVP: "Stadium as a mechanic" is already ruled out of scope, capacity feeds
display only, and no system asks where a match is played beyond which club is at home. The table can
arrive later without disturbing anything, precisely because nothing joins to it yet.

### `clubs.name` is deleted, and resolution happens in one place

`clubs.id` already is the canonical id, so the correction is a deletion rather than a rename: the
`name` column goes, and a display name is resolved through the content pack.

Resolution happens **once, in the main-process query layer**. The renderer's contract is unchanged — it
still receives a named club — so no renderer component and no renderer test moves. Main-process tests
assert canonical ids. `LEAGUE_CLUBS` loses its `name` field and becomes an ordinal-to-stature list, with
the twenty fictional names moving into the base pack under `club_eng_01`-style ids.

Placing resolution in the query layer rather than at generation is what keeps the pack replaceable: a
name baked into a row at generation time is a name that save can never be re-read under a different
pack.

### The content pack is a code asset, recorded on the manifest

The pack is not a table. `generation_manifest` gains `content_pack_id` and the pack version.

Persisting the pack into the save defeats its whole purpose — an existing save could never be reopened
under a localized or licensed pack, which is the one thing the layer was built to allow. The manifest
record exists for provenance, and so that opening a save under a pack that has since lost coverage of
its ids is a reported condition rather than a screen full of `club_eng_07`.

### One id convention, and competition names move too

Underscores win: `nation_eng`, `comp_eng_1`, `club_eng_01`. The `contentPack.ts` helpers are the ones
that state the canonical-id rule, so the catalogue migrates to them rather than the reverse.

Competition display names move out of `leagueSetup.ts` into the base pack in this same change. Leaving
`name: "English First Division"` in code while deleting `clubs.name` would fix the club violation and
leave the identical competition violation in place. The catalogue node keeps `alternativeNames`: that is
setup-screen search input, consumed before a save exists, and it never reaches the simulation core.

Changing every id in the catalogue changes the catalogue's *content*, so its `fingerprint` moves. Every
persisted preset and setup draft from the current catalogue is refused rather than half-restored — the
fingerprint mechanism working as designed, exactly as it did when the fictional catalogue was replaced.

## Handoffs

- **Ticket 08** (player provenance) inherits an open edge: a player's birthplace may be a city in a
  nation with no competitions in this save, and therefore no city rows. Either birthplace is nullable
  outside the loaded nations, or the resolved city subset widens beyond the rule set here.
- **Ticket 10** (generation reads the snapshot) inherits `LEAGUE_CLUBS` as an ordinal-to-stature list
  for one nation. A multi-nation world needs stature distributions per competition, which this note does
  not shape.
- **Ticket 07** (simulation depth) inherits city rows written per activated nation regardless of depth;
  whether a `results-only` nation needs its cities at all is that ticket's to answer.

## Alternatives considered

- **Activated-only nations, matching ticket 02.** Rejected: nations are referents for player
  nationality, not only participants, and the volume argument that justified activated-only for
  competitions does not apply to a table bounded by `NATION_CODES`.
- **A fat nation row mirroring the factual columns and the priors.** Rejected: identical data in every
  save with no post-generation reader, pinned already by `ruleset_version`.
- **Persisting the Nation Profile so a ruleset upgrade cannot disturb a save.** Rejected *for now*, with
  the reintroduction condition stated above. Nothing reads a prior mid-career, so the snapshot would
  protect against a hazard that does not yet exist.
- **City population as a real figure, with coordinates.** Rejected: no consumer needs either, a
  population number is a factual claim that rots, and coordinates imply a distance model nothing has.
- **City names through the content pack.** Rejected: it treats factual geography as a licensing risk,
  which contradicts the boundary the geography/identity split is built on, and it would put country
  names on the wrong side of the same line.
- **A `stadiums` table with a city parent.** Rejected: ground-sharing has no reader in MVP, and the
  table is cheap to add later because nothing joins to it.
- **Resolving display names at generation time into the row.** Rejected: it bakes one pack into the save
  permanently and makes the replaceable layer unreplaceable.
- **The content pack as a table in the save.** Rejected for the same reason, one level up.
- **Keeping hyphenated catalogue ids and translating at the join.** Rejected: a translation function
  between two id conventions is a permanent tax and a permanent source of near-miss bugs, paid to avoid
  a one-time fingerprint bump the mechanism exists to absorb.
- **Correcting `clubs.name` only, leaving competition names in the catalogue.** Rejected: a rule
  enforced in one of two identical cases is a rule nobody believes.

## Acceptance criteria

- `nations` contains one row per `NATION_CODES` member in every save, whatever the selection scope.
- No column anywhere stores whether a nation is activated; the answer comes from `competitions`.
- No table stores a Nation Profile value or a factual nation attribute.
- `cities` contains rows only for nations that have at least one row in `competitions`, and every city
  row's population band is one of the four defined values.
- No `stadiums` table exists; `clubs` carries `stadium_name` and `stadium_capacity`.
- `clubs` has no `name` column, and no test asserts a club display name against a main-process result.
- `leagueSetup.ts` contains no competition display name, and every id in it matches the underscore
  convention `contentPack.ts` mints.
- `generation_manifest` records `content_pack_id` and the pack version.
- Opening a save under a pack missing ids the save uses produces a reported coverage warning, not a
  silent fallback to raw ids in the UI.
- `CONTEXT.md` defines City, and its Nation entry names nations and cities as the real-world foundation
  rather than nations alone.

## Risks

- **The thin nation row will look like a mistake to the next reader.** A one-column table invites a
  well-meaning "fix" that mirrors `nations.ts` into it. The reintroduction condition is the defence, and
  it only works if it is read.
- **Curating sixty cities per nation is real, unglamorous work** — around 480 rows of hand-checked data
  for the shipped eight — and it is on the critical path for generation, since a club cannot be placed
  without one.
- **The fingerprint bump invalidates every existing preset and setup draft.** Correct behaviour, but it
  lands on any user mid-setup at the moment this ships, and it is the second such bump in this
  catalogue's short life.
- **Single-seam name resolution is a load-bearing assumption that has never been tested.** If any read
  path bypasses the main-process query layer, canonical ids reach the screen. Nothing enforces the seam
  today beyond the deletion of the column.
- **Deleting `clubs.name` breaks every main-process test asserting a club name at once**, and the blast
  radius has been reasoned about rather than measured.
- **Ticket 08's birthplace edge is deferred, not solved.** If it resolves toward persisting cities for
  every nation, the activated-nations-only rule for `cities` set here is the thing that gives way.
