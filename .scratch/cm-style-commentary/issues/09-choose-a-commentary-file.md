# 09: Choose a commentary file

Spec: [spec.md](../spec.md)

**What to build:** every `.cfg` in the commentary folder is a choosable commentary file (another language,
a community file), picked in Preferences; the choice persists in the user data folder. CM shipped
`events_eng.cfg` and its siblings the same way.

**Acceptance:** dropping a second `.cfg` in the folder offers it in Preferences; choosing it changes the
commentary from the next lines; a chosen file that disappears falls back to `events.cfg`.

**Blocked by:** 04

**Status:** resolved

## Answer

- Contract: the status view gains `files` (every `.cfg` in the folder, sorted) and `active`;
  `chooseCommentaryFile({ name })` is the fourth method.
- Main: the choice is the file name in `commentary/chosen.txt`. A name not in the folder is ignored (so
  no path from the renderer is ever opened), and a chosen file that disappears falls back to
  `events.cfg`. Reset rewrites `events.cfg` and chooses it again, leaving other files alone.
- Renderer: the Commentary section shows a File picker once the folder holds more than one `.cfg`.
- Tests: choosing describe in `apps/desktop/test/main/match/commentary-file.test.ts`, the picker case in
  `commentary-file-section.test.tsx`, the payload in `packages/contracts/test/roundtrip.test.ts`.
