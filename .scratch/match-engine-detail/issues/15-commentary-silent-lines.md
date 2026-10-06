# 15: New events are silent commentary lines

**What to build:** `Tackle`, `Interception`, `HeaderDuel` and `PossessionTally` each map to one
Commentary Line flagged silent: no commentary key, no text, delay 0. The pacer reveals a silent line and
immediately takes the next without scheduling a beat; the feed and commentary screens skip silent lines;
highlight levels never show or count them. The `Foul` and `Penalty` lines gain a `{fouled}` token filled
from `Foul.fouledPlayerId`, with a token-free line used when absent. Line count stays equal to event
count.

**Decisions:**

- New events are silent: each still produces exactly one commentary line, marked silent, no text and no
  delay. See [ticket 08](08-commentary-for-new-events.md).

**Blocked by:** 12

**Status:** resolved

- [x] For a seeded match with every new kind, line count equals event count.
- [x] Silent lines carry no text or delay and are skipped by the feed and highlight filtering.
- [x] A `{fouled}` line names the brought-down player when the field is present, and a token-free line
      is used when it is absent.
