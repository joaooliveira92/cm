# Wayfinder / setup-matt-pocock-skills evaluation

Evaluation of how this repo has adopted the [`setup-matt-pocock-skills`](https://www.aihero.dev/skills-setup-matt-pocock-skills) and [`wayfinder`](https://www.aihero.dev/skills-wayfinder) skills, based on the actual state of [.agents/skills/](../../.agents/skills/), [docs/agents/](.), and `.scratch/` as of 2026-08-27.

## What's in place

- Full skill suite lives at [.agents/skills/](../../.agents/skills/), including [wayfinder/SKILL.md](../../.agents/skills/wayfinder/SKILL.md) and [setup-matt-pocock-skills/SKILL.md](../../.agents/skills/setup-matt-pocock-skills/SKILL.md).
- Setup output matches the article's description: [issue-tracker.md](issue-tracker.md), [domain.md](domain.md), [triage-labels.md](triage-labels.md), plus the `## Agent skills` block in [AGENTS.md](../../AGENTS.md). Tracker choice is local markdown under `.scratch/`, and the tracker doc carries a dedicated **"Wayfinding operations"** section defining map/child/blocking/frontier/claim/resolve for this repo — the one piece a generic skill can't know and that setup is specifically responsible for writing.
- Three real efforts existed in `.scratch/` at the time of this evaluation: `cm-clone` (large, fully wayfinder-mapped, past handoff into implementation), `e2e-coverage` (active wayfinder map, one ticket claimed), and `injury-system` (no map at all — straight to spec.md). All three have since been archived out of the working tree; they are recoverable from git history.

## Where adherence is strong

- `cm-clone/map.md` had all five prescribed sections (Destination, Notes, Decisions so far, Not yet specified, Out of scope), used correctly rather than just present: **Out of scope** holds permanently-ruled-out items (training, scouting, real-world data — with reasons), while **Not yet specified** holds genuine fog (e.g. "event-odds mechanics" — named but not yet decided) rather than pre-sliced tickets. This matches the skill's "fog or ticket?" test.
- Decisions-so-far entries link to ticket files and gist the answer in one line, pointing to CONTEXT.md/ADRs rather than restating them — matches "the map is an index, not a store."
- **injury-system correctly skipped wayfinder.** No map, tickets carry no `Type:`/`Status:` scaffolding — it went straight to a spec. This follows the article's stated rule ("split depends on session count, not project size") rather than reflexively wayfinder-ing everything.
- e2e-coverage shows live session discipline: ticket 03 is `Status: claimed`, matching the one-ticket-claimed-before-work convention, and its Notes section stays a decision record rather than being abused to smuggle in implementation.

## Gaps found

1. **cm-clone's map was never updated for its last two resolved tickets.** `19-engine-flat-phase-slots.md` and `20-adr-0002-flat-phase-boundary.md` were both `Status: resolved` but don't appear in the map's "Decisions so far." The skill requires appending a context pointer to the map before stopping on resolution — this step was skipped.

   **Resolved:** both entries were appended to `cm-clone/map.md`'s Decisions-so-far, gisting tickets 19 and 20.

2. **No defined home for decisions that surface mid-implementation.** Tickets 09–18 are `to-tickets` implementation tickets (no `Type:`/`Status:` fields, different title format: `09: ...` vs. the wayfinder tickets' plain title), and 19–20 are follow-on decisions discovered while building. All of them reuse the same flat `issues/NN-*.md` numbering as the original wayfinder decision tickets 01–08, in the same directory. Neither article addresses what happens after a map closes and hands off to `/to-spec` → `/to-tickets` → `/implement`, yet a real decision can still come up during implementation (ticket 19's refactor is exactly this). This repo's answer — reopen the same directory, keep incrementing the same counter, skip the map — works but blurs "map ticket" and "build ticket" into one indistinguishable numbering space; only the presence of a `Type:` line tells them apart.

   **Decided (2026-08-27):** post-handoff discoveries are classified by type and impact, and the map closes at handoff — see [classifying post-handoff decisions](../../.agents/notes/implemented/process/2026-08-27-classifying-post-handoff-decisions.md). Architectural decisions go to `architecture`-class Agent Notes (the note's original wording said the ADR layer, which has since been retired); spec corrections amend the spec; gameplay/UX decisions go to `feature`-class notes; a genuinely new destination starts a fresh map. The mixed `issues/NN-*.md` numbering is accepted process debt, no new convention introduced.

## Bottom line

The workflow is well-adopted here, not just installed — the two live maps show real discipline (fog vs. ticket, claim-before-work, single ticket per session, correct skip-wayfinder judgment on injury-system). Gap 1 is a small, mechanical fix. Gap 2 is a genuine gap in the upstream workflow rather than a mistake in this repo's usage of it.
