# Agent Note: Simulation Depth never conditions the world catalogue

Status: proposed

## Problem

Ticket 03 established that `cities` rows are written for every nation that has at least one row in
`competitions`, and handed on the question of whether a nation nobody can see the inside of needs its
geography at all. A `results-only` nation is exactly that case: its clubs carry no players, its matches
resolve from two numbers, and no screen opens onto it.

The question is not only whether to trim those rows. It is where the boundary of Simulation Depth
runs. Depth is defined in `CONTEXT.md` by what the player experiences and was made precise by ticket 07
in terms of the rows beneath a club; nothing has said whether it may reach the world catalogue — the
nations, cities, and competitions that exist independently of any club.

## Proposal

**Simulation Depth conditions what hangs beneath a club. It never conditions the world catalogue, and
it never conditions the club row itself.** `results-only` nations get their cities, and `cities`
widens further: it becomes unconditional across the catalogue, matching `nations`.

Concretely:

- Every nation in `NATION_CODES` contributes its city rows to every save, whatever competitions were
  selected and at whatever Depth they run.
- `clubs.city_id` is set for every club, including a `results-only` one, and is identical to what the
  same club id would carry at `full`.
- Depth's entire footprint on disk stays where ticket 07 put it: the presence or absence of rows in
  `players`, `player_positions`, `contracts`, `fitness`, and `tactics`.

### The economic argument for trimming does not exist

Three costs were candidates, and each dissolves on inspection.

*Disk* is noise. A city is `(canonical id, nation code, name, population band)` — roughly 50 bytes. At
~60 cities per nation and 8 nations, the unconditional set is ~480 rows and ~24 KB. Ticket 04's units
put one player at ~450 bytes; the entire world's geography costs less than sixty players.

*Generation time* is noise for the same reason: 480 inserts of static data, against ~55 microseconds
per generated player and a 400k-player world that already takes ~22 seconds.

*Curation* is the one real cost, and it is paid in the wrong place for trimming to help. The cities are
hand-cut real geography, so each is human work — but that work is per **catalogue** nation, done once
in code, while Simulation Depth is a per-save choice made in the League Selection Snapshot. Any nation
in the catalogue can be selected at `full` by some save, so its cities must be curated regardless.
Skipping the rows at generation time saves zero curation effort. The ticket asked whether the cost was
worth measuring; it was worth locating, and it sits outside the save entirely.

### Trimming would put the first Depth-dependent column on `clubs`

Ticket 07's result is that a `results-only` club is an ordinary `clubs` row with nothing beneath it —
`full` and `standard` are byte-identical, and the third tier differs only by absence. Making
`city_id` NULL for `results-only` clubs would break that: the club row itself would vary by Depth, and
every later reader would have to know which columns are Depth-conditional and which are not.

It would also make promotion across the boundary more expensive. Ticket 07 has a club promoted out of a
`results-only` division conjure a squad on the way up; under trimming it would also have to backfill
geography mid-career, writing catalogue rows into a save long after generation. One kind of upward
conjuring is a designed seam; two is a pattern nobody wants to extend a third time.

### Unconditional cities remove a scope-dependent generated value

This is the argument that carries the widening past `results-only` and out to the whole catalogue.

Ticket 10 fixed an invariant on generation: no generated value may depend on the set of entities being
generated, which is what buys the superset property — a broader selection reproduces the narrower world
byte-identically, plus extra. Ticket 08 gives a player a nullable `birth_city_id` whose NULL means
"born outside the loaded world".

Those two collide under ticket 03's rule. A player's nationality may be a nation with no competitions
in this save, so under activated-only cities their birthplace resolves to a real city in one save and
to NULL in another, from the same seed and the same player id — a generated value that depends on the
selection scope. Widening `cities` to the whole catalogue removes the collision at the source: a
player's birthplace derives from their nationality and their own id alone, and is the same value in
every save.

That also retires ticket 08's stated risk that NULL birthplaces would be common. In MVP they become
unreachable, because every nationality a player can hold is a catalogue nation and every catalogue
nation has cities. The column **stays nullable** and keeps its meaning: it is the escape hatch for a
nation added to the catalogue before its geography is curated, and for any later rule that gives a
player a birthplace outside the nations modelled at all.

### Cities move to the referent side of the catalogue line

Ticket 02 drew a line the catalogue has followed since: the catalogue lives in code, and the save
persists only the resolved world. Ticket 03 put `nations` on the other side of that line deliberately —
unconditional, because a nation is a **referent** for player nationality, not only a participant — and
kept `cities` activated-only on a volume argument: cities are per-nation and numerous, nations are
eight.

