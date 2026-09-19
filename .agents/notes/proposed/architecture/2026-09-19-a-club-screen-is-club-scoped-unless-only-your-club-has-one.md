# Agent Note: A club screen is club-scoped unless only your club has one

Status: proposed

## Problem

The renderer carries two parallel families of club screen, and several imported Group C screens have
a placeholder in **both**:

- **Save-scoped nav destinations** reached from the Club section with only a `saveId`, implicitly
  about the manager's own club — `clubInfo`, `finances`, `boardConfidence`, `clubHistory`.
- **Club-scoped drill-downs** at `club/$clubId/…`, about any club — `clubInformation`,
  `clubFinancesDetail`, `clubSquadDetail`, and six more.

Screen 34 Club General Information is `clubInfo/` *and* `clubInformation/`, both carrying
`aria-label="Club Information"`. Screen 39 Club Finances is `finances/` *and* `clubFinancesDetail/`.
The import has no opinion, because it was written for a game where a club screen is a club screen.

Answering this per screen is how a codebase acquires twelve inconsistent answers to one question.

## What ruled it out as an information question

The obvious hypothesis is that the two families differ by what the manager is *allowed* to see: my
finances in full, a rival's in outline. `CONTEXT.md` closes that off.

> A Club never carries a hidden value of its own for an Attribute Range to narrow. … a Club-level
> reading is derived from [Players].

Uncertainty in this game lives at the **Player** level, through Scouting Progress over Attributes,
Potential Ability, Injury Proneness and Transfer Value. There is no club-level fog mechanism at all,
and Screen 38 Club Staff already shows any club's staff to anyone who navigates to it.

So visibility is never the discriminator, and "one screen with hidden fields" is a design this game
has no machinery for.

## Decision

**A Group C screen is club-scoped and exists once. Any nav entry for it is a thin own-club resolver
over that one screen.** The precedent is Screen 38: `ClubStaffScreen` takes a `clubId`, and the Club
section's Staff entry resolves the own club from `getSquad` and hands off.

**The exception is subject existence, not visibility.** Where the subject exists *only* for the
manager's own club, there is one save-scoped screen and no club-scoped route at all.

The test is a schema question with a crisp answer: **does a rival club have a row?**

- `club_budgets` is keyed on `club_id` — **one row per club**. Every club has budgets, so Screen 39
  is club-scoped, and `finances/` collapses into `clubFinancesDetail/`.
- `board_objective` is keyed on `season_number` — **one row per season**, carrying the human club's
  id. A rival club has no Board Objective *at all*. So Screen 47 is save-scoped, and it should never
  acquire a `club/$clubId/board-confidence` route.

That is the whole rule. It decides all twelve without a judgement call per screen, and where it
needs an input, the input is a primary key rather than an opinion.

## Consequences

- **Two duplications collapse.** Screens 34 and 39 become one screen each, club-scoped, with the nav
  entry resolving the own club. `clubInfo/` and `finances/` go; `clubInformation/` and
  `clubFinancesDetail/` stay.
- **Screen 47 keeps its save-scoped screen and gains no drill-down.** Not because a rival's board
  confidence is secret, but because it does not exist.
- **An interactive own-club screen is not a second screen.** The shipped `squad/` sorts, selects and
  drills down; an any-club squad is a read. That is a difference in *capability*, and the resolver
  pattern handles it — same screen, affordances gated on whether the club is the manager's, exactly
  as `ClubStaffScreen` already marks a club that is not the user's. Two screens for this reason
  would be two implementations of one list.
- **The rule is not Group C's alone.** Group L has the same shape for nations and competitions, and
  should quote this rather than re-deriving it. The discriminator generalises: ask whether the
  subject has a row for the thing you are looking at.

## Alternatives considered

- **Two screens per subject, always.** Honest about the own/other distinction, and wrong about this
  game: it doubles twelve screens to serve a distinction that has no mechanism behind it, and each
  pair immediately starts to drift.
- **One save-scoped screen per subject, with the club as a selector.** Collapses the duplication too,
  but breaks every existing drill-down entry point — a league-table row names a club and expects to
  land on it, not on a screen where it must be re-chosen.
- **Decide per screen.** What the codebase was doing. It produced two placeholders for Screen 34 with
  identical `aria-label`s and nobody noticed.
