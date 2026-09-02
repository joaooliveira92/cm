# Agent Note: The Calendar becomes date-bearing

Status: proposed

> Partially supersedes [The calendar advances by Matchday, not by calendar date](../../implemented/architecture/2026-08-27-fixture-driven-calendar.md).
> That note's calendar half — Matchday as a 1–38 League-wide round number, Transfer Windows defined
> against Matchday arithmetic, "no event carries a real-world date" — is overturned here. Its
> League Table tie-break rule (points, then goal difference, then goals scored, with head-to-head
> deliberately omitted) is untouched and remains the live statement, which is why that note stays
> active rather than being archived.
>
> Also contradicts the season-readout acceptance criteria in
> [Career chrome frame and date/Continue bar](../../implemented/architecture/2026-08-31-career-chrome-and-date-continue-bar.md)
> ("`Season {n} · Matchday {m}/38`", "no copy expresses time in days or dates"). That note is
> `implemented`, so the shipped chrome is wrong at HEAD once this lands; the replacement copy is a
> renderer decision, not a shape on disk, and is left to whoever next opens that note.

## Problem

`CONTEXT.md` defines Matchday as "the League-wide round number (1–38)", "the unit the calendar
advances by and the unit Transfer Window boundaries are defined against — never a calendar date".
That definition assumes one League of twenty clubs playing a 38-round double round-robin, which is
the world the schema encodes today: `season` is a per-save singleton with a `current_matchday`
CHECKed to `0..38`, and `fixtures.matchday` is CHECKed to `1..38`.

The MVP world is multiple nations, pyramids of several tiers, and domestic cups running concurrently.
Competitions of different lengths run at the same time, so a single global Matchday number no longer
identifies a point in time: round 12 of a 38-round league and round 3 of a cup are not the same
moment, and nothing orders them against each other. Transfer Windows inherit the problem, because
they are defined against a number that has stopped meaning anything world-wide.

## Proposal

The Calendar becomes date-bearing. A date is the world's unit of time; a round number survives, but
demoted to a label local to one competition.

### What a Fixture carries

A fixture carries both `scheduled_date` and `round`. The date orders it against every other fixture in
the world; `round` is scoped to its competition and means nothing across competitions — round 3 of a
cup and round 3 of a league are unrelated. Round is stored rather than derived from date ordering,
because a knockout bracket's round is a bracket depth that survives byes and replays, which ordering
cannot reconstruct, and because a league table wants "played 12 of 38" without counting rows.

`fixtures.matchday`'s `1..38` CHECK becomes a `round >= 1` CHECK: the upper bound is a per-competition
property, not a constant.

Dates are ISO `YYYY-MM-DD` text, matching the existing `players.date_of_birth` column. Text sorts
lexicographically, so the `WHERE scheduled_date <= ?` sweep the advance needs works without
conversion, and rows are readable in a debugger. An integer day-offset would save six bytes per row —
about 2 MB across a 16,000-club world's ~300k fixtures, against the 335 MB ticket 04 measured, so the
saving buys nothing.

Season 1 starts on a constant date. Season N's dates derive from the season number, so the whole
calendar is a pure function of the save's inputs, as ticket 10's determinism invariant requires. A
real current date also makes age a real computation against `date_of_birth` rather than against a
season counter.

### One season shape for every nation

Every loaded nation runs the same August-to-May season in MVP. Real football does not: Nordic and
Russian leagues run a spring-to-autumn cycle, and those nations ship on the wrong one here. That is a
fidelity cost, accepted deliberately.

Per-nation cycles would stop `SeasonConcluded` being one moment. Exchange Links, Player Development,
Board Objective judgment, and Wage Budget derivation all fire at season end, and staggered cycles mean
one nation applies promotions while another is mid-season — moving clubs between competitions whose
fixture lists already reference them. **A per-nation calendar becomes worth its cost only when
cross-nation transfers exist**, since that is what first makes the offset observable to the player.

