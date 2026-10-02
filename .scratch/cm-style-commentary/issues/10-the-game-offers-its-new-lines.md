# 10: The game offers its new lines to an edited file

Spec: [spec.md](../spec.md)

**What to build:** the shipped file carries `version = N` before its first section. When a player's file
is older, Preferences says the game has new sections and offers to add them; adding appends only the
sections the player's file lacks and raises its version, never touching the player's own sections.

**Acceptance:** an old file is reported as older; adding appends the missing sections and leaves every
existing line untouched.

**Blocked by:** 04

**Status:** resolved

## Answer

- Format: `version = N` before the first section; `parseCommentaryFile` reports it (0 when absent) and
  the sections a file has. The shipped file is version 1.
- Engine: `missingCommentarySections` and `upgradeCommentaryFile`, which appends missing sections word
  for word from the shipped text and sets the version, or with `addSections: false` sets the version
  only. The player's text is otherwise kept byte for byte.
- Contract: the status gains `newSections` (non-empty only for an older file); `updateCommentaryFile`
  takes `addNewSections`.
- Renderer: the Commentary section offers "Add them to my file" or "Keep my file as it is"; either
  raises the version, so the offer comes once per release.
- Tests: the upgrade describe in `packages/game-engine/test/match/commentary-file.test.ts`, the older-file
  describe in `apps/desktop/test/main/match/commentary-file.test.ts`, the two offer cases in
  `commentary-file-section.test.tsx`, round trips in `packages/contracts/test/roundtrip.test.ts`.
