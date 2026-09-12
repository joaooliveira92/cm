# 03: Team Scout Report derivation logic

Type: task

**What to build:** The pure, DB-free functions that turn a target club's scouting knowledge into a Team Scout Report's content, so the meaning of the report lives somewhere unit-testable rather than in the query that builds it. Given the target squad's members with their per-player scouting progress, the club's recent form, and the club's tactics, it computes: `knowledgeConfidence` and `freshness` from how scouted the squad is and how old the observations are; `keyPlayers` from the scouted members' attribute confidence; and `predictedFormation`, `strengths`, `weaknesses`, and `setPieceFindings` from the tactics and form through the established Attribute Range knowledge rules.

The functions are deterministic and purely computational — `R = never`, no database, no Effect services. They compose the report from knowledge the renderer is already allowed to see and never invent a value: unknown information stays Unknown rather than being estimated from hidden values (screen 49 §8, §16).

**Blocked by:** 02 (needs the report wire shape).

**Status:** resolved

- [x] Given identical inputs, the derivation produces identical output (deterministic; test asserts it).
- [x] `knowledgeConfidence` rises monotonically as the target squad's scouting progress rises, and `freshness` decays as the observations' calendar age grows — never the reverse.
- [x] `keyPlayers` is drawn from the scouted members of the target club, ordered by a deterministic tie-breaker on stable IDs.
- [x] Hidden exact attributes of a below-Fully-Scouted player never leak through any prose or sorting output the derivation produces (spec §16).
- [x] A target club with no scouted members yields the not-scouted state, not an estimated report.
- [x] The functions are exercised by unit tests with no Electron or SQLite in the test environment.

## Notes

**The derivation takes no tactics input at all**, though this ticket said to derive
`predictedFormation` "from the tactics". Spec §8 lists another club's tactical information among
the things requiring explicit permission, and ticket 01's CONTEXT.md decision rules that scouting
is not that permission — so reading the target's tactic record would have been the leak the whole
effort is built to avoid. The predicted shape is instead inferred from where the *scouted* players
play, and is withheld entirely (`null`) at `low` knowledge confidence, where the sample is too thin
to infer from.
