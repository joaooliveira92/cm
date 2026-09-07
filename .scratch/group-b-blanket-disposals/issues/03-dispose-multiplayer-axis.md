# 03: Dispose the multiplayer axis wherever it appears

**What to build:** A maintainer auditing any Group B screen finds every multiplayer, permission and
active-manager-scoping clause already disposed of, so that no audit re-argues an axis this project
removed before Group B began — and so that a clause smuggled into a section about something else is
caught rather than implemented by accident.

Group A removed the multiplayer, network, cloud and multi-manager axis wholesale: there is exactly one
human manager per Save. This ticket applies that ruling across the nine screens surviving ticket 01.

**The axis is not confined to its own section, and finding it is the substance of this ticket.** Every
file carries `## 10. Permissions and multiplayer behavior`, identically titled, and those nine
sections are the easy part. The clauses bleed outward: screen 24's §16 asks to "scope every inbox
query to the active manager" and to "not reveal another hot-seat manager's inbox", and ten of the
eleven files mention an active manager or hot seat somewhere outside §10. Expect the axis in §9
navigation behavior, §16 security and privacy, and §17 persistence rules, and read for the concept
rather than grepping for the word.

Three recurring phrases carry it in disguise and must each get a stated disposal: **"the active
manager"**, whose identity scopes what may be displayed; **"career revision"**, guarding against a
concurrent writer; and **"permission context"**, threaded through §3 and §9 of every file. With one
manager and durable-at-commit persistence, none has a referent — but say so once, explicitly, so the
six audit tickets can cite the disposal instead of each deriving it again.

Where a section is *only* partly multiplayer, dispose the clause and leave the rest of the section for
its screen's audit. Do not mark a section fully disposed because one bullet in it was.

**Seam:** the reconciliation ledger. Nothing else is read or written; no source file changes.

**Blocked by:** 02 (write contention on the ledger).

**Status:** resolved

- [x] All nine surviving `## 10` sections are classified, per screen.
- [x] The bleed outside §10 is swept for and recorded, with §16, §9 and §17 checked on every screen.
- [x] "Active manager", "career revision" and "permission context" each have one stated disposal the audit tickets can cite.
- [x] Partly-multiplayer sections are dispositioned at clause level, leaving the remainder for the screen's audit.
- [x] Each row's anchor cites the Group A ruling or `CONTEXT.md`'s Save entry, rather than re-arguing it.
- [x] The import files are unedited.
- [x] `pnpm exec tsx scripts/verify-md-links.ts` reports nothing new.
