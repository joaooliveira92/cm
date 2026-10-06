# 19: Context and stale docs

**What to build:** `CONTEXT.md` gains the four event kinds and the `Foul.fouledPlayerId` field in the
**Match Event** enumeration, drops the **Match Player Line** term's "tackles/headers/interceptions are
not drawn" premise, and adds a **Possession** term defined as the share of minutes with the ball. The
match-screen spec's Further Notes gains the one-line pointer to [this map](../map.md), and its "out of
scope until new engine events exist" paragraph plus the fold note's absent list are updated where this
change makes them stale.

**Decisions:**

- Domain vocabulary names the new concepts; the standing rule is now "the engine records decided
  facts". See [ticket 11](11-screen-follow-through.md).

**Blocked by:** 12

**Status:** resolved

- [x] `CONTEXT.md` names the new events, drops the fold's stale premise, and defines Possession.
- [x] The match-screen spec points at this map and its stale paragraph is updated.