The volume argument does not survive its own numbers. Sixty rows per nation across eight nations is
~24 KB, which is not a volume problem, and a city is a referent for exactly the same reason a nation is:
it is pointed at by `players.birth_city_id` from outside its own nation's competitions. Cities therefore
join nations on the referent side. `competitions` and `clubs` stay activated-only, where the volume
argument does hold and where nothing outside the loaded world points in.

## Reconciliation

This overturns a rule stated in an existing note, so both are corrected in the same change, per this
effort's standing preference:

- `2026-09-01-world-catalogue-and-canonical-ids.md` (ticket 03) — its "City rows are written only for
  nations that have competitions in this save" rule and the matching acceptance criterion are replaced
  by the unconditional rule, and its handoff to ticket 07 is marked resolved here. That note is
  **partially** superseded: everything else in it — the city shape, population bands as a band, city
  names outside the content pack, no stadium table, the canonical-id enforcement — stands unchanged.
- `2026-09-01-player-provenance-and-nationality.md` (ticket 08) — `birth_city_id` stays nullable with
  its stated meaning, but its risk "NULL birthplaces may be common" no longer holds and its acceptance
  criterion is restated against the catalogue rather than the loaded nations.

`CONTEXT.md` needs no change: its **City** entry is a glossary definition and says nothing about which
cities a save persists.

## Alternatives considered

- **Skip cities for nations whose competitions are all `results-only`.** The ticket's headline option.
  Rejected: it saves ~3 KB and 60 inserts per nation, saves no curation at all, and buys that with a
  Depth-dependent column on `clubs` plus a mid-career geography backfill on promotion.
- **Write only the cities some club actually derived.** A tighter trim that keeps the club row intact.
  Rejected: it makes the persisted city set depend on the set of clubs generated, which is precisely
  the scope-dependence ticket 10's invariant forbids, and it strands `birth_city_id` for any player
  whose birth city no club happened to draw.
- **Keep ticket 03's activated-only rule and accept NULL birthplaces as routine.** The status quo, and
  the option worth the most: it keeps the resolved-world-on-disk rule pure and NULL already has a
  defined meaning. Rejected because the meaning is what breaks — the same player has a birthplace in
  one save and none in another, so NULL stops meaning "born outside the loaded world" and starts
  meaning "your selection was narrow", which is a fact about the save rather than about the player.
- **Make `birth_city_id` non-null once cities are unconditional.** Tempting, since MVP can no longer
  produce a NULL. Rejected: it overturns ticket 08 to remove an unreachable state, and it forecloses
  adding a nation to the catalogue before its geography is curated — the exact lag the nullable column
  absorbs for free.
- **Curate fewer cities for peripheral nations.** A tiering of the human cost rather than the disk cost.
  Rejected: it optimizes the one cost that is already tiny in absolute terms (~480 rows across the whole
  catalogue) and it degrades the nation that gets tiered the moment someone selects it at `full`.

## Acceptance criteria

- `cities` contains rows for every nation in `NATION_CODES` in every save, whatever the selection scope
  and whatever Simulation Depth its competitions run at.
- A `results-only` club and a `full` club with the same id have identical `clubs` rows, `city_id`
  included; no column on `clubs` is Depth-conditional.
- Two saves generated from the same world seed with different nation selections give a player with the
  same id the same `birth_city_id`.
- Promotion out of a `results-only` division writes no rows to `cities`, `nations`, or `competitions`.
- No `players` row generated by MVP carries a NULL `birth_city_id`, and the column remains nullable.

## Risks

- **The catalogue-in-code line now has two exceptions rather than one.** `nations` and `cities` are
  copied wholesale; `competitions` and `clubs` are activated-only. The rule that separates them is
  "does anything outside the loaded world point at it", and it has to be stated in the ticket 12 spec
  or it will read as inconsistency and get re-litigated.
- **Curation debt is now unconditional too.** A nation added to the catalogue without its ~60 cities
  ships an empty geography for itself in every save, not only in saves that select it. The nullable
  `birth_city_id` keeps that from being a crash, but it makes the missing work invisible rather than
  loud.
- **The invariant is broader than the evidence that produced it.** It was derived from cities and one
  Depth boundary, then generalized to the whole catalogue. A future catalogue table with genuinely
  per-club volume — anything approaching player scale — would be a real counter-case, and the rule
  should be reopened rather than stretched over it.
