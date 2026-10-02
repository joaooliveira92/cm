# 09: Choose a commentary file

Spec: [spec.md](../spec.md)

**What to build:** every `.cfg` in the commentary folder is a choosable commentary file (another language,
a community file), picked in Preferences; the choice persists in the user data folder. CM shipped
`events_eng.cfg` and its siblings the same way.

**Acceptance:** dropping a second `.cfg` in the folder offers it in Preferences; choosing it changes the
commentary from the next lines; a chosen file that disappears falls back to `events.cfg`.

**Blocked by:** 04

**Status:** ready-for-agent
