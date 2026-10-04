# 13: Stored timeline decodes the new event kinds

**What to build:** The stored-timeline schema union in `apps/desktop/src/main/match/timeline.ts` gains
`Tackle`, `Interception`, `HeaderDuel` and `PossessionTally`, and `Foul` gains optional
`fouledPlayerId`, in the same change as the engine. The compile-time `StoredMatchEventAgreesWithEngine`
assertion must keep passing. A committed match reads every new tag and the optional field back.

**Decisions:**

- The stored timeline decodes against an explicit union of event schemas; the four new kinds join it
  and `Foul` gains its optional field in the same change as the engine, or committed timelines
  silently drop them. See [ticket 10](10-saves-and-in-progress-matches.md).

**Blocked by:** 12

**Status:** resolved

- [x] Every new tag and `Foul.fouledPlayerId` round-trips through a commit-and-read-back test.
- [x] A timeline without a `PossessionTally` still decodes.
