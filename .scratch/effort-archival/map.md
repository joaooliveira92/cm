# Map: Effort archival

Label: wayfinder:map

## Destination

A working **`cm-archive-effort` skill** at `.agents/skills/cm-archive-effort/` (symlinked into
`.claude/skills/`), plus an **ADR** recording the effort-lifecycle convention it implements, plus a
first archiving pass over the efforts that are already complete. Top-level `.scratch/` should show
only live efforts once this map is done.

## Notes

- This is the missing half of
  [ADR-0010](../../docs/adr/0010-post-handoff-decisions-live-in-adrs-map-closes.md), which decided
  "the map closes at handoff" but defined no *physical* lifecycle for the effort directory. The new
  ADR extends it rather than contradicting it.
- The design sibling is [cm-archive-notes](../../.agents/skills/cm-archive-notes/SKILL.md): explicit
  invocation only (`disable-model-invocation: true`), move-not-delete into an `archived/` tree,
  freeze after the move, repair inbound links in the same change, classify by judgment rather than by
  a mechanical threshold. Deviate from that shape only with a stated reason.
- **Judgment gate, mechanical shortlist.** A purely mechanical "all tickets resolved" predicate would
  archive wrongly: `effect-lint-hardening` reads 2/2 resolved on disk while
  [roadmap.md](../../docs/roadmap.md) records ticket 02 as claimed-but-unanswered. The skill proposes
  candidates; a human confirms each.
- **Two ticket status formats are correct and must both be handled.** Bare `Status:` (wayfinder
  tickets) and bold `**Status:**` (cm-to-tickets build tickets) coexist deliberately;
  [resolve-ticket.ts:30](../../scripts/resolve-ticket.ts#L30) matches both on purpose. Unifying them
  is out of scope.
- `.scratch/archived/` sits inside the directory that every frontier scan globs as
  `.scratch/<effort>/`, so it reads as an effort named "archived" unless scans exclude it. Whatever
  the skill does must keep `cm-wayfinder`, `cm-to-tickets`, `effect-v4-migration`, `code-review` and
  `resolve-ticket.ts` from walking into archived efforts.
- `verify-md-links` is a quality gate and roughly 100 references point into `.scratch/` from Agent
  Notes, ADRs, `docs/roadmap.md`, `docs/architecture.md`, and `docs/e2e.md`. Any move breaks the gate
  unless links are handled in the same change.
- Skills every session should consult: `grilling`, `domain-modeling`, and `doc-standards` (this
  effort's output is almost entirely Markdown); `writing-for-agents` for the SKILL.md itself.

## Decisions so far

## Not yet specified

- Whether `.scratch/archived/` should itself be pruned, gitignored, or capped once it grows — the
  point at which git history alone is a sufficient record. Depends on what archiving turns out to
  cost in practice.
- Whether specs still cited as *live* authority from outside `.scratch/` (notably
  `cm-clone/spec.md`, cited by [docs/architecture.md](../../docs/architecture.md)) should be promoted
  out of the effort directory into `docs/` rather than archived beneath it. Sharpens once the
  inbound-link policy is settled.
- Whether archiving an effort should trigger a `cm-archive-notes` pass over the Agent Notes that
  effort produced, and whether an effort with notes still in `proposed/` is archivable at all.
- How efforts that never had a map (`injury-system` took a shorter path straight to `spec.md`) fit
  the lifecycle, given the completion predicate is likely to lean on map state.

## Out of scope

- Unifying the two ticket status formats. They are a deliberate, tooling-supported split between
  wayfinder tickets and build tickets, not drift.
- Any change to the Agent Notes lifecycle itself — `cm-archive-notes` owns that, and this effort only
  consumes it.
- Retrofitting `injury-system` or any other effort into a shape it never had; the skill must cope
  with the efforts as they exist.