### What Continue stops at, and what it resolves

Advancing to date D resolves every unplayed fixture in the world dated on or before D, and stops at
the first date carrying a fixture in a **playable** competition.

Background fixtures must resolve as their dates pass or league tables go stale, so the choice is only
about how often the human is stopped, never about how often matches run — ticket 07 measured one match
at ~1.0 ms, so a 16,000-club world costs ~8 s of blocking JS per matchday under any of these rules.
Stopping at every date with any fixture anywhere would halt the human because a background third
division played on a Tuesday. Stopping only at dates where the human's own club plays would skip past
dates on which a rival's result changed the table the human is about to read.

`AdvanceCalendarResult` carries only playable-competition fixtures. Reporting every resolved fixture
would put thousands of results into one IPC payload per Continue.

### The season table

`season` stays a per-save singleton. Everything reading it is save-wide: Board Objective is per-season,
Player Development runs once per `SeasonConcluded`, Wage Budget derives at season start. Its
`current_matchday` column becomes `current_date`, so no column carries the retired sense of Matchday.

Per-competition progress — "this cup has reached round 4", "this league has concluded" — is derived
from that competition's own fixture rows rather than stored.

A Season concludes when no unplayed fixture remains for that season in any loaded competition, cup
final included. Competitions genuinely end on different dates, and the league table is already final
by the time a cup final plays, so Board Objective judgment still has its input at that moment.
Pulling later cup fixtures forward to keep one tidy end date would make the calendar lie about the
sport. Everything downstream of `SeasonConcluded` is unchanged and learns nothing about the stagger.

### Matchday, redefined

Matchday survives with a new meaning: **a date on which fixtures are played anywhere in the world**.
The competition-local number is a **Round**. The redefinition is stated explicitly in the glossary
rather than quietly swapped, because a reader holding the old definition would otherwise read the new
text as the old claim.

This keeps `MatchdayResolved`'s meaning intact — it already means "every fixture in this slice
resolved together", which under the advance rule above is exactly "every fixture dated on or before
D".

### Transfer Windows

Two date ranges per season, one pair globally, following from the single season shape.
`CONTEXT.md`'s "open until Matchday 1" and "opens immediately after Matchday 19" become dates.

Legality still reads `season.phase`. Five command handlers in `transfers.ts` call `isWindowOpen(phase)`
today; comparing `current_date` against stored ranges at each call site would spread one rule across
five readers. `nextCalendarBoundary` stops at window dates the way it stops at fixture dates, and stays
the single writer of phase.

The career begins at the pre-season window's open date, some weeks before the first league round.
That gives the pre-season window an actual open boundary: `startSeason` currently writes
`phase: 'pre_season'` directly, and the code carries a comment noting it hooks AI transfer activity
onto the window's *close* because the open has no boundary to attach to. A start date removes that
workaround and gives the human somewhere to stand before round 1.

### Where dates come from

A calendar template in code, per competition kind. A season's dates are a pure function of
`(season number, competition, round)`, evaluated once when fixtures are generated and materialised
onto the fixture row.

The template builds one ordered slot list per season, weekends before midweeks. Cup rounds reserve
their dates first; league rounds then draw from what remains. A 20-club double round-robin needs 38
slots and August-to-May supplies roughly 40 weekends, but the catalogue is free to describe a 24-club
league needing 46 rounds, and those overflow into midweek slots. Generation **fails loudly** when a
competition's round count exceeds the slots available, rather than silently double-booking.

### Fixture congestion

**A club never plays twice on one date.** This is an invariant the generator upholds and a test
covers, not a schema constraint.

Unique indexes on `(home_club_id, scheduled_date)` and `(away_club_id, scheduled_date)` were
considered and rejected: they miss the case of a club playing at home in a league fixture and away in
a cup tie on the same date. Only participant rows would close it, and fixtures are a home/away pair.
A half-covering index reads as a guarantee it does not provide.

### What this spec does not fix

