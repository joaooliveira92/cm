# 12: Home Stats and Away Stats tabs

**What to build:** During a live match and after it, the manager opens Home Stats or Away Stats and sees
one row per matchday-squad member of that side: starters in slot order, then the named bench. Each row
shows squad number, captain mark, card glyph, substitution note, and Key, Off, Fou, Ast, She, Sat, Sav
(only when a goalkeeper has a value), Con, Rat and Gls, cut at the revealed position live and uncut
after full time. Unused substitutes are dimmed with empty cells. The heading names the club; a caption
says only what the match records is shown. The table uses the shared data table, the column glossary
and the rating-tone helper, which the existing ratings view adopts too. The read's edge fails only as
the statistics read does today (no such save, no such match) and needs the same services; the fold is
pure and in the shared rules package. Defined per [02](02-per-player-columns-the-stream-backs.md),
[05](05-one-tab-bar-for-two-tab-rows.md) and [10](10-table-look-and-reading-aids.md).

**Decisions:**

- Twelve columns, all folded from the stream. The other eight are absent rather than shown as unavailable. See [Agent Note](../../../.agents/notes/proposed/feature/2026-10-03-the-match-player-line-folds-only-recorded-events.md).

**Blocked by:** None (can start immediately)

**Status:** ready-for-agent

- [ ] One pure fold produces the Match Player Line; a test per counting rule in the note passes.
- [ ] The live and post-match tables for one seeded match agree with the fold of its timeline at the same cut.
- [ ] Home Stats and Away Stats appear in both tab bars in the order ticket 05 gives, on two routes over one screen; the player-stats placeholder route and screen are gone.
- [ ] An unused substitute's row is dimmed and empty, never 0; card glyphs carry "Booked"/"Sent off" text; headers expose full names.
- [ ] The ratings view, the Rat column and the new table use the one rating-tone helper.
- [ ] Stale records from ticket 11 owned by this change (keeperId doc, duplicate Offside schema entry, CONTEXT.md **Match Player Line**) are updated.
