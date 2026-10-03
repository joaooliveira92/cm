# 14: The Attacks bar under every match tab

**What to build:** Under every live and post-match tab, a two-colour bar shows each side's share of the
attacks with both percentages printed and the label "Attacks", cut at the revealed position live.
Before the first attack it is a neutral track reading "No attacks yet". Pre-match shows no bar. It is
mounted once in the match route shell, reading the attack share the statistics read already returns.

**Decisions:**

- Corners become counted; the possession proxy is renamed to what it measures, "Attacks", and that share drives the footer bar; possession stays unavailable. See [Agent Note](../../../.agents/notes/proposed/feature/2026-10-03-the-possession-bar-shows-attack-share.md).

**Blocked by:** None (can start immediately)

**Status:** resolved

- [x] The bar renders on every live and post-match tab and on no pre-match tab.
- [x] Both percentages are visible text; "No attacks yet" before the first attack.
- [x] No renderer string labels a number "Possession".
