# Agent Note: Templated match commentary, no generation engine

Status: implemented

> Migrated from ADR-0008 when the numbered ADR layer was retired.

## Problem

Match day needs commentary from the event timeline. The range runs from a fixed template pool to a
composition engine assembling lines from interchangeable phrase fragments, and the choice sets how much
engineering the feed costs for how much perceived variety.

## Decision

Each Match Event becomes a Commentary Line by picking a random Commentary Template from a pool and
filling its placeholders from the event: `{player}` and `{team}` for the player and club the moment is
about, `{player2}` and `{team2}` for the second player and the other club, and `{score}`, `{injury}`,
`{side}` or `{formation}` where a pool offers them.

The pool is chosen by the event and the events before it, never the ones after, because a match command
resimulates the future and a line the player has read must not change. A shot reads the set piece or
chance that produced it (a penalty's miss is narrated as a penalty), a key pass names the finisher of the
chance event before it, a goal says whether it opened the scoring, levelled, led, extended or replied, and
the full-time line names the winner. A Goal line is the one two-sentence draw: a finish, then a scoreline
sentence. That is as far as composition goes.

A lightweight composition or generation approach was considered and rejected: for a single-player,
text-only v1 feed, a generous template pool per event type gets most of the perceived variety at a
fraction of the engineering cost. Per-match repetition is mitigated cheaply with a shuffle bag per pool:
no template repeats until its whole pool has been used, and a refilled bag never opens with the template
that closed the last one.

Each line also carries playback, taken from Championship Manager 01/02 and 03/04, whose `events.cfg` gave
every commentary event a display delay, a follow-on flag, a flashing flag and a display probability
(see [the effort spec](../../../../.scratch/cm-style-commentary/spec.md)). Each section of the Commentary
File sets a delay, flash flag and display chance for its lines; a Goal plays by its `Goal:<kind>`
section. A `|` inside a template splits it into follow-on parts,
so a shot plays its build-up, holds, then its outcome. A line that loses its display-chance draw is quiet:
it is revealed at once and never shown in the commentary bar, but the log still lists it. Lines that change
the match (goals, cards, injuries, substitutions, penalties, half and full time) have no display chance and
always show. Each section also has a highlight level (`key`, `extended` or `full`), after CM's event
priority; a player watching Key or Extended highlights gets only lines at or above that level in the
bar, and the rest are handled like quiet lines. Moments that change the match are always `key`. The
renderer owns the clock: it plays each part for its delay, scaled by a renderer-local speed
preference, and reveals a line only when its last part shows, so the score and the injury prompts never
run ahead of the bar.

Quiet Minute-Slices with no Match Event produce no Commentary Line. There is no ambient or filler
commentary. This keeps the feed's density identical to the event timeline's density, and avoids needing a
large filler-phrase pool purely to avoid repetition across roughly 90 mostly-quiet slices.

Commentary Templates and their playback live in a plain-text, player-editable Commentary File, again
after Championship Manager's `events.cfg`. The game ships `packages/game-engine/data/events.cfg`, which is
the source of truth for the game's own lines. The main process writes a copy to the user data folder the
first time a match is read, and reads it again whenever it changes. The engine owns the format: the list
of sections, the placeholders each section allows, and `parseCommentaryFile`. It does no file IO, so it
stays pure. Nothing in a player's file can stop a match. A line using a placeholder its section lacks is
skipped, a section left with no usable lines or a missing setting takes the shipped file's, a `chance`
on a moment that changes the match is ignored, and every problem is logged with its line number. The
templates are never event-sourced state, and the match simulation never reads them, so editing the file
cannot change a result.

## Alternatives considered

- **A phrase-fragment composition engine.** Rejected: substantially more engineering for variety a large
  enough template pool already delivers at this scale.
- **Splitting follow-on parts into separate Commentary Lines.** Rejected: the event cursor and the
  renderer's injury pairing both count one line per Match Event.
- **Templates as constants in code.** Replaced: players could not edit them, which was the point of
  Championship Manager's file, and a code-defined table hid the wording from anyone not reading TypeScript.
- **Strict parsing that rejects a whole broken file.** Rejected: one typo in a player's edit would cost
  every line they wrote. Skipping per line and falling back per section keeps the rest.
- **Ambient commentary on quiet minutes.** Rejected: it requires a large filler pool to avoid obvious
  repetition, and decouples feed density from event density for no informational gain.

## Consequences

- Adding commentary variety means adding lines to `events.cfg`, not touching code. A new section, or a new
  placeholder, is a code change: it goes in `commentarySections.ts` and in the shipped file together.
- No pronoun is hard-coded either: lines write `{he}`, `{him}` and `{his}` for their player, filled from
  `CommentaryNameResolver.pronounsOf`, which callers omit while every league is men's.
- No commentary word lives in code. The phrases `{injury}`, `{score}` and `{side}` are built from are a
  `[Phrases]` section of the file, so a translated file translates everything the commentator says.
- Every `.cfg` in the commentary folder can be chosen in Preferences, as CM shipped `events_eng.cfg`
  and its siblings; the choice is a file name in `commentary/chosen.txt`, and a chosen file that
  disappears falls back to `events.cfg`.
- A player's copy of the file is never rewritten behind their back when the shipped one changes; their
  sections win, and sections new to the game come from the shipped file at run time. The shipped file
  carries `version = N`; when a player's file is older and lacks sections, Preferences offers to append
  them word for word, or to keep the file as it is. Either answer raises the file's version, so the
  offer is made once per release. Raise the version whenever the shipped file gains a section.
- The feed is sparse by design; a quiet match reads as quiet.
- Commentary can never introduce information the event timeline does not carry. Templates follow from
  that: no assist on a set piece, no man count after a red card, no body part beyond the injury type.
