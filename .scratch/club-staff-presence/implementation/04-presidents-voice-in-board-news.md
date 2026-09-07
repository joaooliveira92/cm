# 04: The President names the board's warnings and dismissals

**What to build:** the two messages that end or threaten a career gain the President's name. The
copy table's `ManagerWarned` and `ManagerSacked` messages speak as the President — "Alan Reyes has
issued a warning", "Alan Reyes has dismissed you" — while the Board Objective verdict stays
institutional. The President's name is derived in the main process, never ridden on the event, and
handed to the news projection through `NewsClubContext`, so the projection stays pure and messages
projected years apart name the same person automatically.

The slice's edge promise: the projection and its copy table change shape in exactly one field —
`NewsClubContext` gains `presidentName` — and the main-process news query already resolves club
context through the `displayNames` seam, which is where the name is derived. Old messages re-voice
on the next read by construction (the copy table is a projection with no persistence of its own),
and because the name is derived and fixed, the re-voicing changes the voice and never the person.

**Decisions:**

- The President names the warning and the dismissal; the verdict stays institutional. The copy for
  `ManagerWarned` and `ManagerSacked` gains the President's name; `BoardObjectiveJudged` stays
  institutional — setting and judging the Board Objective is the Board acting on its own
  instrument, and personifying it would blur the face-versus-institution line. (Ticket 05.)
- The President's name is derived in the main process, never ridden on the event. The news
  projection stays pure and takes facts; the main-process news query already resolves club context
  through the `displayNames` seam, and that is where `presidentName` is derived and added to
  `NewsClubContext`, with the copy table formatting it. Messages projected years later name the
  same person automatically because the President is a pure function of the seed, club id, and
  nation, fixed for the life of the career. The retroactive re-voicing of an existing save is fine
  and is recorded, because the change re-voices the voice and never the person. (Ticket 05.)

**Blocked by:** 01 — the presence derivation that supplies the President's name.

**Status:** ready-for-agent

**Files:** `packages/shared/src/news/newsCopy.ts` and `newsProjection.ts`,
`packages/shared/test/news/`, `apps/desktop/src/main/career/news.ts`, `apps/desktop/test/main/career/news.test.ts`.

- [ ] `NewsClubContext` gains `presidentName`, populated by the main-process news query from the
      presence derivation — never read off the event, never stored.
- [ ] A `ManagerWarned` message names the President (subject and body) with the name in the
      copy table's voice.
- [ ] A `ManagerSacked` message names the President in the body while the subject keeps the club
      name, and the body keeps the recorded objective-miss count.
- [ ] A `BoardObjectiveJudged` message carries no personal name — the verdict stays institutional.
- [ ] Two `ManagerWarned` messages projected a season apart — against the same save — name the
      same President.
- [ ] Retroactive re-voicing is recorded where the note or ledger keeps design context (the spec's
      "said so" requirement), not left hidden in the diff.
- [ ] `pnpm check:all` is green at this commit.