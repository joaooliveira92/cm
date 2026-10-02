# 13: Pronouns are placeholders

Spec: [spec.md](../spec.md)

**What to build:** `{he}`, `{him}`, `{his}` (and capitalised `{He}`, `{His}`) for the `{player}` of a line,
so the shipped file and players' files never hard-code a pronoun. The game fills them as he/him/his
today, since every league is men's; a competition that needs others fills them differently without
touching any file.

**Acceptance:** the shipped file has no bare he/him/his referring to a player; the placeholders fill;
an old file without them still works.

**Blocked by:** 02

**Status:** ready-for-agent
