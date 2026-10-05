# 02: Read the pitch and substitutions from the recorded lineup

Source: [spec.md](../spec.md).

**What to build:** The pitch projections and the substitution ledger become readers of the Lineup
Frames and their factual roles instead of re-folding the Match Event timeline. The reveal cut becomes
a pure projection: a manager-origin change appears and counts once given, ahead of the reveal; a
forced change applies and counts only when its event is before the cut; a goalkeeper stand-in spends
no substitution and no window; a halftime substitution spends no window; whether a bring-off removed
its player is a recorded fact. Production live and committed read paths switch to the frame-based
projections, while the old event-derived implementations remain in place as a test oracle. A
permanent cross-check sweep — over seeds with and without commands and forced-offs, and over many
reveal cuts — asserts the frame projections deep-equal the old event-derived output. The group-g
desktop read specs are untouched and green.

The slice's edge is pure functions from frames to the existing view shapes: no failures and no
services.

**Blocked by:** 01.

**Status:** resolved

- [x] `pitchBeforeEachEvent`, `pitchAsOf` and the substitution status take frames (and roles) instead
      of the timeline; the statistics count keeps its event-based forced-reveal filter, taking the
      ledger's recorded stand-in set.
- [x] Production live and committed reads use the frame-based projections.
- [x] The reveal-cut law is preserved exactly: manager-origin ahead of reveal, forced-origin only
      once revealed, stand-in spends nothing, halftime spends no window, bring-off outcome a fact.
- [x] The old event-derived implementations remain only as the sweep's oracle.
- [x] The cross-check sweep covers the command, forced-off and stand-in cases across several reveal
      cuts, and fails if any output differs.
- [x] The group-g desktop read specs (`revealed-pitch`, `revealed-state`, `revealed-substitutions`,
      `substitution-accuracy`, `ratings`, `statistics`, `red-card-stand-in`) keep their assertions and
      pass; the `pitchAsOf` call sites changed mechanically for the new signature.
- [x] `pnpm check:all` is green; small Conventional Commits on `dev`.
