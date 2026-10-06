# 04: Entity-context navigation

**What to build:** When an entity is opened (player, staff, club, nation, competition, or non-live match), the secondary row switches from the section-specific tabs to entity-specific tabs. The primary row remains visible and the originating primary section stays lit via the `?origin=<sectionId>` URL parameter.

Entity tabs defined in config (ticket 01):
- Player: Overview, Attributes, Positions, Form, History, Contract, Transfer, Training, Reports, Relationships (when supported), Injuries (when relevant), Notes
- Staff: Overview, Attributes, Contract, Career, Assignments, Reports, Notes
- Club: Overview, Squad, Staff, Fixtures, Results, Transfers, Finances, History, Records
- Nation: Overview, Senior Team, Under-21s, Players, Fixtures, Results, Competitions, History
- Competition: Overview, Table, Fixtures, Results, Statistics, Awards, Rules, History (conditional tabs apply)
- Match (non-live): Overview, Lineups, Commentary, Statistics, Player Ratings, Events

Navigation rules (spec §6, §10.3):
- The `?origin=<sectionId>` param is set when navigating to an entity from a primary section
- Pressing Back returns to the originating list (the URL captures the previous route)
- If no origin is set (entity opened from a global notification), infer the most appropriate domain from entity type
- List state (filters, sorting, pagination) is preserved via URL search params

**Decisions:**

- Entity origin in URL param. See [Agent Note](../../../.agents/notes/implemented/architecture/2026-09-10-menu-nav-architecture.md).

**Blocked by:** 03 (SecondaryNav).

**Status:** resolved

- [x] Opening a player profile switches secondary row to player-specific tabs (spec §6.1)
- [x] Opening a staff profile switches secondary row to staff-specific tabs (spec §6.2)
- [x] Opening a club profile switches secondary row to club-specific tabs (spec §6.3)
- [x] Opening a nation profile switches secondary row to nation-specific tabs (spec §6.4)
- [x] Opening a competition profile switches secondary row to competition-specific tabs (spec §6.5)
- [x] Opening a non-live match switches secondary row to match-specific tabs (spec §6.6)
- [x] Primary row remains visible and the originating section stays active (`aria-current`)
- [x] `?origin=<sectionId>` is set in the URL when navigating to an entity from a primary section
- [x] Back from an entity returns to the originating list route
- [x] Origin inference works for entities opened from global notifications (per spec §12)
- [x] Component and integration tests cover: entity tab switching, origin tracking, Back navigation, origin inference