# Typical per-match figures to calibrate against

Type: research
Status: resolved

## Question

What per-team and per-player counts does a top-flight match produce, and what did CM 03/04 show, for
passes and completion rate, tackles and tackles won, headers and headers won, interceptions, fouls
suffered and possession spread? Primary sources: published league data (Opta-derived season averages)
and CM 03/04 community documentation. The answer is a short table of target ranges that
`calibrate.test.ts` can assert, with each figure's source.

## Answer

**Real Premier League figures from Opta (2006/07–2024/25) and StatsBomb open data are recorded in
[the calibration research](../../../docs/research/match-engine-calibration-figures.md); CM 03/04's one
recoverable match screen is low-confidence "feel", not a target.** Per team per match: tackles 17–21
attempted, about 60% won (10–13); interceptions 8–12; aerial duels 27–44 contested, about half won;
fouls 11–13; passes 440–480 at 76–83% (not modelled, [02](02-record-or-simulate.md)). About 70% of
team-matches sit between 40% and 60% possession; over 60% in roughly 28% of matches when possession is
measured by time, which is the method closest to this engine's share of minute-slices
([04](04-recording-possession.md)). Providers define "tackle won" and possession differently, so every
calibration assertion names its source and method.
