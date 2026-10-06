# 01: Manager Profile screen

**What to build:** A career screen at `/career/$saveId/manager` showing manager identity (name, archetype, four Pillar values, club name, season number, tenure length) with a passive `Active`/`Archived` badge, reachable via a CareerChrome tab and the `g m` keyboard binding, so the player can inspect their profile identity.

**Decisions:**
- Manager Profile screen shows only profile identity — name, archetype, four Pillar values 1–5, club name, season number, and tenure length (source: [manager-profile-screen.md](../../../.agents/notes/implemented/feature/2026-08-30-manager-profile-screen.md)).
- "Manager Status" is retired as a domain term; survives only as the technical table name `manager_status` with a comment explaining it tracks outcome state, not identity (source: [manager-profile-screen.md](../../../.agents/notes/implemented/feature/2026-08-30-manager-profile-screen.md)).
- Status badge shows `Active` or `Archived` depending on the save's sacked/retired state; archived saves show the same profile layout with an `[Archived]` banner (source: [manager-profile-screen](../../../.agents/notes/implemented/feature/2026-08-30-manager-profile-screen.md)).
- Screen does NOT render: Board Objective, Verdict, consecutive-miss counter, or manager outcome (source: [manager-profile-screen](../../../.agents/notes/implemented/feature/2026-08-30-manager-profile-screen.md)).
- Manager Profile is a career child route, registered in `destinations.ts` and `CareerChrome` (source: [manager-profile-screen](../../../.agents/notes/implemented/feature/2026-08-30-manager-profile-screen.md))..
- `CONTEXT.md` carries the "Manager Profile" entry with the collision resolution stated (source: [manager-profile-screen](../../../.agents/notes/implemented/feature/2026-08-30-manager-profile-screen.md)).

**Blocked by:** None (can start immediately)

**Status:** resolved

- [x] Acceptance criterion 1: Manager Profile screen renders at `/career/$saveId/manager` with identity fields (name, archetype, four Pillars, club, season, tenure)
- [x] Acceptance criterion 2: Status badge shows `Active` for live saves and `Archived` for retired/sacked saves
- [x] Acceptance criterion 3: Screen is reachable via CareerChrome tab and `g m` keyboard binding