# 05 — Screen 28: is the Calendar a screen?

Type: grilling

## Question

Before
[28_calendar_and_schedule.md](../../../docs/specs/group_b_global_navigation_and_inbox/28_calendar_and_schedule.md)
can be audited, this has to be settled: **does this game have a Calendar screen at all, distinct from
Fixtures?**

The tension is real in both directions. `CONTEXT.md` has a whole **Season & calendar** section, so
Calendar is domain vocabulary, not an import invention — the Continue loop is defined in terms of the
Calendar advancing to the next scheduled event. But the only implemented surface near it is
[FixturesScreen.tsx](../../../apps/desktop/src/renderer/fixtures/FixturesScreen.tsx), and the Continue
control already *takes the player to* the next event, which is most of what a player consults a
calendar for.

So: is the Calendar the internal scheduling structure with no screen of its own, is Fixtures already
its player-facing view under a different name, or is there a real surface the game is missing?

Settle that first, in conversation. Only then does the import's content — month and week views,
filters, reminders, entity links, density and virtualization — get classified, and the answer to the
first question decides whether those are `contradicted` or `deferred`.

Deliberately **not** a prototype ticket. Drawing a calendar layout before knowing whether the screen
exists would be prototyping a screen that may not survive the question. If the conversation settles
that it exists and then stalls on what it looks like, raise a prototype ticket then.

No code changes.

## Done when

- The Calendar's status is stated: internal structure, existing screen under another name, or a
  missing surface.
- `CONTEXT.md` says which, if the answer changes or sharpens the existing **Season & calendar**
  vocabulary.
- Screen 28 moves off `Not yet audited`, with its rows classified against that answer.
- If a new surface is warranted, its navigation placement is handed to the map's fog, not decided here.
