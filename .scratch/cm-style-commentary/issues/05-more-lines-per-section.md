# 05: More lines per section

Spec: [spec.md](../spec.md)

**What to build:** at least six lines in every section a match uses often (build-up, key passes, shots,
goals, fouls, offsides, corners, free kicks, cards), and four elsewhere, in the shipped `events.cfg`.

**Acceptance:** the shipped file still parses with no problems and fills every placeholder over whole
simulated matches.

**Blocked by:** 02

**Status:** resolved

## Answer

The shipped `events.cfg` grew from 186 to 317 lines across its 56 sections: at least six in every
frequent section and four elsewhere. Two existing lines broke the injury wording rule (non-contact
injuries say the player pulled up) and were rewritten. Two engine tests that matched the wording of one
random pick now check the rule over every line, and `{team}` as the full-time winner, instead.
