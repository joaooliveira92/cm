# 04: Preferences manage the commentary file

Spec: [spec.md](../spec.md)

**What to build:** a Commentary section in Preferences. It shows where the file is, offers "Open
commentary file" and "Reset to the game's lines", and lists the problems the game found in the file with
their line numbers. Three RPC methods: `getCommentaryFileStatus`, `openCommentaryFile`,
`resetCommentaryFile`.

**Acceptance:** the problems a broken file causes are listed in Preferences; reset restores the shipped
text; open hands the file to the operating system.

**Blocked by:** 02

**Status:** resolved

## Answer

- Contract: `CommentaryFileStatusView` (`file`, `problems`) and `getCommentaryFileStatus`,
  `openCommentaryFile`, `resetCommentaryFile`, all machine-local and error-free.
- Main: `apps/desktop/src/main/match/commentaryFile.ts` keeps the problems it parsed with the cached
  table; open goes through an `openPath` on `RpcContext`, which `index.ts` wires to Electron's
  `shell.openPath` (absent under test, where the request is logged).
- Renderer: `CommentaryFileSection` in the Preferences dialog shows the path, Open and Reset (reset asks
  first, since it loses the player's edits), and the skipped lines.
- Tests: `packages/contracts/test/roundtrip.test.ts`, `apps/desktop/test/main/match/commentary-file.test.ts`,
  `apps/desktop/test/renderer/match/commentary-file-section.test.tsx`.
