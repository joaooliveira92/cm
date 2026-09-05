# 01: Advancing the calendar through the UI skips the season-complete moment entirely

Type: bug
Status: needs-triage

## What was measured

Found on `dev` at `9cc3ca1` while repairing the e2e suite. Seeded `Seed: before-season-end`
(30 `advanceCalendar` calls), opened League Table, then clicked "Advance Calendar" once per step and
read the header after each:

```
STEP 7:  enabled=true | Calendar: Season 1 · 15 May 2027   Position: 6th  Points: 55
STEP 8:  enabled=true | Calendar: Season 1 · 22 May 2027   Position: 5th  Points: 58
STEP 9:  enabled=true | Calendar: Season 2 · Pre-season    Position: 2nd  Points: 0
```

One advance steps from the last matchday of Season 1 straight into Season 2 pre-season. The
`season_complete` phase is never rendered, and the Advance Calendar button — which
`LeagueTableScreen.tsx:83` disables on `phase === "season_complete"` — **stays enabled** across the
rollover. Sampled at every step for 16 advances; it never once disabled.

## Why this looks wrong

The phase exists and is reachable from the main process: `seedConcluded` loops `advanceCalendar`
until its return value reports `seasonConcluded`, stops there, and the resulting save renders a
board verdict (`app.spec.ts` "Season Summary screen shows a verdict for a concluded, seeded save"
passes against it). So the model produces the state; the UI path advances through it without ever
presenting it.

That means a player never sees their season end. The board verdict, the Season Summary moment, and
the disabled-Advance affordance that exists in the code are all unreachable by playing normally —
they are only reachable by loading a save that was already advanced past the line programmatically.

The dead `disabled={... phase === "season_complete"}` branch in `LeagueTableScreen` is the strongest
signal that this is unintended rather than a deliberate auto-rollover: someone wrote the stop, and
nothing ever triggers it.

## Impact on the e2e suite

`journeys.spec.ts` carried "advancing the calendar to season conclusion surfaces a Season Summary
verdict", which waited on `/season complete/i`. It could never pass: with a small advance bound it
stopped short of the end, and with a larger one it rolled into Season 2 and cleared the state it was
waiting for. It has been removed, with the measurement recorded at the removal site, because the
claim it made is not true of the shipped UI. The verdict itself stays covered by `app.spec.ts`
through the concluded seed.

Restore an equivalent journey once the UI stops at the conclusion.

## Open question for triage

Is the auto-rollover intended, with the Season Summary meant to be reviewed retrospectively from the
Analysis section? If so, the dead `disabled` branch should go and the Season Summary needs an entry
point that does not depend on catching a transient phase. If not, `advanceCalendar` should stop at
`seasonConcluded` and require an explicit "start next season" action.

- [ ] Decide: intended auto-rollover, or a missing stop
- [ ] Reconcile `LeagueTableScreen`'s dead `season_complete` disable with that decision
- [ ] Restore the UI-driven conclusion journey in `journeys.spec.ts` if the stop is added
