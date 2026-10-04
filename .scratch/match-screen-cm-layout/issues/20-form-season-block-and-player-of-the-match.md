# 20: Season totals and Player of the Match

**What to build:** Below the recent games, a season block with rows League, Cup, Continental (only when
the player appeared in one) and Overall, reserve fixtures excluded, and columns Apps as "starts (sub)",
Gls, Asts, MoM, Yel, Red, Sh Tar as a percentage, Fouls and Av R to two decimals, with "-" where there
is nothing to divide. Player of the Match is the highest Match Rating across both sides at full time,
tie-broken by goals, assists, the winning side, then player id by code units; it is computed on read,
counted in MoM, and marked on the post-match Ratings tab. **Player of the Match** joins CONTEXT.md.
Defined in [09](09-the-form-tab.md).

**Blocked by:** 19

**Status:** resolved

- [x] The tie-break order is proven by a test with tied ratings at each step.
- [x] The post-match Ratings tab marks exactly one Player of the Match.
- [x] Sh Tar and Av R show "-" with no shots or no appearances.
- [x] CONTEXT.md defines Player of the Match.
