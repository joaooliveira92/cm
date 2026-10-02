# 07: Events name the keeper and the set-piece taker

Spec: [spec.md](../spec.md)

**What to build:** a saved shot names the goalkeeper who saved it; a corner names its taker as well as the
player who attacks it; a set-piece goal or shot names the taker as its assist. New placeholders reach the
commentary file as `{player2}` in those sections. No extra random draws, so seeded matches play the same.

**Acceptance:** seeded matches produce the same results as before; the new fields are filled; the shipped
file uses them.

**Blocked by:** 02

**Status:** ready-for-agent
