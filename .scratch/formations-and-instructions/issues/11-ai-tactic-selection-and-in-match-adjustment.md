# 11: AI tactic selection and in-match adjustment

Type: grilling
Blocked by: 02, 03, 08, 15, 16
Status: resolved

## Question

Decide how an AI club picks its Tactic before a match (from its squad's positional strengths and
what it knows of the opponent, and which information it may use: full data, or only what a
Team Scout Report would show) and how it adjusts during a match by score,
minute, red cards and available players. AI changes go through the same domain operations and
validation as a human manager's. Decide how varied AI behaviour is (a manager-level tactical
identity, the existing Tactical Style presets, or none) and how it is kept deterministic under the
match seed. Today `main/club/aiClubs.ts` picks a formation; say what replaces it.

## Answer

**Seeded CM staff preferences per AI club; a preferred template with a best-XI fallback and
style-mapped instructions before kickoff; a deterministic in-match rule table by score, minute and red
cards; all run by a tactical controller outside the engine and journaled as `ChangeTactics` for the
human's opponent.** See [Agent Note](../../../.agents/notes/proposed/architecture/2026-09-29-ai-tactics-from-seeded-preferences-via-a-controller.md).
