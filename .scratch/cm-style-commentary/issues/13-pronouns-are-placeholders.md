# 13: Pronouns are placeholders

Spec: [spec.md](../spec.md)

**What to build:** `{he}`, `{him}`, `{his}` (and capitalised `{He}`, `{His}`) for the `{player}` of a line,
so the shipped file and players' files never hard-code a pronoun. The game fills them as he/him/his
today, since every league is men's; a competition that needs others fills them differently without
touching any file.

**Acceptance:** the shipped file has no bare he/him/his referring to a player; the placeholders fill;
an old file without them still works.

**Blocked by:** 02

**Status:** resolved

## Answer

- `{he}`, `{him}`, `{his}`, `{He}`, `{His}` are allowed wherever `{player}` is, and fill from an optional
  `pronounsOf` on `CommentaryNameResolver`; without it they are he/him/his, so no caller changed.
- The shipped file's 53 lines that used a pronoun for their player now use the placeholders; the two
  that mean the referee and the manager keep "his", and one goal line that meant the keeper was
  reworded. No version bump: a file without the placeholders still works.
- Tests: the pronouns describe in `packages/game-engine/test/match/commentary.test.ts`, which also pins
  the two deliberate bare pronouns.
