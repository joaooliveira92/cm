# 05: What does the press-conference event record?

Type: grilling
Blocked by: 01
Status: resolved

## Question

The answered conference is one event on the match's stream. Does it store template and answer ids
(compact; editing a template rewrites every past transcript, and a deleted template leaves a hole)
or the rendered question and answer text (frozen history; larger rows, copy cannot be corrected
retroactively), or ids plus rendered text? Which command writes it, and does that command refuse a
second conference for the same match?

## Answer

**Each exchange stores template id, rendered question, tone id, and rendered answer; one command writes the whole conference after the last answer, and refuses a non-accepted match, a repeat, or questions that differ from the re-derived ones.** See [Agent Note](../../../.agents/notes/proposed/feature/2026-10-06-press-conference-event-records-text-and-ids.md).
