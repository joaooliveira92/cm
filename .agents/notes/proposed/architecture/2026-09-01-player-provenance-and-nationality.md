# Agent Note: Player provenance — nationality, birthplace, and names

Status: proposed

## Problem

The `players` table carries names, a date of birth, attributes, and generation provenance, but no
nationality and no birthplace. In today's single-nation world that is harmless. In the multi-nation
world the League Selection Snapshot promises, provenance determines which name pool a player is drawn
from, what the migration links in `nations.ts` actually do, and whether any future eligibility rule has
anything to read.

Underneath sits a naming problem that is already live: the generator draws from **20 given names and 20
surnames, globally shared** — 400 full-name combinations for a world that may hold hundreds of
thousands of players, with no relationship to any nation.

## Proposal

**A player carries exactly one nationality, a nullable birth city, and a directly-stored name drawn
from nation-keyed pools that live in code. No career-history table.**

### One nationality, with a stated reintroduction condition

`players` gains a `nationality` column referencing a nation. Not two columns, and not a
`player_nationalities` table.

Dual nationality is a real football concept, and the argument for modelling it now is that retrofits
are expensive. That argument does not hold here. **Nothing in MVP reads a second nationality**: work
permits do not exist, national teams are not in scope, and `MIGRATION_LINKS` drives generation — where
a player is drawn from — rather than eligibility. A second nationality would be a stored value nothing
reads, which the Manager Pillar discipline rejects.

The retrofit is also not the kind ticket 03 faced. Canonical ids had to land everywhere at once because
they *replaced* the meaning of an existing column. A second nationality is purely additive: a nullable
column or a join table alongside the existing one, with existing saves backfillable because generation
is reproducible from seed.

**Reintroduction condition, stated so it is not rediscovered by argument:** the moment work permits or
national teams ship, this decision reopens, and the migration is additive.

### Birthplace is a nullable city reference

`players` gains a nullable `birth_city_id` referencing the cities table
[ticket 03 established](../../implemented/architecture/2026-09-01-world-catalogue-and-canonical-ids.md). Free text is not an option: a
city name stored as a player attribute is a display name used as data, which `contentPack.ts` forbids
and which ticket 03 spent an entire decision removing.

**NULL means "born outside the loaded world."** Ticket 03 handed over an open edge — a player may be
born in a nation with no competitions in this save, and therefore no city rows — and this is how it
closes. The player profile then reads "Born: Portugal" rather than inventing a city, and nationality
carries the fallback. Fabricating a city name for a nation whose geography was never loaded would put a
display name where a canonical id belongs, which is the same violation by a different route.

> **Narrowed by ticket 13** ([results-only geography](2026-09-02-results-only-geography-cost.md)). That
> ticket made `cities` unconditional across the catalogue, partly *because* of this column: an
> activated-only city set gives the same player a birthplace in one save and NULL in another, making a
> generated value depend on the selection scope, which ticket 10 forbids. The column stays nullable and
> keeps this meaning, but MVP no longer reaches it — every nationality a player can hold is a catalogue
> nation and every catalogue nation has cities. NULL is now the escape hatch for a nation added to the
> catalogue before its geography is curated, not a routine state.

### Name pools are factual data, keyed by nation, and live in code

Name pools go in a module beside `nations.ts`, keyed by nation code, under that file's **factual and
stable** heading rather than its **gameplay priors** heading.

They are not content-pack data. The pack exists for replaceable commercial identities and carries a
`contentSource: "FICTIONAL" | "LICENSED"` flag for precisely that reason; common given names and
surnames in a country carry no more legal weight than the country's languages, which already sit in
`NationProfile`. This is the same reasoning ticket 03 used to keep city names out of the pack. They are
not save data either: pools are inputs to generation, and generation is reproducible from seed and code.

**Pool size is part of the decision.** 400 combinations is not a pool. Roughly 100 given names and 200
surnames per nation yields 20,000 combinations per nation, so at ~40,000 players per nation a full name
recurs about twice — which is how real leagues read. Across the eight nations that is ~2,400 curated
entries, and that curation is the honest cost of this decision, not a detail for later.

No `UNIQUE` constraint enforces name uniqueness. Names are attributes, not identifiers; avoiding two
identical names inside one squad is generation's job, done by redrawing.

**On the caricature risk.** `nations.ts` warns that a prior shifts a distribution and never sets a
value, and that individual variance must exceed the national modifier. That safeguard does not map onto
names: a name is drawn wholly from one pool, with no variance term to dominate the national one. The
defensible ground is the file's own factual/prior split — name frequencies within a country are factual
linguistic data, the same class of claim as its languages, not a gameplay prior about its people. A
project unwilling to make that claim per nation keeps one shared pool and accepts that every league in
the world reads alike.

### Player names are stored directly; the canonical-id split does not apply

`first_name` and `last_name` remain text columns on `players`.

