# Match commentary text-generation approach

Type: grilling

Blocked by: 02

Status: resolved

## Question

Now that the match engine's v1 Match Event vocabulary is locked (`MatchStarted`, `Goal`,
`ShotOnTarget`, `ShotMissed`, `BigChance`, `YellowCard`, `RedCard`, `Injury`, `Substitution`,
`HalfTimeReached`, `FullTimeWhistle` — see [Match engine resolution algorithm](02-match-engine-algorithm.md)),
decide how each Match Event becomes the line(s) of text the Match day screen displays: templated
strings (a pool of phrasings per event type, chosen by variety/context), a lightweight
generation/composition approach, or something in between. Also decide what per-event context the
templates/generator need beyond the event payload itself (e.g. team names, scoreline-so-far, player
names) and whether commentary density varies (e.g. every Minute-Slice gets a line, or only slices with
an event).

## Answer

Resolved via a grilling + domain-modeling session. Canonical vocabulary recorded in
[CONTEXT.md](../../../CONTEXT.md) under "Match commentary", architecture rationale in
[ADR-0008](../../../docs/adr/0008-templated-match-commentary.md).

**Generation approach**: Pure templated strings — a fixed pool of Commentary Templates per Match Event
type, one picked at random per firing. No composition/generation engine; rejected as disproportionate
effort for a v1 text-only feed.

**Per-line context**: Player name(s) read straight from the Match Event payload (the engine already
resolves the actor for Goal/ShotOnTarget/ShotMissed/BigChance/YellowCard/RedCard/Injury/Substitution).
Team name(s) baked into the line (single scrolling feed, no two-column layout). Running scoreline
baked into Goal, HalfTimeReached, and FullTimeWhistle lines specifically. Minute is *not* baked into
template text — the UI renders it separately from the event's minute field.

**Density policy**: A Commentary Line is only emitted when a Match Event fires (including the three
boundary events MatchStarted/HalfTimeReached/FullTimeWhistle). Quiet Minute-Slices produce nothing —
no ambient/filler commentary.

**Repetition avoidance**: Per match, per event type, track the last-used Commentary Template index and
exclude it from the next random pick for that same event type.

**Storage**: Commentary Templates live in `packages/shared` as fixed game-design data, parallel to
Position Weights and Role Weights.
