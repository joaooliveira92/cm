# 04: Store and read the Lineup Journal on the committed timeline

Source: [spec.md](../spec.md).

**What to build:** The committed-timeline record gains an optional Lineup Journal, stored as additive
JSON in the existing column: no DDL and no save-schema version move. A committed read decodes it and
materialises the same Lineup Frames the run produced, so the post-match pitch, ratings, statistics,
report, summary and player-stats reads never re-simulate. A stored timeline without the field
re-derives once from the stream, the fallback Conditions already use. The committed-timeline note is
updated to record the added field. The Match Event vocabulary is unchanged.

The slice's decode is an Effect whose only failure is a corrupt payload — a defect, not a typed
error. A missing journal is a re-derive fallback, not a failure. It needs the match stream reader and
the engine.

**Blocked by:** 03.

**Status:** resolved

- [x] Committing a match writes the Lineup Journal; reading it back materialises frames identical to
      the live run's.
- [x] A stored timeline without the journal re-derives from the stream and reads identically.
- [x] No save-schema version move and no migration.
- [x] Post-match reads do not call the simulation when the journal is present.
- [x] The Match Event union is unchanged.
- [x] The committed-timeline Agent Note records the added field.
- [x] `pnpm check:all` is green; small Conventional Commits on `dev`.
