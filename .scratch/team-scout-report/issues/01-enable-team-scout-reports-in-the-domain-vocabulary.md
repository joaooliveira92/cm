# 01: Enable team scout reports in the domain vocabulary

Type: task

**What to build:** The domain decision that opponent analysis is cut from v1 is superseded, so the Team Scout Report (screen 49) is in scope. CONTEXT.md's Scouting section is revised: a Scout may be assigned to watch a Club as well as a Player, the `_Avoid_: Scouting Report` term is restored as a real vocabulary entry, and the clause "Opponent analysis is cut from v1: no opponent-scouting or pre-match report system exists" is removed. The supersession is recorded as an Agent Note, written `proposed` and promoted to `implemented/` in the same commit. No runtime code changes.

**Decisions:**

- Opponent analysis is no longer cut from v1: a Scout may watch a Club, and the resulting Team Scout Report is a real, ongoing artifact rather than a disallowed one-shot document. Supersedes the CONTEXT.md "cut from v1" clause and the "Only a Player is a valid target" / "_Avoid_: Scouting Report" terms. See [Agent Note](../../../.agents/notes/implemented/architecture/2026-09-07-team-scout-reports-supersede-opponent-analysis-cut.md).

**Blocked by:** None (can start immediately).

**Status:** resolved

- [x] CONTEXT.md no longer states that opponent analysis / opponent-scouting is cut from v1.
- [x] The Scouting glossary allows a Club as a scouting target and lists "Scouting Report" as a term, not an `_Avoid_`.
- [x] The vocabulary stays consistent with the existing per-Player scouting: a report on a Club aggregates the scouted knowledge of that Club's players and never invents a per-Club hidden value that the glossary forbids.
- [x] An Agent Note records the supersession and sits in `implemented/` in the same commit that edits CONTEXT.md.
- [x] No source, contract, or schema file changes in this ticket.