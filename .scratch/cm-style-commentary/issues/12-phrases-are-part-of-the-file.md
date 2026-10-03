# 12: Phrases are part of the commentary file

Spec: [spec.md](../spec.md)

**What to build:** a `[Phrases]` section in the commentary file for the words the engine still builds
in code: the injury phrases (`{injury}`), the score format (`{score}`), and the words for `{side}`. A
translated file can then translate every word the commentator says.

**Acceptance:** a file that sets the phrases gets them in its lines; a file without them gets the
shipped ones; a phrase line using an unknown name or placeholder is skipped and reported.

**Blocked by:** 02

**Status:** resolved

## Answer

- `[Phrases]` holds `injury.<type>`, `score` (with `{home}`, `{away}`, `{homeScore}`, `{awayScore}`),
  `side.left` and `side.right`, written `name = text`. The engine's English injury phrases and score
  format are gone from code (`commentary.ts`); `CommentaryTable` gains `phrases`.
- A missing phrase falls back to the shipped one; an unknown name, an empty text or a placeholder the
  phrase lacks is skipped and reported. `[Phrases]` counts as a section, so an older file is offered it.
- The shipped file is version 2 for the new section.
- Tests: the phrases describe in `packages/game-engine/test/match/commentary-file.test.ts`; version
  assertions there and in the desktop main test now read the shipped version instead of hard-coding it.
