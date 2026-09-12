# 03: Logo in the career header

**What to build:** Once a career has started, the career header shows the user club's logo beside its
name, or the colour-and-initials shield when the club has no logo. The logo sits on the header's
club-coloured band without changing how that band is painted.

The header's own read model gains `badgeKey`, resolved through the same save-pack seam as the header's
name and colours. It is not added to any contract shared with screens that don't render a logo.

**Seam:** the header's read keeps its current error channel and services. It gains a nullable field
and no new failure.

**Decisions:**

- Read models that show a club carry `badgeKey: string | null`, added per screen as it adopts logos, never to a contract shared with screens that don't render one. See [Agent Note](../../../.agents/notes/implemented/architecture/2026-09-11-club-badge-library.md).

**Blocked by:** 02 (Logos in club selection for Premier League and La Liga careers).

**Status:** resolved

- [x] A Premier League or La Liga career's header shows the user club's logo through `ClubBadge`.
- [x] A fictional-pack career's header shows the colour-and-initials shield.
- [x] `badgeKey` is added only to the header's read model. `ClubSummary` and other shared club contracts are unchanged.
- [x] A header test covers both the logo and the fallback.
- [x] `pnpm check:all` passes.
