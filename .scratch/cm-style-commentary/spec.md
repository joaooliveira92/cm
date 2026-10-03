# Spec: CM-style commentary playback

Status: ready-for-agent

## Problem

Match day reveals every Commentary Line on one fixed 350 ms tick, whole, in a scrolling log. Championship
Manager 01/02 and 03/04 drove the same kind of templated commentary from a data file where every event also
carried playback fields: a display delay in milliseconds (800 to 2700 in the shipped file), a follow-on flag
that continues the previous line instead of replacing it ("X steps up for the free kick ... and he spoons
it!"), a flashing flag for big moments, and a display probability. That playback, not the text, is what
gave the feed its suspense.

## Decisions

- Playback is game-design data authored beside the templates in `packages/game-engine`: a delay, flash flag
  and display chance per Match Event tag, and follow-on parts split on `|` inside a template.
- A Commentary Line stays one per Match Event. Follow-on parts live inside the line, so the event cursor and
  the injury pairing are unchanged.
- `CommentaryLineView` gains optional `parts`, `flash`, `quiet` and `clubId`. A line without them plays as
  one part on the default reveal interval.
- Pacing stays a renderer concern. The renderer plays each part for its delay, scaled by a renderer-local
  speed preference (Slow, Normal, Fast). A line is revealed (score, log, injury prompts) when its last part
  shows, never before.
- A quiet line (the display-chance draw failed) is revealed at once and never shown in the bar; the log
  still lists it.
- Match day shows a CM-style commentary bar, in the colours of the club the line belongs to, above the log.
  Flash lines blink in the bar.

## Out of scope

Sound, and ambient filler lines. (Highlight levels were out of scope here at first; ticket 08 added them
when the follow-up recommendations were approved.)

## Addendum, 2026-10-01: a player-editable commentary file

The templates and their playback move out of code into a plain-text file players can edit, like
Championship Manager's `events.cfg`. Placeholders follow CM's `<p1>`/`<t1>`: `{player}` and `{team}` for
the player and club a moment is about, `{player2}` and `{team2}` for the second player and the other club,
plus `{score}`, `{injury}`, `{side}` and `{formation}` where a section offers them. Playback settings
(`delay`, `flash`, `chance`) move from per Match Event tag to per section.
