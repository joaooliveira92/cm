# Agent Note: Presence Staff are derived, never stored

Status: proposed

## Problem

`CONTEXT.md` recorded that a Staff member exists to carry a mechanical binding and that everything
else about them is presence, and [staff are two bound roles](2026-09-01-staff-entity-and-bindings.md)
closed the role set at Coach and Scout on exactly that test — each candidate role was weighed and
rejected because no shipped system had a term for it to bind to. That note also established that
staff rows exist only for a club that is or has been human-managed, since no shipped system reads an
AI club's staff.

A club with no president is a thin world. The question is what a President and a Physio could
possibly be in a codebase whose stated rule is that a stored value nothing reads is not a real thing,
given neither role has a mechanical term available: Regimen already owns Condition decay, recovery,
and injury severity outright, and the Board's authority is deliberately institutional.

Underneath sit four smaller questions the earlier note did not have to answer, because two roles
drawn from one stream raised none of them: which seed these people derive from, given the existing
staff stream is order-sensitive and load-bearing for every shipped save; whether they are domestic
like staff or migration-weighted like players, since those two precedents disagree in the code today;
whether anything about them varies by Stature Tier when they carry no number for it to vary; and what
type they take, given the `staff_role` check constraint permits exactly two values and must go on
saying so.

## Proposal

**A Presence Staff member is a name and a role, derived on demand from the World Seed and the club's
canonical id, and never written anywhere.**

The binding rule is widened rather than broken: a value is justified when **some shipped surface
reads it**, not only when a formula does. A screen that displays a named person is a reader. What the
rule keeps forbidding, and what it was always really aimed at, is a value stored for a surface that
does not exist yet.

That widening buys the whole design, because a person nothing computes with needs no row. The
President and the Physio are a pure function of the World Seed and the club's canonical id, evaluated
when a screen asks. Every club in the world has them, at every Simulation Depth, at zero storage cost
and zero world-generation cost.

### Stored versus derived is a claim about identity, not existence

The earlier note's invariant — *staff rows exist only for a club that is or has been human-managed* —
survives verbatim, and turns out to have been a statement about **rows** rather than about **staff**.
That note already established staff as a deterministic function of the World Seed and the club id,
materialised lazily. The rows were always downstream of a derivation that could answer for any club.

This note makes that explicit and gives it a reason: **a row exists to give a Scouting Assignment
something stable to point at.** Bound Staff need identity, so they get rows; Presence Staff are never
pointed at by anything, so they get none. The line between the two tiers is a real technical
distinction rather than a taxonomy imposed on top of one.

### Per-role seeds, because the existing stream is a landmine

`materialiseStaff` builds one stream, `deriveSeed(worldSeed, "staff", clubId)`, and `generateStaff`
draws the coach and then N scouts from it in sequence. Any draw inserted into that stream shifts every
subsequent draw, changing the backroom of every club in every existing save.

Presence Staff therefore never share that stream, and do not share one with each other either. Each
person derives from their own seed: `deriveSeed(worldSeed, "presence", ${clubId}:president)` and the
same shape for the physio. `presence` is a fresh discriminator; the ones in use are `club`, `draw`,
`economy`, `match`, `player`, and `staff`.

The cost is one extra `deriveSeed` call per person. What it buys is that adding a fifth role later
changes nobody else's name, which is the property the bound stream conspicuously lacks — and the
reason it lacks it is that nobody needed it until the set grew.

### Domestic names, because a nationality would be a value nothing reads

The two precedents in the codebase disagree. Players call `drawNationality(clubNation, random)` and
are sometimes drawn from a recruitment source at `MIGRATION_LINKS` weights. Staff index
`NAME_POOLS[clubNation]` directly and are always domestic. The earlier note asserted that the
player-provenance answer applied to staff *without a separate decision*; that was not true when it
was written and is not true now.

Presence Staff follow the **staff** precedent: `NAME_POOLS[clubNation]`, no nationality drawn.

The argument is the binding rule applied to itself. A Presence Staff member carries no number and is
never linked to, so no surface anywhere would display a nationality — drawing one would create
exactly the unread stored value this whole design had to argue its way around. A foreign president is
the better fiction and becomes correct the moment a staff profile screen exists; today it is a hidden
field.

The players-versus-staff divergence is recorded here rather than repaired. Changing the bound staff
draw would alter every shipped save's backroom, and this effort has no standing to spend that.

### Nothing varies by Stature Tier

Stature Tier owns quality, and Presence Staff have no quality. A tier-varying job title was rejected
because the glossary bans **Chairman** as a synonym for **President**, and shipping the banned word as
a big-club variant would make the `_Avoid_` line meaningless. Tier-varying name pools were rejected
as unfalsifiable: nobody can distinguish a big club's pool from a small one's by looking, so it is
tuning with no observable.

### Two role unions, so the check constraint stays honest

