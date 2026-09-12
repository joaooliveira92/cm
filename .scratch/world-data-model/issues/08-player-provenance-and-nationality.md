# 08 - Player provenance: nationality, birthplace, and identity across a multi-nation world

Type: grilling
Status: resolved
Blocked by: 03

## Question

`players` today carries names, a date of birth, attributes, and generation provenance — no
nationality, no birthplace. In a single-nation world that is harmless. In a ten-nation world it
determines name generation, the migration links already defined in `nations.ts`, and any future
work-permit or eligibility rule.

- Does a player carry one nationality or several? `MIGRATION_LINKS` already models recruitment
  between nations; dual nationality is a real football concept the reference specs cover, and it is
  cheap to model now and expensive to retrofit.
- Is birthplace a City reference (ticket 03's table) or free text? What about a player generated for
  a nation whose cities are not loaded?
- How does nationality drive name generation, and where do name pools live — code, content pack, or
  save?
- Does the player's canonical id / display-name split work the same way as clubs', or are player
  names generated content that can safely be stored directly? (They are fictional, so the licensing
  argument that forced the split for clubs may not apply.)
- Is there a `player_career_history` in MVP, or is that fog? A transfer today leaves no trace beyond
  the changed `club_id`, and there is no completed-transfer record anywhere in the schema.

## Answer

**One nationality with a stated reintroduction condition, a nullable `birth_city_id` whose NULL means
"born outside the loaded world", nation-keyed name pools in code as factual data (today's pool is 400
combinations and must grow), names stored directly because a pack cannot name players it predates, and
no career-history table because the event log already holds it.** See
[Agent Note](../../../.agents/notes/implemented/architecture/2026-09-01-player-provenance-and-nationality.md).
