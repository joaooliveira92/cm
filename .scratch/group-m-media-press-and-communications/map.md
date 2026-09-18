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

**Grounding observed while charting** (not yet a full inventory — that is ticket 01): CONTEXT.md has
essentially no media vocabulary (two matches for media/press conference/journalist across the whole
file), and no route under `apps/desktop/src/renderer/routes/` mentions media or press. The
expectation is that all 13 screens are absent, but that is a hypothesis for ticket 01 to confirm, not
a finding.

## Decisions so far

<!-- empty: charting session only; nothing resolved yet -->

## Not yet specified

- **Data and simulation model.** If any of this group is in v1, what does a Press Conference
  *produce*? Candidate consequences — player morale, squad harmony, board confidence, manager
  reputation, media relationships — are each their own modelling decision, and several may not exist
  in the codebase at all. Cannot be ticketed until ticket 02 says which screens survive.
- **Where media sits in the event model.** A statement or answer is a player command; its
  consequence is an event. Whether that goes through an existing decider or needs a new bounded
  decider is a structural question, and it depends on which consequences are modelled.
- **Determinism.** Rumours (189) and public reaction (192) imply generated content. Anything
  generated must be a pure function of (seed, position) per ENGINEERING-CONTRACT § Determinism.
  What seeds it, and whether opening a screen can consume randomness, is unspecified.
- **Relationship to the Inbox.** Beyond naming: whether media output lands as News Messages in the
  existing inbox, or in a parallel surface, and what that does to the "career record, never a queue"
  property.
- **Deviation register.** Cannot be written until the scope decision (ticket 02) fixes what is being
  deviated from.

## Out of scope

- **Redesigning the News Inbox (Screen 24).** It is shipped and modelled; this map may need to
  *name its boundary* against Media Centre, but changing it belongs to its own effort.
- **Multiplayer and administration surfaces.** Group R's territory, even where a media screen
  implies a shared or hosted context.
- **National team media.** Group O owns national team management; media attached to it follows that
  effort, not this one.
