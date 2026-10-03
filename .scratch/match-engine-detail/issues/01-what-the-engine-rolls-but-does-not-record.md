# What the engine rolls but does not record

Type: research
Status: resolved

## Question

Which facts does the match engine already decide, per minute-slice or per attack, and then discard
without emitting a Match Event? Known so far: `PhaseStrengthResolver.resolve` rolls `homeHasPossession`
every slice; `resolveOutcome` in `chanceTypeResolvers.ts` weighs the defence as an average of the
defensive and midfield slots, so no defender is named; the cross resolver weighs heading for the
finisher pick. List every such fact across `packages/game-engine/src/match/simulate/`, and for each say
(a) whether recording it consumes no extra random draws, (b) which CM column it could back (Pas, Cmp,
Tck, Won, Hea, Won, Key headers, Int, Run, Fld, possession), and (c) what a named player would have to
be picked from if it is a team-level fact today. Local code only; no external sources.

## Answer

Read from `packages/game-engine/src/match/simulate/` on 2026-10-03. "No extra draw" means recording the
fact consumes nothing from the match's random source.

| Fact the engine decides | Where | Recorded today? | Extra draw to record? | Could back | Named player? |
|---|---|---|---|---|---|
| Which side has the ball, once per minute-slice (~92 a match, including the two stoppage slices) | `PhaseStrengthResolver.resolve`, `homeHasPossession` | No | No | Possession | Team-level |
| The side in possession fails to create an attack this slice (the `eventProbability` roll in `EventResolver.resolveEvents` fails) | `eventResolver.ts` | No | No | Tck (won), Int | Team-level: needs a defender picked |
| The defence's quality against a shot, as an average of every defensive and midfield slot | `resolveOutcome` in `chanceTypeResolvers.ts` | Only the outcome | — | Blocks | Never named; the average has no individual |
| A contact duel between a named defender and a named attacker (~6% of slices) | `resolveContactDuels` in `injuryResolver.ts` | Only when it injures | No | Tackle attempts | Both named, no winner decided |
| The fouling defender | `resolveFoul` in `minuteResolvers.ts` | Yes (`Foul`) | — | Fou | Named |
| The player fouled | — | No | — | Fld | Not decided anywhere; fouls are rolled on the side out of possession, so the victim belongs to the side in possession |
| The cross finisher, picked with weights led by heading (or near/far post by aim) | `pickFinisher` | Finisher only, as a shot | No | Hea attempted / won | Finisher named; his marker is not |
| A cleared cross or saved shot leading to a corner | `resolveSetPieces` (`CORNER_CHANCE`) | The `Corner` only | No | Defensive headers won | Clearing defender not named |
| The chance creator for every chance type, including the runner of `RunWithBall` | `pickChanceType` | Yes (`KeyPass`, `assistPlayerId`) | — | Key, Run | Named |
| Passing of any kind | — | — | — | Pas, Cmp | Nothing decides a pass; there is no pass, chain or completion model |

Two constraints any recording must respect:

- `resolveSetPieces` scans the events emitted in the slice by tag and draws for each `ShotOnTarget`,
  `Cross` and `Foul`; the stoppage roll counts `STOPPAGE_CAUSING_TAGS` in the half. A new event placed
  among them is harmless only if its tag triggers neither, so new events are safest appended after
  set pieces resolve.
- The AI controller does not read events (`aiController.ts` imports only `MatchHalf`), so new tags cannot
  change AI decisions.
