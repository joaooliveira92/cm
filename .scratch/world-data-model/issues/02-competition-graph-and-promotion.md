# 02 - The competition graph: tiers, dependency edges, and promotion/relegation

Type: grilling
Status: resolved

## Question

Competition is defined in `CONTEXT.md` — a League, a domestic cup, a reserve competition, or a
cross-border tournament, carrying dependency edges — and has no table behind it. Charting settled that
promotion and relegation ship, which overturns `CONTEXT.md`'s current statement that they do not exist.

Decide the competition entity and the graph it sits in:

- What a Competition row holds: canonical id, nation, kind (league / cup), tier within its nation's
  pyramid, size, and whatever the scheduling model from ticket 01 requires of it.
- How dependency edges are persisted, given the Setup Catalogue already expresses them and already
  resolves closure server-side. Are edges a table, or does the catalogue stay code and only the
  *resolved* Effective Selection land in the save?
- How promotion and relegation are expressed: slot counts on the competition, or a separate relation
  between two competitions? What happens at the top of a pyramid and the bottom, and what happens when
  a division's neighbour is not loaded because the player selected a narrower scope?
- How a Club's membership works across seasons. A club has a *generated home* competition and a
  *current* competition, and after the first relegation those differ. Which is authoritative, and is
  membership a column on `clubs` or its own table keyed by season?
- What identity a Competition has across seasons — does a season of a competition need its own row
  (standings, champion, participants), and if so, is that this ticket's `competition_season` or ticket
  06's generalized `season`?

Reconcile `CONTEXT.md`'s League, Season, and Fixture entries in the same change.

## Answer

**The catalogue stays code and the save records the resolved world: an activated-only `competitions`
table, symmetric Exchange Links carrying promotion and relegation as one fact, a closed world at the
edge of the chosen scope, and membership answered from participant rows rather than a column.** See
[Agent Note](../../../.agents/notes/proposed/architecture/2026-09-01-competition-graph-and-promotion.md).
