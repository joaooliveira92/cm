# 02: Dispose the non-normative import scaffolding

**What to build:** A maintainer auditing any Group B screen can skip its authoring artifacts, because
the ledger already records that they are not requirements — so no audit spends attention deciding
whether a section that summarizes its own file needs implementing.

Group A ruled that the `Condensed LLM implementation brief`, `Next planned item` and
`Suggested Git commit` sections are artifacts of the import process rather than requirements. The
briefs in particular restate the file they sit in, so auditing them would double-count every section
they summarize. This ticket applies that inherited ruling across Group B.

Twenty-four sections across the nine screens that survive ticket 01, and the distribution is uneven,
so a sweep that assumes three per file will be wrong:

- `## 22. Condensed LLM implementation brief` appears in all nine.
- `## 23. Next planned item` appears in eight; screen 26 has no such section.
- `## Suggested Git commit` appears in seven; screens 22 and 26 have none.

Screen 23 is included. It is already `Reviewed`, but its scaffolding rows belong to this sweep like
any other file's; check before writing whether its existing forty-two rows already cover them, and do
not duplicate a row that exists.

Do not group the nine screens into one row. The ledger is read per screen, and a maintainer auditing
screen 28 must find the disposal on screen 28.

**Seam:** the reconciliation ledger. Nothing else is read or written; no source file changes.

**Blocked by:** 01 (write contention on the ledger, and screens 29 and 32 must already be disposed so
this sweep skips them).

**Status:** resolved

- [x] All twenty-four surviving scaffolding sections are classified `out-of-scope`, per screen.
- [x] Each row's anchor cites the Group A ruling rather than re-arguing it.
- [x] Screens 26 and 22 are handled correctly despite their missing sections; no row cites a section that does not exist.
- [x] No row duplicates one screen 23 already carries.
- [x] The import files are unedited.
- [x] `pnpm exec tsx scripts/verify-md-links.ts` reports nothing new.
