# 10: The game offers its new lines to an edited file

Spec: [spec.md](../spec.md)

**What to build:** the shipped file carries `version = N` before its first section. When a player's file
is older, Preferences says the game has new sections and offers to add them; adding appends only the
sections the player's file lacks and raises its version, never touching the player's own sections.

**Acceptance:** an old file is reported as older; adding appends the missing sections and leaves every
existing line untouched.

**Blocked by:** 04

**Status:** ready-for-agent
