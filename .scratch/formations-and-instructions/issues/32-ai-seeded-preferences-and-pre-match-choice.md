# 32: AI: seeded preferences and pre-match tactic choice

**What to build:** Each AI club derives CM's five staff preferences (Preferred Formation, Playing
Mentality, Pressing Style, Playing Style, Marking Style) from the world seed and its stature, with no
stored rows. Before a match it starts from its preferred template, falls back to the best-fitting
template when its squad's average suitability is below 15, maps its style preferences onto Team
Instructions, and shifts Mentality one step by relative strength and venue, reading only the
opponent's public Phase Strengths and last-used formation.

Seam: a pure selection function in the shared package, called from the main process where AI clubs
set their Tactic; deterministic, no failure channel.

**Decisions:**

- **Seeded CM staff preferences per AI club; a preferred template with a best-XI fallback and style-mapped instructions before kickoff; a deterministic in-match rule table by score, minute and red cards; all run by a tactical controller outside the engine and journaled as `ChangeTactics` for the human's opponent.** See [Agent Note](../../../.agents/notes/implemented/architecture/2026-09-29-ai-tactics-from-seeded-preferences-via-a-controller.md).

**Blocked by:** 26

**Status:** resolved

- [x] Two AI clubs with different seeds field different templates or instructions across a season.
- [x] A squad unsuited to its preferred template gets the fallback.
- [x] No hidden opponent data is read.
- [x] Shared and main tests pass.