`STAFF_ROLES` and `StaffRole` keep meaning exactly the two values the table permits, matching
`check("staff_role", oneOf("role", ["coach", "scout"]))`. Beside them sit `PRESENCE_ROLES` and
`PresenceRole` for `president` and `physio`, and a `ClubPersonRole` union where a caller needs both.

Widening `StaffRole` to four and carving out a bound subset for the table was rejected: the type would
then claim four values in a column that accepts two, which is the kind of quiet disagreement that is
harmless until a migration reads the type instead of the constraint.

The derivation returns `{ role, firstName, lastName }` — `GeneratedStaff` minus `quality` — so both
tiers produce the same shape of person and nothing has to reconcile two representations before
grouping them. Joining stays where it already lives: `materialiseStaff` joins on write, a screen joins
on read, and neither is forced here.

**Collisions are redrawn within the presence pair only.** A president and a physio never share a name;
neither is checked against the bound staff or the squad. Cross-checking would make the presence
derivation depend on the bound one — undoing the seed separation above — and would make a president's
name depend on how many scouts the club has.

### Both roles live in `rules/staff.ts`

Two kinds of one concept, one file. The separation that matters is the seed, and it is structural
already. Splitting the file would invite a third place for someone to re-derive a president.

## Relationship to existing notes

- **[Staff are two bound roles on the human's club](2026-09-01-staff-entity-and-bindings.md)** is
  **partially superseded, and mostly ratified.** Its two bindings, both hard invariants
  (`coachModifier(q) >= 1.0`, strictly positive scout accrual), the no-market stance, static quality,
  one-coach-N-scouts, the generic quality column, and every rejected role all stand unchanged. Its
  rows invariant survives verbatim, reread as a claim about rows. Two things change: the role set is
  no longer exactly two, and its assertion that player provenance answers staff naming "without a
  separate decision" is corrected here. Both stay active.
- **[Player provenance — nationality, birthplace, and names](../../implemented/architecture/2026-09-01-player-provenance-and-nationality.md)**
  is untouched. Its name pools are reused as-is, and its owed pool-growing work is reinforced: at
  today's 20x20 pools a page-level name collision between a presence person and a bound one is
  roughly 1 in 400, and at that note's own 100x200 target it is 1 in 20,000.
- **[Simulation depth persistence](../architecture/2026-09-01-simulation-depth-persistence.md)** is
  **partially superseded**. Its statement that per-club things "key off *human-managed*, not off
  Depth" stays true of rows and becomes false of staff: a `results-only` club now has a President and
  a Physio like every other club. Its no-depth-branch property is preserved rather than weakened —
  the derivation reads Stature Tier, nation, and seed, all of which exist at every Depth. Both stay
  active.
- **[No onboarding inbox](../architecture/2026-08-29-no-onboarding-inbox.md)** says staff
  recommendations are impossible because *"there are no staff"*. That premise was already false and is
  now further from true. Whether its conclusion should change is for whoever next opens it; this note
  does not reopen it.

## Acceptance criteria

- `PRESENCE_ROLES` is exactly `["president", "physio"]`, and `STAFF_ROLES` is unchanged at
  `["coach", "scout"]`, matching the `staff_role` check constraint.
- No schema change: no table, column, or migration is added by this decision.
- The derivation for a club returns one president and one physio, each `{ role, firstName, lastName }`
  drawn from `NAME_POOLS[clubNation]`.
- Each person derives from their own seed; deriving the physio does not read or advance the
  president's stream, and neither touches `deriveSeed(worldSeed, "staff", clubId)`.
- Every existing determinism test over generated staff passes unchanged, byte for byte.
- The same club yields identical Presence Staff across two independent derivations, and across a
  career in which the club is taken, left, and taken again.
- A `results-only` club yields a president and a physio.
- A president and a physio at one club never share a full name.
- `CONTEXT.md` defines **Bound Staff**, **Presence Staff**, **President**, and **Physio**, and the
  **Staff** entry no longer claims exactly two roles or a universal mechanical binding.

## Risks

- **The justification is a screen that does not exist yet.** Presence Staff are defensible only
  because the Club Staff screen and the President's board copy are in this effort's destination. If
  the screen is cut and the news copy is not, the Physio has no reader and should be cut with it —
  the President survives on the news copy alone. That is the failure mode to watch, and it is the
  reason the map blocks the reconciliation ticket on the page design rather than on this one.
- **A widened rule is easier to widen again.** "Some shipped surface reads it" admits far more than
  "a formula reads it", and the next role will arrive arguing that a page could show it. The set is
  closed at four deliberately; reopening it needs the same argument this note made, not a reference
  to this note.
- **Two staff-naming behaviours now coexist knowingly.** Players can be foreign and no Staff member
  ever is. Recorded rather than fixed, because fixing it costs every shipped save's backroom, and it
  will read as an oversight to anyone who finds it without this paragraph.
- **Name collisions will look like bugs before the pools grow.** Roughly 1 in 400 club pages will
  show two people sharing a name at today's pool sizes.
- **Nothing enforces that a derived person is cheap.** The derivation is called per club per page
  view rather than cached, which is correct at four people and would not be at forty.
