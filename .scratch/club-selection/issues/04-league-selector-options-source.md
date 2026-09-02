# 04 — League selector options source

Type: grilling
Status: resolved

## Question

What populates the league selector, given that the world database has no league dimension?

There is no `competitions` or `leagues` table, and `clubs` carries no league foreign key, so
`getClubSelection`'s `FROM clubs` is not merely unfiltered — there is nothing to filter by. The
only league identity that exists anywhere in the creation flow is the `LeagueSelectionSnapshot`
on `CreationSession`, produced by the League and Nation Selection screen and carried forward
without generation honouring it.

The selector is built degenerate on purpose: correct in shape, single-option today.

Decisions this ticket owns:

- **The options.** Read the Effective Selection's `playable` competitions off the session
  snapshot, or ship a placeholder naming the one generated League? The first is honest about
  intent and wrong about the world; the second is honest about the world and useless as a
  selector.
- **What a selection does today.** With every generated club belonging to the single implicit
  League, changing the selector cannot change the list. Does it no-op, disable, or filter
  against a league attribution that this effort adds to `ClubSelectionRow` as a constant?
- **Whether `ClubSelectionRow` gains a league field now.** Adding `leagueId` / `leagueName`
  that every row answers identically is dead weight until generation is multi-league — but
  retrofitting it later touches the contract, the query, and every consumer.
- **The disabled and single-option presentation.** A select with one option is a common
  accessibility trap: it reads as interactive and isn't.

## Answer

The selector is built degenerate: the single option names the one generated League from a new
shared `LEAGUE_NAME` constant, not the session snapshot; selecting it is inert chrome while the
world holds one League; `ClubSelectionRow` gains no league field now (the identity scheme belongs
to the multi-league effort); and it renders as a disabled native `<select>` with helper text, never
the enabled single-option trap.

**Resolved as [Agent Note: The league selector sources a named, inert, single-option control](../../../.agents/notes/proposed/architecture/2026-09-01-league-selector-options-source.md).**