The season start constant, the two window bounds, and the weekend/midweek slot values are generation
content, handed off like ticket 10's club-strength tuning constants. The spec fixes the structure —
a start-date constant, window bounds as month-day pairs, a slot list derived from them. Whether
August-to-May starts on the 8th or the 15th decides nothing about the shape of the data.

## Glossary reconciliation

`CONTEXT.md` is corrected in the same change, per this effort's standing preference. **Matchday**,
**Calendar**, **Season**, and **Transfer Window** all currently assert the overturned model;
**Continue**'s `_Avoid_` list bars "Next Day" on the grounds that the Calendar has no day-by-day
clock, which is still true — the Calendar jumps between dated events and never walks day by day, so
that entry stands as written. **Round** enters the glossary as a new term.

## Alternatives considered

- **Round number alone, with dates derived from a template at read time.** Rejected: it makes the
  `scheduled_date <= D` sweep impossible, and the round-to-date function would have to be re-run for
  every fixture in every query that orders the world by time.
- **Per-nation season shapes.** Rejected for MVP on the `SeasonConcluded` fragmentation above, with
  the reintroduction condition recorded: cross-nation transfers.
- **Integer day-offset dates.** Rejected: ~2 MB saved against a 335 MB measured save, in exchange for
  unreadable rows and conversion at every boundary.
- **Retiring "Matchday" entirely in favour of "Round".** Rejected: it would rename `MatchdayResolved`,
  whose meaning is unchanged, and discard a football word the player recognises for a term the
  redefinition can carry.
- **Comparing `current_date` against window ranges at each transfer command.** Rejected: five call
  sites become five readers of one rule; `season.phase` keeps one writer and leaves `transfers.ts`
  untouched.
- **Ending the season at the last league round, pulling cup finals forward.** Rejected: it distorts
  the sport to avoid a stagger that nothing downstream can observe.
- **Capping MVP competitions at a round count the weekends hold.** Rejected: it would push a calendar
  limitation into the world catalogue, where nothing would explain why a nation's real second tier
  cannot ship at its real size.
- **Unique indexes as congestion enforcement.** Rejected as half-covering, above.

## Acceptance criteria

- `fixtures` carries `scheduled_date` (ISO text) and `round`, with `round >= 1` and no upper CHECK.
- `season` carries `current_date` and no `current_matchday`; no CHECK mentions 38.
- Advancing to date D leaves no unplayed fixture in the world dated on or before D, and lands on a
  date carrying a playable-competition fixture.
- Two saves generated from the same inputs produce byte-identical `scheduled_date` values.
- Generation raises rather than double-books when a competition's rounds exceed the season's slots.
- No club holds two fixtures on one date in a generated world.
- The five `isWindowOpen` call sites in `transfers.ts` are unchanged.
- `SeasonConcluded` fires exactly once per season, after the last dated fixture of any loaded
  competition.
- `CONTEXT.md` defines Matchday as a date, Round as competition-local, and Transfer Windows as date
  ranges.

## Risks

- **Nations on a real spring-to-autumn cycle ship on the wrong calendar.** Knowingly accepted; visible
  to anyone who knows those leagues, and reversible only by taking the per-nation cost above.
- **The shipped chrome contradicts this.** `Season {n} · Matchday {m}/38` and "no day-or-date copy"
  are acceptance criteria of an `implemented` note. The renderer will read wrong until that note is
  reopened, and this decision does not do that work.
- **Congestion is unenforced at the schema.** A generator bug double-books a club and only a test
  catches it. Accepted over an index that would look like a guarantee.
- **The slot allocator is a new failure mode at world generation.** A catalogue edit that pushes a
  competition past the available slots fails career creation rather than degrading. That is the
  intent, but it makes the catalogue and the calendar template coupled in a way neither file states.
- **Every Matchday-keyed event predates dates.** The superseded note flagged retrofitting a date onto
  existing events as "a real but bounded cost". This is where that cost falls due; ticket 11 owns
  what it means for the event streams.
