# 06 - Season and fixture generalization, including cup rounds

Type: grilling
Status: open
Blocked by: 01, 02

## Question

`season` is a per-save singleton with a `current_matchday` capped at 38; `fixtures` hard-codes a
matchday range of 1–38 and a home/away pair. Neither survives multiple competitions, and neither can
express a knockout tie. Charting settled that domestic cups ship as real knockout competitions with
bracket progression.

With the calendar unit (01) and the competition graph (02) settled, decide the scheduling tables:

- What replaces the `season` singleton: one row per (competition, season), a per-save season plus
  per-competition progress, or something else. Where does "which season is the save in" live?
- What a Fixture becomes once it can belong to a league round or a cup round: does one table serve
  both, with nullable round metadata, or do knockout ties get their own table?
- How a bracket progresses. A tie needs participants that may not be known when the round is
  scheduled, a winner, and a rule for forcing one (extra time, penalties — and whether the match
  engine, which currently plays exactly 90 minutes plus stoppage, can even produce them).
- Whether two-legged ties exist in MVP, and replays.
- How fixture generation is seeded and kept reproducible when a bracket's shape depends on results.
- What happens to `board_objective`, which is keyed on the season singleton and judges a league
  position, once a club plays in more than one competition.

Reconcile `CONTEXT.md`'s Season, Fixture, and Matchday entries alongside ticket 01's changes.

## Handoff from ticket 02

[02](02-competition-graph-and-promotion.md) settled that a Competition's identity is stable across
Seasons — the `competitions` row lives for the whole save — and that per-Season state (participants,
standings, champion) hangs off a separate per-competition-per-Season row. It deliberately did **not**
name or shape that row: this ticket owns it. Two requirements land here as a result:

- **Membership is participation.** There is no `clubs.competition_id`; a club's current competition is
  its participant row for the current Season, and its generated home is its participant row for Season 1.
  The participant relation must therefore answer both, for leagues and cups alike.
- **Final positions are frozen, not derived.** At `SeasonConcluded` the rollover writes each competition's
  final standings into its per-Season row, because promotion reads the League Table projection at exactly
  one instant and the next Season's fixtures overwrite its inputs.

The invariant 02 relies on: for every competition and Season, the participant count equals
`competitions.club_count`.
