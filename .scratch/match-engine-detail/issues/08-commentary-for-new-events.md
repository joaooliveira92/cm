# Commentary and the reveal for new events

Type: grilling
Status: resolved
Blocked by: 06

## Question

The live feed reveals the timeline at a set pace and commentary is driven by an editable commentary
file with highlight levels (see the cm-style-commentary effort). Which new events get commentary lines,
which are silent, and how does the reveal pace treat silent events so a match does not slow down or
stall? Does a highlight level hide them? Do tallies (if ticket 06 chooses them) ever speak?

## Answer

**New events are silent: each still produces exactly one commentary line, marked silent, with no text
and no delay, which the pacer reveals at once and the feed never draws.**

- **The invariant this protects.** Commentary is built as one line per Match Event (`events.map` in
  the engine's commentary module), and the live cut sends the number of *revealed lines* as the
  revealed-event count. Every live statistic, rating and the command stamp (M+1 after the last revealed
  event) depends on lines and events staying one-to-one. Dropping silent events from the line list
  would desynchronise all of them.
- **Silent line.** `Tackle`, `Interception`, `HeaderDuel` and `PossessionTally` map to a line flagged
  silent: no commentary key, no text, delay 0. The pacer, on taking a silent line, reveals it and
  immediately takes the next without scheduling a beat, so a match's live duration does not grow. The
  feed and the commentary screens skip silent lines when rendering. A test asserts line count equals
  event count for a seeded match with every new kind present.
- **Highlight levels** do not apply to silent lines: they are never shown at any level, and they never
  count as a "highlight" for the level's filtering.
- **Commentary file.** Gains no sections for the new kinds in this effort; giving one a voice later is a
  commentary-file change that clears the silent flag for that kind.
- **Fouled player.** The existing `Foul` and `Penalty` lines gain a `{fouled}` token, filled when the
  `Foul` carries `fouledPlayerId`; a line using the token is skipped in favour of one without it when
  the field is absent.
- Helpers that read the `previous` event (`KeyPass` and shot-kind rules) are unaffected, because
  attribution events are appended after the slice, never between a chance and its outcome
  ([03](03-attribution-without-moving-the-seed.md)).
