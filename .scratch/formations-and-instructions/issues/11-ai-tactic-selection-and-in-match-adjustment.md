# 11: AI tactic selection and in-match adjustment

Type: grilling
Blocked by: 02, 03, 08

## Question

Decide how an AI club picks its Tactic before a match (from its squad's positional strengths and
what it knows of the opponent, and which information it may use: full data, or only what a
Team Scout Report would show) and how it adjusts during a match by score,
minute, red cards and available players. AI changes go through the same domain operations and
validation as a human manager's. Decide how varied AI behaviour is (a manager-level tactical
identity, the existing Tactical Style presets, or none) and how it is kept deterministic under the
match seed. Today `main/club/aiClubs.ts` picks a formation; say what replaces it.
