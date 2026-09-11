# 04: Missing-logo reporting

**What to build:** When a save opens, a club its pack names but gives no logo is logged, even though
the screen still paints a shield for it. The fallback shield would otherwise make a missing crest
invisible. A pack whose `clubBadges` map is empty (the fictional base pack) is exempt, because every
club in it uses the shield by design.

The report extends the existing pack coverage reporting: one warning per save open, annotated with
the pack id and version, the gap count and a sample of club ids. Unnamed-id reporting keeps its
current behaviour.

**Seam:** coverage reporting keeps its current error channel and services. A missing logo is a logged
condition, never a failure or a defect.

**Decisions:**

- Missing logos are reported, not hidden, for any pack whose `clubBadges` is non-empty. The fictional pack is exempt. See [Agent Note](../../../.agents/notes/implemented/architecture/2026-09-11-club-badge-library.md).

**Blocked by:** 02 (Logos in club selection for Premier League and La Liga careers).

**Status:** ready-for-agent

- [ ] A generated Premier League save, with one club's badge mapping removed, reports that club as a logo gap.
- [ ] A fully mapped Premier League or La Liga save reports no logo gaps.
- [ ] A fictional-pack save reports no logo gaps.
- [ ] Existing unnamed-id reporting assertions still hold.
- [ ] `pnpm check:all` passes.
