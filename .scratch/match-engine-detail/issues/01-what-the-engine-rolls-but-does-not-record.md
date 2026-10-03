# What the engine rolls but does not record

Type: research
Status: ready-for-agent

## Question

Which facts does the match engine already decide, per minute-slice or per attack, and then discard
without emitting a Match Event? Known so far: `PhaseStrengthResolver.resolve` rolls `homeHasPossession`
every slice; `resolveOutcome` in `chanceTypeResolvers.ts` weighs the defence as an average of the
defensive and midfield slots, so no defender is named; the cross resolver weighs heading for the
finisher pick. List every such fact across `packages/game-engine/src/match/simulate/`, and for each say
(a) whether recording it consumes no extra random draws, (b) which CM column it could back (Pas, Cmp,
Tck, Won, Hea, Won, Key headers, Int, Run, Fld, possession), and (c) what a named player would have to
be picked from if it is a team-level fact today. Local code only; no external sources.