The canonical-id split exists because real club and competition names are licensed assets a content
pack replaces. A content pack maps canonical id to display name and **ships before the world is
generated**, so it cannot name players who do not yet exist — and a generated fictional name has no
licensed counterpart to be swapped for.

This is recorded explicitly because the rule it appears to bend — no display name stored as an
identifier — governs catalogue entities a pack can replace. A player's identifier is already a canonical
id; the name is an attribute hanging off it. Generated content is not catalogue.

Staff names follow the same path: [the staff entity](../feature/2026-09-01-staff-entity-and-bindings.md)
defers naming to this decision, and staff are drawn from their club's nation's pools by the same
machinery.

### Nationality is drawn first; the name pool follows

When generating a squad for a club in a given nation, most players are drawn as nationals of that
nation, and a fraction are drawn from its migration sources according to the weights already in
`MIGRATION_LINKS`. A foreign-drawn player takes their origin nation's name pool and their origin
nationality. This is what makes the nationality column a value something reads rather than a constant
copy of the club's nation.

The migration weights are **gameplay priors**, not measurements, and are governed by the rule already
stated in `nations.ts`: they shift a distribution and never set a value. A nation absent from
`MIGRATION_LINKS` — today `AND` and `ITA` — generates a fully domestic squad. That is a gap in the data,
not a statement about those countries, and should be visible as a gap rather than read as a design
intent.

### Career history is a projection, not a table

There is no `player_career_history` table in MVP. Completed transfers already append
`PlayerTransferredOut` and `PlayerTransferredIn` to both clubs' event streams, so a career history is a
read model over an existing log rather than new authoritative state. An authoritative table would put
one fact in two places — the log and the table — the same duplication the competition graph rejected for
club membership.

Whether that read model is materialised is the event-streams-and-read-models question, and it is now
sharp enough to decide there: reconstructing one player's history means scanning both clubs' streams,
which is exactly the scale problem that ticket owns.

## Acceptance criteria

- `players` carries exactly one nationality column and no second nationality anywhere in the schema.
- `players.birth_city_id` is nullable and references the cities table. Since ticket 13 made `cities`
  unconditional, no player generated by MVP carries a NULL; the state remains reachable only for a
  catalogue nation whose geography has not been curated.
- No player name is stored anywhere as an identifier, and no content pack entry names a player.
- Name pools are keyed by nation, live in code beside `nations.ts`, and are large enough that a full
  name recurs on the order of twice per nation at representative world size.
- No two players in the same squad share a full name.
- A club generated in a nation with modelled migration links has a non-zero fraction of players whose
  nationality differs from the club's nation.
- No `player_career_history` table exists.

## Alternatives considered

- **Dual nationality now, as a nullable second column or a join table.** Rejected because no MVP system
  reads it and the retrofit is additive rather than structural. The reintroduction condition is recorded
  above so the decision is reopened deliberately, not re-argued.
- **Birthplace as free text.** Rejected outright: a city name stored as a player attribute is exactly
  the display-name-as-data pattern the canonical-id rule forbids.
- **No birthplace at all.** Coherent, and cheaper. Rejected because the city rows already exist for club
  hometowns, the column is a nullable reference, and the player profile is a screen people actually read.
- **Name pools in the content pack.** Rejected because the pack is the licensed-content boundary, and
  name frequencies are factual data of the same class as a nation's languages — the reasoning that
  already kept city names in code.
- **Keeping one globally shared name pool.** Cheapest by far, and it sidesteps making any per-nation
  claim. Rejected because it makes every league in the world read identically, which is the flattening a
  multi-nation world exists to avoid. It stays the fallback if the per-nation curation is unwanted.
- **A canonical-id split for player names.** Rejected because a pack ships before the world is generated
  and cannot name players who do not yet exist.
- **An authoritative `player_career_history` table.** Rejected as duplicated state; the event log already
  holds the facts.

## Risks

- **The curation is real work and it is unglamorous.** ~2,400 curated names across eight nations, and a
  half-done pool is worse than the shared one because it makes some nations read richly and others
  thinly. If the curation stalls, the honest fallback is the shared pool, not partial per-nation pools.
- **Per-nation name pools make a claim about real countries.** The claim is factual name frequency, and
  it is bounded by never touching attributes or ability. If a pool is ever wired to anything mechanical,
  that boundary is gone and this decision must be revisited.
- ~~**NULL birthplaces may be common.**~~ *Retired by ticket 13*
  ([results-only geography](2026-09-02-results-only-geography-cost.md)): with `cities` unconditional
  across the catalogue, a narrow selection no longer strips birthplaces. The nationality fallback is
  still worth designing in, but for a nation whose geography is uncurated rather than for the common
  case.
- **One nationality may prove too thin sooner than expected.** Work permits are a natural early feature
  for a game with a transfer market, and they are the exact trigger condition named above.
