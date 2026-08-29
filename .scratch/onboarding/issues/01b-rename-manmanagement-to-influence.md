# 01b: Rename `manManagement` to `influence` across the codebase

**What to build:** Replace every occurrence of `manManagement` / `man_management` with `influence` / `influence` in domain types, persistence columns, Archetype definitions, tests, CONTEXT.md, and all Agent Notes. No deprecated alias is retained. The rename is total because nothing has shipped against the old term.

**Decisions:**

- The second Manager Pillar is named **Influence**, not Man-Management, because its only shipped binding is club-to-club seller negotiation. See [Agent Note](../../../.agents/notes/proposed/feature/2026-08-29-manager-pillar-bindings-v1.md).

**Blocked by:** None (can start immediately).

**Status:** ready-for-agent

- [ ] All domain type definitions rename `manManagement` → `influence` across `packages/shared`, `packages/contracts`, `apps/desktop`
- [ ] `manager_profile` table column and CHECK constraint renamed
- [ ] Archetype definitions (Professor 5/1/2/4, Motivator 2/5/4/1, etc.) updated with new pillar name
- [ ] CONTEXT.md glossary entry updated
- [ ] All Agent Notes referencing the old name updated
- [ ] No `manManagement` alias retained anywhere
- [ ] `pnpm check:all` passes