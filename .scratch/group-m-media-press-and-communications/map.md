# Map: Group M — Media, Press and Communications

Label: `wayfinder:map`

## Destination

A reconciliation spec and deviation register for screens 181–193 (Media Centre through
Communication History and Transcript), stating per screen what the implementation must do and what
deviations exist from the imported spec at
`docs/specs/group_m_media_press_and_communications/`.

## Notes

**Domain**: local single-player football-management sim, Electron + event-sourced Effect domain
layer. Charted following the Group A and Group L reconciliation precedent: inventory each screen
against the existing implementation, decide v1 scope, record deviations (out-of-scope, contradicted,
deferred, renamed), then spec → slice → implement.

**Skills**: `cm-wayfinder` for charting; `grilling` and `domain-modeling` for the scope and
vocabulary questions, both of which are human-in-the-loop; `doc-standards` for the spec and
deviation register.

**What makes this group different from L.** Group L was a set of *views* over data the game already
half-modelled. Group M is largely a *game system*: press conferences, interviews and statements are
inputs the player makes, with consequences (morale, reputation, relationships) that must be
modelled, simulated and persisted. A reconciliation that treats these as screens over existing data
will understate the work by an order of magnitude. The v1 scope question here is therefore heavier
than L's, and it is a design decision about what the game *is* — not an implementation call an agent
should make alone.

**The adjacent concept that already exists.** CONTEXT.md models **News Message** and **News Inbox**
(lines 907–926), shipped as Screen 24, and is explicit that the News Inbox is "a career record and
never a queue of work". It lists _Avoid_ terms for it: News feed, Message centre, Notification
centre. Screen 181 "Media Centre" is the obvious collision: if it becomes a second inbox-like
surface, the domain grows two names for one idea. Whether Media Centre is a distinct concept, a
facet of the News Inbox, or a renaming, is the first vocabulary question this map owes an answer to.

**Grounding** — ticket 01 confirmed the charting hypothesis and went further: not only are all 13
screens absent, CONTEXT.md affirmatively excludes media handling from v1 rather than merely omitting
it. The Calendar's design depends on that absence. This map's likely destination is therefore a
deviation register recording that Group M is out of v1, not a spec to build from — unless a human
overturns the exclusion.

## Decisions so far

- [01 — Screen inventory](issues/01-screen-inventory.md): all 13 screens are Absent — not even
  stubbed, though the repo has a stub idiom ~30 screens use. No supporting data exists either: no
  manager reputation, no morale, no board opinion (one annual verdict from league position plus a
  consecutive-miss counter), no relationship model, and no command that produces text. The game does
  generate prose — Commentary Templates and the News copy table — both deterministic, neither a
  generator. **The decisive finding is that CONTEXT.md already excludes this group from v1**, at
  751-753 ("media handling ... none of those systems ship in v1") and at 445-447, where the absence
  of "press content" is the stated reason the Calendar needs no finer clock. That reframes ticket 02
  from a scope question into a question about overturning a recorded decision.

- [02 — Does CONTEXT.md's v1 exclusion get overturned?](issues/02-v1-scope.md): **no.** Option A —
  the exclusion stands, all 13 screens stay out of v1, CONTEXT.md is unchanged because it was
  already right. Reopening would be a programme (reputation, morale, consequence decider,
  persistence, balance, a finer Calendar), not a group, and would require amending CONTEXT.md in the
  same commit as the first code.

## Not yet specified

Nothing. Ticket 02 closed the map: with Group M out of v1 there is no further fog *toward* this
destination. The modelling questions the fog used to hold — consequence model, where media sits in
the event model, determinism of generated content, the Inbox relationship — all moved to
**Out of scope**, since they are only reachable by reopening the scope decision, which would be a
fresh effort rather than a resumption of this one.

## Out of scope

- **Redesigning the News Inbox (Screen 24).** It is shipped and modelled; this map may need to
  *name its boundary* against Media Centre, but changing it belongs to its own effort.
- **Multiplayer and administration surfaces.** Group R's territory, even where a media screen
  implies a shared or hosted context.
- **National team media.** Group O owns national team management; media attached to it follows that
  effort, not this one.
- **The whole of screens 181-193**, per ticket 02. Out of v1, not deferred within it.
- **A media consequence model** — manager reputation, morale, board opinion, relationships. None
  exists; each would be its own effort, and only if the scope decision is reopened.
- **A finer-grained Calendar.** Screens 184/185 assume a clock that stops on non-Fixture dates.
  CONTEXT.md:445-447 makes the absence of press content the reason no such clock exists, so this
  cannot change without the scope decision changing first.
