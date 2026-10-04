# 14: The bottom bar under every match tab

**What to build:** A persistent two-colour bottom bar under the match tabs, with both sides' shares as
text and the split drawn in the clubs' colours, cut at the revealed position live. Mounted once in the
match route shell; absent pre-match. Originally an **Attacks** bar showing the chance-share proxy with
"No attacks yet" before the first chance. The engine-detail work recorded real possession, superseding
that: the bar now shows **Possession** ("Not tracked" before the first tally, never 50–50), and Attacks
stays a Statistics row.

**Decisions:**

- The bar shows possession, not attack share. See [possession is the share of minutes with the
  ball](../../../.agents/notes/implemented/feature/2026-10-03-possession-is-the-share-of-minutes-with-the-ball.md)
  and [attack share is a statistics row](../../../.agents/notes/implemented/feature/2026-10-03-attack-share-is-a-statistics-row.md).
- The post-match half of this ticket is not reachable yet: no renderer route yields the post-match match
  context, so the bar runs live only. Tracked in [21](21-post-match-tab-context.md).

**Blocked by:** None (can start immediately)

**Status:** resolved

- [x] The bar renders on every live tab and on no pre-match tab.
- [x] Both sides' shares are visible text, cut at the revealed position.
- [x] The bar shows possession (the superseding decision), and no renderer string labels a chance share
      "Possession".
