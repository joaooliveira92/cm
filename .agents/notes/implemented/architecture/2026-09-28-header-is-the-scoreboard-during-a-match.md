# Agent Note: The header is the scoreboard during a match

Status: implemented

## Problem

During a match, the career header showed the same things as on any other day: club identity,
search, Preferences, Save, Continue, and a second row with the date, league position, points and
games played. None of that matters mid-match. The score, the thing that does matter, sat in a
neutral band inside the Match day screen and disappeared when the manager opened Tactics or
Substitutions. The
[match-day visual language note](../../proposed/architecture/2026-08-31-match-day-visual-language.md)
kept the chrome identical on purpose and kept the scoreboard neutral because no club colours
existed. Club colours exist now (see
[club colours and the header scope](2026-09-03-club-colours-and-the-header-scope.md)).

## Decision

From kickoff until the result is accepted, both header rows are replaced by a scoreboard
(`chrome/header/MatchHeader.tsx`, `match/Scoreboard.tsx`):

- **Two halves, one per club.** Each half is painted in its club's primary colour pair. The club
  name sits at the outer edge and the score box at the seam where the halves meet. Each half uses
  the same mechanism as the career header (`club-header` plus `clubHeaderStyle`), so an unreadable
  pack pair gets the same contrast correction. The score boxes stay white with dark numerals,
  whatever the clubs wear.
- **What remains:** the sidebar toggle, back/forward, and a match clock (the revealed minute,
  `HT`, `FT`). Search, Preferences, Save, Continue and the season row are hidden. Continue was
  already suspended mid-match.
- **The scoreboard is a button to Match day.** With Continue ("Go to Match") gone, a manager who
  left Match day, even at full time, still has a way back.
- **It follows the match session, not the screen.** The header reads `match/session.ts`, which
  outlives Match day and ends at `clearActiveMatch` when the result is accepted, so the scoreboard
  stays up on every screen mid-match. `session.ts` became subscribable for this. Its notifications
  are deferred to a microtask because Match day records revealed lines from inside a state updater.
- **Colours come with the match data.** `MatchSummary` carries `homeClubColours` and
  `awayClubColours`, resolved in `matchSummaryOf`. They are not added to `ClubSummary`, following
  the club colours note: the data the scoreboard reads is where its colours belong.
- **The Match day screen no longer draws its own scoreboard.** The score appears once, in the
  header.

## Alternatives considered

- **Keep the neutral scoreboard on the screen and colour it.** Rejected. The score would still
  vanish when the manager leaves Match day, and the header would still spend its space on
  information that doesn't matter mid-match.
- **Paint the whole header in the user's club colours around a neutral score.** Rejected. It favours
  one side on a surface that shows both clubs.
- **Switch on the scope-state `match` readout that `CommentaryProvider` publishes.** Rejected. It is
  cleared when Match day unmounts and at full time, so the header would revert when the manager opens
  Tactics mid-match or reaches full time.

## Consequences

- The secondary row's match readout (`matchReadout` in `career-header-state.ts`) no longer renders:
  whenever a match would set it, the header is showing the scoreboard instead. It still gates
  Continue through scope state.
- After an app restart, the scoreboard returns only once Match day resumes the awaiting match,
  because the session lives in renderer memory.
- `e2e/launchApp.ts`'s `matchScore` now means "a match is on", not "Match day is showing".
