# 02: Commentary comes from a player-editable file

Spec: [spec.md](../spec.md), addendum.

**What to build:** move every Commentary Template and its playback into `packages/game-engine/data/events.cfg`;
a pure `parseCommentaryFile` in the engine; a main-process loader that seeds the player's copy in the user
data folder, re-reads it when it changes and falls back to the shipped file per section.

**Acceptance:**

- The shipped file parses with no problems and fills every placeholder over whole simulated matches.
- A player's line for a section replaces the shipped ones, with `{player}`, `{team}` and `{team2}` filled.
- A line with a placeholder its section lacks is skipped and reported with its line number.
- A missing or broken section uses the shipped lines; a missing setting uses the shipped setting.
- An edit shows without a restart; an unchanged file is not parsed again.
- A `chance` on a moment that changes the match is ignored.

**Blocked by:** 01

**Status:** resolved

## Answer

Shipped, 2026-10-01, not yet committed.

- `packages/game-engine/data/events.cfg`: 56 sections, generated once from the former code constants with
  the placeholders renamed (`creator`/`finisher` to `player`/`player2`, `home`/`away` and
  `winner`/`loser` to `team`/`team2`, `scoreline` to `score`, `toLabel` to `formation`).
- Engine: `commentarySections.ts` (sections and their placeholders), `commentaryFile.ts`
  (`parseCommentaryFile`); `renderCommentary` takes the parsed table.
- Desktop: `src/main/match/commentaryFile.ts` seeds `<userData>/commentary/events.cfg`, caches by
  modification time, and logs problems; both match RPCs load it.
- Tests: `packages/game-engine/test/match/commentary-file.test.ts`,
  `apps/desktop/test/main/match/commentary-file.test.ts`.
- Docs: the templated-commentary Agent Note and CONTEXT.md (Commentary Template, Commentary File).
