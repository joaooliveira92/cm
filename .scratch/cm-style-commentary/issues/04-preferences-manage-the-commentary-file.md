# 04: Preferences manage the commentary file

Spec: [spec.md](../spec.md)

**What to build:** a Commentary section in Preferences. It shows where the file is, offers "Open
commentary file" and "Reset to the game's lines", and lists the problems the game found in the file with
their line numbers. Three RPC methods: `getCommentaryFileStatus`, `openCommentaryFile`,
`resetCommentaryFile`.

**Acceptance:** the problems a broken file causes are listed in Preferences; reset restores the shipped
text; open hands the file to the operating system.

**Blocked by:** 02

**Status:** ready-for-agent
